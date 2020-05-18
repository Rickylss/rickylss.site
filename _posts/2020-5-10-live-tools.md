---
layout: post
title:  "live-build、live-boot和live-config"
subtitle: ""
date:   2020-5-10 19:13:45 +0800
tags:
  - debian
categories: [OS]
comment: true
---

要构建一个live system主要使用到的有三个工具：live-build，live-boot和live-config。这三个工具分别具备不同的职责：

- live-build，是一组用于构建live system的脚本的集合。你可以在`/usr/lib/live/build`下找到它们，并在`/usr/share/live/build`下找到这些脚本使用的functions；
- live-boot，是一组用于为**initramfs-tools**提供钩子的脚本的集合，用于生成一个能够引导live system的initramfs；
- live-config，是一组用于在**live-boot**之后自动配置live system的脚本的集合，它能够处理类似于设置hostname，locales和timezone，创建用户等。

# live-build

live-build的理念是使用一个配置目录来完全自动化和客制化一个live image的各个方面。它和用于构建Debian包的*debhelper*在使用上有很多相似值出：

- 用于配置构建操作的脚本有一个集中的存放位置。在*debhelper*中，这个位置是包构建根目录下的`debian/`子目录。举例来说，dh_install将会查找一个叫`debian/install`的文件，以此来决定将哪些文件放入特定的二进制包中。相似的，*live-build*使用`config/`目录来保存类似的配置信息；
- 各个脚本之间是独立的，也就说单独的运行任何一个脚本命令都是安全的。

和*debhelper*不同的是，*live-build*提供了一个生成配置目录骨架的工具。这个和*dh_make*工具很相似。注意，`lb`是`live-build`命令的包装。

- **lb config**：负责初始化一个live system配置目录；
- **lb build**：负责开始构建一个live system;
- **lb clean**：负责一处live system的构建；

## `lb config`命令

使用`lb config`命令使用默认的配置创建`config/`目录，以及两个目录树`auto/`和`local/`。

```bash
$ lb config
[2015-01-06 19:25:58] lb config
P: Creating config tree for a debian/stretch/i386 system
P: Symlinking hooks...
```

不添加任何选项使用该命令只能够创建一个非常基础的镜像，你也可以后期通过配置`auto/config`来修改某些选项。

通常你可以指定一些选项，例如，指定你想要使用的包管理器：

```bash
$ lb config --apt aptitude
```

你也可以指定更多：

```bash
$ lb config --binary-images netboot --bootappend-live "boot=live components hostname=live-host username=live-user" ...
```

更多的选项可以查看`lb_config`的man page。

## `lb build`命令

`lb build`命令开始构建，它在构建时会读取`config/`下的配置。事实上，`lb build`由多个过程组成，详细的过程步骤可以查看`/usr/lib/live/build/build`脚本，事实上，它会经过：lb bootstrap，lb chroot，lb binary，lb source等阶段，每个阶段由多个过程（脚本）构成。每个阶段将完成不同的构建工作。

## `lb clean`命令

清除chroot，binary和source阶段的构建。但是在bootstrap阶段（因为这个阶段会下载大量的deb包）的cache将会缓存。当然，你也可以清楚单独的某个阶段的构建，例如`lb clean --binary`只清楚binary阶段的构建。如果你的更改影响到了`--mode`，`--architecture`或者`--bootstrap`阶段，你就需要使用`lb clean --purge`来清除。