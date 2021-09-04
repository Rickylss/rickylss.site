---
layout: post
title:  "路由器架构简史"
subtitle: ""
date:   2021-3-15 14:37:45 +0800
tags:
  - translate
categories: [translate]
comment: true
---

在过去的 50 年里，我们将网络从一小部分的计算机互联发展成为了一个拥有数亿节点的世界范围的结构，在这方面我们取得了很大的进步。在这段旅程中，我们学到了很多关于如何构建网络，以及连接网络的路由器的知识。一路走来，我们的失误给那些想要从中汲取教训的人上了很好的一课。

起初，路由器就是总线上挂载了网卡的普通电脑。



某种程度上来说这是可行的。在这种架构下，数据包从网卡进来，然后被 CPU 转发到内存上。CPU 作出转发决策，并将数据包推到出口网卡。CPU 和内存都是集中的资源，被它们的能力范围所限制。总线是额外的限制：总线的带宽必须能够支持所有网卡同时使用。

