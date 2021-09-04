---
layout: post
title:  "Windows 硬件资源"
subtitle: ""
date:   2020-2-20 11:13:45 +0800
tags:
  - Windows
  - driver
categories: [Windows]
comment: true
---

一个系统的硬件资源包括 I/O 端口、中断向量、DMA 通道以及必须分配给连接到系统的每个设备的其他通信路径。本文内容讲解了 KMDF 驱动如何与 device 交流硬件资源需求，检查已有的资源列表然后接收指定的资源。本文同样讲解了 KMDF 和 UMDF 驱动如何访问和映射已分配的资源。

# 1、硬件资源简介

用户插入一个 PnP 设备之后，[枚举设备](https://docs.microsoft.com/en-us/windows-hardware/drivers/wdf/enumerating-the-devices-on-a-bus)的驱动一般会创建一个或多个[逻辑配置](https://docs.microsoft.com/windows-hardware/drivers/kernel/hardware-resources#ddk-logical-configurations-kg)，这些配置由设备能够使用的硬件资源组成。这些配置包含：

- 一个启动配置，列举了系统启动时该设备需要的硬件资源。例如：对于 PnP 设备来说，这些信息由 BIOS 来提供）；
- 一些能够被设备操作的额外配置。驱动将这些额外配置组织在一个[resource requirements list](https://docs.microsoft.com/windows-hardware/drivers/kernel/hardware-resources)中。最终将由 PnP 管理器从该列表中选取资源并分配给设备。

驱动创建完逻辑配置之后，将它们发送到框架中，由框架将它们发送到 PnP 管理器。

接下来，由 PnP 管理器决定设备需要使用那个驱动，同时如果没有提前加载驱动就马上加载它。PnP 管理器将设备的硬件需求列表发送给设备的驱动检查。功能和过滤型驱动可以修改该列表并且返回给 PnP 管理器。

PnP 管理器审查修改后的硬件需求列表，最后确定那个指定的资源在这个系统上时可用的。如果设备要求的资源早已被分配给其它设备，PnP 管理器尝试在系统设备之间[重新分配资源](https://docs.microsoft.com/en-us/windows-hardware/drivers/wdf/handling-requests-to-stop-a-device#redistributing-resources)







-km -scan:"trace.h" -odir:"x64\Debug\" -cfgdir:"C:\Program Files (x86)\Windows Kits\10\bin\10.0.18362.0\wppconfig\rev1" 

