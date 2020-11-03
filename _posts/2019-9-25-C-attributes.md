---
layout: post
title:  "C语言中的__attributes__"
subtitle: ""
date:   2019-9-25 16:56:09 +0800
tags:
  - C
  - gcc
categories: [C]
---

`__attributes__()`是GNU C支持的一个机制，因此使用该机制需要确保GNU C标准适用于你的编译器，`__attributes__()`可放置在函数、变量或类型的声明前，从而使得编译器对该内容进行某些特殊处理。

例如：在Function前使用

constructor
destructor

使用constructor（构造）会使该方法在运行main()方法前被自动调用，相同的destructor会使该方法在main()方法运行后或者exit()方法运行之后被自动调用（注：atexit()方法也可做到main执行后调用）。

linux运行 elf程序链接、启动过程如下图：

![](..\pictures\elf_callgraph.png)

调试QEMU中对应部分程序：

![](..\pictures\C_constructor.jpg)

实际上，使用constructor属性，使得该函数在`__libc_csu_init()`中被调用，在main方法被调用之前，由此可看出`__attributes__`机制可以影响编译器，是一个编译器相关的特性，需要编译器支持。



[Function-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Function-Attributes.html
[Type-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Type-Attributes.html
[Variable-Attributes]: https://gcc.gnu.org/onlinedocs/gcc-4.0.0/gcc/Variable-Attributes.html

