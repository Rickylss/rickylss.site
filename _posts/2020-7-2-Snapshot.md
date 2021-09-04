---
layout: post
title:  "snapshot 快照"
subtitle: ""
date:   2020-7-2 19:13:45 +0800
tags:
  - qemu
  - snapshot
categories: [QEMU]
comment: true
---

snapshot 需要保存在支持`backing files`的镜像文件格式中，比如 QCOW2 和 QED。但是着并不是说原镜像也要支持`backing files`，原镜像可以是任何格式。举例来说，我们可以从 RAW 格式镜像中创建一个 QCOW2 格式或者 QED 格式的 snapshot

# backing file

https://github.com/Rickylss/hammerdb_to_excel/archive/master.zip