---
layout: post
title:  "conserver"
subtitle: ""
date:   2020-5-21 19:13:45 +0800
tags:
  - console
categories: [OS]
comment: true
---

Conserver是一个允许多个用户同时使用一个serial console的应用。它能够保存日志，允许用户获取对console的写权限（每次一个）。它的思想是记录你serial上所有的通信，使得你能够返回去查看是否有什么东西崩溃了。支持多用户的功能，使得你能够和其他人一起工作。

> 东西是个好东西，但是配置实在是太让人迷惑了。。网上示例还巨少。

# 1、conserver - console server daemon

conserver是一个守护进程，它管理所有通过console客户端远程连接到系统console的用户，同时（可选的）将console输出保存到日志。conserver可以通过本地的serial ports、Unix domain sockets、TCP sockets或者其他扩展程序连接到console。

1. conserver启动时通过`conserver.cf`文件获取每个console的一些细节，包括console类型，日志选项，串口或者网络配置，用户访问等级等。接着再使用命令行选项，并且可能会覆盖`conserver.cf`中的一些设置。
2. conserver将consoles分为两类：一类需要积极地管理；一类只需要知道其存在就行，因此它可能将clients提交给其他conserver实例；
3. 如果master值与本机的hostname或者ip地址相匹配，conserver将积极地管理这个console。否则，将其视为被其他server管理的远程console。



查看conserver.cf配置默认路径

```bash
$ conserver -V
```

conserver.cf配置

```
config * {
    autocomplete no;
    defaultaccess rejected;
    sslrequired yes;
}

access * {
    trusted localhost;
}

default condefault {
    baud 115200;
    type device;
    master localhost;
    protocol raw;
    rw congroup;
}

console ttyS0 {
    include condefault;
    device /dev/pts/1;
    logfile "/var/log/libvirt/qemu/testconserver.log";
    parity none;

}
```

检查配置是否有错误

```bash
$ conserver -S
```

运行conserver

```bash
$ conserver -C conserver.cf -d -v
```

console连接一个窗口

```bash
$ console ttyS0
```



