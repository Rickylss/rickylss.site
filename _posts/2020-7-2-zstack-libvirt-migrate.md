---
layout: post
title:  "libvirt 迁移实验"
subtitle: ""
date:   2020-7-2 19:13:45 +0800
tags:
  - libvirt
categories: [libvirt]
comment: true
---

在 zstack 环境下，通过 virsh 直接迁移虚拟机，测试不同选项对虚拟机迁移的影响。

# 默认迁移

默认的迁移方式即`managed direct migration`方式，迁移命令：

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d qemu+tcp://172.31.6.12/system

real    0m6.589s
user    0m0.007s
sys     0m0.009s
```

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d qemu+tcp://172.31.6.11/system

real    0m6.741s
user    0m0.011s
sys     0m0.006s
```

# direct 选项

添加`--direct`选项对应`Unmanaged direct migration`方式，迁移命令：

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d tcp://172.31.6.11 --direct
error: argument unsupported: direct migration is not supported by the source host

real    0m0.014s
user    0m0.006s
sys     0m0.007s
```

QEMU 的 feature 中不支持`direct`方式迁移

# p2p 选项

添加`--p2p`选项对应`managed peer to peer migration`方式，迁移命令：

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d qemu+tcp://172.31.6.11/system --p2p

real    0m6.598s
user    0m0.006s
sys     0m0.009s
```



## tunnelled 选项

添加`--tunnelled`可使用 libvirt 代理迁移，可使用加密功能，迁移命令：

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d qemu+tcp://172.31.6.11/system --p2p --tunnelled

real    0m6.606s
user    0m0.006s
sys     0m0.010s
```



# 模拟 zstack 默认迁移方式

```bash
$ time virsh migrate 83195712b6ce4368a8bd9d6dc65e438d qemu+tcp://172.31.6.11/system --live --p2p --undefinesource
```

在不开启 converge 的情况下添加 xbzrle 压缩

```plain
virsh qemu-monitor-command uuid --hmp info migrate
virsh domjobinfo uuid
```



managed direct 

```json
{
    "return": {
        "status": "completed", 
        "setup-time": 43, 
        "downtime": 30, 
        "total-time": 22004, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 5, 
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 507.311245, 
            "transferred": 1394795636, 
            "duplicate": 1765164, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1376219136, 
            "normal": 335991
        }
    }, 
    "id": "libvirt-340"
}

{
    "return": {
        "status": "completed", 
        "setup-time": 43, 
        "downtime": 507, 
        "total-time": 23166, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 4, 
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 480.903634, 
            "transferred": 1392012875, 
            "duplicate": 1765147, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1373442048, 
            "normal": 335313
        }
    }, 
    "id": "libvirt-152"
}
```



p2p no tunnel

```json
{
    "return": {
        "status": "completed", 
        "setup-time": 45, 
        "downtime": 240, 
        "total-time": 12287, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 4, 
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 905.988418, 
            "transferred": 1390921209, 
            "duplicate": 1765153, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1372352512, 
            "normal": 335047
        }
    }, 
    "id": "libvirt-322"
}

{
    "return": {
        "status": "completed",
        "setup-time": 44, 
        "downtime": 201, 
        "total-time": 13705, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 4, 
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 811.73078, 
            "transferred": 1390032340, 
            "duplicate": 1765324, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1371463680, 
            "normal": 334830
        }
    }, 
    "id": "libvirt-335"
}
```



p2p tunnelled

```json
{
    "return": {
        "status": "completed", 
        "setup-time": 44, 
        "downtime": 195, 
        "total-time": 13336, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 4, 
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 836.807119, 
            "transferred": 1394393445, 
            "duplicate": 1765157, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1375817728, 
            "normal": 335893
        }
    }, 
    "id": "libvirt-171"
}

{
    "return": {
        "status": "completed", 
        "setup-time": 44, 
        "downtime": 238, 
        "total-time": 14090, 
        "ram": {
            "total": 8594989056, 
            "postcopy-requests": 0, 
            "dirty-sync-count": 4,
            "page-size": 4096, 
            "remaining": 0, 
            "mbps": 790.127935,
            "transferred": 1391048672, 
            "duplicate": 1765144, 
            "dirty-pages-rate": 0, 
            "skipped": 0, 
            "normal-bytes": 1372479488, 
            "normal": 335078
        }
    },
    "id": "libvirt-99"
}
```



umanaged direct

`QEMU do not support`