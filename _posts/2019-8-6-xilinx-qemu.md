---
layout: post
title:  "xilinx qemu"
subtitle: ""
date:   2019-8-6 10:23:45 +0800
updated: 2019-8-8 12:24:55 +0800
tags:
  - xilinx
  - qemu
categories: [QEMU]
comment: true
---
 本文描述如何在 QEMU 中启动 xilinx 设备，并启动 xilinx 官方提供的系统镜像

 <!-- more -->


## 1. xilinx 是什么

## 2. xilinx QEMU 编译部署

从 github 下载 Xilinx qemu 源码：

```shell
$ git clone git://github.com/Xilinx/qemu.git
$ cd qemu
```

安装依赖：

```shell
$ sudo apt install libglib2.0-dev libgcrypt20-dev zlib1g-dev autoconf automake libtool bison flex libpixman-1-dev libsd1.2-dev
```

创建`compile/build`、`compile/install`目录，在`compile/build`下创建 build.sh 编译脚本：

```plain
../../configure --prefix="/qemu/compile/install" --target-list="aarch64-softmmu,microblazeel-softmmu" --enable-fdt --disable-kvm --disable-xen

make -j4 install
```

运行脚本，若出现报错：

```plain
warning: cannot parse SRV response: Message too long
```

则可能是 submodule 获取路径错误，修改`./git/config`或.gitsubmodules 如下：

```plain
[core]
        repositoryformatversion = 0
        filemode = true
        bare = false
        logallrefupdates = true
[remote "origin"]
        url = https://github.com/Xilinx/qemu.git
        fetch = +refs/heads/*:refs/remotes/origin/*
[branch "master"]
        remote = origin
        merge = refs/heads/master
[branch "branch/xilinx-v2019.1"]
        remote = origin
        merge = refs/heads/branch/xilinx-v2019.1
[submodule "dtc"]
        url = https://github.com/qemu/dtc.git
[submodule "capstone"]
        url = https://github.com/qemu/capstone.git
[submodule "ui/keycodemapdb"]
        url = https://github.com/qemu/keycodemapdb.git
```

再次运行编译脚本。更多 git submodule 的信息可参考[Git-工具-子模块](https://git-scm.com/book/zh/v1/Git-工具-子模块)。

使用 help 命令查看 machine 支持

```shell
$ ./qemu-system-aarch64 -M help | grep arm-generic-fdt-plnx
arm-generic-fdt-plnx Deprecated ARM device tree driven machine for the Zynq-7000
$ ./qemu-system-microblazeel -M help | grep microblaze-fdt-plnx
microblaze-fdt-plnx  Microblaze device tree driven machine model for PetaLinux
```



## 3. 运行官方提供的镜像

```shell
$ ./aarch64-softmmu/qemu-system-aarch64 \
    -M arm-generic-fdt-7series -machine linux=on \
    -serial /dev/null -serial mon:stdio -display none \
    -kernel <path>/uImage -dtb <path>/devicetree.dtb --initrd <path>/uramdisk.image.gz
```

```shell

$ ./aarch64-softmmu/qemu-system-aarch64 \
    -M arm-generic-fdt-7series -machine linux=on \
    -serial /dev/null -serial mon:stdio -display none \
    -kernel <path>/image.elf -dtb <path>/system.dtb
```

示例中的镜像可在[http://www.wiki.xilinx.com/Zynq+Releases](https://xilinx-wiki.atlassian.net/wiki/display/A/Zynq+Releases)找到。

## 4.文件传输

1. 使用 dd 创建一个文件，作为虚拟机和宿主机之间传输桥梁
 dd if=/dev/zero of=/opt/share.img bs=1M count=200
2. 格式化 share.img 文件
    mkfs.ext4 /opt/share.img
3. 在宿主机上创建一个文件夹，
   mkdir /tmp/share
   mount -o loop /opt/share.img /tmp/share
这样，在宿主机上把需要传输给虚拟机的文件放到/tmp/share 下即可。
4. 启动 qemu-kvm 虚拟机，添加上/opt/share.img 文件。
5. 在虚拟机中 mount 上添加的一块硬盘。即可以获得宿主机上放在/tmp/share 文件夹下的文件