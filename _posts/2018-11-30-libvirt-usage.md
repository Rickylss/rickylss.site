---
layout: post
title:  "初识 libvirt"
subtitle: ""
date:   2018-11-30 14:12:33 +0800
tags:
  - libvirt
categories: [libvirt]
---

 想要学习 libvirt，首先要学习如何使用 libvirt。具体的使用方式在官网可以查询到完整的资料，因此本文不会对此进行详细的讲解，本文目的是让读者快速地、低成本地学会 libvirt 的基本使用并学会如何查询相应资料。

## libvirt 是什么

**官方文档上对[libvirt](https://libvirt.org/)的描述：**

The libvirt project:

- is a toolkit to manage [virtualization platforms](https://libvirt.org/platforms.html)
- is accessible from C, Python, Perl, Java and more
- is licensed under open source licenses
- supports [KVM](https://libvirt.org/drvqemu.html), [QEMU](https://libvirt.org/drvqemu.html), [Xen](https://libvirt.org/drvxen.html), [Virtuozzo](https://libvirt.org/drvvirtuozzo.html), [VMWare ESX](https://libvirt.org/drvesx.html),[LXC](https://libvirt.org/drvlxc.html), [BHyve](https://libvirt.org/drvbhyve.html) and [more](https://libvirt.org/drivers.html)
- targets Linux, FreeBSD, [Windows](https://libvirt.org/windows.html) and OS-X
- is used by many [applications](https://libvirt.org/apps.html)

**wikipedia 对[libvirt](https://en.wikipedia.org/wiki/Libvirt)的描述：**

*libvirt is a [C](https://en.wikipedia.org/wiki/C_(programming_language)) library with bindings in other languages, notably in [Python](https://en.wikipedia.org/wiki/Python_(programming_language)),[Perl](https://en.wikipedia.org/wiki/Perl), [OCaml](https://en.wikipedia.org/wiki/OCaml),[Ruby](https://en.wikipedia.org/wiki/Ruby_(programming_language)),[Java](https://en.wikipedia.org/wiki/Java_(programming_language)),[JavaScript](https://en.wikipedia.org/wiki/JavaScript) (via [Node.js](https://en.wikipedia.org/wiki/Node.js))and [PHP](https://en.wikipedia.org/wiki/PHP).libvirt for these programming languages is composed of wrappers around another class/package called **libvirtmod**. libvirtmod's implementation is closely associated with its counterpart in C/C++ in syntax and functionality.*

**libvirt 在虚拟化中的位置：**

![libvirt](\pictures\use-libvirt1.png)

简而言之，libvirt 就是一个中间件，屏蔽了底层不同 hypervisor 的区别，向上层提供统一的管理接口。

## 第一件事

> 安装好 libvirt 之后，想要使用它，要做的第一件事是什么？

​	如果你曾接触过 libvirt，你也许会认为要使用 libvirt 首先要开启 libvirtd 服务。但事实上这不是必要的。要使用 libvirt 首先要做的第一件事是连接（Connection）一个[hypervisor](https://zh.wikipedia.org/zh-hans/Hypervisor)。

### virsh CLI

​	virsh 是 libvirt 项目中内建的一个 CLI（command line interface）工具，通过它可以调用 libvirt 的 API，它是最纯净的一个基于 libvirt 的虚拟资源管理器，它的命令和 libvirtAPI 基本上是一一对应的，我推荐使用它来学习研究 libvirt。

使用[virsh](https://libvirt.org/virshcmdref.html)调用 libvirtAPI：

``` shell
# virsh
Welcome to virsh, the virtualization interactive terminal.

Type:  'help' for help with commands
       'quit' to quit

virsh # uri
error: failed to connect to the hypervisor
error: Failed to connect socket to '/var/run/libvirt/libvirt-sock': No such file or directory
```

​	若未开启 libvirtd 服务，会报一个`failed  to connect to the hypervisor`的错误，在本文后续章节中将会进行解释。下面开启`libvirtd`再进入 virsh。

``` shell
# systemctl start libvirtd
# virsh
Welcome to virsh, the virtualization interactive terminal.

Type:  'help' for help with commands
       'quit' to quit

virsh # uri
qemu:///system

virsh # version
Compiled against library: libvirt 4.5.0
Using library: libvirt 4.5.0
Using API: QEMU 4.5.0
Running hypervisor: QEMU 2.11.2

virsh # 

```

### URI

​	virsh 终端一进去就会自动连接到`qemu:///system`，这是由于在 libvirt 中将这个 uri 设置成了默认的连接(connection)。我们可以在`/etc/libvirt/libvirt.conf`中修改默认的连接。

```plain
# cat /etc/libvirt/libvirt.conf
#
# This can be used to setup URI aliases for frequently
# used connection URIs. Aliases may contain only the
# characters  a-Z, 0-9, _, -.
#
# Following the '=' may be any valid libvirt connection
# URI, including arbitrary parameters

#uri_aliases = [
#  "hail=qemu+ssh://root@hail.cloud.example.com/system",
#  "sleet=qemu+ssh://root@sleet.cloud.example.com/system",
#]

#
# These can be used in cases when no URI is supplied by the application
# (@uri_default also prevents probing of the hypervisor driver).
#
#uri_default = "qemu:///system"
```

​	在 libvirt 中 uri 的意义是什么。uri 指定了 libvirt 想要连接的 hypervisor 具体位置及类型信息。结构及意义如下：

```plain
driver[+transport]://[username@][hostname][:port]/[path][?extraparameters]
```

| Component       | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| driver          | The name of the libvirt hypervisor driver to connect to. This is the same as that used in a local URI. Some examples are `xen`, `qemu`, `lxc`, `openvz`, and `test`. As a special case, the psuedo driver name `remote` can be used, which will cause the remote daemon to probe for an active hypervisor and pick one to use. As a general rule if the application knows what hypervisor it wants, it should always specify the explicit driver name and not rely on automatic probing. |
| transport       | The name of one of the data transports described earlier in this section. Possible values include `tls`, `tcp`, `unix`, `ssh`and `ext`. If omitted, it will default to `tls` if a hostname is provided, or `unix` if no hostname is provided. |
| username        | When using the SSH data transport this allows choice of a username that differs from the client's current login name. |
| hostname        | The fully qualified hostname of the remote machine. If using TLS with x509 certificates, or SASL with the GSSAPI/Keberos plug-in, it is critical that this hostname match the hostname used in the server's x509 certificates / Kerberos principle. Mis-matched hostnames will guarantee authentication failures. |
| port            | Rarely needed, unless SSH or libvirtd has been configured to run on a non-standard TCP port. Defaults to `22` for the SSH data transport, `16509` for the TCP data transport and`16514` for the TLS data transport. |
| path            | The path should be the same path used for the hypervisor driver's local URIs. For Xen, this is always just `/`, while for QEMU this would be `/system`. |
| extraparameters | The URI query parameters provide the mean to fine tune some aspects of the remote connection, and are discussed in depth in the next section. |

例如`uri：qemu+tcp://127.0.0.1/system`，即代表通过 tcp 连接本地 libvirtd。更多相关的信息可以参考[官方文档](https://libvirt.org/docs/libvirt-appdev-guide/en-US/html/Application_Development_Guide-Architecture-Remote_URIs.html)。

### 连接一个 hypervisor

​	现在我们可以来连接一个 hypervisor，同时来解释为什么 libvirtd 服务不是必要的，同样，不开启 libvirtd，进入 virsh 终端：

``` shell
virsh # connect test:///default

virsh # uri
test:///default

virsh #
```

​	test 是一个测试用的 hypervisor，并没有实际的作用，只是用来测试接口。为什么可以不开启 libvirtd 守护进程，就涉及到 libvirt 的两种 HypervisorDriver。
![libvirt连接方式](\pictures\libvirt-daemon-arch.png)

​	只有当需要连接到远程（remote）的 hypervisor 才需要连接 libvirtd，而部分本地的 Driver 是不需要远程连接的（上图有部分错误，qemu 是必须远程连接的）。详情见代码。

### libvirt 的结构

​	 libvirt 是标准的 linux 系统编程，它主要是使用 C 语言编写成的，是模块化编程。以简单的 vmware 为例：
​    **TODO**

## 配置文件与日志

​	配置文件与日志主要影响 libvirtd，这些文件和日志都是在 libvirtd 初始化的时候被获取的。
   **TODO**

