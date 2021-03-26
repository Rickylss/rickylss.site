---
layout: post
title:  "Linux 汇编"
subtitle: ""
date:   2020-1-5 9:35:45 +0800
tags:
  - GNU
  - as
categories: [GNU, as]
comment: true
---

>想要读懂 Linux 内核源码，尤其是启动过程以及涉及到硬件操作、中断等代码就绕不开汇编这座大山，绕不开就把它干烂！！

# 1、汇编语法格式

目前常用的汇编代码有两种风格，Intel 格式和 AT&T 格式。两者在语法格式上又很大的不 同。

DOS/Windows 下使用的就是 Intel 风格的汇编代码，在 Unix 和 Linux 系统中更多采用的是 AT&T 风格。这两种风格的差别在后文中将详细阐述。

# 2、汇编器

以 C 代码的编译过程为例，经过预处理->编译->汇编->链接，最终生成可执行文件，在编译成汇编文件之后，通过汇编器完成接下来的操作。

Linux 平台的标准汇编器是 GAS（可执行文件名称为 as，也可称之为 as），它是 GNU 计划所使用的汇编器，也是就是 gcc 使用的汇编器，gcc 后台的汇编工具就是它。GAS 使用标准的 AT&T 汇编语法，可以用来汇编用 AT&T 格式编写的程序：

```shell
$ as -o hello.o hello.s
```

Linux 平台上经常使用的另一个汇编器是 NASM，它采用人工编写的语法分析器，执行速度比 GAS 快很多，而且它使用的是 Intel 汇编语法，可以用来编译用 Intel 语法格式编写的汇编程序：

```shell
$ nasm -f elf hello.asm
```

# 3、GCC 内联汇编





