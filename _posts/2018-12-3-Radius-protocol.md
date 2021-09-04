---
layout: post
title:  "Radius 协议"
subtitle: ""
date:   2018-12-4 10:02:09 +0800
tags:
  - radius
categories: [DK]
---

 RADIUS(Remote Authentication Dial-In User Service)，即用户远程拨入认证服务，直译过来是远程身份验证拨入用户服务，后者更有助于理解该协议的原理。

 本文基于[Wikipedia](https://en.wikipedia.org/wiki/RADIUS)，只做学习了解目的。

## 协议简介

RADIUS 是一种 C/S 结构的网络应用层协议，工作在 1812、1813 端口上，它是目前应用最广泛的 AAA(认证 Authentication、授权 Authorization、计费 Accounting)协议。

Radius 协议主要针对的远程登陆类型：SLIP、PPP、telnet 和 rlogin 等。Radius 协议应用范围很广，包括普通电话、上网业务计费，对 VPN 的支持可以使不同的拨入服务器的用户具有不同权限。

## NAS(Network Access Server)

在讲解 RADIUS 协议内容之前，先简单介绍一下[NAS](https://wiki.freeradius.org/glossary/NAS)(网络接入服务器)。

> The NAS is meant to act as a gateway to guard access to a protected resource. 

**工作流程：**

​	用户在接入网络之前，需要将用户信息（用户名密码）发送给 NAS，NAS 再将信息发送给对应的 AAA 服务器，通过 AAA 服务器的验证之后，AAA 服务器通知 NAS 该用户已被验证，之后 NAS 准许用户接入网络。NAS 扮演了一个 gateway 的角色，守护着受保护资源的访问。**需要注意的是，NAS 不保存客户端能连接哪些网络资源或者哪些证书是有效的，这方面的信息。** 

​	通常 NAS 中包含了一个 Radius client 组件，它通过和 Radius server 通信进行验证。Radius 就是常见于 NAS 的 AAA 协议了，在讲解协议内容时，我们以 NAS 做为例子讲解。

## 协议内容

RADIUS 使用两个包类型来管理完整的 AAA 进程：管理认证和授权的 Access-Request；管理计费的 Accounting-Request，分别定义在 RFC2865 与 RFC2866 中。

### Access-Request

![](\pictures\Radius-access-request.png)

1. 用户向 NAS 发送获取特定网络资源连接的请求，同时将 credentials 通过 linklayer-protocol（数据链路层协议，如：PPP）发送给 NAS 设备；

2. NAS 向 Radius server 发送 Access-Request，通过 RADIUS 协议请求准许访问的授权。通常来说这个 request 中包括了 1 中提到的 credentials，典型地就是用户名密码，或者用户提供的安全证书，但是有时候也会包含 NAS 所知道的一些用户的信息，比如网络地址或者电话号码等。

3. Radius server 使用认证方案（authenticcation schemes 如 PAP、CHAP、EAP）检查这些信息是否正确。以往的 Radius server 通过本地的平面文件数据库来验证用户信息，现在的 Radius server 可以参考外部的资源，例如 SQL，Kerberos，LDAP 或者 Active Directory 来验证用户证书。Radius server 根据不同的情况返回三种不同的 response;

   1. Access Reject

      验证失败，用户被无条件拒绝访问所请求的网络资源；

   2. Access Challenge（可理解为盘问）

      要求提供额外的用户信息，例如次要密码、PIN、token 或者 card；一般出现在更复杂的认证会话中；

   3. Acccess Accept

      验证成功，一旦验证成功之后，Radius server 将会检查用户能使用的网络服务。比如，一个       用户也许可以使用公司的无线网络，但是不能使用 VPN 服务。当然，这些信息可以从本地数据库中获取，也可以通过外部资源查找，比如 LDAP 或者 Active Directory；

4. 每个不同的 response 中都包含了一个 Reply-Message，它会包含拒绝连接的原因；对 challenge（盘问）的提示或者成功连接的欢迎信息。

5. Radius server 发送给 NAS 的授权属性规定了准许的条款，例如一个 Access-Accept 授权中也许包括了以下条款：

   1. The specific [IP address](https://en.wikipedia.org/wiki/IP_address) to be assigned to the user
   2. The address pool from which the user's IP should be chosen
   3. The maximum length of time that the user may remain connected
   4. An access list, priority queue or other restrictions on a user's access
   5. [L2TP](https://en.wikipedia.org/wiki/L2TP) parameters
   6. VLAN parameters
   7. Quality of Service (QoS) parameters

6. 当一个客户端被设置成使用 RADIUS，所有用户在使用该客户端时，都会看到一个登陆提示，用户在这个登陆提示中填写用户名密码，之后通过一个数据链路协议如 PPP（数据包中会存放这些信息）发送给 Radius client（NAS），Radius client 创建一个“Access-Request”用来存放客户端发送过来的信息，其中密码会使用算法加密。

### Accounting-Request

![](\pictures\Radius-accounting-request.png)

1. 当 NAS 准许用户访问网络时，计费就开始了（一个 Accounting-Request 数据包中包含了一个叫 Acct-Status-Type 的属性，此时它的值为 start）。Radius client 发送一个 Accounting-Request 给 server，在这个 request 里面包含了用户的身份信息、网络地址等同时包含了标志为开启的状态属性。
2. 定时从 client 到 server 发送一个 acct_status_type=interim update 的 Accounting-Request，主要目的是为了更新一个活跃会话的状态，“Interim”中记录了当前会话持续时间和当前数据使用情况。
3. 最后，当用户想要关闭一个连接的时候，client 发送一个 acct_status_type=stop 的 request 给 server，提供最终在时间、包转发、数据转发和关闭连接的原因等相关的信息。
4. 通常，client 发送一个 Accounting-Request 之后，会等待一个 Accounting-Response 确认回复。这些数据信息的意义在于计费和监控。

## 包结构(Packet structure)

![](\pictures\Radius_packet_format.png)

RADIUS 数据包格式如上图所示，从左到右传送出去，从 code 到 identifier 再到 Length 最后是 Authenticator 和 attributes。

- RADIUS Codes（十进制）如下表所示：

| Code | Assignment     |
| ---- | -------------- |
|   1  | Access-Request |
|   2  | Access-Accept  |
|   3  | Access-Reject   |
|   4  | Accounting-Request|
|   5  | Accounting-Response|
|  11  | Access-Challenge |
|  12  | Status-Server (experimental) |
|  13  | Status-Client (experimental) |
|  40  | Disconnect-Request |
|  41  | Disconnect-ACK |
|  42  | Disconnect-NAK |
|  43  | CoA-Request |
|  44  | CoA-ACK |
|  45  | CoA-NAK |
|  255  | Reserved |

- Identifier 的作用是匹配每一个 requests 和 replies（请求和回复）
- Length 指明了整个 RADIUS 数据包的大小，包括 Code、Identifier、Length、Authenticator 和 Attributes
- Authenticator 用于认证从 Radius server 发送过来的答复，并且它被用于加密 passwords，长度为 16bytes
- Attribute Value pairs（AVP）属性值，在 AAA 整个协议的请求和响应中都会用到，AVP 的类型多达 190 多种，具体的情况可以查看官方资料（RFC 文档）。
- 值得注意的是 RADIUS 是可扩展的，所以许多供应商都在里面集成了自己想要使用的属性值，这样的属性值称之为 Vendor-Specific Attributes（VSAs）

## RFC 文件定义

- [RFC 2865](https://tools.ietf.org/html/rfc2865) - RADIUS 验证协议
- [RFC 2866](https://tools.ietf.org/html/rfc2866) - RADIUS 计费协议
- [RFC 2867](https://tools.ietf.org/html/rfc2867) - 为通道协议的 RADIUS 计费拓展
- [RFC 2868](https://tools.ietf.org/html/rfc2868) - 通道协议中使用的 RADIUS 属性
- [RFC 2869](https://tools.ietf.org/html/rfc2869) - RADIUS 协议拓展
- [RFC 3162](https://tools.ietf.org/html/rfc3162) - [IPv6](https://zh.wikipedia.org/wiki/IPv6)网络中 RADIUS 协议的使用
- [RFC 3579](https://tools.ietf.org/html/rfc3579) - RADIUS 协议中 EAP([RFC 2284](https://tools.ietf.org/html/rfc2284))的使用
- [RFC 3580](https://tools.ietf.org/html/rfc3580) - IEEE 802.1X 中 RADIUS 协议的使用指南

