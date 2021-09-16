---
layout: post
title:  "C 语言中的__attributes__"
subtitle: ""
date:   2019-9-25 16:56:09 +0800
tags:
  - C
  - gcc
categories: [C]
---

`__attributes__()`是 GNU C 支持的一个机制，因此使用该机制需要确保 GNU C 标准适用于你的编译器，`__attributes__()`可放置在函数、变量或类型的声明前，从而使得编译器对该内容进行某些特殊处理。

<!-- more -->

例如：在 Function 前使用

constructor
destructor

使用 constructor（构造）会使该方法在运行 main()方法前被自动调用，相同的 destructor 会使该方法在 main()方法运行后或者 exit()方法运行之后被自动调用（注：atexit()方法也可做到 main 执行后调用）。

linux 运行 elf 程序链接、启动过程如下图：

![](..\pictures\elf_callgraph.png)

调试 QEMU 中对应部分程序：

![](..\pictures\C_constructor.jpg)

实际上，使用 constructor 属性，使得该函数在`__libc_csu_init()`中被调用，在 main 方法被调用之前，由此可看出`__attributes__`机制可以影响编译器，是一个编译器相关的特性，需要编译器支持。



[Function-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Function-Attributes.html
[Type-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Type-Attributes.html
[Variable-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Variable-Attributes.html

