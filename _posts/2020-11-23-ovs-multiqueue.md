---
layout: post
title:  "ovs-dpdk 多队列"
subtitle: ""
date:   2020-11-23 10:13:45 +0800
tags:
  - network
  - ovs
categories: [network]
comment: true
---

# 配置

1. 配置 PMD 和 RXQs

   ```bash
   $ ovs-vsctl set Open_vSwitch . other_config:pmd-cpu-mask=6
   $ ovs-vsctl set Interface pf0 options:n_rxq=2
   $ ovs-vsctl set Interface pf1 options:n_rxq=2
   ```

2. 使用命令查看 queue 在 pmd 上的分布

   ```bash
   $ ovs-appctl dpif-netdev/pmd-rxq-show
   pmd thread numa_id 0 core_id 1:
     isolated : false
     port: pf0               queue-id:  0 (enabled)   pmd usage:  0 %
     port: vdpa0             queue-id:  0 (enabled)   pmd usage:  0 %
     port: vdpa1             queue-id:  1 (enabled)   pmd usage:  0 %
     port: vdpa2             queue-id:  0 (enabled)   pmd usage:  0 %
     port: vdpa3             queue-id:  1 (enabled)   pmd usage:  0 %
   pmd thread numa_id 0 core_id 2:
     isolated : false
     port: pf0               queue-id:  1 (enabled)   pmd usage:  0 %
     port: pf1               queue-id:  0 (enabled)   pmd usage:  0 %
     port: pf1               queue-id:  1 (enabled)   pmd usage:  0 %
     port: vdpa0             queue-id:  1 (enabled)   pmd usage:  0 %
     port: vdpa1             queue-id:  0 (enabled)   pmd usage:  0 %
     port: vdpa3             queue-id:  0 (enabled)   pmd usage:  0 %
   ```

3. 配置 libvirt 设置队列数

   ```xml
       <interface type='vhostuser'>
         <mac address='de:75:cc:e1:c6:85'/>
         <source type='unix' path='/var/run/virtio-forwarder/sock3' mode='server'/>
         <model type='virtio'/>
         <driver queues='2'/>
         <address type='pci' domain='0x0000' bus='0x00' slot='0x18' function='0x0'/>
       </interface>
   ```

   >libvirt 在生成 qemu 命令的时候会自动将 vector 设置成`2 * queues + 2`。vector 代表[MSI-X 中断向量](https://en.wikipedia.org/wiki/Message_Signaled_Interrupts)。

4. 在虚拟机中设置 interface 的 channel 数

   ```bash
   $ ethtool -l eth0
   $ ethtool -L eth0 combined 2
   $ ethtool -L eth1 combined 2
   ```

# Reference

https://docs.openvswitch.org/en/latest/howto/dpdk/