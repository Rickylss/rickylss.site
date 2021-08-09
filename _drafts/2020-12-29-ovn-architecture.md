---
layout: post
title:  "OVN-architecture"
subtitle: ""
date:   2020-12-29 14:37:45 +0800
tags:
  - network
categories: [network]
comment: true
---

OVS(open virtual switch) 是一个软件实现的支持 openflow 协议的开源交换机机软件，简而言之，就是一个软件实现的交换机。OVS 这个交换机本身是不具备虚拟 L2、L3 overlay 网络、安全组和 DHCP 等功能的；

OVN(open virtual network) 是一个 SDN 控制器，可以为 OVS 提供虚拟网络抽象功能。

# OVN architecture

OVN 由许多组件构成，OVN 基本架构如图：

```txt
                                    CMS
                                          |
                                          |
                              +-----------|-----------+
                              |           |           |
                              |     OVN/CMS Plugin    |
                              |           |           |
                              |           |           |
                              |   OVN Northbound DB   |
                              |           |           |
                              |           |           |
                              |       ovn-northd      |
                              |           |           |
                              +-----------|-----------+
                                          |
                                          |
                                +-------------------+
                                | OVN Southbound DB |
                                +-------------------+
                                          |
                                          |
                       +------------------+------------------+
                       |                  |                  |
         HV 1          |                  |    HV n          |
       +---------------|---------------+  .  +---------------|---------------+
       |               |               |  .  |               |               |
       |        ovn-controller         |  .  |        ovn-controller         |
       |         |          |          |  .  |         |          |          |
       |         |          |          |     |         |          |          |
       |  ovs-vswitchd   ovsdb-server  |     |  ovs-vswitchd   ovsdb-server  |
       |                               |     |                               |
       +-------------------------------+     +-------------------------------+
```

从上往下看，OVN 由以下几个组件构成：

- **CMS(Cloud Management System) 云平台管理系统**，*我认为 CMS 不是必须的，本质上我们只需要一个集成了 OVN/CMS Plugin 的管理平台就行了*，但通常来说 OVN 的目的是管理云平台虚拟网络，因此我们可以把它笼统地概括为 CMS；如：OpenStack、ZStack
- **OVN/CMS Plugin**，CMS 需要集成的一个组件，作为 OVN 的接口。它的作用是将以 CMS 特定格式保存在 CMS 数据库中的逻辑网络配置，转化为可以被 OVN 理解的中间表达方式；由于这个组件必然是 CMS 特定的，因此你需要为每个 CMS 实现一个 Plugin，翻译成 OVN 可理解的中间表达后，之后的组件就与 CMS 无关了；如：Neutron
- **OVN Northbound DB**，北向数据库（从图上理解，因为这个数据库在上面，所以是北向数据库），它接收从 OVN/CMS Plugin 下发的逻辑网络中间表达。数据库模式是和 CMS 组件*阻抗匹配*的，因此它直接支持逻辑交换机、路由、ACLs 等的概念；
- **ovn-northd**，北向数据库的守护进程，负责将高级的 OVN 配置转化为可被 ovn-controller 理解的逻辑配置；它根据传统的网络概念将逻辑网络配置（来自北向数据库）转化为南向数据库的逻辑路径流；
- **OVN Southbound DB**，南向数据库，是系统的核心部分，它包含三种类型的数据：
  - 指定如何达到 hypervisor 和其他节点的 Physical Network(PN)表；
  - 依据“逻辑数据路径流”描述的逻辑网络的 Logical Network(LN)表；
  - 将逻辑网络组件的位置连接到物理网络的 Binding 表；

接下来的几个组件存在于每个 hypervisor 上：

- **ovn-controller**，是 OVN 在每个 hypervisor 上的代理，它向上连接到南向数据库，学习 OVN 配置和状态并且向数据库提交 PN 表信息，将 hypervisor 的状态更新到 Binding 表的 Chassis 列上；向下连接到 ovs-vswitchd，做为一个 OpenFlow 控制器，控制网络流量，同时连接到 ovsdb-server，用于监控和控制 OVS 配置；
- ovs-vswitchd 和 ovs-dbserver，都是 OVS 的常规组件

# OVN 信息流

OVN 的**配置数据由北向南流动**。CMS 通过它的 OVN/CMS 插件和北向数据库将逻辑网络配置传递给 OVN -northd。然后，ovn-northd 将配置编译为较低级的形式，并通过南向数据库将其传递给所有机器。

OVN 的**状态信息由南向北流动**。OVN 目前只提供几种形式的状态信息。

首先，ovn-northd 会更新北向数据库的`Logical_Switch_Port`表上的`up`列，更新规则如下：如果一个逻辑端口对应的南向数据库`Port_Binding`表的`chassis`列非空，那么将`up`设置为`true`，否则设置为`false`。CMS 可通过这种方式检测虚拟机的网络是否 up 起来了。

其次，OVN 还为 CMS 提供了**反馈机制**，由此可判断 CMS 提供的配置是否生效。这个特性要求 CMS 符合一系列的协议，工作方式如下：

1. 当 CMS 更新北向数据库的配置，作为更新数据库配置的事务的一部分，`NB_Global`表中的`nb_cfg`列的值会增加（只有当 CMS 想知道何时实现了配置时，才需要这样做）；
2. 当 ovn-northd 根据北向数据库的一个**快照**（更新南向数据库时，北向数据库也可能被修改）更新南向数据库时，它会将`NB_Global`表中的`nb_cfg`拷贝到`SB_Global`，当然也是在同一个事务中（因此，监视两个数据库的观察者可以确定南向数据库何时赶上北向数据库）；
3. ovn-northd 从南向数据库接收到更改完成的确认后，它会将`NB_Global`表中的`sb_cfg`更新为推送过来的`nb_cfg`版本（因此，CMS 或者其他观察者可以在不连接南向数据库的情况下确定南向数据库是否赶上）；
4. ovn-controller 接收到南向数据库和`nb_cfg`的更新。它紧接着会更新当前机器上的 OVS 的 physical flows。当它接收到来自 OVS 的更新确认信息，它会在南向数据库中更新自己的`Chassis`记录中的`nb_cfg`;
5. ovn-northd 监控南向数据库中记录的所有`Chassis`中的`nb_cfg`列。它会跟踪所有记录中最小的值，并将其复制到北向数据库`NB_Global`表的`hv_cfg`列（因此，CMS 或者其他观察者可以确定何时所有的 hypervisours 能赶上北向数据库配置）。

# Chassis 设置

OVN 部署下的每个 Chassis 都必须配置一个专用于 OVN 的 OVS 网桥，这个网桥被称为`integration bridge`。系统启动脚本需要先创建这个网桥，然后再启动`ovn-controller`。如果在`ovn-controller`启动时该网桥不存在，那么它将会使用默认的配置创建一个。`integration bridge`上的端口包括：

- 在 Chassis 上，用于管理逻辑网络连接的 tunel ports，`ovn-controller`可以添加、更新、移除这些端口；
- 在 hypervisor 上，附加到逻辑网络上的 VIFs。
- 网关，物理端口用于连接逻辑网络。系统启动脚本在启动`ovn-controller`之前将这个端口添加到 bridge；

# 逻辑网络

逻辑网络实现了和物理网络相同的概念，但是它们通过 tunnels（vxlan）或者 encapsulations（vlan）与物理网络进行了隔离。这使得逻辑网络能够使用与物理网络重叠的 IP 和地址空间，并且不会产生冲突。对逻辑网络拓扑结构的安排无需考虑其所在的物理网络的拓扑结构。

OVN 中逻辑网络的概念包括：

- logical switches，以太网交换机；
- logical routers，IP 路由器；
- logical datapaths，Open Flow 交换机，logical switches & routers 都被实现为 logical datapaths；
- logical ports，代表 logical switch 和 logical router 内外的连通点。典型的 logical port 类型有：
  - 表示 VIFs 的逻辑端口；
  - localnet ports 表示 logical switch 和 physical network 之间的连通点，
  - logical patch ports 表示 logical switch 和 logical routers 之间的联通点。

# VIF 生命周期

hypervisor 上的 VIF 是一个虚拟网络接口，它连接到 VM 或直接运行在 hypervisor 上的容器（运行在 hypervisor 上的容器和运行在虚拟机内的容器有很大的区别）。

本例中的步骤通常引用 OVN 和北向数据库的细节，要查看完整的数据库细节，请查看[ovn-sb](https://man7.org/linux/man-pages/man5/ovn-sb.5.html)和[ovn-nb](https://man7.org/linux/man-pages/man5/ovn-nb.5.html)。


# VM 内容器接口的生命周期

# 包的架构物理生命周期

>openflow 规则由两部分组成，openflow 的运行也分两步，第一步是匹配（match），找到与条件相符的包，然后第二步执行（action），执行预设的规则。

从入口 hypervisor 的虚拟机或者容器上发送一个包到 attach 在 OVN integration bridge 的端口。然后：

1. OpenFlow table 0 负责从 physical 到 logical 的转发。**它会 match 包的入口端口**，match 成功后会给包注释上 logical 的 metadata 字段用来标识该数据包通过的数据路径，同时注释 input port 字段来标志入口端口。标记完成后，**将包提交到 table 8，进入 logical ingress 流水线**。如果**包是从 tunnel 进来的**，除了打上 logical datapath 和 logical ingress port metadata 之外还要加上 logical output port，这三个信息在 tunnel encapsulation metadata 中可以看到，**完成之后提交到 table 33 进入 logical egress 流水线**；
2. OpenFlow table 8 到 31 执行从南向数据库`Logical_Flow`表中配置的 logical ingress 流水线。`Logical_FLow`表完全采用 logical 网络的概念，比如 logical port 和 logical datapaths。OVN 控制器很大一部分的工作就是将它们转换成等价于 OpenFlow 的信息；

# 逻辑路由器和逻辑 patch port

# VTEP 网关的生命周期

# 用于外部逻辑端口的本地 OVN 服务

# DESIGN DECISIONS

## tunnel encapsulations

OVN 把逻辑网络上 hypervisor 之间发送的包用 metadata 注释起来，metadata 由使用特定编码方式的 3 个部分组成：

- 24bit 的数据路径标志，在 OVN 南向数据库`Datapath_Binding`表中的`tunnel_key`列；
- 15bit 的逻辑入口端口标志，在 OVN 中 ID0 被保留做内部使用，ID 1~32767 可分配给逻辑端口（在 OVN 南向数据库`Port_Binding`表中的`tunnel_key`列）；
- 16bit 的逻辑出口端口标志，ID 0~32767 含义与逻辑入口端口标志相同，ID 32768~65535 可被分配给逻辑多播组（在 OVN 南向数据库`Multicast_Binding`表中的`tunnel_key`列）；

对于 hypervisor <----> hypervisor 的流量，OVN 只支持 Geneve 和 STT 封包方式，有以下几个原因：

- 只有 STT 和 Geneve 支持如此大的 metadata（每个包超过 32bit，24+15+16）；
- STT 和 Geneve 使用随机的 UDP 或者 TCP 源端口，这样可以提高底层网络使用 ECMP 情景下的多路径的分发效率；
- NICs 都支持 STT 和 Geneve 的封解包的卸载；

初于灵活性考虑，在 hypervisor 之间封包方式推荐的选择是 Geneve。对于 Geneve 封装方式，OVN 将逻辑数据路径的标志放置到 Geneve VNI；将逻辑入口端口和出口端口标志放置到 TLV 上，并且设置 class 0x0102、type 0x80，组成一个 32 位的值，MSB 到 LSB 如下:

```plain
  1       15           16
+---+------------+-----------+
|rsv|ingress port|egress port|
+---+------------+-----------+
  0
```

对于 NICs 不支持 Geneve 封装 offload 的情况，则推荐 STT 封装方式以获得更好的性能。对于 STT 封装方式，OVN 将所有的 3 部分 metadata 放置在 STT 64bit 的 tunnel ID 中，从大端到小端：

```plain
     9          15          16         24
 +--------+------------+-----------+--------+
 |reserved|ingress port|egress port|datapath|
 +--------+------------+-----------+--------+
      0
```

对于连接到网关的情况，除了 Geneve 和 STT，OVN 还支持 VXLAN，因为通常[ToR 交换机](https://searchnetworking.techtarget.com/definition/top-of-rack-switching)只支持 VXLAN。目前网关具有与 VTEP 模式定义的功能相匹配的特性集，因此只需要很少的 metadata 位。在未来，不支持使用大量元数据封装的网关可能会继续减少特性集。

