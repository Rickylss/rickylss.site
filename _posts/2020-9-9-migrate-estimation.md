---
layout: post
title:  "QEMU 热迁移预测尝试（failed）"
subtitle: "负载发生器及动态预测"
date:   2020-9-9 19:13:45 +0800
tags:
  - qemu
  - migration
categories: [QEMU]
comment: true
---

当前的热迁移功能是不支持预测虚拟机热迁移时间的，能提供热迁移相关状态信息的只有`info migrate`指令。热迁移有时会消耗很长时间，而用户想要知道能否完成热迁移，或者需要花多少时间来完成热迁移。为了实现这个目的，我实现了一个写内存负载发生器（`mem_writer`）并为 QEMU 增加了一个 qapi。目前测试下来实际消耗时间与预测时间相差 3%到 10%。目前该方法仍有较大的限制，该实验：

1. 只讨论 RAM；
2. 只讨论 pre-copy；

> 脏页生成速率的问题目前无法解决，该实验只能作为参考，无实际意义。

<!-- more -->

# QEMU 热迁移流程

本节描述 QEMU pre-copy 流程，该流程在其他 hyperviosr 中会有不同，而不同的流程将会影响到预测模型，最终会对预测结果产生影响，这里只讨论 QEMU post-migrate 的情况。

post-migrate 的整个过程分为三个阶段，全拷贝、脏页拷贝和停机拷贝。

## 阶段一：全拷贝

在全拷贝阶段，QEMU 将当前所有设备状态拷贝到目标主机上。在全拷贝期间，虚拟机仍在运行，因此会产生新的数据信息，这些数据信息将会在第二阶段被拷贝走。在只考虑 RAM 的情况下，若全拷贝期间虚拟机上正在运行频繁写内存的负载时，新的数据信息将显著增加；而读内存时不会增加新的数据信息。

全拷贝阶段做了一件事情来加快拷贝：

1. 只拷贝使用中（top 命令下 RES 部分）的内存，未被使用的内存被认为是`duplicate`，这部分内存不拷贝；

为了方便后续的预测模型计算，我们将使用中的内存标记为 WSET（work set），拷贝速度记为$r_u$。

> 判断那些内存页被使用，那些未被使用，使用了[PML](https://www.spinics.net/lists/kvm/msg112904.html)机制。

## 阶段二：脏页拷贝

由于在全拷贝期间，虚拟机仍在运行，因此还会有新的数据参数，产生的新数据叫做脏页。在第二阶段，QEMU 不会拷贝所有的 WSET 而是只拷贝新生成的脏页，判断脏页使用的是[PML](https://www.spinics.net/lists/kvm/msg112904.html)机制。

脏页拷贝需要注意两点：

1. 写内存程序不断地修改内存，不断产生脏页，但是脏页的产生是有上限的，重复修改同一个内存页并不会产生两个脏页。我们将写内存活动频繁的内存页标记为 HSET（hot work set）;
2. 在拷贝脏页期间还会生成新的脏页，这似乎是一个死循环，我们永远都真正同步源主机和目标主机上的虚拟机。

为了方便后续的预测模型计算，我们将脏页生成速率标记为 DRATE。

> 预测虚拟机迁移的核心难点在于脏页生成速率，在实际的负载中脏页生成速率是不稳定的，但是好在对于绝大多数虚拟机来说业务是稳定的，~~因此在一个可预见的时间段里，脏页生成速率是稳定的~~。
>
> 如何获得这个脏页生成速率是下一步的目标。

## 阶段三：停机拷贝

在阶段二的第二点注意中提到过，拷贝脏页时，也会生成新的脏页，这确实是个死循环，打破这个死循环的方式是做一些妥协。

当第二阶段循环迁移满足一定条件后，会进入到停机拷贝阶段，在这个阶段源主机上的虚拟机会停止运行（不再产生脏页），并将剩下的脏页一股脑迁移到目标机上。完成迁移后立马启动目标机。我们将这个停机时间称为 downtime

阶段二到阶段三的条件有两种：

1. 当脏页减少到一定数量，可以在很短的 downtime（QEMU 默认 300ms）里完成阶段三；
2. 当迁移时间达到阈值，QEMU 中不使用这种方法。

在阶段三时不产生脏页，但是停机会对业务有影响，在 QEMU 中可设置最大可忍受停机时间。

# 预测模型

预测模型的推导可参考[热迁移预测模型](./2020-7-31-live-migrate-estimation.md)。
$$
\begin{aligned}
& t_1 = \frac {WSET}{r_u} &\qquad (9)\\
& t_2 = \frac {min(HSET,RATE * t_1) - (downtime*r_u)} {(r_u-RATE)} &\qquad (10) \\
& t_3 = t_1 + t_2 + downtime \\
\end{aligned}
$$
$t_3$为总的迁移时间。downtime 为最大可忍受停机时间。

# 负载发生器

负载发生器源码如下：

```c
#include <stdio.h>
#include <limits.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>
#include <getopt.h>
#include <sys/time.h>
#include <string.h>

typedef struct the_args {
    size_t hot_pages;
    int dirty_rate;
} the_args;

void *do_mem_job(void* arg)
{
    the_args args = *(the_args*)arg;
    struct timespec req;
    char *buf = (char *)calloc(args.hot_pages, 4096);

    /* init the ram */
    memset(buf, 3, (args.hot_pages*4096));

    req.tv_nsec = (1000 * 1000 * 1000) / args.dirty_rate;
    req.tv_sec = 0;

    while(1)
    {
        for (size_t i = 0; i < args.hot_pages; i++)
        {
            buf[i * 4096]++;
            nanosleep(&req, NULL);
            printf("tick\n");
        }
    }
}

void mem_helper(char* pro_path) {
    printf("%s -s [hotpage size]MB -r [dirty rate]pages/s -d [test time]s \n", pro_path);
}

int main(int argc, char **argv)
{
    int opt;
    the_args args = {
        .dirty_rate = 5000,
        .hot_pages = 1000,
    };
    unsigned int test_time = 60;

    char* programe_path = realpath(argv[0], NULL);
    //printf("programe path: %s\n", programe_path);

    while ((opt = getopt(argc, argv, "s:r:d:")) != -1)
    {
        switch (opt)
        {
        case 's': /* hot pages */
            args.hot_pages = (size_t)(atoi(optarg) * 1024 / 4);
            break;
        case 'r': /* dirty rate */
            args.dirty_rate = atoi(optarg);
            break;
        case 'd': /* test time */
            test_time = (unsigned int)atoi(optarg);
            break;
        default:
            mem_helper(programe_path);
            return 0;
        }
    }

    pthread_t p;
    pthread_create(&p, NULL, do_mem_job, (void*)&args);
    pthread_detach(p);

    printf("test thread running\n");

    sleep(test_time);

    printf("test finished\n");
}
```

# 测试结果

| WSET | HSET(输入) | RATE(输入) | 平均脏页率 | 平均迁移速度 | 实际迁移时间 | 预测迁移时间 |
| ---- | ---------- | ---------- | ---------- | ------------ | ------------ | ------------ |
| 4G   | 100        | 2000       | 1274       | 8169         | 18802        | 18261        |
| 4G   | 100        | 4000       | 2198       | 8173         | 19805        | 19392        |
| 4G   | 100        | 6000       | 2734       | 8191         | 20683        | 19739        |
| 4G   | 100        | 8000       | 3966       | 8171         | 22395        | 21172        |
| 4G   | 100        | 10000      | 4434       | 8180         | 23098        | 21857        |
| 4G   | 100        | 12000      | 5438       | 8185         | 25294        | 24374        |
| 4G   | 100        | 20000      | 6720       | 8081         | 33606        | 33582        |
| 4G   | 100        | 22000      | 6818       | 8213         | 33915        | 32614        |
| 4G   | 100        | 30000      | 7445       | 8197         | 53029        | 47293        |
| 4G   | 100        | 36000      | 8091       | 8180         | 316021       | 268995       |
| 4G   | 200        | 2000       | 1272       | 8181         | 22388        | 21825        |
| 4G   | 200        | 4000       | 2247       | 8189         | 26302        | 25536        |
| 4G   | 200        | 6000       | 3128       | 8204         | 29107        | 28012        |
| 4G   | 200        | 8000       | 4436       | 8189         | 32410        | 31605        |
| 4G   | 200        | 10000      | 5101       | 8186         | 35006        | 34319        |
| 4G   | 200        | 12000      | 5400       | 8186         | 37302        | 36328        |
| 4G   | 200        | 20000      | 6621       | 8175         | 54346        | 50498        |

# 结果分析

该方法确实能够在一定程度上预测热迁移时间，但是其受限制影响极大，主要有以下几点：

1. 实际负载脏页率并不均匀，并且无法从宏观地角度进行观察（极小的抖动都有可能导致迁移的成功或失败）；
2. 本文采用的方法为取 RATE 从阶段二后的平均 RATE，该值需要实时获取，并且越往后预测越精确，但是问题在于，越往后，迁移工作都快完成了，也就不需要预测了；

# 成果

虽然热迁移预测的功能不具备现实意义，但是依旧有很多收获，也获得了一些启示：

1. 热迁移预测难点，归根结底在脏页率上；
2. 知道了热迁移的更详细信息，同时发现了 qemu-2.12 的一个 dirty_pages_rate 的 bug，该 bug 可能会影响到阶段二转换到阶段三的判断条件以及 auto-converge 的可靠性。

# Reference

Peter Troger and Matthias Richly,(2012). *Dependable Estimation of Downtime for Virtual Machine Live Migration*

