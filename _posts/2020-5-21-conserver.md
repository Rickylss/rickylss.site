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

Conserver 是一个允许多个用户同时使用一个 serial console 的应用。它能够保存日志，允许用户获取对 console 的写权限（每次一个）。它的思想是记录你 serial 上所有的通信，使得你能够返回去查看是否有什么东西崩溃了。支持多用户的功能，使得你能够和其他人一起工作。

> 东西是个好东西，但是配置实在是太让人迷惑了。。网上示例还巨少。

# 1、conserver - console server daemon

conserver 是一个守护进程，它管理所有通过 console 客户端远程连接到系统 console 的用户，同时（可选的）将 console 输出保存到日志。conserver 可以通过本地的 serial ports、Unix domain sockets、TCP sockets 或者其他扩展程序连接到 console。

1. conserver 启动时通过`conserver.cf`文件获取每个 console 的一些细节，包括 console 类型，日志选项，串口或者网络配置，用户访问等级等。接着再使用命令行选项，并且可能会覆盖`conserver.cf`中的一些设置。
2. conserver 将 consoles 分为两类：一类需要积极地管理；一类只需要知道其存在就行，因此它可能将 clients 提交给其他 conserver 实例；
3. 如果 master 值与本机的 hostname 或者 ip 地址相匹配，conserver 将积极地管理这个 console。否则，将其视为被其他 server 管理的远程 console。



查看 conserver.cf 配置默认路径

```bash
$ conserver -V
```

conserver.cf 配置

```plain
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

运行 conserver

```bash
$ conserver -C conserver.cf -d -v
```

console 连接一个窗口

```bash
$ console ttyS0
```



