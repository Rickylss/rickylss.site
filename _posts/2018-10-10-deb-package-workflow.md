---
layout: post
title:  "deb打包工作流"
subtitle: ""
date:   2018-10-10 14:15:38 +0800
categories: [debain]
---

> 本文介绍从源码打包deb的主要流程，对debain文件夹内容的配置细节不做深究，只对规则做介绍。

## 依然是HelloWorld

我们创建一个简单的helloworld程序来做打包，简化细枝末节，突出主流程。

``` shell
# mkdir -p hello-sh/hello-sh-1.0
# cd hello-sh/hello-sh-1.0
# cat > hello <<EOF
#!/bin/sh
# (C) 2018 Foo Bar, GPL2+
echo "HELLO!"
EOF
# chmod 775 hello
# cd ..
# tar -cvzf hello-sh-1.0.tar.gz hello-sh-1.0
```

假装我们下载了一个helloworld程序源码包，现在开始将它打包。

## 鼎鼎大名

在对程序进行打包之前，我们先设置两个环境变量，这两个环境变量可以让大多数Debian维护工具（前面说过，debian有很多维护工具）正确识别你用于维护该软件包的姓名与电子邮件地址

``` shell
# cat >> ~/.bashrc <<EOF
DEBEMAIL="your.email.address@example.org"
DEBFULLNAME="Firstname Lastname"
export DEBEMAIL DEBFULLNAME
EOF
# source ~/.bashrc
```

## 初始化Debian软件包

当你想要使用源码创建一个debian软件包，你可以在它的基础上对它进行初始化（如果是已有的deb包，则不需要初始化，可以下载对应的三个文件）：

``` shell
# cd ~/hello-sh
# cd hello-sh-1.0
# dh_make -f ../hello-sh-1.0.tar.gz
```

接下来会询问你想要创建什么类型的软件包，这里有四种类型：

我们选择创建一个单一二进制包，即单个.deb文件，执行dh_make之后，上级目录中自动创建了一份上游tarball副本，名为hello-sh_1.0.orig.tar.gz，这个文件与稍后要介绍的debian.tar.gz合在一起便满足了一部分Debian非本土源码包的要求。

**同时，当前目录下创建了一个debian目录** ，这个目录下已经有了许多模板，在后续的文章中将加以说明。

## Debian目录下有什么

> 在程序源代码目录下有一个叫做 `debian` 的新的子目录。这个目录中存放着许多文件，我们将要修改这些文件来定制软件包行为。其中最重要的文件当属 `control`, `changelog`,`copyright`, 以及 `rules`, 所有的软件包都必须有这几个文件。

### control

该文件中包含了很多供包管理工具进行管理时所使用的许多变量。dh_make将会为源码创建一个默认的模板，具体的control内容解析可参考官方文档。

### copyright

这个文件包含了上游软件（源码）的版权以及许可证信息。dh_make为其提供了一个copyright文件模板，可使用--copyright参数来进行修改。或者你也可以直接将其指向/usr/share/common-licenses/目录下的文件，这个目录保存了多种许可文件，否则，你需要将完整的许可证文本放入其中。

### changelog

这是一个必须有的文件，文件保存了你所做的更改详细信息，它将帮助下载你的软件包的人了解该软件包。同样的dh_make将创建一个默认的文件。

### rules

rules文件是dpkg-buildpackage(后文将提及)需要使用的实际创建软件包的脚本，该文件可理解为另一个Makefile文件，但不同于上游代码中的那个。该文件需要被标记为可执行。

1. rules文件中的Target

   每个rules文件中都包含了若干的规则（rules），如同Makefile中一样，对于每个规则都定义了一个target及具体操作，新的rule以自己的target声明开头，该rule中后续的每行都以TAB字符开头，以指示target的具体行为。空行和#号开头的行都将视为注释忽略。

   当你想要执行一个rule时，就将target作为命令行参数调用。如，debian/rules build以及fakeroot make -f debian/rules binary将分别执行build和binary两个target。**该使用方法与Makefile相似。** 

2. 默认的rules文件

   新版本的dh_make会生成一个使用dh命令的非常简单但强大的默认的rules文件：

   ``` shell
    1 #!/usr/bin/make -f
    2 # See debhelper(7) (uncomment to enable)
    3 # output every command that modifies files on the build system.
    4 #DH_VERBOSE = 1
    5 
    6 # see FEATURE AREAS in dpkg-buildflags(1)
    7 #export DEB_BUILD_MAINT_OPTIONS = hardening=+all
    8
    9 # see ENVIRONMENT in dpkg-buildflags(1)
   10 # package maintainers to append CFLAGS
   11 #export DEB_CFLAGS_MAINT_APPEND  = -Wall -pedantic
   12 # package maintainers to append LDFLAGS
   13 #export DEB_LDFLAGS_MAINT_APPEND = -Wl,--as-needed
   14 
   15
   16 %:
   17         dh $@ 
   ```

   第一行告诉操作系统这个文件使用/usr/bin/make处理，取消第四行的注释，设置DH_VERBOSE变量为1，dh命令将输出它要使用的dh_*命令。这将帮助你理解这个rules文件背后做了什么，同时帮助你调试。

   第16和17行使用了pattern rule，百分号意味着“任何target”，它会以 target 名称作参数调用单个程序 **dh**。**dh** 命令是一个包装脚本，它会根据参数执行妥当的 **dh_\*** 程序序列。

   - `debian/rules clean` 运行了 `dh clean`，接下来实际执行的命令为：

     ```
     dh_testdir
     dh_auto_clean
     dh_clean
     ```

   - `debian/rules build` 运行了 `dh build`，其实际执行的命令为：

     ```
     dh_testdir
     dh_auto_configure
     dh_auto_build
     dh_auto_test
     ```

   - `fakeroot debian/rules binary` 执行了 `fakeroot dh binary`，其实际执行的命令为：

     ```
     dh_testroot
     dh_prep
     dh_installdirs
     dh_auto_install
     dh_install
     dh_installdocs
     dh_installchangelogs
     dh_installexamples
     dh_installman
     dh_installcatalogs
     dh_installcron
     dh_installdebconf
     dh_installemacsen
     dh_installifupdown
     dh_installinfo
     dh_installinit
     dh_installmenu
     dh_installmime
     dh_installmodules
     dh_installlogcheck
     dh_installlogrotate
     dh_installpam
     dh_installppp
     dh_installudev
     dh_installwm
     dh_installxfonts
     dh_bugfiles
     dh_lintian
     dh_gconf
     dh_icons
     dh_perl
     dh_usrlocal
     dh_link
     dh_compress
     dh_fixperms
     dh_strip
     dh_makeshlibs
     dh_shlibdeps
     dh_installdeb
     dh_gencontrol
     dh_md5sums
     dh_builddeb
     ```

## debian目录下还有什么

## dpkg-buildpackage

``` shell
# dpkg-buildpackage -rfakeroot
```

运行dpkg-buildpackage命令生产deb安装包。

这样会自动完成所有从源代码包构建二进制包的工作，包括：

- 清理源代码树(`debian/rules clean`)
- 构建源代码包(`dpkg-source -b`)
- 构建程序(`debian/rules build`)
- 构建二进制包(`fakeroot debian/rules binary`)
- 制作 `.dsc` 文件
- 用 **dpkg-genchanges** 命令制作 `.changes` 文件。

如果构建结果令人满意，那就用 **debsign** 命令以你的私有 GPG 密钥签署 `.dsc` 文件和 `.changes` 文件。你需要输入密码两次。

## 生成了什么

对于非本土 Debian 软件包，比如 hello-sh， 构建软件包之后，你将会在上一级目录(`~/hello-sh) 中看到下列文件：

- `hello-sh_1.0-1.orig.tar.gz`

  这是原始的源代码 tarball，最初由 `dh_make -f ../gentoo-0.9.12.tar.gz` 命令创建，它的内容与上游 tarball 相同，仅被重命名以符合 Debian 的标准。

- hello-sh_1.0-1.dsc

  这是一个从 `control` 文件生成的源代码概要，可被 dpkg-source(1) 程序解包。

- hello-sh_1.0-1.debian.tar.gz

  这个压缩的 Tar 归档包含你的 `debian` 目录内容。其他所有对于源代码的修改都由**quilt** 补丁存储于 `debian/patches` 中。

  如果其他人想要重新构建你的软件包，他们可以使用以上三个文件很容易地完成。只需复制三个文件，再运行 `dpkg-source -x gentoo_0.9.12-1.dsc`。

- hello-sh_1.0-1_all.deb

  这是你的二进制包，可以使用 **dpkg** 程序安装或卸载它，就像其他软件包一样。

- hello-sh_1.0-1_amd64.changes

  这个文件描述了当前修订版本软件包中的全部变更，它被 Debian FTP 仓库维护程序用于安装二进制和源代码包。它是部分从 `changelog` 和 `.dsc` 文件生成的。