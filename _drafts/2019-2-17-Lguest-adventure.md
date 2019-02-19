---
layout: post
title:  "Lguest探险之旅?"
subtitle: ""
date:   2019-2-17 14:15:38 +0800
categories: [linux, hypervisor, kernal]
---

> 本文为Lguest学习笔记，原文来自[Lguest Adventure](https://swtch.com/lguest/)，本文会在对原文翻译的基础上添加个人的理解，所有个人理解内容将被标注，读者可自行甄别，如果发现有争议的内容可与本人联系交流，谢谢。

# Lguest探险之旅

Lguest是一个在Linux上的轻量级的x86虚拟机模拟器，由[Rusty Russell](https://en.wikipedia.org/wiki/Rusty_Russell)开发并整理。

Lguest采用[文学式编程](https://zh.wikipedia.org/wiki/%E6%96%87%E5%AD%A6%E7%BC%96%E7%A8%8B)风格编写而成：你能够通过运行make命令抽出对应的文档，就像下面那样；

让我们开始探险吧！

> *Lguest相比于qemu更像kvm，它们都被集成到Linux kernel里成为一个模块，它们关注的都是cpu和memory。而qemu则是纯软件实现。* 

## README

``` shell
$ cd linux-2.6/drivers/lguest
$ cat README
```

欢迎来到Lguest的世界，亲爱的读者。

对你来说Lguest是一场冒险，而读者你，是英雄。我想不到有多少个只有5000行代码的项目能提供如此的性能同时包含可预见的潜能；深入源码，度过一段激动人心的时间！

但是请注意！这是一段需要花费数个小时或者更多的险峻旅途，正如我们所知，真正的勇士们都是在一个崇高的目标下驱动前进。因此，我将会为任何我遇到的完成了这场冒险的人买一杯啤酒（或者任何等价的东西）。（*要喝啤酒的请找Rusty Russell*)

找一个舒服的地方，保持头脑清醒又不失风趣。在你通向崇高的目标的同时，你将获得对lguest、hypervisors和x86虚拟化技术的熟练的洞察力。

我们需要探寻七个部分：

1. 准备（Preparation）

   -让我们未来的英雄快速地浏览lguest的景色。非常适合armchair coder(参考“armchair traveller”，神游码农，坐在扶手椅上以空想方式写代码的人)以及易昏阙体质的人。

2. 客户机（Guest）

   -我们在这里遇见第一缕诱人的代码，并且开始理解Guest kernel的生命周期的细节。

3. 驱动（Drivers）

   -Guest靠这个发出它的声音并且变得可用，到这里，我们对Guest的理解就完成了。

4. 启动器（Launcher）

   -返回去看看Guest的创建，从这里开始理解Host。

5. 宿主机（Host）

   -通过一段漫长和艰难的旅程我们研读Host代码，在这里我们的英雄尝到一点失败的滋味。

6. 转换开关（Switcher）

   -在这里我们理解Guests和Hosts的交织关联。

7. 征服

   -我们完全成熟的英雄抓住这最伟大的问题：“what next?”

> Lguest或者说hypervisor主要包括5个部分，Guest、Drivers、Launcher、Host和Switcher，其中Guest和Host就是客户机和宿主机，表现为Linux内核与Linux系统上的一个进程。Drivers则是驱动，是客户机能够连接不同设备的关键，类比为qemu中的不同设备驱动。Launcher则是启动器，类比qemu中的qemu-arch-system，用来创建配置虚拟机。

## Preparation

``` shell
$ make Preparation!
```

`arch/x86/lguest/boot.c`

hypervisor允许多个操作系统运行在一个机器上。用David Wheller的话来说就是：“所有计算机上的问题都可以通过另一层的迂回手段解决”

为了让实现更简单，我们要做两件事：

第一，我们从一个普通的Linux kernel开始，在kernel中插入一个模块（lg.ko），我们可以通过这个模块运行另一个Linux kernel，就像是运行一个进程一样。我们把第一个kernel叫做Host，另一个叫做Guest。设置启动Guests的程序（如：Documentaion/lguest/lguest.c）就叫做Launcher。

第二，我们只运行特别的改良的Guests，不是普通的系统内核。当你将CONFIG_LGUEST设置为‘y'或者’m‘，就会自动地设置CONFIG_LGUEST_GUEST=y，这样就可以将相关的文件编译进kernel，将kernel做Guest使用。这意味着，你可以在Host和Guest上用同样的kernel。

这些Guest知道自己不能做特权操作（*Hypervisor中的特权指令*），比如关闭中断，它们需要明确地要求Host去做这件事。本文件由这些低级本地的硬件操作的替代品组合而成：这个特殊的Guest就是Host。

所以，kernel是怎么知道自己是一个Guest的呢，Guest从一个专用的用特殊字符串标记的入点启动，它设置了一些东西，然后调用到这里。我们用Guest version替换原生的方法参数“paravirt"，然后正常启动。





