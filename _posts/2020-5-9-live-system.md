---
layout: post
title:  "live system"
subtitle: ""
date:   2020-5-9 19:13:45 +0800
tags:
  - debian
categories: [OS]
comment: true
---

> 我之前做过类似的Linux操作系统打包工作，但是对live system并没有一个整体的概念，趁这次编译vyos的机会梳理一下相关的知识。本文绝大部分内容来自Debian [live manual](https://live-team.pages.debian.net/live-manual/html/live-manual/index.en.html)中的第四节[The basics](https://live-team.pages.debian.net/live-manual/html/live-manual/the-basics.en.html#the-basics)。

常用的镜像类型有三种：

- `iso-hybrid`，最通用的镜像类型，可在虚拟机、光学媒介或者USB便携式存储设备使用；
- `hdd`，在某些特殊情况下这个类型更加合适，后文有解释；
- `netboot`，用于网络安装的镜像，常用于运维批量安装。

# 1、什么是live system

live system通常是指从一个可移动的设备，如：CD-ROM、U盘或者网络上启动操作系统，无需在普通的驱动器上安装即可使用，在运行的时候自动完成配置。

一个live system通常由一下几个部分组成：

- **Linux kernel image：**通常以`vmlinuz*`命名；
- **Initial RAM disk image(initrd)：**一个为Linux引导而设置的RAM磁盘，包含可能需要挂载系统映像的模块和一些执行该任务的脚本呢；
- **System image：**操作系统的文件系统映像。通常使用SquashFS来压缩这个文件系统，注意，这个映像是只读的。因此，在live system引导期间将使用一个RAM磁盘以及一个‘union’机制来允许在运行的系统上写文件。但是，除非使用persistence，所有的修改在关机后都会丢失；
- **Boot loader：**从选择的媒介引导的一小段代码，可能显示一个提示或菜单以允许选择选项/配置。它加载Linux内核及其initrd，使其与一个关联的系统文件系统一起运行。可以使用不同的解决方案，这取决于包含前面提到的组件的文件系统的目标媒介和格式：*solinux to boot from a CD or DVD in ISO9660 format, syslinux for HDD or USB drive booting from a VFAT partition, extlinux for ext2/3/4 and btrfs partitions, pxelinux for PXE netboot, GRUB for ext2/3/4 partitions, etc.*

# 2、第一步：构建一个ISO hybrid image

无论是什么类型的image，你每次构建image都需要执行相同的基本步骤。作为第一个例子，首先创建一个构建目录，放置所有构建的内容。进入到目录，运行如下`live-build`命令创建一个基础的ISO hybrid image包含默认的live system。它能够烧入CD或者DVD设备，也能够拷贝到U盘里。

工作目录的名字可以随便命名，但是最好使用能够帮助你分辨你工作内容的名字来命名。尤其是当你构建多个不同的image类型时。

```bash
$ mkdir live-default
$ cd live-default
```

然后运行`lb config`命令，它会创建“config/”目录：

```bash
$ lb config
```

没有给这条命令传入任何参数，因此它将使用所有默认的选项。查看[lb config command](https://live-team.pages.debian.net/live-manual/html/live-manual/overview-of-tools.en.html#lb-config)了解更多信息。

接下来运行`lb build`：

```bash
$ lb build
```

构建开始，构建的速度却决于你的电脑和网络。构建结束之后，你将在当前目录下获得一个镜像文件。

# 3、使用ISO hybrid image

- 将镜像烧入物理设备；
- 烧入U盘；
- 使用剩余的U盘空间；
- 修改BIOS从其他设备启动

略。

# 4、使用虚拟机测试

使用虚拟机测试可以节省很多时间

以QEMU为例：

```bash
# apt-get install qemu-kvm qemu-utils
# kvm -cdrom live-image-i386.hybrid.iso
```

略。

# 5、构建HDD镜像

HDD镜像只能够用于U盘，或者其他便携式存储设备。通常ISO hybrid能够满足一般的使用，但是当你的BIOS无法处理byvrid image的话，你需要使用HDD image。

```bash
# lb clean --binary
# lb config -b hdd
# lb build
```

# 6、 构建net boot 镜像

```bash
# lb clean
# lb config -b netboot --net-root-path "/srv/debian-live" --net-root-server "192.168.0.2"
# lb build
```

与ISO和HDD不一样，netboot不能够直接提供文件系统，所以必须通过NFS来处理这些文件。通过lb config可以选择不同的网络文件系统，`--net-root-path`和`--net-root-server`选项分别指定了本地和服务端。