---
layout: post
title:  "在kickstart %post阶段生成initramfs"
subtitle: ""
date:   2021-9-28 15:20:45 +0800
tags:
  - ZStack
categories: [ZStack, Linux]
comment: true
---

# kickstart %pre %post阶段

在kickstart中我们可以通过%pre和%post标签添加pre-installation脚本和post-installation脚本，顾名思义，这两个脚本分别作用在：

- %pre，在系统安装开始之前，kickstart 文件解析之后立即运行；
- %post，在系统完成安装之后运行；

并且%post默认在chroot环境下运行，而%pre不在chroot下运行，这一点在后文调试中会解释。

# 调试iso安装过程

调试iso安装过程，首先选iso启动，进到安装界面，你可以选text mode（不带UI的字符安装界面）或者带UI的界面。

![image-20210128121159661](https://rickylss.github.io/pictures/image-20210128121159661.png)

按下`Alt+F2`切换到shell。

![image-20210128121229975](https://rickylss.github.io//pictures/image-20210128121229975.png)

进入了可以看到以anaconda开头的shell环境，现在看到的这个就是**安装系统用的系统**，这个系统非常简洁，只支持很少的与系统安装相关的一些命令，可以通过`help`命令查看。

安装系统到硬盘的操作就是在这个环境下执行。首先会执行%pre，之后将你选择的硬盘（如/dev/vda）挂载到`/mnt/sysimage`目录下，并且将系统和rpm包安装到该目录下：

![image-20210128122224980](https://rickylss.github.io//pictures/image-20210128122224980.png)

这个时候切换到shell环境可以看到安装硬盘已经被分区并挂载到`/mnt/sysimage`目录下了。

![image-20210128122745534](https://rickylss.github.io//pictures/image-20210128122745534.png)

再切回main，等待rpm安装完成，

![image-20210128122921882](https://rickylss.github.io//pictures/image-20210128122921882.png)

可以看到在generating initramfs之后才真正执行%post

而执行%post，是在chroot环境下，等同于：

```bash
# 在shell tab下
[anaconda root@localhost /]# cd /mnt/sysimage
[anaconda root@localhost sysimage]# chroot .
```

# *重新生成initramfs

要重新生成initramfs，只需要执行以下几条指令：

```bash
$ KERNEL_VERSION=$(rpm -q kernel --qf '%{version}-%{release}.%{arch}\n')
$ cp /boot/initramfs-${KERNEL_VERSION}.img /boot/initramfs-${KERNEL_VERSION}.bak.$(date +%m-%d-%H%M%S).img
$ /sbin/dracut -f /boot/initramfs-${KERNEL_VERSION}.img ${KERNEL_VERSION}
```

我们可以在ks.cfg中这么写：

```
%post --log=/var/log/ks_post.log
    KERNEL_VERSION=$(rpm -q kernel --qf '%{version}-%{release}.%{arch}\n')
    cp /boot/initramfs-${KERNEL_VERSION}.img /boot/initramfs-${KERNEL_VERSION}.bak.$(date +%m-%d-%H%M%S).img
    /sbin/dracut -f /boot/initramfs-${KERNEL_VERSION}.img ${KERNEL_VERSION}
%end
```

# Reference

CentOS install guide: https://docs.centos.org/en-US/centos/install-guide/Kickstart2/

Red Hat How to: https://access.redhat.com/solutions/5498341
