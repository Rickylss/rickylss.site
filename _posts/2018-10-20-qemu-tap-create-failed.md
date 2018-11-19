---
layout: post
title:  "qemu创建tap设备时/dev/net/tun读取失败"
subtitle: ""
date:   2018-10-20 16:45:16 +0800
categories: [libvirt, qemu]
---

# qemu创建tap设备时/dev/net/tun读取失败

​	在申威平台上移植libvirt4.5时，遇到一个奇怪的问题，在虚拟机定义文件中无法使用-netdev tap选项。但是将命令行复制出来手动执行时，却没有问题。

``` 
-netdev tap,br=,helper=,id=
-device virtio-net-dev,netdev=
```

报错：

``` 
could not open file /dev/net/tun no such file or ...
```



经过多番查找，终于找到一个解决方法

``` 
Thanks for the suggestion, Matt!

I just tried it on a RHEL system and it does indeed solve the problem.

So, in summary, in order to use <interface type='ethernet'>, you must make the following changes to your system:

1) disable SELinux

2) in /etc/libvirt/qemu.conf add/edit the following lines:

  a) clear_emulator_capabilities = 0
  b) user = root
  c) group = root
  d)
     cgroup_device_acl = [
         "/dev/null", "/dev/full", "/dev/zero",
         "/dev/random", "/dev/urandom",
         "/dev/ptmx", "/dev/kvm", "/dev/kqemu",
         "/dev/rtc", "/dev/hpet", "/dev/net/tun",
     ]

Since each of these steps is decreasing security on the system, we obviously can't configure things this way by default. The fix for this "bug" then, is to put this somewhere useful in documentation. What is the best place for that? Should this BZ be closed as NOTABUG, or should it be made dependent on some in-tree change to documentation?
```

[原文](https://bugzilla.redhat.com/show_bug.cgi?id=770020) 

重启libvirtd后，成功。