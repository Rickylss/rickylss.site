---
layout: post
title:  "topsec for ubuntu21/22"
subtitle: ""
date:   2022-03-14 12:52:45 +0800
tags:
  - network
categories: [network]
comment: true
---

我在 19 年尝试完全转到 Linux 环境办公，后来由于部分办公软件支持不好，公司的 VPN 客户端又不支持 Linux 因此几度装回 Windows。最近几年得益于国家的政策支持，很多办公软件都开始支持 Linux 系统了。其中包括公司用的 VPN 客户端，但是因为 Linux 发行版的问题，难免会遇到一些小问题。

<!-- more -->

# Ubuntu 22.04 更新

unbuntu 22.04 下除了需要替换 `libgdk_pixbuf-2.0.so.0` 之外，还需要替换 `libsecret-1.so.0` ，做法和之前一样，将对应的动态链接库拷贝到 `lib` 目录下即可。

解决方法：

1. 下载并[该 so 文件](https://www.aliyundrive.com/s/Li7ZxvkzuQq)，将 `.so` 文件复制到 `/opt/TopSAP/lib` 下；

# TL;DR

ubuntu 21.10 下使用天融信 `TopSAP` 出现 `/opt/TopSAP/TopSAP: symbol lookup error: /lib/x86_64-linux-gnu/libgdk_pixbuf-2.0.so.0: undefined symbol: g_task_set_name` 报错；

解决方法：

1. ~~下载并解压[该 tar 包](http://192.168.200.100/mirror/haibiao.xiao/libgdk_pixbuf.tar.xz)，将 `.so` 文件复制到 `/opt/TopSAP/lib` 下；~~
2. 下载 [`.deb` 包](https://www.aliyundrive.com/s/1AFU4JJ8inm)并重新安装 TopSAP。 

# 分析

公司用的是天融信的 VPN 产品，对应的 VPN 客户端可从[这里](https://app.topsec.com.cn/)下载，目前针对 Linux 支持三种 cpu 架构，下载对应的 tar 包就好了。

下载后解压可以看到两个安装包，一个是 `.deb `一个是 `.rpm` 选择对应的包安装即可：

```bash
$ ls
TopSAP-3.5.2.30.2-x86_64.tar.gz
$ tar xvf TopSAP-3.5.2.30.2-x86_64.tar.gz
$ ls
TopSAP-3.5.2.30.2-x86_64.deb 
TopSAP-3.5.2.30.2.x86_64.rpm 
TopSAP-3.5.2.30.2-x86_64.tar.gz
$ sudo dpkg -i TopSAP-3.5.2.30.2-x86_64.deb
$ cd /opt/TopSAP
$ ls
addtopvpn              libvpn_client-x86_64.so  sv_uninstall.sh  TopSAP.sh     version
lib                    Resources                sv_websrv        topsec.png
libes_3000gm.so.1.0.0  sv_install.sh            TopSAP           topvpn
libgm3000.1.0.so       sv_sever.sh              TopSAP.desktop   TopVPNhelper
```

TopSAP 会安装到  `/opt/TopSAP` 目录下，同时可以看到 TopSAP 应用已经添加。

![image-20220314145325465](https://raw.githubusercontent.com/Rickylss/pics/main/img/image-20220314145325465.png)

如果你使用的 Linux 发行版恰好是 TopSAP 支持的，那么你直接用就没问题了（你应该不会找到这里来 :stuck_out_tongue_winking_eye: ）。

我们到 shell 里运行一下，看会报什么错：

```bash
$ cd /opt/TopSAP
$ ./TopSAP.sh                                                                   
/opt/TopSAP/TopSAP: symbol lookup error: /lib/x86_64-linux-gnu/libgdk_pixbuf-2.0.so.0: undefined symbol: g_task_set_name
```

根据报错的信息，我们知道，问题是在 `/lib/x86_64-linux-gnu/libgdk_pixbuf-2.0.so.0` 这个动态链接库里没有符号 `g_task_set_name` 。由于我用的是最新的 ubuntu 21.10：

```bash
$ cat /etc/os-release
PRETTY_NAME="Ubuntu 21.10"
NAME="Ubuntu"
VERSION_ID="21.10"
VERSION="21.10 (Impish Indri)"
VERSION_CODENAME=impish
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
PRIVACY_POLICY_URL="https://www.ubuntu.com/legal/terms-and-policies/privacy-policy"
UBUNTU_CODENAME=impish
```

可以猜测大概是由于这个动态链接库有一些改动，移除了 `g_task_set_name` 方法。那么我们找个老一点的版本给它换上就好了。

```bash
$ cat TopSAP.desktop
[Desktop Entry]
Encoding=UTF-8
Version=1.0
Name=TopSAP
Exec=/opt/TopSAP/TopSAP.sh # TopSAP 实际使用的启动脚本
Icon=/opt/TopSAP/topsec.png
Terminal=false
Type=Application
Categories=Network;WebBrowser;
$ cat TopSAP.sh
LD_LIBRARY_PATH=/opt/TopSAP/lib GIO_MODULE_DIR=/opt/TopSAP/lib/gio/modules /opt/TopSAP/TopSAP
```

在 `TopSAP.sh` 中指定了首要的动态链接库地址，若指定的路径下没有对应的动态链接库则会从默认的路径下查找

```bash 
$ ls lib
gio              libicui18n.so.50             libpcre.so.1
libcairo.so.2    libicuuc.so.50               libpng15.so.15
libenchant.so.1  libgio-2.0.so.0              libjavascriptcoregtk-3.0.so.0  libpng16.so.16
libffi.so.6      libglib-2.0.so.0             libjpeg.so.62                  libsoup-2.4.so.1
libfribidi.so.0  libgobject-2.0.so.0          libpango-1.0.so.0              libwebkitgtk-3.0.so.0
libgcrypt.so.11  libgtk-3.so.0                libpangocairo-1.0.so.0         libwebp.so.4
libgdk-3.so.0    libicudata.so.50             libpangoft2-1.0.so.0
```

同理，我们把找到的老版本的 `libgdk_pixbuf-2.0.so.0` 放进来就好啦。

老版本的 so 可以通过 docker 建一个 ubuntu 18.04 container 然后从对应的地方拷贝过来改个名字就好了。这里就不展开讲，直接提供[链接下载](http://192.168.200.100/mirror/haibiao.xiao/libgdk_pixbuf.tar.xz)

下载完成之后，将解压出来的两个 so 直接拷贝到 `/opt/TopSAP/lib` 目录下。再次运行。

我已经重新打包了一个 `.deb` 文件，有需要的人可以[直接下载](http://192.168.200.100/mirror/haibiao.xiao/topsap_3.5.2.30.2_amd64.deb)

# 超长的碎碎念

> 随着国际形式的变化和政策上的推动，现在很多国内办公软件都已经开始支持 Linux 系统了。我认为其中做的最好的非 `钉钉` 莫属了，我从很早开始就加入了 Linux 钉钉试用组织，看着钉钉 Linux 版本一步一步地完善，快速地迭代，现在使用起来日常办公完全没有问题，在这里要感谢钉钉技术人员。相比之下 `微信` 就是个垃圾。幸运的是我们公司用的就是钉钉。
>
> 再者， win11 完全抛弃了我的笔记本，`TPM` 不是个可选项。作为一个更新强迫症患者，这真的无法忍受。
>
> 仔细想想，除了打游戏，我在 windows 上要做的事情，现在在 Linux 上做也完全没问题。更何况，`SteamOS` is comming！！！感谢 G 胖。
>

