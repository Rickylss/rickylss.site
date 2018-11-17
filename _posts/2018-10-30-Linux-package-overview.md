---
layout: post
title:  "Debain包概述"
subtitle: ""
date:   2018-10-30 15:18:40 +0800
categories: [debain]
---

# Debain包概述

> 读者需要对rpm包管理体系和deb包管理体系有一定的了解，并且了解类unix系统下源码安装软件的操作过程及其工作流程，最好能够对autotools工具有一定的了解。

## 软件打包思路

1. 软件包安装与原始的源码编译安装的区别

   源码编译安装需要源码，在当前的操作系统中使用autotools等编译工具，将源码编译成二进制，再进行安装操作。对应到命令行操作就是

   ``` 
   # ./auogen.sh --system(或者./config)
   # make
   # make install
   ```

   然而软件包安装不需要源码，而且你也无法从软件包中解压出源码（源码包除外），软件包中保存的都是二进制文件。安装一个软件包的操作

   ``` 
   # dpkg -i xxxx.deb
   # rpm -i xxxx.rpm
   ```

2. 软件包安装时要做的事情

   由1中可以看出，软件包的安装对应到源码安装就是完成（make install）这一步骤，但又略有不同。

   在制作安装包的时候，打包工具创建了一个虚拟的根文件系统，将源码编译安装到这个虚拟文件系统中，这其中就涉及到安装位置的设置、目录创建、相关文件拷贝、数据库初始化、文件注册等。在**完成这一步之后，你就在一个虚拟的文件系统中安装好了这个软件，之后要做的事情就是把这个文件系统包起来，安装时再解压出去到真实的文件系统中** 。

   还有一个要点，就是依赖问题，当你将这个包安装到其他主机上时，若只将二进制文件与配置文件解压到真实根文件系统，而没有解决依赖问题，那也是无法正常运行的。**因此，在安装包之前，还要需要一个检查依赖的步骤，删除包时也同样需要一个删除的相关规则** 。这一点在rpm的spec文件与debian的rules文件中体现的尤为明显。

## 打包工具

deb有非常多的打包工具，在这里我们使用debhelper和dh-make当然新的debmake也是不错的选择，debmake有详细的介绍文档。

## 从源码打包或修改包

### 修改包

1. 一般来说如果是修改某个包的某些功能，可以下载对应的源码包，在rpm体系下是以.src.rpm为后缀的包，在deb体系下就是三个文件：package_version-revision.dsc package_version.orig.tar.gz package_version-revision.debian.tar.gz。
2. package.src.rpm可以直接安装，但deb体系的三个文件不可直接安装，仍需要下载.deb包。
3. deb体系下三个文件：.dsc是一个描述文件，orig是源码文件，debian是打包配置脚本文件。

``` shell
$dpkg-buildpakage -b
```



### 源码打包

从源码（在debain中又叫上游软件）打包，则需要自己编写.spec文件或者是debian化（将在后文介绍）并修改脚本。

``` shell
$dpkg-buildpakage --fakeroot
```

