---
layout: post
title:  "ovs dpdk 多 numa 优化"
subtitle: "Dealing with multi-NUMA"
date:   2021-9-17 11:20:45 +0800
tags:
  - OVS
categories: [OVS, DPDK]
comment: true
---

在网络虚拟化中，为了最大化资源利用，通常需要将功能和基础设施调度到多个 NUMA 上。在这种情况下该如何配置 OVS DPDK 以保证性能最优，则需要一些额外的分析和配置

<!-- more -->

# 查看当前系统状态

物理网卡和与 DPDK 接口相连虚拟机都有对应的 NUMA node。跨 NUMA node 的通信通常会产生更高的延迟，因此在配置 OVS DPDK 时了解系统当前 NUMA node 分布情况是非常重要的。

对于物理机网卡，可以通过如下命令查看：

```bash
# 01:00.0 是网卡 pci 号
$ lspci -vmms 01:00.0 | grep NUMANode
NUMANODE:	0
```

对于使用了 DPDK interface 的虚拟机，如果在虚拟机定义文件中做了`vcpupin`，可以查看`<cputune>`:

```xml
<cputune>
    <vcpupin vcpu='0' cpuset='2'/>
    <vcpupin vcpu='1' cpuset='4'/>
    <vcpupin vcpu='2' cpuset='6'/>
    <emulatorpin cpuset='8'/>
  </cputune>
```

然后通过`numactl`命令查看物理机上`cpu`在`node`的分布情况：

```shell
$ numactl -H
available: 2 nodes (0-1)
node 0 cpus: 0 2 4 6 8 10 12 14
node 1 cpus: 1 3 5 7 9 11 13 15
```

> 注意：
>
> - 如果虚拟机没有做`vcpupin`，通常`vcpu`会随意调度到空闲`pcpu`上；
> - 在这里 2、4、6、8 都在`node0`上；

如果系统中没有`numactl`命令，可通过查看如下地址：

```bash
$ ls /sys/devices/system/node/
has_cpu                has_memory         node0   possible  uevent
has_generic_initiator  has_normal_memory  online  power
```

`nodeX`下保存着相关的信息。

```bash
$ ls /sys/devices/system/node/node0                                  11:49:06
compact    memory105  memory126  memory147  memory45  memory64  memory84
cpu0       memory106  memory127  memory148  memory46  memory65  memory85
cpu1       memory107  memory128  memory149  memory47  memory66  memory86
cpu2       memory108  memory129  memory150  memory48  memory67  memory87
cpu3       memory109  memory130  memory151  memory49  memory68  memory88
cpu4       memory110  memory131  memory2    memory5   memory69  memory89
cpu5       memory111  memory132  memory3    memory50  memory7   memory90
cpu6       memory112  memory133  memory32   memory51  memory70  memory91
cpu7       memory113  memory134  memory33   memory52  memory71  memory92
cpulist    memory114  memory135  memory34   memory53  memory72  memory93
cpumap     memory115  memory136  memory35   memory54  memory73  memory94
distance   memory116  memory137  memory36   memory55  memory74  memory95
hugepages  memory117  memory138  memory37   memory56  memory75  memory96
meminfo    memory118  memory139  memory38   memory57  memory76  memory97
memory0    memory119  memory140  memory39   memory58  memory77  memory98
memory1    memory120  memory141  memory4    memory59  memory78  memory99
memory100  memory121  memory142  memory40   memory6   memory79  numastat
memory101  memory122  memory143  memory41   memory60  memory80  power
memory102  memory123  memory144  memory42   memory61  memory81  subsystem
memory103  memory124  memory145  memory43   memory62  memory82  uevent
memory104  memory125  memory146  memory44   memory63  memory83  vmstat

```

包括对应的 cpu 和内存。

# 配置

对 OVS DPDK 的配置都保存在`Open_vSwitch`表中，每次修改该表，都需要重启`ovs-vswitchd`使设置生效。

在`ovs-vswitchd`未运行时，执行`ovs-vsctl`设置需要添加`--no-wait，`以免等待`ovs-vswitchd`导致无法返回。

## dpdk-init

要使用 DPDK，需要首先开启`dpdk-init`，该设置默认为`false`:

```bash
# ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-init=true
```

## pmd-cpu-mask

`pmd-cpu-mask`用于设置 pmd cpu 位图，pmd cpu 指的是 OVS DPDK 用于处理 datapath 数据包的 cpu 核心。

设置了这个值之后，OVS DPDK 会在位图指定的 cpu 对应的 NUMA node 上轮询 DPDK interface。如果在位图中指定的 cpu 不在某个特定的 NUMA node 上，那么这个 NUMA node 上的物理网卡或者虚拟机则无法使用。

随着 cpu 的增加，通常来说 OVS DPDK 的性能会变得更好，在默认的情况下会使用每个 NUMA node 上编号最小的 cpu。

该参数可在任何时间设置，即使此时 OVS 上已经有流量了。

```bash
$ numactl -H
available: 2 nodes (0-1)
node 0 cpus: 0 2 4 6 8 10 12 14
node 1 cpus: 1 3 5 7 9 11 13 15
# 将 numa0 上 4 和 6，numa1 上 5 和 7 用于 datapath 数据包处理
$ ovs-vsctl set Open_vSwitch . other_config:pmd-cpu-mask=0xF0
```

## dpdk-socket-mem

`dpdk-socket-mem`用于设置在不同 NUMA node 上的大页内存分配，如果在某个 NUMA node 上没有分配内存，那么在这个 node 上的物理网卡和虚拟机则无法使用。有关大页内存分配的计算可参考：https://blog.rickylss.site/ovs/dpdk/2021/09/15/ovs-dpdk-hugepage/#。

`dpdk-socket-mem`默认设置为` dpdk-socket-mem=1024,0 `，默认情况下在在 NUMA node0 上分配。修改该设置需重启 OVS。

```bash
$ ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-socket-mem=1024,1024
```

![image-20210917132324191](/pictures/image-20210917132324191.png)

## dpdk-lcore-mask

`dpdk-lcore-mask`同样是用于设置 cpu 位图，和`pmd-cpu-mask`不同的是，这些 cpu 是用于非 datapath 的 OVS DPDK 线程，例如 handler 或者 revalidator。因为这些 cpu 不是用来处理 pmd 的，所以也不会在性能上带来什么提升。而且使用默认的设置有一个好处，Linux 调度器可以根据当前系统负载情况自动调度这些任务到各个 cpu 上。

```bash
$ ovs-vsctl --no-wait set Open_vSwitch . other_config:dpdk-lcore-mask=0x4
```

> 注意：
>
> - 这个设置通常来说保持默认就好；
> - 可以个给 pmd-cpu-mask 做 cpu isolate，这样可以确保 dpdk-lcore-mask 上的 cpu 不会调度到 pmd cpu 上。

# Reference

[OVS-DPDK Parameters: Dealing with multi-NUMA](https://developers.redhat.com/blog/2017/06/28/ovs-dpdk-parameters-dealing-with-multi-numa#)

