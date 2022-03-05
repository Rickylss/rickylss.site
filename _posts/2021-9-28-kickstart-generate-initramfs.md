---
layout: post
title:  "在 kickstart %post 阶段生成 initramfs"
subtitle: ""
date:   2021-9-28 15:20:45 +0800
tags:
  - ZStack
categories: [ZStack, Linux]
comment: true
---

# kickstart %pre %post 阶段

在 kickstart 中我们可以通过%pre 和%post 标签添加 pre-installation 脚本和 post-installation 脚本，顾名思义，这两个脚本分别作用在：

- %pre，在系统安装开始之前，kickstart 文件解析之后立即运行；
- %post，在系统完成安装之后运行；

并且%post 默认在 chroot 环境下运行，而%pre 不在 chroot 下运行，这一点在后文调试中会解释。

<!-- more -->

# 调试 iso 安装过程

调试 iso 安装过程，首先选 iso 启动，进到安装界面，你可以选 text mode（不带 UI 的字符安装界面）或者带 UI 的界面。

![image-20210128121159661](/pictures/image-20210128121159661.png)

按下`Alt+F2`切换到 shell。

![image-20210128121229975](//pictures/image-20210128121229975.png)

进入了可以看到以 anaconda 开头的 shell 环境，现在看到的这个就是**安装系统用的系统**，这个系统非常简洁，只支持很少的与系统安装相关的一些命令，可以通过`help`命令查看。

安装系统到硬盘的操作就是在这个环境下执行。首先会执行%pre，之后将你选择的硬盘（如/dev/vda）挂载到`/mnt/sysimage`目录下，并且将系统和 rpm 包安装到该目录下：

![image-20210128122224980](/pictures/image-20210128122224980.png)

这个时候切换到 shell 环境可以看到安装硬盘已经被分区并挂载到`/mnt/sysimage`目录下了。

![image-20210128122745534](/pictures/image-20210128122745534.png)

再切回 main，等待 rpm 安装完成，

![image-20210128122921882](/pictures/image-20210128122921882.png)

可以看到在 generating initramfs 之后才真正执行%post

而执行%post，是在 chroot 环境下，等同于：

```bash
# 在 shell tab 下
[anaconda root@localhost /]# cd /mnt/sysimage
[anaconda root@localhost sysimage]# chroot .
```

# *重新生成 initramfs

要重新生成 initramfs，只需要执行以下几条指令：

```bash
$ KERNEL_VERSION=$(rpm -q kernel --qf '%{version}-%{release}.%{arch}\n')
$ cp /boot/initramfs-${KERNEL_VERSION}.img /boot/initramfs-${KERNEL_VERSION}.bak.$(date +%m-%d-%H%M%S).img
$ /sbin/dracut -f /boot/initramfs-${KERNEL_VERSION}.img ${KERNEL_VERSION}
```

我们可以在 ks.cfg 中这么写：

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


