---
layout: post
title:  "libvirt 迁移"
subtitle: ""
date:   2020-6-25 19:13:45 +0800
tags:
  - libvirt
categories: [libvirt]
comment: true
---

相比于 QEMU，在 libvirt 的层面上，虚拟机迁移方式就更为多样灵活。libvirt 上的迁移有多种方式，每种都有自己的优点和缺点，为了最大程度地保证 hypervisor 集成和管理员部署的灵活性，libvirt 实现了多种迁移选择。
<!-- more -->
# 1、从数据转发看迁移

从数据转发（通常指网络数据转发）的角度上来看，libvirt 提供了两种迁移方式，一种是利用 hypervisor 自身提供的转发机制，另一种是通过利用 libvirtd 的连接实现转发。

> 通常来说，虚拟机迁移发生在两台不同的主机上，因此，这里的数据转发通常也是指网络数据的转发。具体的协议则不一定。

## 1.1、hypervisor native transport

使用 hypervisor 原生的数据转发机制可能无法支持数据加密功能，这取决于 hypervisor 的具体实现，但是它减少了额外的数据拷贝（vm 和 libvirtd 之间的数据拷贝）开销。使用 hypervisor 原生的数据转发机制需要管理员在主机上进行额外的 hypervisor 相关的网络配置，对于某些 hypervisor 来说需要在防火墙上打开一堆 ports，来允许虚拟机通过这些 ports 进行迁移。

![libvirt-migrate1](\pictures\libvirt-migrate1.png)

## 1.2、libvirt tunnelled transport

通过隧道的数据传输方式，可以使得迁移过程高度加密，因为它可以使用 libvirt RPC 协议中内置的功能。但是它的缺点是需要进行额外的数据拷贝，无论在 srcHost 上还是 destHost 上都需要将数据在 libvirtd 和 hypervisor 之间拷贝。另一方面，使用隧道数据传输方式不需要对主机网络进行额外的设置，因为它使用的是和 libvirtd remote access 相同的机制。只需要在防火墙上打开一个端口，就能够同时支持多个迁移操作。

![libvirt-migrate2](\pictures\libvirt-migrate2.png)

 # 2、从控制流看迁移

虚拟机迁移需要密切地协调两台参与的 Host，同时也包括参与迁移的应用程序，这个应用程序可能是 srcHost，destHost，或者是第三方的 Host(libivrt 管理节点)。

## 2.1、managed direct migration

在`managed direct migration`情况下，libvirt 客户端进程控制着迁移的各个阶段。客户端应用需要能够连接 srcHost 和 destHost，并且能够管理其上的 libvirtd 守护进程。两个 libvirtd 之间不需要交流。如果客户端应用崩溃，或者在迁移过程中失去了与 libvirtd 的连接，那么 libvirtd 将尝试终止迁移，并且在 srcHost 上重启 guest CPUs（libvirt 官方原文为重启 guest CPUs，非重启 guest）。在很多情景下迁移过程可能无法安全完成，这将导致 guest 在一台或者两台 Host 上挂起。

![libvirt-migrate3](\pictures\libvirt-migrate3.png)

> 根据对 libvirtvir 中`DomainMigrateVersion3Full`方法的具体实现，实际上`managed direct migration`采用的是`direct transport`方式。与`Unmanaged direct migration`区别在于它由 libvirt 来负责管控迁移的各个阶段。
>
> **注意**，图中所画为控制流的连线情况，原文中：There is no need for the two libvirtd daemons to communicate with each other。 指两者在迁移过程中不需要交流，并非两者之间不需要连线。

## 2.2、managed peer to peer migration

在`managed peer to peer migration`情况下，libvirt 客户端进程只与 srcHost 对话，srcHost 上的 libvirtd 守护进程通过直接连接 destHost 上的 libvirtd 控制整个迁移过程。如果客户端应用崩溃，或者在迁移过程中失去了与 libvirtd 的连接，迁移过程不会被中断。srcHost libvirtd 使用自身的凭证（通常是 root）连接到 destHost，而不是使用客户端连接到 srcHost 的凭证；如果这两个凭证不同，那么就可能出现客户端能够直接连接到 destHost 上，但是 srcHost 不能够创建 p2p 迁移连接的情况。

![libvirt-migrate4](\pictures\libvirt-migrate4.png)

> 使用`managed peer to peer migration`时，可通过 VIR_MIGRATE_TUNNELLED，选择数据流迁移方式。

## 2.3、Unmanaged direct migration

在`Unmanaged direct migration`情况下，既不是 libvirt 客户端控制迁移过程，也不是 libvirtd 守护进程控制迁移过程。控制权委托给 hypervisor 管理服务。libvirt 仅仅是通过 hypervisord 的管理层初始化虚拟机迁移操作。即便 libvirt 客户端或者 libvirtd 崩溃，都不会影响迁移过程。

![libvirt-migrate5](\pictures\libvirt-migrate5.png)

> `Unmanaged direct migration`采用`native transport`，数据不需要额外拷贝。

# 3、数据安全

由于迁移数据流包含了完整的 guest OS RAM 信息，窥探迁移数据流可能会危及敏感的客户信息。如果 Host 具有多个网络接口，或者如果网络交换机支持标记的 VLAN，则非常需要将 Guest 网络流量与迁移或管理流量分开。

在某些情况下，即便是分离迁移和管理网络流量也会承受一些风险。在这种情况下，需要加密迁移数据流。如果 hypervisor 本身不提供加密功能，那么就应该是用 libvirt tunnelled migration。

# 4、离线迁移

在进行离线迁移时，会将虚拟机定义取消。成功迁移后，虚拟机将在 srcHost 上保持原来的状态，在 destHost 上 defined，但不激活（参考[在 libvirt 中虚拟机状态](https://wiki.libvirt.org/page/VM_lifecycle)）。简单地来说就是在 srcHost 运行`virsh duumpxml`，在 destHost 上运行`virsh define`。离线迁移将运行 pre-migration hook，用于更新在 destHost 上的虚拟机定义文件。offline 迁移不支持拷贝非共享存储和基于文件的存储。

# 5、URIs

略。

# 6、虚拟机配置文件

libivrt 能够识别到两种类型的虚拟机（参考[在 libvirt 中虚拟机状态](https://wiki.libvirt.org/page/VM_lifecycle)），`transient`类型的虚拟机只有在运行时才存在，磁盘中不会存储虚拟机配置文件信息。`persistent`类型的虚拟机会在磁盘上保存一份虚拟机配置文件，无论是否在运行。

默认情况下，迁移操作不会修改虚拟机定义文件。管理虚拟机配置文件是管理员、管理系统的责任。注意：`etc/libvirt`文件目录**绝对不能**够在 Host 之间共享。下面是一些典型的场景：

- 在 libvirt 之外的共享存储中集中管理虚拟机配置文件。支持集群的管理应用程序可以在集群文件系统中维护所有主要的 guest 配置文件。当想要启动一个 guest 时，就从集群文件系统中读取配置文件，创建一个`persistent`虚拟机。迁移的时候，需要将该配置文件从 srcHost 复制到 destHost 并删除原件。
- 在 libvirt 之外的数据库中集中管理虚拟机配置文件。数据中心管理应用可能完全不会存储虚拟机配置文件。只有当 guest 启动时，它才生成一个虚拟机定义文件。它一般使用`transient`虚拟机。因此在迁移过程中无需考虑虚拟机配置文件。
- 在 libvirt 中分发虚拟机配置文件。虚拟机配置文件在所有 Host 上都保存一个副本。在迁移时，现有的配置只需要更新到最新的更改。
- 在 libvirt 中进行专门的配置管理，每个 Guest 都被绑定到特定的 Host 上，并且很少迁移。当需要迁移的时候，需要将配置文件从一个 Host 移动到另一个 Host。

在默认情况下 libvirt 在迁移时不会修改配置文件。`virsh`命令中有两个 flag 可以影响这个行为。`--undefine-source`flag 将使 srcHost 上的虚拟机配置文件在迁移后被移除。`--persist`flag 将使 destHost 上在迁移成功后创建一个虚拟机配置文件。

>`--undefined-source`和`--persist`两个 flag 将使迁移后的虚拟机改变状态。

# 7、迁移实验

略。

# 8、libvirt API

https://libvirt.org/html/libvirt-libvirt-domain.html

## 8.1、相关宏

```c
#define VIR_MIGRATE_PARAM_AUTO_CONVERGE_INCREMENT
#define VIR_MIGRATE_PARAM_AUTO_CONVERGE_INITIAL
#define VIR_MIGRATE_PARAM_BANDWIDTH
#define VIR_MIGRATE_PARAM_BANDWIDTH_POSTCOPY
#define VIR_MIGRATE_PARAM_COMPRESSION
#define VIR_MIGRATE_PARAM_COMPRESSION_MT_DTHREADS
#define VIR_MIGRATE_PARAM_COMPRESSION_MT_LEVEL
#define VIR_MIGRATE_PARAM_COMPRESSION_MT_THREADS
#define VIR_MIGRATE_PARAM_COMPRESSION_XBZRLE_CACHE
#define VIR_MIGRATE_PARAM_DEST_NAME
#define VIR_MIGRATE_PARAM_DEST_XML
#define VIR_MIGRATE_PARAM_DISKS_PORT
#define VIR_MIGRATE_PARAM_GRAPHICS_URI
#define VIR_MIGRATE_PARAM_LISTEN_ADDRESS
#define VIR_MIGRATE_PARAM_MIGRATE_DISKS
#define VIR_MIGRATE_PARAM_PARALLEL_CONNECTIONS
#define VIR_MIGRATE_PARAM_PERSIST_XML
#define VIR_MIGRATE_PARAM_TLS_DESTINATION
#define VIR_MIGRATE_PARAM_URI
```

该宏被应用在 API（`virDomainMigrate3`和`virDomainMigrateToURI3`）的 nparams 参数

## 8.2、相关枚举量

```c
enum virDomainMigrateFlags {
VIR_MIGRATE_LIVE	=	1 (0x1; 1 << 0)	

VIR_MIGRATE_PEER2PEER	=	2 (0x2; 1 << 1)	

VIR_MIGRATE_TUNNELLED	=	4 (0x4; 1 << 2)	

VIR_MIGRATE_PERSIST_DEST	=	8 (0x8; 1 << 3)	

VIR_MIGRATE_UNDEFINE_SOURCE	=	16 (0x10; 1 << 4)	

VIR_MIGRATE_PAUSED	=	32 (0x20; 1 << 5)	

VIR_MIGRATE_NON_SHARED_DISK	=	64 (0x40; 1 << 6)	

VIR_MIGRATE_NON_SHARED_INC	=	128 (0x80; 1 << 7)	

VIR_MIGRATE_CHANGE_PROTECTION	=	256 (0x100; 1 << 8)	

VIR_MIGRATE_UNSAFE	=	512 (0x200; 1 << 9)	

VIR_MIGRATE_OFFLINE	=	1024 (0x400; 1 << 10)	

VIR_MIGRATE_COMPRESSED	=	2048 (0x800; 1 << 11)	

VIR_MIGRATE_ABORT_ON_ERROR	=	4096 (0x1000; 1 << 12)	

VIR_MIGRATE_AUTO_CONVERGE	=	8192 (0x2000; 1 << 13)	

VIR_MIGRATE_RDMA_PIN_ALL	=	16384 (0x4000; 1 << 14)	

VIR_MIGRATE_POSTCOPY	=	32768 (0x8000; 1 << 15)	

VIR_MIGRATE_TLS	=	65536 (0x10000; 1 << 16)	

}
```

该枚举量用于两种迁移 API 中的 flag 参数

```c
enum virDomainMigrateMaxSpeedFlags {
VIR_DOMAIN_MIGRATE_MAX_SPEED_POSTCOPY	=	1 (0x1; 1 << 0)	
}
```

该枚举量用于`virDomainMigrateSetMaxSpeed`和`virDomainMigrateGetMaxSpeed`。

## 8.3、相关 API

libvirt 中迁移的 API 共有两种共 6 个，一种是 virDomainMigrateX，一种是 virDomainMigrateToURIX。X 指迁移所用的协议是第 X 代的。

```c
virDomainPtr	virDomainMigrate	(virDomainPtr domain, 
					 virConnectPtr dconn, 
					 unsigned long flags, 
					 const char * dname, 
					 const char * uri, 
					 unsigned long bandwidth)
virDomainPtr	virDomainMigrate2	(virDomainPtr domain, 
					 virConnectPtr dconn, 
					 const char * dxml, 
					 unsigned long flags, 
					 const char * dname, 
					 const char * uri, 
					 unsigned long bandwidth)
virDomainPtr	virDomainMigrate3	(virDomainPtr domain, 
					 virConnectPtr dconn, 
					 virTypedParameterPtr params, 
					 unsigned int nparams, 
                     unsigned int flags)
```

这三个方法是迁移要用到的主要方法，三个方法都是通过`dest connect`将虚拟机从当前的 Host 迁移到目标 Host。不同的地方在于对参数的支持。

在完成虚拟机迁移之后，需调用`virDomainFree`释放不再需要的虚拟机资源。

```c
int	virDomainMigrateToURI		(virDomainPtr domain, 
					 const char * duri, 
					 unsigned long flags, 
					 const char * dname, 
					 unsigned long bandwidth)
int	virDomainMigrateToURI2		(virDomainPtr domain, 
					 const char * dconnuri, 
					 const char * miguri, 
					 const char * dxml, 
					 unsigned long flags, 
					 const char * dname, 
					 unsigned long bandwidth)
int	virDomainMigrateToURI3		(virDomainPtr domain, 
					 const char * dconnuri, 
					 virTypedParameterPtr params, 
					 unsigned int nparams, 
					 unsigned int flags)
```

三个方法相似，通过`dest uri`将当前 Host 上的虚拟机迁移到目标 Host 上。

**注意：**virDomainMigrateX 和 virDomainMigrateToURIX 虽然方法相似，但是它们属于不同的控制流。

- virDomainMigrateX 需要提供 destHost 上 libvirt 的`connect`(a connection to the destination host)，此时 client 端需要同时连接两个 Host，并且管理迁移过程。不支持`VIR_MIGRATE_PEER2PEER`和`VIR_MIGRATE_TUNNELLED`。

- virDomainMigrateToURIX 若设置了`VIR_MIGRATE_PEER2PEER`，那么需要提供`valid libvirt connection URI`。可选择`VIR_MIGRATE_TUNNELLED`。（这是目前 zstack-utility 使用的方式）
- virDomainMigrateToURIX 若未设置`VIR_MIGRATE_PEER2PEER`，那么需要提供`hypervisor specific URI`。该功能需要 hypervisor 支持，在 hypervisor 的 capabilities XML 中的 uri_transports 元素中包含了支持的 URI schemes。

控制流：

- virDomainMigrateX 使用的是`managed direct migration`

- virDomainMigrateToURIX 开启`VIR_MIGRATE_PEER2PEER`，使用的是`managed peer to peer migration`

- virDomainMigrateToURIX 关闭`VIR_MIGRATE_PEER2PEER`，使用的是`Unmanaged direct migration`

```c
int	virDomainMigrateGetCompressionCache	(virDomainPtr domain, 
						 unsigned long long * cacheSize, 
						 unsigned int flags)
int	virDomainMigrateSetCompressionCache	(virDomainPtr domain, 
						 unsigned long long cacheSize, 
						 unsigned int flags)
```

获取/设置用于在动态迁移时压缩多次转移的内存页的缓存大小 (Bytes)。（xbzrle 将用到该 API）。可在虚拟机运行时设置/修改该值。

```c
int	virDomainMigrateGetMaxDowntime	(virDomainPtr domain, 
					 unsigned long long * downtime, 
					 unsigned int flags)
int	virDomainMigrateSetMaxDowntime	(virDomainPtr domain, 
					 unsigned long long downtime, 
					 unsigned int flags)
```

设置/获取虚拟机在动态迁移最后阶段可能挂起的最大可容忍时间（最大可容忍 downtime）。可在虚拟机运行时设置/修改该值。

```c
int	virDomainMigrateGetMaxSpeed	(virDomainPtr domain, 
					 unsigned long * bandwidth, 
					 unsigned int flags)
int	virDomainMigrateSetMaxSpeed	(virDomainPtr domain, 
					 unsigned long bandwidth, 
					 unsigned int flags)
```

设置/获取当前最大迁移带宽（MiB/s）。可在虚拟机运行时设置/修改该值。并非所有 hypervisor 都支持该功能。

```c
int	virDomainMigrateStartPostCopy	(virDomainPtr domain, 
					 unsigned int flags)
```

开始 post-copy 迁移，该方法只在迁移过程中可被调用。

> libvirt 默认使用的是 pre-copy 的方式进行迁移，通过`virDomainMigrateStartPostCopy`方法可切换成 post-copy。
>
> post-copy 的优点在于，无论内存写入有多快，都不会增加迁移难度。缺点在于，可能会产生大量的 page faults，并且一旦开始就无法停止无法回滚。

