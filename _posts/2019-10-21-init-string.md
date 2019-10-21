---
layout: post
title:  "C分段初始化字符数组"
subtitle: ""
date:   2019-10-21 10:23:45 +0800
tags:
  - C
categories: [C]
comment: true
---

今天在研究怎么获取linux系统上pci设备相关的信息的时候，发现了pciutils这个工具（以后再讲这个工具）。然后打开github，下载源码，打开vscode，一套行云流水。

一看目录结构和LICENSE，是个标准的GNU项目，GNU项目一般使用`getopt`解析参数。

打开源码一看，这个options参数有点奇怪，源码：`/pciutils/lspci.c`

```c
static char options[] = "nvbxs:d:ti:mgp:qkMDQ" GENERIC_OPTIONS ;
```

这个options初始化有点奇怪，后面的宏定义是什么意思？源码：`/pciutils/pciutils.h`

```c
#ifdef PCI_HAVE_PM_INTEL_CONF
#define GENOPT_INTEL "H:"
#define GENHELP_INTEL "-H <mode>\tUse direct hardware access (<mode> = 1 or 2)\n"
#else
#define GENOPT_INTEL
#define GENHELP_INTEL
#endif
#if defined(PCI_HAVE_PM_DUMP) && !defined(PCIUTILS_SETPCI)
#define GENOPT_DUMP "F:"
#define GENHELP_DUMP "-F <file>\tRead PCI configuration dump from a given file\n"
#else
#define GENOPT_DUMP
#define GENHELP_DUMP
#endif

#define GENERIC_OPTIONS "A:GO:" GENOPT_INTEL GENOPT_DUMP
#define GENERIC_HELP \
	"-A <method>\tUse the specified PCI access method (see `-A help' for a list)\n" \
	"-O <par>=<val>\tSet PCI access parameter (see `-O help' for a list)\n" \
	"-G\t\tEnable PCI access debugging\n" \
	GENHELP_INTEL GENHELP_DUMP
```

后面的宏定义是根据不同的编译选项，选择支持某些options。如果define了 GENERIC_OPTIONS 那么就添加“A:GO:”等等。将宏定义解开来就是这个形式：

```c
static char test[] = "this is string1" "and" "this is string2";
```

C中还可以这样初始化字符串？！！我查找了一些资料，但是并没有找到相关的内容，所以这么无聊的问题我也写出来放到博客里:)。

个人猜测这个应该是编译器进行的优化，它并不会解释成`this is string1" "and" "this is string2`而是将几段字符串拼接了起来"this is string1andthis is string2"。

```c
#include <stdio.h>
#include <string.h>

static char test[] = "this is string1" "and" "this is string2";
char test2[] = "this is string3" "and" "this is string4";

int main() {
    char test3[34];
    strcpy(test3, "this is string5" "and" "this is string6");


    printf("%s\n", test);
    printf("%s\n", test2);
    printf("%s\n", test3);

    return 0;
}
```

在函数中也同样可以使用，看来和java的`+`相似，具体的情况等以后深入使用再说。