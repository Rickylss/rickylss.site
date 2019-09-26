---
layout: post
title:  "QEMU timer模块分析"
subtitle: ""
date:   2019-5-20 16:56:09 +0800
tags:
  - qemu
categories: [QEMU]
---

 qemu中所有的与时间相关的模块都由timer.h和qemu-timer.c文件实现，包括arm的计时器arm_timer.c以及通用的倒数计时器ptimer.c，本文分析timer.h文件，探究qemu中timer的机制和原理，再实现一个自己的加数计时器itimer.c

## 1、QEMUClock

### 1.1、QEMUClockType

qemuclock一共有四种类型，分别是：QEMU_CLOCK_REALTIME、QEMU_CLOCK_VIRTUAL、QEMU_CLOCK_HOST和QEMU_CLOCK_VIRTUAL_RT，下面分别解释。

- QEMU_CLOCK_REALTIME

> The real time clock should be used only for stuff which does not change the virtual machine state, as it is run even if the virtual machine is stopped. The real time clock has a frequency of 1000 Hz.

real time clock 用于不改变虚拟机状态的情况下，因为即使虚拟机停止了，它依然会运行。

- QEMU_CLOCK_VIRTUAL

> The virtual clock is only run during the emulation. It is stopped when the virtual machine is stopped. Virtual timers use a high precision clock, usually cpu cycles (use ticks_per_sec).

virtual clock与real time clock 相反，它只在仿真的时候运行，当虚拟机停止时，它就会停止。virtual clock具有较高的精确度。

- QEMU_CLOCK_HOST

> The host clock should be use for device models that emulate accurate real time sources. It will continue to run when the virtual machine is suspended, and it will reflect system time changes the host may undergo (e.g. due to NTP). The host clock has the same precision as the virtual clock.

host clock 用于需要真实时间的设备模拟，虚拟机挂起时它依然会运行，它会反应出系统时间可能会经受的改变（例如，由于NTP所导致的改变），host clock和virtual clock具有相同的精确度。

- QEMU_CLOCK_VIRTUAL_RT

> Outside icount mode, this clock is the same as @QEMU_CLOCK_VIRTUAL. In icount mode, this clock counts nanoseconds while the virtual machine is running.  It is used to increase @QEMU_CLOCK_VIRTUAL while the CPUs are sleeping and thus not executing instructions.

在非icount模式下，这个clock和virtual clock是一样的，不同的在于，当该clock处于icount模式下，它会以纳秒来计数，当cpu停止运行时，它用来为virtual clock计数。

### 1.2、QEMUClock struct

```c
typedef struct QEMUClock {
    /* We rely on BQL to protect the timerlists */
    QLIST_HEAD(, QEMUTimerList) timerlists;

    NotifierList reset_notifiers;
    int64_t last;

    QEMUClockType type;
    bool enabled;
} QEMUClock;
```



## 2、QEMUTimer struct

```c
struct QEMUTimer {
    int64_t expire_time;        /* in nanoseconds */
    QEMUTimerList *timer_list;
    QEMUTimerCB *cb;
    void *opaque;
    QEMUTimer *next;
    int scale;
};
```

### 2.1、timer_init_tl

```c
/**
 * timer_init_tl:
 * @ts: the timer to be initialised
 * @timer_list: the timer list to attach the timer to
 * @scale: the scale value for the timer
 * @cb: the callback to be called when the timer expires
 * @opaque: the opaque pointer to be passed to the callback
 *
 * Initialise a new timer and associate it with @timer_list.
 * The caller is responsible for allocating the memory.
 *
 * You need not call an explicit deinit call. Simply make
 * sure it is not on a list with timer_del.
 */
void timer_init_tl(QEMUTimer *ts,
                   QEMUTimerList *timer_list, int scale,
                   QEMUTimerCB *cb, void *opaque)
{
    ts->timer_list = timer_list;
    ts->cb = cb;
    ts->opaque = opaque;
    ts->scale = scale;
    ts->expire_time = -1;
}
```

### 2.2、timer_new_tl

```c
/**
 * timer_new_tl:
 * @timer_list: the timer list to attach the timer to
 * @scale: the scale value for the timer
 * @cb: the callback to be called when the timer expires
 * @opaque: the opaque pointer to be passed to the callback
 *
 * Creeate a new timer and associate it with @timer_list.
 * The memory is allocated by the function.
 *
 * This is not the preferred interface unless you know you
 * are going to call timer_free. Use timer_init instead.
 *
 * Returns: a pointer to the timer
 */
static inline QEMUTimer *timer_new_tl(QEMUTimerList *timer_list,
                                      int scale,
                                      QEMUTimerCB *cb,
                                      void *opaque)
```

```c
int64_t qemu_clock_get_ns(QEMUClockType type)
{
    int64_t now, last;
    QEMUClock *clock = qemu_clock_ptr(type);

    switch (type) {
    case QEMU_CLOCK_REALTIME:
        return get_clock();
    default:
    case QEMU_CLOCK_VIRTUAL:
        if (use_icount) {
            return cpu_get_icount();
        } else {
            return cpu_get_clock();
        }
    case QEMU_CLOCK_HOST:
        now = REPLAY_CLOCK(REPLAY_CLOCK_HOST, get_clock_realtime());
        last = clock->last;
        clock->last = now;
        if (now < last || now > (last + get_max_clock_jump())) {
            notifier_list_notify(&clock->reset_notifiers, &now);
        }
        return now;
    case QEMU_CLOCK_VIRTUAL_RT:
        return REPLAY_CLOCK(REPLAY_CLOCK_VIRTUAL_RT, cpu_get_clock());
    }
}
```

real time 和 virtual time 对应的是虚拟机cpu的运行时间，因此它底层调用的是QueryPerformanceCounter()方法和clock_gettime(CLOCK_MONOTONIC,&ts)方法，

host time 对应的是宿主机的时间，他的底层调用使用gettimeofday()方法。

## Prescaler除频器

<https://www.cnblogs.com/biglucky/p/4894982.html>