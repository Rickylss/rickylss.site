---
layout: post
title:  "C语言协程实现"
subtitle: ""
date:   2019-10-31 15:13:45 +0800
tags:
  - C
  - Coroutine
categories: [C]
comment: true
---

乙方还是不给我反馈。。。昨天刚好看到有一个叫协程的概念，今天拿过来仔细研究一下。

# 1 概念

- 进程是系统资源分配的最小单位，每个进程都有一个主线程，每个进程都拥有自己独立的内存空间；

- 线程是cpu调度的最小单位，在内核实现中，cpu对待线程和进程的态度是一样，都需要先保存寄存器现场；

- 协程是一种用户态的轻量级线程，不需要进行寄存器现场的切换，只需要将其上下文保存到静态区；

由以上3点可以得出一个重要的结论，多进程和多线程都可以使用多核cpu，也就是说它们可以同步/并行；但是协程是依附在线程（进程也可看做一个主线程）上的，线程是cpu调度的最小单位，因此多协程是无法使用多核cpu的，它只能跑在一个cpu上，也就是说它们是异步，但是可以说是并发的。

# 2 C协程

> 本节内容参考 *[Simon Tatham](http://pobox.com/~anakin/)* 的[Coroutines in C]( https://www.chiark.greenend.org.uk/~sgtatham/coroutines.html )，详细记录了自己的分析过程。

## 2.1 协程要做的事

看下面一个例子：

```c
int function(void) {
    int i;
    for (i = 0; i < 10; i++)
        return i;
}
```

这段程序永远都返回0。

现在假设我们想要实现这么一个功能：每次调用`function`取得`i`值后，`function`仍继续运行，也就是循环继续。程序最终返回0~9。

这个功能，就是我们想要使用的协程功能的简单体现：让协程处理一件事情，返回结果后，协程继续运行。

## 2.2 解决方法和新的问题

要实现这个功能思路很简单，我们只要把协程的上下文保存起来就好了。

这段程序的上下文包括两个内容，变量`i`和程序运行位置（不然每次进`for`循环都会将`i`重新赋值）。程序改写如下：

```c
int function(void) {
    static int i, state = 0;
    switch (state) {
        case 0: goto LABEL0;
        case 1: goto LABEL1;
    }
    LABEL0: /* start of function */
    for (i = 0; i < 10; i++) {
        state = 1; /* so we will come back to LABEL1 */
        return i;
        LABEL1:; /* resume control straight after the return */
    }
}
```

解决方法很粗暴：

1. 保存只在该方法下使用的上下文，使用静态变量`static`。
2. 回到运行位置，直接用`goto`语句，并用`switch`将跳转位置对应到具体的数值上。

但是这样做会产生一些问题，如果返回结果的"地方"变多，需要维持的`switch`"跳转表"就更大，`goto`标签也更多。

## 2.3 优化

结合著名的[Duff's device]( https://rickylss.github.io/c/2019/10/31/C-Duff-device/# )使用到的`switch`的两个特性，程序可以修改如下：

```c
int function(void) {
    static int i, state = 0;
    switch (state) {
        case 0:
            for (i = 0; i < 10; i++) {
                state = 1;
                return i;
        case 1:;
            }
    }
}
```

虽然代码看起来很恶心，但是它达到了我们的目标。现在我们来施展一些宏魔法：

```c
#define crBegine static int state = 0; switch (state) {
#define crReturn(i,x) do {state = i; return x; case i:;} while(0)
#define crFinish }
int function(void) {
    static int i;
    crBegine;
    for (i = 0; i < 10; i++)
        crReturn(1, i);
	crFinish;
}
```

再使用[`__LINE__`]( https://rickylss.github.io/c/2019/09/25/c-base/ )宏来解决记录程序位置的问题。

```c
#define crReturn(x) do { state=__LINE__; return x; \
                         case __LINE__:; } while (0)
```

这样就不用手动指定跳转位置了，可以使用行号自动指定。

就这样，最简单的协程方案出来了。

使用[coroutine.h](https://www.chiark.greenend.org.uk/~sgtatham/coroutine.h)头文件就行啦，或者使用[Protothreads](http://dunkels.com/adam/pt/index.html)，这是基于上文协程方案的一个最佳实现。

# 3 可重入问题

在2节中分析的协程有一个可重入的问题，当你要使用多个协程的时候，`state`的值会被污染。解决可重入问题的唯一方法就是为每个协程保存一个单独的上下文结构体，coroutine.h中如下：

```c
/*
 * `ccr' macros for re-entrant coroutines.
 */

#define ccrContParam     void **ccrParam

#define ccrBeginContext  struct ccrContextTag { int ccrLine
#define ccrEndContext(x) } *x = (struct ccrContextTag *)*ccrParam

#define ccrBegin(x)      if(!x) {x= *ccrParam=malloc(sizeof(*x)); x->ccrLine=0;}\
                         if (x) switch(x->ccrLine) { case 0:;
#define ccrFinish(z)     } free(*ccrParam); *ccrParam=0; return (z)
#define ccrFinishV       } free(*ccrParam); *ccrParam=0; return

#define ccrReturn(z)     \
        do {\
            ((struct ccrContextTag *)*ccrParam)->ccrLine=__LINE__;\
            return (z); case __LINE__:;\
        } while (0)
#define ccrReturnV       \
        do {\
            ((struct ccrContextTag *)*ccrParam)->ccrLine=__LINE__;\
            return; case __LINE__:;\
        } while (0)

#define ccrStop(z)       do{ free(*ccrParam); *ccrParam=0; return (z); }while(0)
#define ccrStopV         do{ free(*ccrParam); *ccrParam=0; return; }while(0)

#define ccrContext       void *
#define ccrAbort(ctx)    do { free (ctx); ctx = 0; } while (0)
```

使用`ccrBegineContext`和`ccrEndContext`创建一个协程上下文`x`，用来保存某个协程的上下文信息，其他则与第2节描述一样。



