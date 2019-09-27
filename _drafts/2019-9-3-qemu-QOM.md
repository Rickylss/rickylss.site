---
layout: post
title:  "QEMU QOM和QDev"
subtitle: "qemu设备模型"
date:   2019-6-25 16:56:09 +0800
categories: [qemu, qom, qdev]
---

https://wiki.qemu.org/Features/QOM

> qemu作为一款虚拟仿真器，内部实现了许多常用的控制器和外设，但是在早期版本中，并没有统一设备模型，导致设备的配置和创建混乱，后采用QDev的方式统一了设备模型，采用设备树的方式。

## 1、QDev

QDev中核心的两个步骤

### 1.1、devices and busses

devices和busses是QDev中两个核心概念，devices可理解为代表了所有外设和控制器，busses可理解为代表连接外设和控制器之间的总线。注意：*bus并不是总对应于真实的物理设备*。

在QEMU代码中，device抽象为结构体`DeviceState`;

```c
/**
 * DeviceState:
 * @realized: Indicates whether the device has been fully constructed.
 *
 * This structure should not be accessed directly.  We declare it here
 * so that it can be embedded in individual device state structures.
 */
struct DeviceState {
    /*< private >*/
    Object parent_obj;
    /*< public >*/

    const char *id;
    bool realized;
    bool pending_deleted_event;
    QemuOpts *opts;
    int hotplugged;
    BusState *parent_bus;
    QLIST_HEAD(, NamedGPIOList) gpios;
    QLIST_HEAD(, BusState) child_bus;
    int num_child_bus;
    int instance_id_alias;
    int alias_required_for_version;
};
```

bus抽象为`BusState`;

```c
/**
 * BusState:
 * @hotplug_device: link to a hotplug device associated with bus.
 */
struct BusState {
    Object obj;
    DeviceState *parent;
    const char *name;
    HotplugHandler *hotplug_handler;
    int max_index;
    bool realized;
    QTAILQ_HEAD(ChildrenHead, BusChild) children;
    QLIST_ENTRY(BusState) sibling;
};
```

device通过bus互相连接，device之间没有直接的连接关系。在上面两个struct中可以看到，device有一个`parent_bus`和多个`child_bus`，bus有一个`parent`设备和多个`children`。由此可见：

1. device和bus都只有一个parent，而children则可有0到多个；
2. device和bus交错相接，即一个device接一个bus，一个bus接一个device，如此反复；
3. device和bus交错相接形成一棵设备树，这棵树的根节点是SysBus;



## 2、QOM

