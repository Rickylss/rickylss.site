---
layout: post
title:  "QEMU monitor 与 QMP"
subtitle: "qemu 控制台"
date:   2019-6-25 16:56:09 +0800
tags:
  - qmp
  - qemu
  - monitor
categories: [QEMU]
---

 由于 QEMU 版本不同可能会导致具体的内容不同，因此本文只介绍 QEMU monitor 和 QMP 的概念与使用，详细的命令建议查阅相应版本的指导手册。

# QEMU monitor

当用户启动一个 QEMU 进程之后，QEMU 进程会为用户提供一个 monitor 用于交互。通过使用一些命令，用户可以监控正在运行的 guestOS，更改可移除的媒体设备和 USB 设备，截图或者捕获音频，甚至控制虚拟机。

## 运行一个板级设备，不对 monitor 做任何设置

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out
```

弹出 monitor：

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor.png"/>

点开 Machine 和 View，可以看到更多选项。当前界面为 compact monitor0 窗口，点击 View 下拉框，可选择 serial0，这里是串口的监控窗口，通过该窗口可查看串口输入输出信息。

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor-serial.png"/>

或者你也可以勾选 show tabs 将所有可查看窗口显示出来。

## 将 monitor 重定向到标准输入输出

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -monitor stdio
```

将 monitor 重定向到标准输入输出后，依旧有 QEMU 弹窗，但是这个弹窗中只有 serial0，而 compact monitor0 窗口重定向到当前的命令行窗口下了。(如果想要去除 QEMU 弹窗，可以添加参数-vnc :53，这样弹窗会被转到 vnc 的 53 端口，使用工具连接时需要 5900+53 端口)

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor-stdio.png"/>

## 将 monitor 重定向到网络设备

按照前面的思路同样可以将 monitor 重定向到 telnet 中

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -monitor telnet:localhost:9000,server
```

## QEMU monitor 命令

使用 QEMU monitor 的目的是为了在 VM 运行后控制 VM，控制 VM 的命令有许多，同样也有很多快捷键，在 monitor 界面使用 help 命令就可以查看了。同时[WIKIBOOKS](https://en.wikibooks.org/wiki/QEMU/Monitor)中也有详细的解析，我就不复制粘贴，制造信息垃圾了。

# QMP (QEMU monitor protocol)

在许多情况下，我们希望在外部将控制命令输入到 QEMU monitor 中，但是原有的机制太麻烦（需要重定向等绕圈子的操作），幸而 QEMU 为我们提供了一个叫 QMP 的东西。

QMP 全称 QEMU monitor protocol 顾名思义就是用于 QEMU monitor 的协议啦。QEMU 协议以 JSON 格式传输命令与返回信息，许多基于 qemu 的应用都使用了这个功能，比如著名的虚拟化中间件 libvirt，它在对 QEMU 虚拟机做操作时，就是使用的 QMP。

## 通过 telnet 启用 QMP

启用 QMP 使用`-qmp`或`-qmp-pretty`，两者都可配置 qmp 连接，但`-qmp-pretty`配置的连接使得输出格式更友好。将 qmp 通过 tcp 定向到本地 9000 端口，并且不等待连接。

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -qmp-pretty tcp:localhost:9000,server,nowait -serial telnet:localhost:9001,server
```

开启连接

```shell
$ telnet localhost 9000
```

开启 telnet 连接后，可以看到 telnet 窗口如下输出：

```plain
Trying 127.0.0.1...
Connected to localhost.
Escape character is '^]'.
{
    "QMP": {
        "version": {
            "qemu": {
                "micro": 1,
                "minor": 7,
                "major": 2
            },
            "package": " (-dirty)"
        },
        "capabilities": [
        ]
    }
}
```

表示连接成功。想要进入 QMP 命令模式需要先发送一个*qmp_capabilities*，进入到命令模式。

```plain
{ "execute": "qmp_capabilities" }
```

如果 return 为空则命令运行成功

```plain
{
    "return": {
    }
}
```

现在你就可以开心地通过 telnet 控制 VM 了，之后要怎么做就任君发挥了。在这里[可以](https://qemu.weilnetz.de/doc/qemu-qmp-ref.html)找到更多最新的命令和使用方法。

## 2.2、通过 qmp-shell script 使用 qmp

在 QEMU 的源码目录下的`script/qmp`目录下有一个 qmp-shell 脚本，你也可以使用这个脚本来使用 qmp，它可以用来做自动测试，因为它可以为你组合一些命令。

```shell
$ qemu [...] -qmp unix:./qmp-sock,server,nowait
```

运行脚本

```shell
$ qmp-shell ./qmp-sock
```

## 配置文件运行

创建配置文件

```plain
[chardev "qmp"]
  backend = "socket"
  port = "9000"
  host = "localhost"
  server = "on"
  wait = "on"
[mon "qmp"]
  mode = "control"
  chardev = "qmp"
  pretty = "on"
```

等价于

```shell
-chardev socket,id=qmp,port=9000,host=localhost,server -mon chardev=qmp,mode=control,pretty=on
```

或者通过本地 socket 连接

```plain
[chardev "qmp"]
  backend = "socket"
  path = "/root/qemu-install/bin/qmp-sock"
  server = "on"
  wait = "on"
[mon "qmp"]
  mode = "control"
  chardev = "qmp"
  pretty = "on"
```

连接 socket

```shell
$ apt-get install rlwrap socat
$ rlwrap -C qmp socat STDIO UNIX:qmp-sock
```

# 自定义 QMP 协议

## 在 qapi-schema.json 文件下声明命令

```plain
{ 'command': 'hello qemu'}
```

## qmp.c 中添加命令函数

```c
void qmp_hello_qemu(Error **errp)
{
	printf("hello qemu\n");
}
```

## 修改 qmp-commands.hx

```plain
{
    .name  = "hello qemu",
    .args_type  = "",
    .mhandler.cmd_new = qmp_marshal_input_hello_world,
},
```

更多内容可以查看[官网教程](https://wiki.qemu.org/Documentation/QMP)

# Human Monitor Interface（HMP）

https://blog.csdn.net/dobell/article/details/8271140

hmp 即 monitor 界面使用的命令

## 修改 hmp-commands.hx

```haxe

    {
        .name       = "hello qemu",
        .args_type  = "",
        .params     = "",
        .help       = "print hello qemu",
        .mhandler.cmd = hmp_input_hello_world,
    },

STEXI
@item hello_qemu
print hello qemu.
ETEXI
```

注意：args_type 中参数值不可使用下划线

# hmp.c 中添加命令函数

```c
void hmp_input_hello_world(Monitor *mon, const QDict *qdict)
{
    Error *err = NULL;

    qmp_hello_qemu(&err);
}
```

## hmp.h 中添加声明

```c
void hmp_input_hello_world(Monitor *mon, const QDict *qdict);
```

