---
layout: post
title:  "RCU 同步机制"
subtitle: ""
date:   2020-8-7 19:13:45 +0800
tags:
  - qemu
categories: [QEMU]
comment: true
---

TODO: memory barriar  RCU 内存一致性

RCU（Read-copy update）读复制更新机制，用于保护读频繁的数据结构。RCU 在读方面非常高效且可扩展性强（它是 wait-free 的）。

RCU 支持一个 writer 和多个 reader 并行，因此它不会单独使用。通常情况下，写入端会通过一个锁来序列化多个更新，但是其他方法也是可能的（例如：将更新限制为单个任务）。在 QEMU 中，这个锁通常就是“iothread mutex”，也就是熟知的“big QEMU lock”（BQL）。当然，限制为单个任务的方法在 QEMU 中也可以通过“bottom half”API 实现。

RCU 本质上是一个“wait-to-finish”机制。读端使用“critical sections”标记代码段，更新端在执行前会等待所有当前“正在运行”的“critical sections”。



