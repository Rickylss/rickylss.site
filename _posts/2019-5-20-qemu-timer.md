---
layout: post
title:  "QEMU timer 模块分析"
subtitle: ""
date:   2019-5-20 16:56:09 +0800
updated: 2020-8-8 14:24:55 +0800
tags:
  - qemu
categories: [QEMU]
---

 qemu 中所有的与时间相关的模块都基于`timer.h`和`qemu-timer.c`实现，包括 arm 的计时器`arm_timer.c`以及通用的倒数计时器`ptimer.c`，本文分析 timer.h 文件，探究 qemu 中 timer 的机制和原理，再实现一个自己的加数计时器`itimer.c`

 <!-- more -->

# QEMUClock

## QEMUClockType

`QEMUClock`一共有四种类型，分别是：`QEMU_CLOCK_REALTIME`、`QEMU_CLOCK_VIRTUAL`、`QEMU_CLOCK_HOST`和`QEMU_CLOCK_VIRTUAL_RT`，下面分别解释。

- QEMU_CLOCK_REALTIME

> The real time clock should be used only for stuff which does not change the virtual machine state, as it is run even if the virtual machine is stopped. The real time clock has a frequency of 1000 Hz.

real time clock 可以理解为真实的（相对于虚拟的）时钟，即使虚拟机停止或者挂起了，这个时钟也会继续走，这就意味着这个时钟只能用在不涉及到虚拟机状态的地方，否则一旦挂起后恢复，虚拟机状态就会出问题。

它实际上调用的是`clock_gettime()`和`CLOCK_MONOTONIC`，这是一个不可设定的恒定态时钟，从系统启动之后开始测量，并且不可修改，手动修改系统时间不会对其产生影响。

- QEMU_CLOCK_VIRTUAL

> The virtual clock is only run during the emulation. It is stopped when the virtual machine is stopped. Virtual timers use a high precision clock, usually cpu cycles (use ticks_per_sec).

virtual clock 与 real time clock 相反，虚拟时钟只会在虚拟机运行时运行，当虚拟机停止了，它也会停止。因为这种特性，它会被用于处理虚拟机硬件的一些状态，例如一些外设的定时器。它使用的是高精度的时钟，通常就是通过 CPU 的 cycle 来计算的。

这其实很好理解，假设你在虚拟机上运行了一个定时程序，这个程序要求每隔 60s 打印一个“hello world”，如果你使用 real time clock 作为计时器，那么当你在程序运行到一半的时候将虚拟机挂起，等待一段时间后恢复，程序是无法从上一次停止的时刻开始继续倒计时。只有在使用 virtual clock 的情况下，虚拟机挂起时，会将程序的时间也冻结了，恢复时，程序会从上一次停止的时刻开始继续倒计时。

- QEMU_CLOCK_HOST

> The host clock should be use for device models that emulate accurate real time sources. It will continue to run when the virtual machine is suspended, and it will reflect system time changes the host may undergo (e.g. due to NTP). The host clock has the same precision as the virtual clock.

host clock 用于需要使用真实时间的设备，虚拟机挂起或者停止时它依然会运行，它反应的是系统时钟时间（你可以简单的理解为它用的就是 date 的时间），因此相比于 real time clock 它会收到系统时间的影响（例如，由于 NTP 时间同步导致的改变），host clock 和 virtual clock 具有相同的精确度。

host clock 实际上使用的是`gettimeofday`函数，这个函数返回的是一个日历时间，因此会因为宿主机系统的 date 改变而改变。real time clock 在万不得已的情况下也会使用`gettimeofday`。

- QEMU_CLOCK_VIRTUAL_RT

> Outside icount mode, this clock is the same as @QEMU_CLOCK_VIRTUAL. In icount mode, this clock counts nanoseconds while the virtual machine is running.  It is used to increase @QEMU_CLOCK_VIRTUAL while the CPUs are sleeping and thus not executing instructions.

在非 icount 模式下，这个 clock 和 virtual clock 是一样的，不同的在于，当该 clock 处于 icount 模式下，它会以纳秒来计数。当 cpu sleep 时，它被用来增加 virtual clock，这样就不需要运行额外的指令了。

要很好的理解 virtual rt clock 和 virtual clock 的关系和区别，需要对 QEMU 中的 icount 有一定的了解。

icount 在 QEMU 中全称为 TCG Instruction Counting。它是 TCG 用于指令计数的一个组件，当 CPU 在 icount 模式下 sleep 时，通过它来计算时间。

## qemu_clock_get_ns

为了更好的理解前面提到的 4 中 clock type 的关系，可以直接看`/qemu/util/qemu-timer.c`文件下的`qemu_clock_get_ns`函数：

```c
/* get host real time in nanosecond */
static inline int64_t get_clock_realtime(void)
{
    struct timeval tv;

    gettimeofday(&tv, NULL);
    return tv.tv_sec * 1000000000LL + (tv.tv_usec * 1000);
}

/* Warning: don't insert tracepoints into these functions, they are
   also used by simpletrace backend and tracepoints would cause
   an infinite recursion! */
#ifdef _WIN32
extern int64_t clock_freq;

static inline int64_t get_clock(void)
{
    LARGE_INTEGER ti;
    QueryPerformanceCounter(&ti);
    return muldiv64(ti.QuadPart, NANOSECONDS_PER_SECOND, clock_freq);
}

#else

extern int use_rt_clock;

static inline int64_t get_clock(void)
{
    if (use_rt_clock) {
        struct timespec ts;
        clock_gettime(CLOCK_MONOTONIC, &ts);
        return ts.tv_sec * 1000000000LL + ts.tv_nsec;
    } else {
        /* XXX: using gettimeofday leads to problems if the date
           changes, so it should be avoided. */
        return get_clock_realtime();		// 实际上是gettimeofday()，不建议使用
    }
}
#endif

int64_t qemu_clock_get_ns(QEMUClockType type)
{
    switch (type) {
    case QEMU_CLOCK_REALTIME:
        return get_clock();		
    default:
    case QEMU_CLOCK_VIRTUAL:
        if (use_icount) {
            return cpu_get_icount();		// cpu cycle计数
        } else {
            return cpu_get_clock();			// cpu时钟
        }
    case QEMU_CLOCK_HOST:
        return REPLAY_CLOCK(REPLAY_CLOCK_HOST, get_clock_realtime()); 
    case QEMU_CLOCK_VIRTUAL_RT:
        return REPLAY_CLOCK(REPLAY_CLOCK_VIRTUAL_RT, cpu_get_clock());
    }
}
```

## 以 autoconverge 为例

`migrate_auto_converge`是 QEMU 热迁移支持的一个特性，它可以通过自动降频 CPU 的方式来减少写内存的频率，而降频的方法就是通过计算需要降频的时间和执行时间的比例来 halt cpu。

启动虚拟机时，通过`cpu_throttle_init->timer_new_ns`注册收敛回调函数：

```c
void cpu_throttle_init(void)
{
    throttle_timer = timer_new_ns(QEMU_CLOCK_VIRTUAL_RT,
                                  cpu_throttle_timer_tick, NULL);
}
```

入口函数`mig_throttle_guest_down`：

```c
static void mig_throttle_guest_down(uint64_t bytes_dirty_period,
                                    uint64_t bytes_dirty_threshold)
{
    /* ........ */
    /* We have not started throttling yet. Let's start it. */
    if (!cpu_throttle_active()) {
        cpu_throttle_set(pct_initial);
    } else {
        /* Throttling already on, just increase the rate */
        if (!pct_tailslow) {
            throttle_inc = pct_increment;
        } else {
            /* Compute the ideal CPU percentage used by Guest, which may
             * make the dirty rate match the dirty rate threshold. */
            cpu_now = 100 - throttle_now;
            cpu_ideal = cpu_now * (bytes_dirty_threshold * 1.0 /
                        bytes_dirty_period);
            throttle_inc = MIN(cpu_now - cpu_ideal, pct_increment);
        }
        /* 通过脏页率，计算想要的收敛时间 */
        cpu_throttle_set(MIN(throttle_now + throttle_inc, pct_max));
    }
}
```

调用`cpu_throttle_set->timer_mod`启动时钟：

```c
void cpu_throttle_set(int new_throttle_pct)
{
    /* ........... */
    timer_mod(throttle_timer, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL_RT) +
                                       CPU_THROTTLE_TIMESLICE_NS);
}
```

当 timer modify 到预设的值，调用回调函数`cpu_throttle_timer_tick`：

```c
static void cpu_throttle_timer_tick(void *opaque)
{
    CPUState *cpu;
    double pct;

    /* Stop the timer if needed */
    if (!cpu_throttle_get_percentage()) {
        return;
    }
    CPU_FOREACH(cpu) {
        if (!atomic_xchg(&cpu->throttle_thread_scheduled, 1)) {
            async_run_on_cpu(cpu, cpu_throttle_thread,
                             RUN_ON_CPU_NULL);
        }
    }

    pct = (double)cpu_throttle_get_percentage() / 100;
    timer_mod(throttle_timer, qemu_clock_get_ns(QEMU_CLOCK_VIRTUAL_RT) +
                                   CPU_THROTTLE_TIMESLICE_NS / (1 - pct));
}
```

对每个 cpu 执行`cpu_throttle_thread`线程，用于将一部分 cpu 时间设置为 halt（通过`pthread_cond_timedwait`函数）。

## QEMUClock 初始化流程

![QEMUClock](\pictures\QEMUClock.png)

1. `qemu_init_main_loop`中调用`init_clocks`初始化 4 种 Clock 类型：
2. `qemu_clock_init`初始化 4 种 Clock 类型，并且每种 Clock 下都有一个 TimerList，将 TimerList 加入到全局的 TimerListGroup(main_loop_tlg)中。

## QEMUClock 执行流程

简化一下前面提到的 auto-converge 的例子：

```plain
timer_new_ns()->timer_mod()
```

本质上就只有两个调用，`timer_new_ns`向`main_loop_tlg`下对应的 type 中添加一个 QEMUTimer。`timer_mod`修改当前的计时器，当 current_time >= expire_time 的时候，就会调用在`timer_new_ns`时注册的 callback。

```c
void timer_mod_ns(QEMUTimer *ts, int64_t expire_time)
{
    QEMUTimerList *timer_list = ts->timer_list;
    bool rearm;

    qemu_mutex_lock(&timer_list->active_timers_lock);
    timer_del_locked(timer_list, ts);
    rearm = timer_mod_ns_locked(timer_list, ts, expire_time);
    qemu_mutex_unlock(&timer_list->active_timers_lock);

    if (rearm) {
        timerlist_rearm(timer_list);
    }
}
```

# itimer 设备实现

<script src="https://gist.github.com/Rickylss/b69f1dc7749b73d6e6ad4a4e816a07e5.js"></script>

# Reference

[Prescaler 除频器](https://en.wikipedia.org/wiki/Prescaler)