---
layout: post
title:  "热迁移预测模型"
subtitle: ""
date:   2020-7-31 19:13:45 +0800
tags:
  - qemu
  - migration
categories: [QEMU]
comment: true
---

为用户提供私有云或者 IT 服务，总是伴随着`service level agreement（SLA）`。我们需要向客户承诺服务可靠性。对于虚拟机热迁移来说，目前没有可靠的预测热迁移 downtime 和 totaltime 的方法。

主动故障管理的关键概念是在故障实际发生之前就对潜在故障采取行动。目标是执行一些能够防止即将发生的故障的操作，使其不会发生，或者为可能发生的故障准备恢复机制。

> 关键在于：增加`mean-time-to-failure`（MTTF）或者减少`mean-time-to-repair`（MTTR）
>
> Accuracy is inversely related to the length of the time interval how far prediction reaches into the future, which is called the failure prediction lead time.

# 虚拟机热迁移过程（pre-copy）

虚拟机热迁移可大致分为两个阶段，细分为三个阶段：

1. *warm-up phase*，将 vm 的主存及其上不断更改的主存增量传输到目标主机，**直至剩余待传输数据到达阈值或传输时间到达阈值**；
   1. *first iteration*，复制所有内存到目标主机，将当前内存状态作为基础，之后对内存的改动作为增量；
   2. *other iteration*，复制所有增量到目标主机；
2. *stop-and-copy phase*，到达阈值后，vm 停机，剩余的待传输数据一次性复制到目标主机；

虚拟机热迁移中最重要的部分是主存的运行状态，因为虚拟机的存储通常都是使用的共享存储无需迁移。

> **注意**：更重要的是虚拟机中内存管理器交换出去的内存。某些 hypervisor（如：Xen）在*warm-up*阶段会使用一种叫*ballooning*的技术，申请大量无用内存，将相关的内存交换到次级存储上。

内存分为两种情况：

1. 只读内存区域（如：code 段），在*warm-up*的时候只需要复制一次；
2. 其余的内存区域（data 段、stack 段、heap……），在*warm-up*阶段会不断更改；

# 影响因素

1. CPU 负载，并不会直接影响热迁移，除非 CPU 的负载对内存的使用状态产生了影响，例如增加了内存的写频率；
2. 内存使用状态

# 关键参数及概念

## 变量

1. The Virtual machine size ($VMSIZE$): 为虚拟机分配的内存大小
2. The working set ($WSET$): 需要传输给目标主机的内存大小，约等于虚拟机实际使用的内存
3. The hot working set ($HWSET$): 被平凡修改的内存区域
4. The modification rate ($RATE$): 
5. The throughput ($r_u$): 表示在迁移发生时，每个时间单位修改的平均内存量。

![image-20200803145051471](C:\Users\xiaohaibiao\AppData\Roaming\Typora\typora-user-images\image-20200803145051471.png)

## 性能指标

1. *Migration time*，总迁移时间，指从热迁移流程启动到 hypervisor 声明迁移完成所用时间；
2. *Downtime*，也称*blackout time*，指虚拟机迁移过程中*stop-and-copy*阶段，短暂的停机时间；

# 热迁移模型

## 待迁移数据余量

根据不同内存情况分类：

- 未使用的内存页，只需要复制一次，某些 hypervisor（如：QEMU）不复制空页；剩余待传输空页（ESET = VMSIZE - WSET）的表示`e(t)`；
- 属于*WSET*但不属于*HWSET*，同样只需要复制一次，不能省略，剩余待传输的（PSET = WSET - HWSET）表示`p(t)`；
- *HWSET*，在迁移过程中仍然会不断改变，需要多次拷贝，剩余待传输的（HWSET）表示`h(t)`

剩余待传输页面的表达式为：
$$
f(t) = e(t) + p(t) + h(t) \qquad (1)
$$
第一轮复制与后面的复制有很大的不同，第一轮复制需要做 base，**每个内存页都复制一次**。将复制分为两个阶段，假设$t_1$时刻完成第一轮复制，因此：

- empty set(ESET)，只复制一次，复制速度为$r_e$，这个速度通常会比较快，甚至在不拷贝的时候可以认为是无穷大；

$$
e(t)=\left\{
\begin{aligned}
ESET - r_et & \qquad for \quad 0\le t\le t_1\\
0                    & \qquad for \quad t>t_1\\
\end{aligned}
\right.
\qquad (3)
$$

- passive set(PSET)，只复制一次，复制速度为$r_u$，但是，在复制 PSET 的时候，HWSET 正在被写入，在这里我们假设复制速度$r_u$被 PSET 和 HWSET 按比例划分，则 PSET 的复制速率为$\frac {PSET}{WSET}r_u$。

$$
p(t)=\left\{
\begin{aligned}
PSET - \frac {PSET}{WSET}r_ut & \qquad for \quad 0\le t\le t_1\\
0                    & \qquad for \quad t>t_1\\
\end{aligned}
\right.
\qquad (2)
$$

> 注意理解$\frac {PSET}{WSET}r_u$，事实上，在第一阶段复制内存页的时候，所有的 WSET 都需要被复制一次，因此将$r_u$按比例分给 PSET 和 WSET。
>

- HWSET，复制多次，需要注意的是：
  - 在第一阶段$0~t_1$，除了复制一次 HWSET，还会有脏页生成，因此剩余的待迁移内存需要加上新生成的脏页，表现为公式$(4)$；
  - 进入增量复制阶段$t_1~t_2$，所有$r_u$速率用来复制增量，表现为公式$h_2(t)$；
  - 进入*stop-and-copy*阶段$t_2~t_3$，不再有脏页生成(RATE=0)，迁移剩余数据。
- 活跃内存大小不会大于 HWSET，即便脏页率 RATE 远大于$r_u$，*每次只需要更新最新的修改即可，中间的更新可以丢弃*；
$$
h(t)=\left\{
\begin{aligned}
min(HWSET, max(0,h_1(t))) & \qquad for \quad 0\le t\le t_1\\
min(HWSET, max(0,h_2(t))) & \qquad for \quad t_1< t\le t_2\\
h_3(t)  & \qquad for \quad t_1< t\le t_3\\
0                    & \qquad for \quad t>t_3\\
\end{aligned}
\right.
\qquad (3)
$$

$$
\begin{aligned}
& h_1(t) = HWSET  - \frac {HWSET}{WSET}r_ut + RATEt
& \qquad (4) \\
& h_1(t) = HWSET - (RATE-\frac {HWSET}{WSET}r_u)t 
& \qquad (4) \\
& h_2(t) = f(t_1)+(RATE - r_u)t
& \qquad (5)	\\
& h_3(t) = f(t_2)-r_ut
& \qquad (6)
\end{aligned}
$$

> **注意**：到达$t_1$的条件是对每个内存页面都复制一次，到达$t_2$的条件是剩余数据量到达阈值或者时间到达阈值；

## 迁移时间公式

预测时间计算公式：
$$
\begin{aligned}
migration\quad time = t_3 - 0 \qquad (7)\\
blackout\quad time = t_3 - t_2 \qquad (8)
\end{aligned}
$$
时间计算公式：
$$
\begin{aligned}
& t_1 = \frac {ESET}{r_e} + \frac {WSET}{r_u} &\qquad (9)\\
& t_2 = min(t_{c1},t_{c2}) &\qquad (10) \\
& t_3 = t_2 + \frac {f(t_2)}{r_u} &\qquad (11) \\
\end{aligned}
$$
阈值：

$t_{c1}$代表，在剩余待迁移数据量达到阈值情况下的时间；

$t_{c2}$代表，达到超时阈值情况下的时间；

> **注**：QEMU 采用的是条件 1——剩余带迁移数据量达到阈值。

# 获取参数

![image-20200804105332092](C:\Users\xiaohaibiao\AppData\Roaming\Typora\typora-user-images\image-20200804105332092.png)

为了衡量这个模型，我们需要上图中的参数，来预测总迁移时间和停机时间，再与真实的数据进行比较。

需要获取的变量值分为 4 种类型：

- VM specific，相关的只有 VMSIZE，这个值在虚拟机启动时就设置好了，获取较为方便；
- Situation specific，这个类型的变量需要根据虚拟机具体运行状态来定，WSET 比较好获取，HWSET 和 RATE 获取较为困难；
- System specific，这个类型的变量需要根据当前的网络和物理机状态来决定，$r_e$和$r_u$默认为系统网络性能上限，但是该值是可设置的，获取较为方便；
- Hypervisor specific，这个变量和 hypervisor 直接相关，是停止*pre-copy*阶段的条件，获取方便；

PML，KVM 脏页记录机制

https://www.spinics.net/lists/kvm/msg112904.html


