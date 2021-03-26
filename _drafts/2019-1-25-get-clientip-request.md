---
layout: post
title:  "通过 request 获取 clientIp"
subtitle: ""
date:   2019-1-25 14:15:38 +0800
categories: [Http, reqeuest, ip]
---

# 服务端获取客户端请求 Ip 的几种方法

​	remote_addr 指的是当前直接请求的客户端 IP 地址，它存在于 tcp 请求体中，是 http 协议传输时自动添加的，不受请求头 header 所控制。所以，当客户端与服务器间不存在任何代理时，通过 remote_addr 获取客户端 IP 地址是最准确的，也是最安全的。

　　x-forwarded-for 简称 XFF，它其实和 http 协议本身并没什么关系，是很多代理服务器在请求转发时添加上去的。如果客户端和服务器之间存在代理服务器，那么直接通过 remote_addr 获取的 IP 就是代理服务器的地址，并不是客户端真实的 IP 地址。因此，需要代理服务器（通常是反向代理服务器）将真实客户端的 IP 地址转发给服务器，转发时客户端的真实 IP 地址通常就存在于 x-forwarded-for 请求头中。

　　client-ip 同 x-forwarded-for，也是代理服务器添加的用于转发客户端请求的真实 IP 地址，同样保存于请求头中。

