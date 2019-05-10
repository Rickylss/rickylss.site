---
layout: post
title:  "QEMU arm大小端问题"
subtitle: ""
date:   2019-5-9 16:56:09 +0800
categories: [qemu, arm]
---

# QEMU arm 大小端问题

>在qemu2.7.1上开发tms570ls3137板级设备时，遇到了一个大小端的问题。本文将详细描述该问题，并对测试过程进行记录。

## 1、问题描述

- 目前PC上以x86体系结构为代表的小端机为主，因此在qemu最初的实现里只考虑到了对小端机的支持。但是目前仍有一部分以arm为核心的板子采用大端序。
- 因此在2016年，qemu增加了对arm大端的支持，详细的内容可以查看[qemu开发邮件]( https://lists.gnu.org/archive/html/qemu-devel/2016-01/msg03025.html) 
- 即便如此，在开发时依旧遇到了一些问题，包括：gdb调试地址大小端出错，数据顺序颠倒等。

## 2、qemu中arm大小端解决方式

arm芯片是可以切换大小端模式的，可以通过设置sctlr和cpsr来实现，具体的内容可以查看芯片手册。对一块板子的大小端限制一般来自于外设。

在启动qemu程序时，首先会读取elf文件的header从而判断该文件是大端或是小端，得知elf文件的大小端信息后，qemu会去设置cpu的sctlr和cpsr，从而切换到想要的模式，这样就使qemu上的armcpu即可运行小端程序也可运行大端程序。如果想要在自己实现的板子上限制大小端，则可将外设中的MemoryRegionOps.endianness设置为想要的字节序。

关键代码`/qemu2.7.1/hw/arm/boot.c`

```c
static void do_cpu_reset(void *opaque)
{
    ARMCPU *cpu = opaque;
    CPUState *cs = CPU(cpu);
    CPUARMState *env = &cpu->env;
    const struct arm_boot_info *info = env->boot_info;

    cpu_reset(cs);
    if (info) {
        if (!info->is_linux) {
            int i;
            /* Jump to the entry point.  */
            uint64_t entry = info->entry;

            switch (info->endianness) {
            case ARM_ENDIANNESS_LE:
                env->cp15.sctlr_el[1] &= ~SCTLR_E0E;
                for (i = 1; i < 4; ++i) {
                    env->cp15.sctlr_el[i] &= ~SCTLR_EE;
                }
                env->uncached_cpsr &= ~CPSR_E;
                break;
            case ARM_ENDIANNESS_BE8:
                env->cp15.sctlr_el[1] |= SCTLR_E0E;
                for (i = 1; i < 4; ++i) {
                    env->cp15.sctlr_el[i] |= SCTLR_EE;
                }
                env->uncached_cpsr |= CPSR_E;
                break;
            case ARM_ENDIANNESS_BE32:
                env->cp15.sctlr_el[1] |= SCTLR_B;
                break;
            case ARM_ENDIANNESS_UNKNOWN:
                break; /* Board's decision */
            default:
                g_assert_not_reached();
            }

            if (!env->aarch64) {
                env->thumb = info->entry & 1;
                entry &= 0xfffffffe;
            }
            cpu_set_pc(cs, entry);
        } else {
           ……
    }
}
```

外设（如：pl011）字节序设置`/qemu2.7.1/hw/char/pl011.c`

```c
static const MemoryRegionOps pl011_ops = {
    .read = pl011_read,
    .write = pl011_write,
    .endianness = DEVICE_NATIVE_ENDIAN,//修改为DEVICE_BIG_ENDIAN或DEVICE_LITTLE_ENDIAN
};
```

## 3、解决方法

在我寻找解决方法的时候，发现已经有人遇到过相同的问题，并且在Qemu-devel中有相关的[邮件记录](https://lists.gnu.org/archive/html/qemu-devel/2017-08/msg02186.html)

其中提到的情况与我遇到的完全相符：

- 通过gdb调试qemu，qemu中pc值完全正确，并且进入到了外设读写数据的相关流程；
- gdb调试裸金属程序，gdb中的地址以错误的大小端模式显示；
- 使用x命令打印时大小端正常；
- 数据的顺序出错，如：HelloWorld变成了 lleHlroW；



```

```



