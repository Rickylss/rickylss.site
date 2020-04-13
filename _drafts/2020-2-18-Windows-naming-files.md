---
layout: post
title:  "windows文件、路径和命名空间"
subtitle: ""
date:   2020-2-18 9:13:45 +0800
tags:
  - Windows
categories: [Windows]
comment: true
---

所有Windows支持的文件系统都是用文件和文件夹的概念来获取磁盘或者设备上的数据。使用Windows APIs操作文件和设备I/O的Windows开发者都应该了解文件和文件夹命名的各种规则、约定和限制。

通过使用文件I/O APIs可以从磁盘、设备和网络读写数据。文件和文件夹，以及命名空间，理念上来说都是路径（path)，即：一个用来表示从哪里获取数据的字符串，而无论是磁盘、设备还是网络。

一些文件系统如NTFS，支持链接文件和链接文件夹，它们和普通的文件、文件夹一样需要遵循文件命名规则和约定。更多信息可查看 [Hard Links and Junctions](https://docs.microsoft.com/zh-cn/windows/win32/fileio/hard-links-and-junctions) 和 [Reparse Points and File Operations](https://docs.microsoft.com/zh-cn/windows/win32/fileio/reparse-points-and-file-operations)。

# 1、File and Directory Names

对于一个单独的文件来说，所有文件系统都遵循着同样的命名约定：一个基本的名字和一个可选的被句号（英文句号）分割开来的扩展后缀。但是，每一个文件系统，如：NTFS，CDFS，exFAT，UDFS，FAT和FAT32，都有独特且不同的规则。

# 2、Paths

# 3、Namespaces

在Windows API中使用命名空间有两种类型的约定，通常被称为NT命名空间和Win32命名空间。NT命名空间是做为低级命名空间设计的，可以存在于其他的子系统和命名空间中，包括在Win32子系统中，同时扩展为Win32命名空间。POSIX是另一个Windows上构建于NT命名空间上的子系统。早期版本的Windows也定义了一些预定义或者保留项，对一些特殊设备比如：通信（串口并口）端口和默认显示器的命名现在都被成为NT设备命名空间。在当前版本的Windows中依旧支持。

https://docs.microsoft.com/zh-cn/windows/win32/fileio/naming-a-file#win32-device-namespaces





