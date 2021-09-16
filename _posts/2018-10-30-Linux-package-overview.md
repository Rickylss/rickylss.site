---
layout: post
title:  "Debain 包概述"
subtitle: ""
date:   2018-10-30 15:18:40 +0800
tags:
  - debain
categories: [Linux]
---

 读者需要对 rpm 包管理体系和 deb 包管理体系有一定的了解，并且了解类 unix 系统下源码安装软件的操作过程及其工作流程，最好能够对 autotools 工具有一定的了解。

 <!-- more -->

## 软件打包思路

1. 软件包安装与原始的源码编译安装的区别

   源码编译安装需要源码，在当前的操作系统中使用 autotools 等编译工具，将源码编译成二进制，再进行安装操作。对应到命令行操作就是

   ``` shell
   $ ./auogen.sh --system(或者./config)
   $ make
   $ make install
   ```

   然而软件包安装不需要源码，而且你也无法从软件包中解压出源码（源码包除外），软件包中保存的都是二进制文件。安装一个软件包的操作

   ``` shell
   $ dpkg -i xxxx.deb
   $ rpm -i xxxx.rpm
   ```

2. 软件包安装时要做的事情

   由 1 中可以看出，软件包的安装对应到源码安装就是完成（make install）这一步骤，但又略有不同。

   在制作安装包的时候，打包工具创建了一个虚拟的根文件系统，将源码编译安装到这个虚拟文件系统中，这其中就涉及到安装位置的设置、目录创建、相关文件拷贝、数据库初始化、文件注册等。在**完成这一步之后，你就在一个虚拟的文件系统中安装好了这个软件，之后要做的事情就是把这个文件系统包起来，安装时再解压出去到真实的文件系统中** 。

   还有一个要点，就是依赖问题，当你将这个包安装到其他主机上时，若只将二进制文件与配置文件解压到真实根文件系统，而没有解决依赖问题，那也是无法正常运行的。**因此，在安装包之前，还要需要一个检查依赖的步骤，删除包时也同样需要一个删除的相关规则** 。这一点在 rpm 的 spec 文件与 debian 的 rules 文件中体现的尤为明显。

## 打包工具

deb 有非常多的打包工具，在这里我们使用 debhelper 和 dh-make 当然新的 debmake 也是不错的选择，debmake 有详细的介绍文档。

## 从源码打包或修改包

### 修改包

1. 一般来说如果是修改某个包的某些功能，可以下载对应的源码包，在 rpm 体系下是以.src.rpm 为后缀的包，在 deb 体系下就是三个文件：`package_version-revision.dsc` `package_version.orig.tar.gz` `package_version-revision.debian.tar.gz`。
2. package.src.rpm 可以直接安装，但 deb 体系的三个文件不可直接安装，仍需要下载.deb 包。
3. deb 体系下三个文件：.dsc 是一个描述文件；orig 是源码文件；debian 是打包配置脚本文件。

``` shell
$ dpkg-buildpakage -b
```



### 源码打包

从源码（在 debain 中又叫上游软件）打包，则需要自己编写.spec 文件或者是 debian 化（将在后文介绍）并修改脚本。

``` shell
$ dpkg-buildpakage --fakeroot
```

