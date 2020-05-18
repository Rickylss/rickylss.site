---
layout: post
title:  "Linux firmware"
subtitle: ""
date:   2020-5-11 19:13:45 +0800
tags:
  - Linux
categories: [OS, Linux]
comment: true
---

> 最近在构建一个基于debian的网络操作系统vyos，由于这个项目很多地方不完善，只能一步步跟着编译，一步步修改源码，吃了不少苦头。在构建iso的时候，遇到一个新的东西，以前没见过，也不知道是什么作用。翻译过来叫做固件（firmware）。

# 1、什么是固件

与firmware对应的单词叫做software，firm有坚固、结实的意思，soft则是柔软柔和的意思。

- software是指软件，通常我们所说的software就是运行在OS用户态的程序，不直接与硬件交互，而是工作在OS抽象出来的系统调用之上。
- firmware是指固件，固件一般是指在硬件产品生产时预安装到硬件内部只读记忆体（EEPROM）里的程序，BIOS就是一种固件。

# 2、Linux firmware?

一般来说固件是要放在设备的存储器上的，但是处于成本和灵活性的考虑，现在很多设备的固件都直接存放在硬盘上，当设备的驱动程序初始化的时候，再由该驱动将其加载到设备内部。这样，方便固件升级，也省了设备的存储器。正因如此，你会发现Linux作为一个操作系统居然会有firmware这个东西。

还有一个特点是：firmware运行在非“控制处理器”中，也就是说firmware的代码一般运行在外设自己的小核中，因此，firmware中的机器码指令和我们的操作系统还有软件的机器码指令一般也是不同的。对于我们来说，不需要理睬firmware是干嘛的做了什么，因为他们连指令都不一样了。firmware程序以二进制的形式存在于Linux内核的源码树中，生成目标系统时通常拷贝到`/lib/firmware`目录下。使用driver调用request_firmware()接口将其加载到硬件中。

# 3、工作方式

固件子系统使用sysfs和热插拔机制，当调用request_firmware()接口加载固件时，一个新的目录在`/sys/class/firmware`下使用你的驱动名字创建，该目录包含三个文件：

- loading，
- data,
- device,

> 待补充。