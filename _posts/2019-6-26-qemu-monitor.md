---
layout: post
title:  "QEMU monitor 与QMP"
subtitle: "qemu控制台"
date:   2019-6-25 16:56:09 +0800
categories: [qemu, qmp]
---

https://www.ibm.com/developerworks/cn/linux/l-cn-qemu-monitor/index.html

https://en.wikibooks.org/wiki/QEMU/Monitor#commit

https://blog.csdn.net/wangwei222/article/details/80055615

https://wiki.qemu.org/Documentation/QMP

## 1、QEMU monitor

当用户启动一个QEMU进程之后，QEMU进程会为用户提供一个monitor用于交互。通过使用一些命令，用户可以监控正在运行的guestOS，更改可移除的媒体设备和USB设备，截图或者捕获音频，甚至控制虚拟机。

### 1.1、运行一个板级设备，不对monitor做任何设置

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out
```

弹出monitor：

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor.png"/>

点开Machine和View，可以看到更多选项。当前界面为compact monitor0窗口，点击View下拉框，可选择serial0，这里是串口的监控窗口，通过该窗口可查看串口输入输出信息。

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor-serial.png"/>

或者你也可以勾选show tabs将所有可查看窗口显示出来。

### 1.2 、将monitor重定向到标准输入输出

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -monitor stdio
```

将monitor重定向到标准输入输出后，依旧有QEMU弹窗，但是这个弹窗中只有serial0，而compact monitor0窗口重定向到当前的命令行窗口下了。(如果想要去除QEMU弹窗，可以添加参数-vnc :53，这样弹窗会被转到vnc的53端口)

<img class="col-lg-12 col-md-12 mx-auto" src="\pictures\qemu-monitor-stdio.png"/>

### 1.3、将monitor重定向到网络设备

安装前面的思路同样可以将monitor重定向到telnet中

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -monitor telnet:localhost:9000,server
```

### 1.4、QEMU monitor命令

使用QEMU monitor的目的是为了在VM运行后控制VM，控制VM的命令有许多，同样也有很多快捷键，在monitor界面使用help命令就可以查看了。同时[WIKIBOOKS](https://en.wikibooks.org/wiki/QEMU/Monitor)中也有详细的解析，我就不复制粘贴，制造信息垃圾了。

## 2、QMP (QEMU monitor protocol)

在许多情况下，我们希望在外部将控制命令输入到QEMU monitor中，但是原有的机制太麻烦（需要重定向等绕圈子的操作），幸而QEMU为我们提供了一个叫QMP的东西。

QMP全程QEMU monitor protocol顾名思义就是用于QEMU monitor的协议啦。QEMU协议以JSON格式传输命令与返回信息，许多基于qemu的应用都使用了这个功能，比如著名的虚拟化中间件libvirt，它在对QEMU虚拟机做操作时，就是使用的QMP。

### 2.1、通过telnet启用QMP

启用QMP使用`-qmp`或`-qmp-pretty`，两者都可配置qmp连接，但`-qmp-pretty`配置的连接使得输出格式更友好。将qmp通过tcp定向到本地9000端口，并且不等待连接。

```shell
$ ./qemu-system-arm -M tms570-ls3137 -kernel /mnt/hgfs/code/ccs/tms570/Debug/tms570.out -qmp-pretty tcp:localhost:9000,server,nowait -serial telnet:localhost:9001,server
```

开启连接

```shell
$ telnet localhost 9000
```

开启telnet连接后，可以看到telnet窗口如下输出：

```telnet
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

表示连接成功。想要进入QMP命令模式需要先发送一个*qmp_capabilities*

```telnet
{ "execute": "qmp_capabilities" }
```

如果return为空则命令运行成功

```telnet
{
    "return": {
    }
}
```

现在你就可以开心地通过telnet控制VM了，之后要怎么做就任君发挥了。

### 2.2、通过qmp-shell script使用qmp

在QEMU的源码目录下的`script/qmp`目录下有一个qmp-shell脚本，你也可以使用这个脚本来使用qmp，它可以用来做自动测试，因为它可以为你组合一些命令。

```shell
$ qemu [...] -qmp unix:./qmp-sock,server,nowait
```

运行脚本

```shell
$ qmp-shell ./qmp-sock
```

### 2.3、配置文件运行

创建配置文件

```
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

或者通过本地socket连接

```
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

连接socket

```shell
$ apt-get install rlwrap socat
$ rlwrap -C qmp socat STDIO UNIX:qmp-sock
```

## 3、自定义QMP协议

### 3.1、在qapi-schema.json文件下声明命令

```
{ 'command': 'hello qemu'}
```

### 3.2、qmp.c中添加命令函数

```c
void qmp_hello_qemu(Error **errp)
{
	printf("hello qemu\n");
}
```

### 3.3、修改qmp-commands.hx

```haxe
{
    .name  = "hello qemu",
    .args_type  = "",
    .mhandler.cmd_new = qmp_marshal_input_hello_world,
},
```



