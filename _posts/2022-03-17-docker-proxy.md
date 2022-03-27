---
layout: post
title:  "docker 代理设置"
subtitle: ""
date:   2022-03-17 12:52:45 +0800
tags:
  - network
categories: [network, docker]
comment: true
---

# docker 代理设置

在这里讲 docker 代理设置其实本质上有两种 proxy，一种是针对 docker 应用本身的 proxy，一种是针对 docker 容器的 proxy。我讲它们分别称之为 `docker proxy` 和 `container proxy`。

<!-- more -->

> 两类代理的设置都需要代理服务器支持，如果你还没有代理服务器，可以考虑从[该地址](https://portal.shadowsocks.nz/aff.php?aff=45902)购买相应服务。

## 代理设置

配置好 VPN 客户端之后，在设置中开启局域网共享（Allow connections from LAN）。以本人使用的 Trojan-Qt5 为例：

![image-20220317162205614](https://raw.githubusercontent.com/Rickylss/pics/main/img/image-20220317162205614.png)

开启成功后，socks5 和 http 的监听地址变为 `INETADDR_ANY`。

![image-20220317162350148](https://raw.githubusercontent.com/Rickylss/pics/main/img/image-20220317162350148.png)

现在同一个局域网下的设备都可以将当前的机器用作代理服务器了，比如你的手机，ipad 或者 switch 都可以科学上网了。

## docker proxy

docker proxy 主要就是用在 pull image 的时候。设置非常简单：

```bash 
$ sudo mkdir -p /etc/systemd/system/docker.service.d
$ vim /etc/systemd/system/docker.service.d/http-proxy.conf
$ cat /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://127.0.0.1:58591"
Environment="HTTPS_PROXY=http://127.0.0.1:58591"
Environment="NO_PROXY=localhost,127.0.0.1,docker-registry.example.com,.corp"
```

## container proxy

container proxy 的用途比较广泛，常见的比如 ignite 在编译的时候会跑一个 docker，并且在 docker 中下载各种 tar 包，而这些 tar 包通常放在 github 或者一些不存在的网站上。

设置 container proxy 有两种方法

- docker version >= 17.07，设置 `~/.docker/config.json`

```bash
$ cat ~/.docker/config.json
{
 "proxies":
 {
   "default":
   {
     "httpProxy": "http://192.168.1.12:58591",
     "httpsProxy": "http://192.168.1.12:58591",
     "noProxy": "*.test.example.com,.example2.com,127.0.0.0/8"
   }
 }
}
```

- docker version <= 17.06，设置 `environment`；

```bash
$ docker run --env HTTP_PROXY="http://192.168.1.12:58591" \
			 --env HTTPS_PROXY="http://192.168.1.12:58591" \
			 --env FTP_PROXY="ftp://192.168.1.12:58591" \
			 --env NO_PORXY="*.test.example.com,.example.com" \
			 ....
```

> 有两个点需要注意：
>
> 1. 在这里 `192.168.1.12` 是当前物理机在局域网中的地址；
> 2. 务必开启局域网共享，参考[代理设置](#代理设置)一节， container 可被认为是该局域网下单独的一个设备。

# reference

[](https://docs.docker.com/config/daemon/systemd/#httphttps-proxy)

[](https://docs.docker.com/network/proxy/)

[](https://kingsamchen.github.io/2020/04/19/allow-connections-from-lan-for-trojan-qt5/)
