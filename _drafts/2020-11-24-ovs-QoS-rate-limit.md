---
layout: post
title:  "ovs-dpdk QoS 限速"
subtitle: ""
date:   2020-11-23 10:13:45 +0800
tags:
  - network
  - ovs
categories: [network]
comment: true
---



# QoS 限速实现

## 单速单桶

## 单速双桶

## 双速双桶

# Linux TC

TC(Traffic Control)流量控制器，顾名思义是用于 Linux 内核的流量控制的，主要是通过在输出端口处建立一个队列来实现流量控制。



# ovs 限速

注意：在进行 ovs QoS 限速实验之前，需要首先查看一下你的 interface 支持的 QoS 类型。

```bash
# ovs-appctl -t ovs-vswitchd qos/show-types [interface]
$ ovs-appctl -t ovs-vswitchd qos/show-types vdpa0
QoS type: egress-policer
QoS type: trtcm-policer
```

目前 ovs + dpdk 只支持`egress-policer`和`trtcm-policer`不支持`ingress policing`



## egress policing



## ingress policing



# Reference

https://forum.huawei.com/enterprise/zh/thread-385047-1-1.html

https://forum.huawei.com/enterprise/zh/thread-279033.html

https://cloud.tencent.com/developer/article/1409664

https://tldp.org/HOWTO/Traffic-Control-HOWTO/