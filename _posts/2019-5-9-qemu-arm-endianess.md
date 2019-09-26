---
layout: post
title:  "QEMU arm大小端问题"
subtitle: ""
date:   2019-5-9 16:56:09 +0800
tags:
  - qemu
  - arm
categories: [QEMU]
---

 在qemu2.7.1上开发tms570ls3137板级设备时，遇到了一个大小端的问题。本文将详细描述该问题，并对测试过程进行记录。

## 1、问题描述

- 目前PC上以x86体系结构为代表的小端机为主，因此在qemu最初的实现里只考虑到了对小端机的支持。但是目前仍有一部分以arm为核心的板子采用大端序。
- 因此在2016年，qemu增加了对arm大端的支持，详细的内容可以查看[qemu开发邮件]( https://lists.gnu.org/archive/html/qemu-devel/2016-01/msg03025.html) 
- 即便如此，我在开发时依旧遇到了一些问题，包括：gdb调试地址大小端出错，数据顺序颠倒等。

## 2、qemu中arm大小端解决方式

在真实硬件中arm芯片是可以通过设置sctlr和cpsr寄存器切换大小端模式的，详细内容可以查看芯片手册。对一块板子来说大小端限制一般来自于外设。

QEMU启动虚拟板级设备时首先会读取elf文件的header从而判断该文件是大端或是小端，在得知elf文件的大小端信息后，QEMU会去设置arm cpu的sctlr和cpsr，从而切换到想要的模式并设置`info->endiannes`，这样就使QEMU上的arm cpu即可运行小端程序也可运行大端程序。如果想要在自己实现的板子上限制大小端，则可设置外设中的`MemoryRegionOps.endianness`属性。

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

根据[邮件列表](https://lists.nongnu.org/archive/html/qemu-devel/2017-01/msg04386.html)中的patch将代码加上，就可以了。

**注意**：在添加完patch之后，还需要修改一个地方，否则在发生中断之后大小端依然会出错。

在`qemu/target-arm/helper.c`文件中

```c
@ -6418,7 +6418,7 @@ static void arm_cpu_do_interrupt_aarch32(CPUState *cs)
    /* Set new mode endianness */
    env->uncached_cpsr &= ~CPSR_E;
    if (env->cp15.sctlr_el[arm_current_el(env)] & SCTLR_EE) {
-       env->uncached_cpsr |= ~CPSR_E; //set new mode endianness
+       env->uncached_cpsr |= CPSR_E;
    }
    env->daif |= mask;
    /* this is a lie, as the was no c1_sys on V4T/V5, but who cares
```

这个问题在邮件中也有提到，但是patch中并没有修改，因此需要格外注意。

## 4、tms570大端be8与be32之谜

tms570是大端机，但是它属于大端的那个模式呢，在tms570手册中，它可以使用be32模式，但是在cortexr4f的文档中，我发现，它是不能使用be32模式，只能使用be8模式。

![cortexr4f手册](\pictures\cortexr4f-bigendian.png)

同时，当我在网上查询这个问题的时候，发现早也有人对此提出疑问，在QMEU[开发邮件](<https://lists.gnu.org/archive/html/qemu-devel/2013-03/msg00033.html>)中可看到详细信息。

同时，长期使用在tms570上开发的朋友却告诉我，在真实硬件上是使用be32模式。

因此这里应该是手册描述错误。

这里不是错误。。。。。这是由于TI对be32做了转换，把它转换成了be8

[官方答复](https://e2e.ti.com/support/microcontrollers/hercules/f/312/t/672512?TMS570LS3137-TMS570-Endianess-BE32)

## 5、tms570实现be32转be8

在第4节里，发现了tms570大端模式中描述冲突的问题，官方老哥回复的比较简单

`We don't modify the Cortex-R4 core, but add a bridge to convert BE32 to BE8.`

没办法，只能自己实现be32到be8的转换了。

实现这个功能的思路有两个：

1. 将be32文件转换为be8；
2. 基于已有的le、be32和be8模型，在qemu内部添加一个针对tms570的内存读写控制；

目前我根据思路2，实现了该功能。

