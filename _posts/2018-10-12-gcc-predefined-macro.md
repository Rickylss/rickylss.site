---
layout: post
title:  "gcc 预定义宏"
subtitle: ""
date:   2018-10-12 20:13:45 +0800
tags:
  - gcc
  - SW
  - libvirt
categories: [libvirt]
---

 在 linux 环境下编写代码时，会经常遇到想要根据不同的机器架构（arch）或者不同的操作系统，针对性地编译一段代码的情况。

### 针对性地编译一段代码

假设你想要对不同的架构做不同的编译处理，你可以尝试使用以下的方法：

``` c
#if defined(__x86_64__)
/* x86_64 */
#endif
#if defined(__i386__)
/* todo somthing */
#endif
#if defined(__arch__)
/* todo something */
#endif
```

在 make 程序的时候，gcc 会根据某个宏是否已定义来判断是否需要编译该部分代码块。

那么问题来了，**C 中宏要么在程序源码中定义，要么在编译时 Makefile 文件中定义（如：--with-qemu），这里使用的宏是在哪里定义的呢** ？

答案是：gcc 预定义的宏。

### 查看预定义宏

``` shell
$ gcc -posix -E -dM - </dev/null
```

在终端输入这条命令就可以把 gcc 中预定义的宏全都打印出来了。

### 在 libvirt 中的实际应用

在 virsysinfo.c 中的 virSysinfoRead 方法中：

``` c
virSysinfoDefPtr
virSysinfoRead(void)
{
#if defined(__powerpc__)
    return virSysinfoReadPPC();
#elif defined(__arm__) || defined(__aarch64__)
    return virSysinfoReadARM();
#elif defined(__s390__) || defined(__s390x__)
    return virSysinfoReadS390();
#elif defined(__sw_64__)
    return virSysinfoReadSW64();
#elif defined(WIN32) || \
    !(defined(__x86_64__) || \
      defined(__i386__) ||   \
      defined(__amd64__) || \
      defined(__arm__) || \
      defined(__aarch64__) || \
      defined(__powerpc__) || \
      defined(__sw_64__))
    /*
     * this can probably be extracted from Windows using API or registry
     * http://www.microsoft.com/whdc/system/platform/firmware/SMBIOS.mspx
     */
    virReportSystemError(ENOSYS, "%s",
                         _("Host sysinfo extraction not supported on this platform"));
    return NULL;
#else /* !WIN32 && x86 */
    return virSysinfoReadX86();
#endif /* !WIN32 && x86 */
}
```

在这里由于 sw 架构的原因（不支持 dmicode），要为其单独加入一个系统信息读取方式。这就需要判断当前架构是否为 sw_64，因此在这里使用 gcc-sw 的预定义宏，以此来实现功能。