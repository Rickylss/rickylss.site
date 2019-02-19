---
layout: post
title:  "通过request获取clientIp"
subtitle: ""
date:   2019-1-25 14:15:38 +0800
categories: [Http, reqeuest, ip]
---

# 服务端获取客户端请求Ip的几种方法

​	remote_addr指的是当前直接请求的客户端IP地址，它存在于tcp请求体中，是http协议传输时自动添加的，不受请求头header所控制。所以，当客户端与服务器间不存在任何代理时，通过remote_addr获取客户端IP地址是最准确的，也是最安全的。

　　x-forwarded-for简称XFF，它其实和http协议本身并没什么关系，是很多代理服务器在请求转发时添加上去的。如果客户端和服务器之间存在代理服务器，那么直接通过remote_addr获取的IP就是代理服务器的地址，并不是客户端真实的IP地址。因此，需要代理服务器（通常是反向代理服务器）将真实客户端的IP地址转发给服务器，转发时客户端的真实IP地址通常就存在于x-forwarded-for请求头中。

　　client-ip同x-forwarded-for，也是代理服务器添加的用于转发客户端请求的真实IP地址，同样保存于请求头中。

