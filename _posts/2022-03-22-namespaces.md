---
layout: post
title:  "namespaces"
subtitle: ""
date:   2022-03-22 12:52:45 +0800
tags:
  - container
  - namespace
categories: [container]
comment: true
---

# 什么是 namespaces

引用一段来自 [wiki](https://en.wikipedia.org/wiki/Linux_namespaces) 的定义：

> *“Namespaces are a feature of the Linux kernel that partitions kernel resources such that one set of processes sees one set of resources while another set of processes sees a different set of resources.”*

简而言之，`namespaces` 的主要特性就是用来隔离进程资源。当你在一个服务器上跑了许多服务的时候，隔离不同的服务能将发生事故的影响范围控制到最小，并且提高安全性（恶意程序无法探测到其他进程）。隔离服务恰好也契合微服务的架构观念。

<!-- more -->

# namespaces 的类型

Linux 内核支持多种 namespaces，每种 namespace 都有它自己独特的属性：

- `user namespace`：它拥有自己的一套用户 ID 和组 ID，可注册到进程中。具体地来说，就是在这个 namespace 里的进程可以拥有 root 权限，并且在其他的 namespace 中不可见；
- `pid namespace`：注册一组 PID 到进程中，和其他 namespace 中的 PID 独立。新的 namespace 中的第一个进程为 PID 1，子进程将按需分配后续的 PID。如果一个子进程在它自己的 `pid namespace` 中创建，那么它就是 PID 1；
- `network namespace`：拥有单独的网络协议栈，单独的路由表，IP 地址，端口监听，connection tracking 表，防火墙及其他的网络相关的资源；
- `mount namespace`：拥有单独的挂载点，自在当前 namespace 下可见。这意味着可以在不影响主文件系统的情况下挂载或卸载文件系统；
- `ipc namespace`：拥有独立的 IPC 资源，例如：[POSIX message queues](https://man7.org/linux/man-pages/man7/mq_overview.7.html)；
- `uts namespace`：允许向不同的进程展现出不同的 host / domain name；
- `cgroup`：

# unshare & lsns

通过 `unshare` 工具我们可以为程序指定想要使用的 namespace。

```bash
$ unshare --help

用法：
 unshare [options] <program> [<argument>...]

Run a program with some namespaces unshared from the parent.

选项：
 -m, --mount               unshare mounts namespace
 -u, --uts                 unshare UTS namespace (hostname etc)
 -i, --ipc                 unshare System V IPC namespace
 -n, --net                 unshare network namespace
 -p, --pid                 unshare pid namespace
 -U, --user                unshare user namespace
 -f, --fork                fork before launching <program>
     --mount-proc[=<dir>]  mount proc filesystem first (implies --mount)
 -r, --map-root-user       map current user to root (implies --user)
     --propagation <slave|shared|private|unchanged>
                           modify mount propagation in mount namespace
 -s, --setgroups allow|deny  control the setgroups syscall in user namespaces

 -h, --help     显示此帮助并退出
 -V, --version  输出版本信息并退出

更多信息请参阅 unshare(1)。
```

`unshare` 意为不分享，用法也很简单，只要在想要运行的程序之前指定不同的 namespace 就可以了。

# 如何查看进程相关 namespace

在每个进程的 `/proc/[pid]/` 下都会有一个 `ns` 文件夹，文件夹下有各 `namespace` 的编号：

```bash 
$ ll /proc/$$/ns                                      16:31:43
总用量 0
dr-x--x--x 2 rickylss rickylss 0  3月 22 16:31 ./
dr-xr-xr-x 9 rickylss rickylss 0  3月 22 16:26 ../
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 cgroup -> 'cgroup:[4026531835]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 ipc -> 'ipc:[4026531839]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 mnt -> 'mnt:[4026531840]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 net -> 'net:[4026532008]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 pid -> 'pid:[4026531836]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 pid_for_children -> 'pid:[4026531836]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 time -> 'time:[4026531834]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 time_for_children -> 'time:[4026531834]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 user -> 'user:[4026531837]'
lrwxrwxrwx 1 rickylss rickylss 0  3月 22 16:31 uts -> 'uts:[4026531838]'
```

可以通过这种方式来判断不同进程是否在同一个 `namespace` 下。

## `user namespace` 示例

## `pid namespace` 示例



## `network namespace` 示例

## `mount namespace` 示例

仅使用 `unshare -m`  命令，将从 parent namespace 复制所有的挂载点信息到新的 namespace 中。这也意味着非特权用户是没有权限执行这个命令的，而特权用户执行这个命令之后将会继承对应的 `user namespace`，并复制所有挂载点信息。

```bash 
$ unshare -m                                                         17:03:07
unshare: unshare 失败: 不允许的操作

$ sudo unshare -m                                                    17:03:20
[sudo] rickylss 的密码： 
$ whoami
root
$ ls /
模板  boot   etc   lib32   lost+found  opt   run   spaconfig       sys  var
桌面  cdrom  home  lib64   media       proc  sbin  spa_dateconfig  tmp
bin   dev    lib   libx32  mnt         root  snap  srv             usr
```

> 请注意，如果没有正确的配置好 `mount namespace` 可能会影响到宿主机文件系统。
>
> 即使在 namespace 里是 root 用户，也不能够直接操作宿主机上的文件，因为它继承的是 user 的权限。

那么该怎么正确地配置好 `mount namespace` 呢？或者说如何像容器一样，拥有自己的 rootfs 呢。

```bash 
# 首先用你的 docker export 一个 rootfs 出来
$ sudo docker export $(docker create busybox) | tar -C rootfs -xvf -
$ ls rootfs
bin  dev  etc  home  old_root  proc  root  sys  tmp  usr  var
# 同时进入 user namespace 和 mount namespace
$ unshare -Urm
# 查看 rootfs 挂载点
$ findmnt | grep mapper
/                                           /dev/mapper/vgubuntu-root ext4          rw,relatime,errors=remount-ro
$ mount --bind rootfs rootfs
$ cd rootfs
$ mkdir old_root
$ pivot_root . old_root
$ PATH=/bin:/sbin:$PATH
$ umount -l /old_root
```



## `ipc namespace` 示例

## `uts namespace` 示例

 
