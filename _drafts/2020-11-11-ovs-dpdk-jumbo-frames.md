---
layout: post
title:  "ovs-dpdk Jumbo Frames 配置"
subtitle: ""
date:   2020-11-11 10:13:45 +0800
tags:
  - network
  - ovs
categories: [network]
comment: true
---

DPDk 端口默认为标准的 MTU（1500B），想要开启巨型帧（Jumbo Frames）需要修改一些特定的配置。

# ovs 开启 Jumbo Frames

开启巨型帧需要修改对应 interface 的`mtu_request`，假设修改 vDPA1 的 mtu 为 9000，只需要执行如下命令：

```bash
$ ovs-vsctl set interface vdpa1 mtu_request=9000
```

# 添加 qemu 与 libvirt 支持

要使用 jumbo Frames，还需要修改 qemu 或 libvirt。必须开启 mergeable buffers。

1. qemu

   ```bash
   $ qemu-kvm ... vhost-user,id=mynet1,chardev=char0,vhostforce \
   -device virtio-net-pci,mac=00:00:00:00:00:01,netdev=mynet1,mrg_rxbuf=on
   ```

2. libvirt

   ```xml
       <interface type='vhostuser'>
         <mac address='de:75:cc:30:86:84'/>
         <source type='unix' path='/var/run/virtio-forwarder/sock1' mode='server'/>
         <model type='virtio'/>
         <driver queues='16'>
           <host mrg_rxbuf='on'/>
         </driver>
         <address type='pci' domain='0x0000' bus='0x00' slot='0x17' function='0x0'/>
       </interface>
   ```

在虚拟机中将对应网卡 MTU 设置为相同的大小：

```bash
$ ip link set eth1 mtu 9000
```

# 使用 ping 测试

使用`ping -s [packet_size] -M do [dest_ip]`命令进行测试。

`-s`制定要发出的包的大小。`-M`指定要使用的[PMTUD](https://en.wikipedia.org/wiki/Path_MTU_Discovery)策略。

> PMTUD 是一个用于在两个 IP 主机之间的路径上确定 MTU 大小的标准技术。对于 IPv4 包，它通过设置 IP 头部的*Don't Fragment(DF)*标志来工作。在这条路径上 MTU 小于该包大小的设备将会 drop 掉这个包，并且返回一个 ICMP，让源主机减小包大小。步骤不断重复，直到 MTU 小到满足路径上所有设备。

`ping`命令的`-M`选项指定 PMTUD 策略：

```man
 -M pmtudisc_opt
              Select  Path MTU Discovery strategy.  pmtudisc_option may be either do (prohibit fragmentation, even
              local one), want (do PMTU discovery, fragment locally when packet size is large), or  dont  (do  not
              set DF flag).
```

我们采用 do 策略配合指定包大小，来判断 MTU 是否修改成功。

测试结果显示:

1. 虚拟机中是否设置 mtu 并不影响实际的 mtu，即便虚拟机中 mtu 设置为 1500，依旧能够收到 9000 的包，但是 fragment 会被切割成 1500；
2. 虚拟机中设置成 mtu 能够收到完整的 9000 大小的包，而不会被切割；

# Reference

https://docs.openvswitch.org/en/latest/topics/dpdk/jumbo-frames/

https://doc.dpdk.org/dts/test_plans/vf_jumboframe_test_plan.html?highlight=jumboframe

https://libvirt.org/formatdomain.html

https://software.intel.com/content/www/us/en/develop/articles/configuration-and-performance-of-vhost-virtio-in-data-plane-development-kit-dpdk.html