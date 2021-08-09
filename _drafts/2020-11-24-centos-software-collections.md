---
layout: post
title:  "software collections"
subtitle: ""
date:   2020-11-24 10:13:45 +0800
tags:
  - linux
categories: [linux]
comment: true
---

一般发行版会带有一套配套的开发工具，这套开发工具的版本通常是配置好的。但是很多时候你可能想要使用其他版本的开发工具，这个时候如果要重新编译或者自己去解决一系列依赖问题，就会非常头疼了。今天介绍一个`Developer Toolset`可以解决这个头疼的问题。

# Developer Toolset

Developer Toolset is designed for developers working on CentOS or Red Hat Enterprise Linux platform. It provides current versions of the GNU Compiler Collection, GNU Debugger, and other development, debugging, and performance monitoring tools.

> Developer Toolset 是为在 CentOS 或者 Red Hat 发行版上工作的开发者设计的。它提供了最新的 GNU 编译器、GNU 调试器以及其他的开发、调试、性能监控工具。

## 安装使用

1. 安装 scl 仓库

```bash
# 在CentOS下
$ sudo yum install centos-release-scl
# 在RHEL下
$ sudo yum-config-manager --enable rhel-server-rhscl-7-rpms
# 安装对应的工具集
$ sudo yum install devtoolset-N
# 使用对应的工具集
$ scl enable devtoolset-N bash
# 查看可使用的工具集
$ yum list devtoolset-N\*
```

> 注意`devtoolset-N`中`N`可以是 7、8、9……，它代表了你想要使用的工具集的版本号。

2. 退出工具集

```bash
$ exit
```