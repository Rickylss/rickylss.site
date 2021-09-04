---
layout: post
title:  "Centos7 内核构建"
subtitle: ""
date:   2020-5-20 13:13:45 +0800
tags:
  - kernel
categories: [OS]
comment: true
---

> 因为工作需求，要修改一下 Centos7 的内核，然后替换原有的内核。因为 Centos7 采用 rpm 包进行管理，因此内核源码也采用这种方式获取，并且编译后的内核也可以打成 rpm 包发布。注：本文参考[wiki.centos](https://wiki.centos.org/HowTos/Custom_Kernel)中构建内核相关的步骤。

# 1、获取 src.rpm

官方不建议使用 root 用户构建内核，同时初学者也应该避免使用 root 用户。

1. 创建内核构建工作目录

   ```bash
   $ mkdir -p ~/rpmbuild/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS}
   $ echo '%_topdir %(echo $HOME)/rpmbuild' > ~/.rpmmacros
   ```

2. 安装编译工具

   ```bash
   $ yum install asciidoc audit-libs-devel bash binutils binutils-devel bison bzip2 diffutils elfutils-devel
   $ yum install elfutils-libelf-devel findutils flex gawk gcc gnupg gzip hmaccalc m4 make module-init-tools
   $ yum install net-tools newt-devel patch patchutils perl perl-ExtUtils-Embed python python-devel
   $ yum install redhat-rpm-config rpm-build sh-utils tar xmlto zlib-devel
   ```

3. 下载`kernel-x.xx-yy.el7.src.rpm`源码包，并安装（解压到工作目录）

   ```bash
   $ rpm -i https://mirror.tuna.tsinghua.edu.cn/centos-vault/7.6.1810/updates/Source/SPackages/kernel-3.10.0-957.5.1.el7.src.rpm 2>&1 | grep -v exist
   ```

   由于国外源仓库比较慢，我改用了清华的源。

4. 使用`rpmbuild -bp`解压出源码

   ```bash
   $ cd ~/rpmbuild/SPECS
   $ rpmbuild -bp --target=$(uname -m) kernel.spec
   ```

# 2、打个 patch

我们使用`diff`命令为想要做的修改打个 patch，在这里我们修改了`net/bridge/br_private.h`文件中的一个宏。

1. 复制想要修改的文件，并修改该文件

   ```bash
   $ cp a/net/bridge/br_private.h b/net/bridge/br_private.h
   $ vim b/net/bridge/br_private.h  #修改文件
   ```

   注意：这里的`a`和`b`目录为内核源码根目录，在使用 patch 时，这两个目录一般用 ab 表示。

2. 打个 patch，将 patch 添加到`SOURCE`下

   ```bash
   $ diff -Naur a/ b/ > br_private.patch
   $ mv br_private.patch ~/rpmbuild/SOURCE
   ```

3. 备份一下`.spec`文件，添加 patch 文件

   ```bash
   $ cd ~/rpmbuild/SPECS
   $ cp kernel.spec kernel.spec.distro
   $ vi kernel.spec
   ```

   修改`%define buildid .your_identifier`一行；

   找到`#empty final patch to facilitate testing of kernel patches`，在下面添加你要的 patch：

   ```plain
   Patch40000: br_private.patch
   ```

   找到`ApplyOptionalPatch linux-kernel-test.patch`，在相应的位置添加你的 patch：

   ```plain
   ApplyOptionalPatch br_private.patch
   ```

# 3、创建构建配置文件

将本机当前的 kernel 配置文件复制出来，在此基础上进行修改；

1. 复制`.config`文件

   ```bash
   $ cd ~/rpmbuild/BUILD/kernel-*/linux-*/
   $ cp configs/kernel-3.10.0-`uname -m`.config .config
   ```

2. 指定硬件平台

   ```bash
   $ vim .config
   ```

   在文件头部添加

   ```plain
   # x86_64
   ```

3. 将`.config`文件拷贝到`SOURCE`目录下

   ```bash
   $ cp .config configs/kernel-3.10.0-`uname -m`.config
   $ cp configs/* ~/rpmbuild/SOURCES/
   ```


# 4、构建新内核

```bash
$ rpmbuild -bb --target=`uname -m` kernel.spec 2> build-err.log | tee build-out.log
```

接下来你就可以在`~/rpmbuild/RPMS/`目录下找到你的安装包了。

```bash
$ rpm -Uvh *.rpm
```

