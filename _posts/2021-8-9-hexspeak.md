---
layout: post
title:  "Hexspeak&leetspeak"
subtitle: ""
date:   2021-8-9 21:35:45 +0800
tags:
  - translate
categories: [translate]
comment: true
---

在看一些开源项目的时候，经常会遇到一些奇怪的magic numbers，比如0xdeedbeef，它们经常出现，但是有什么含义呢？

wiki上对Hexspeak的解释如下：

> **Hexspeak**, like [leetspeak](https://en.wikipedia.org/wiki/Leet), is a novelty form of variant [English](https://en.wikipedia.org/wiki/English_language) spelling using the hexadecimal digits. Created by programmers as memorable [magic numbers](https://en.wikipedia.org/wiki/Magic_number_(programming)), hexspeak words can serve as a clear and unique identifier with which to mark memory or data.

简而言之，hexspeak，就是一种程序员发明的，用16进制数来表达的一种变体的英文拼写。

## 翻译规则

16进制的书写由`0123456789ABCDEF`15个字符来完成，仅仅使用`ABCDEF`几个字母就已经可以拼写出很多单词了。剩余的`0123456789`可以将它们转化成对应的字母，比如：

- `0`可以当作字母`O`，
- `1`可以当作字母`L`或者`I`，
- `5`可以当作字母`S`,
- `7`可以当作字母`T`,
- `12`可以当作字母`R`,
- `6`或者`9`可以当作字母`G`或者`g`,
- `5`可以当作字母`S`,
- `2`、`4`、`8`则可使用谐音，如`to`、`for`、`ate`

通过这种方式就可以表达出更多含义了。

## 常见的magic numbers

许多计算机处理器、操作系统和调试器都会使用幻数，尤其是将其作为调试值。下面是wiki中收录的一些常见幻数：

|                  Code                  |                         Description                          |
| :----------------------------: | :----------------------------------------------------------: |
|            `0x0000000FF1CE`            | ("office") is used as the last part of product codes ([GUID](https://en.wikipedia.org/wiki/Globally_unique_identifier)) for [Microsoft Office](https://en.wikipedia.org/wiki/Microsoft_Office) components (visible in registry under the `HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall` registry key). |
|              `0x00BAB10C`              | ("über (ooba) block") is used as the magic number for the [ZFS](https://en.wikipedia.org/wiki/ZFS) uberblock. |
|              `0x1BADB002`              | ("1 bad boot"[[1\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-1)) Multiboot header magic number.[[2\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-2) |
|                `0x4B1D`                | ("forbid") was a password in some calibration consoles for developers to peer deeper into control registers outside the normal calibration memory range.[*[citation needed](https://en.wikipedia.org/wiki/Wikipedia:Citation_needed)*] |
|              `0x8BADF00D`              | ("ate bad food") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc.) in [iOS](https://en.wikipedia.org/wiki/IOS_(Apple)) crash reports, when an application takes too long to launch, terminate, or respond to system events.[[3\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-DAC1-3) |
|              `0xABADBABE`              | ("a bad babe") was/is used by Microsoft's Windows 7 to trigger a debugger break-point, probably when a USB device is attached[[4\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-4) |
|              `0xB105F00D`              | ("BIOS food") is the value of the low bytes of last four registers on ARM PrimeCell compatible components (the component_id registers), used to identify correct behaviour of a memory-mapped component. |
|              `0xB16B00B5`              | ("big boobs") was required by [Microsoft](https://en.wikipedia.org/wiki/Microsoft)'s [Hyper-V](https://en.wikipedia.org/wiki/Hyper-V) hypervisor to be used by Linux guests as their "guest signature".[[5\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-5) One proposal suggested changing it to `0x0DEFACED` ("defaced").[[6\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-6) But in actuality, it was initially changed to decimal and then replaced entirely.[[7\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-7) |
|              `0x0B00B135`              | ("boobies") was likewise required by [Microsoft](https://en.wikipedia.org/wiki/Microsoft)'s [Hyper-V](https://en.wikipedia.org/wiki/Hyper-V) hypervisor to be used by a user of XEN as their user id.[[8\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-8) It was removed on January 22, 2010.[[9\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-9) |
|              `0xBAAAAAAD`              | ("baaaaaad") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc)'s [iOS](https://en.wikipedia.org/wiki/IOS) exception report to indicate that the log is a stackshot of the entire system, not a crash report.[[10\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-developer.apple.com-10) |
|              `0xBAADF00D`              | ("bad food") is used by [Microsoft](https://en.wikipedia.org/wiki/Microsoft)'s LocalAlloc(LMEM_FIXED) to indicate uninitialised allocated heap memory when the debug heap is used.[[11\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-11) |
|              `0xBAD22222`              | ("bad too repeatedly") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc)'s [iOS](https://en.wikipedia.org/wiki/IOS) exception log to indicate that a VoIP application has been terminated by iOS because it resumed too frequently.[[10\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-developer.apple.com-10) |
|              `0xBADDCAFE`              | ("bad cafe") is used by [Libumem](https://en.wikipedia.org/wiki/Libumem) to indicate uninitialized memory area. |
|              `0xCAFEB0BA`              | ("cafe boba") is used by datp as canned return value for QKit MFCC keyword detection for Host GUI development since his colleague likes coffee (and maybe boba, too). |
|              `0xB0BABABE`              | ("boba babe") is used by pton as Host GUI Ack to QKit MFCC keyword detection response. |
|              `0xBEEFBABE`              | ("beef babe") is used by the 1997 video game [*Frogger*](https://en.wikipedia.org/wiki/Frogger_(1997_video_game)) to detect a [stack buffer overflow](https://en.wikipedia.org/wiki/Stack_buffer_overflow). |
|            `0xB000 0xDEAD`             | ("boo dead") was displayed by [PA-RISC](https://en.wikipedia.org/wiki/PA-RISC) based [HP 3000](https://en.wikipedia.org/wiki/HP_3000) and [HP 9000](https://en.wikipedia.org/wiki/HP_9000) computers upon encountering a "system halt" (aka "low level halt").[[12\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-12) |
|              `0xC00010FF`              | ("cool off") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc.) in [iOS](https://en.wikipedia.org/wiki/IOS_(Apple)) crash reports, when application was killed in response to a thermal event.[[3\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-DAC1-3) |
|            `C15C:0D06:F00D`            | ("cisco dog food") used in the [IPv6 address](https://en.wikipedia.org/wiki/IPv6_address) of www.cisco.com on [World IPv6 Day](https://en.wikipedia.org/wiki/World_IPv6_Day). "Dog food" refers to Cisco [eating its own dog food](https://en.wikipedia.org/wiki/Eating_your_own_dog_food) with IPv6. |
|              `0xCAFEBABE`              | ("cafe babe") is used by [Plan 9](https://en.wikipedia.org/wiki/Plan_9_From_Bell_Labs)'s libc as a poison value for memory pools.[[13\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-13) It is also used by [Mach-O](https://en.wikipedia.org/wiki/Mach-O) to identify [Universal](https://en.wikipedia.org/wiki/Universal_binary) object files, and by the [Java programming language](https://en.wikipedia.org/wiki/Java_(programming_language)) to identify [Java bytecode](https://en.wikipedia.org/wiki/Java_bytecode) class files. It was originally created by [NeXTSTEP](https://en.wikipedia.org/wiki/NeXTSTEP) developers as a reference to the baristas at [Peet's Coffee & Tea](https://en.wikipedia.org/wiki/Peet's_Coffee_%26_Tea).[[14\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-14) |
|              `0xCAFED00D`              | ("cafe dude") is used by [Java](https://en.wikipedia.org/wiki/Java_(software_platform)) as a magic number for their [pack200](https://en.wikipedia.org/wiki/Pack200) compression.[[15\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-15) |
|              `0xCEFAEDFE`              | ("face feed") is used by [Mach-O](https://en.wikipedia.org/wiki/Mach-O) to identify flat (single architecture) object files. In [little endian](https://en.wikipedia.org/wiki/Little_endian) this reads `FEEDFACE`, "Feed Face". |
|              `0x0D15EA5E`              | ("zero disease") is a flag that indicates regular boot on the [Nintendo GameCube](https://en.wikipedia.org/wiki/Nintendo_GameCube) and [Wii](https://en.wikipedia.org/wiki/Wii) consoles.[[16\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-16)[[17\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-17) |
|              `0xDABBAD00`              | ("dabba doo") is the name of a blog on computer security.[[18\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-18) |
|              `0xDEAD2BAD`              | ("dead too bad") was used to mark allocated areas of memory that had not yet been initialised on [Sequent](https://en.wikipedia.org/wiki/Sequent_Computer_Systems) [Dynix/ptx](https://en.wikipedia.org/wiki/Dynix) systems. |
|              `0xDEADBAAD`              | ("dead bad") is used by the Android libc abort() function when native heap corruption is detected. |
|              `0xDEADBABE`              | ("dead babe") is used by IBM [Jikes RVM](https://en.wikipedia.org/wiki/Jikes_RVM) as a sanity check of the stack of the primary thread.[[19\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-19) |
|              `0xDEADBEAF`              | ("dead beaf") is part of the signature code of *[Jazz Jackrabbit 2](https://en.wikipedia.org/wiki/Jazz_Jackrabbit_2)* tileset files.[[20\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-20) Level files have less room for their signatures and use `0xBABE` ("babe") instead.[[21\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-21) It is also the header of campaign gamesaves used in the [*Halo* game series](https://en.wikipedia.org/wiki/Halo_(franchise)). |
| `deadbeef-dead-beef-dead-beef00000075` | ("dead beef") is the [GUID](https://en.wikipedia.org/wiki/GUID) assigned to hung/dead [virtual machines](https://en.wikipedia.org/wiki/Virtual_machines) in Citrix [XenServer](https://en.wikipedia.org/wiki/XenServer#Hosts). |
|              `0xDEADBEEF`              | ("dead beef") is frequently used to indicate a software crash or deadlock in embedded systems. `0xDEADBEEF` was originally used to mark newly allocated areas of memory that had not yet been initialized—when scanning a memory dump, it is easy to see the `0xDEADBEEF`. It is used by IBM [RS/6000](https://en.wikipedia.org/wiki/RS/6000) systems, [Mac OS](https://en.wikipedia.org/wiki/Mac_OS) on 32-bit [PowerPC](https://en.wikipedia.org/wiki/PowerPC) processors, and the [Commodore](https://en.wikipedia.org/wiki/Commodore_International) [Amiga](https://en.wikipedia.org/wiki/Amiga) as a magic debug value. On [Sun Microsystems](https://en.wikipedia.org/wiki/Sun_Microsystems)' [Solaris](https://en.wikipedia.org/wiki/Solaris_(operating_system)), it marks freed kernel memory. The DEC Alpha SRM console has a background process that traps memory errors, identified by PS as "BeefEater waiting on 0xdeadbeef".[[22\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-22) |
|              `0xDEADC0DE`              | ("[dead code](https://en.wikipedia.org/wiki/Dead_code)") is used as a marker in [OpenWrt](https://en.wikipedia.org/wiki/OpenWrt) firmware to signify the beginning of the to-be created jffs2 filesystem at the end of the static firmware. |
|              `0xDEADDEAD`              | ("dead dead") is the bug check (STOP) code displayed when invoking a [Blue Screen of Death](https://en.wikipedia.org/wiki/Blue_screen_of_death) either by telling the kernel via the attached debugger, or by using a special keystroke combination.[[23\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-23) This is usually seen by driver developers, as it is used to get a memory dump on Windows NT based systems. An alternative to `0xDEADDEAD` is the bug check code `0x000000E2`,[[24\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-24) as they are both called MANUALLY_INITIATED_CRASH as seen on the Microsoft Developer Network. |
|              `0xDEADD00D`              | ("dead dude") is used by [Android](https://en.wikipedia.org/wiki/Android_(operating_system)) in the [Dalvik virtual machine](https://en.wikipedia.org/wiki/Dalvik_(software)) to indicate a VM abort. |
|              `0xDEADFA11`              | ("dead fall" or "dead fail") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc.) in [iOS](https://en.wikipedia.org/wiki/IOS_(Apple)) crash reports, when the user force quits an application.[[3\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-DAC1-3) |
|              `0xDEAD10CC`              | ("dead lock") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc.) in [iOS](https://en.wikipedia.org/wiki/IOS_(Apple)) crash reports, when an application holds on to a system resource while running in the background.[[3\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-DAC1-3) |
|              `0xDEADFEED`              | ("dead feed") is used by [Apple](https://en.wikipedia.org/wiki/Apple_Inc.) in [iOS](https://en.wikipedia.org/wiki/IOS_(Apple)) crash reports, when a timeout occurs spawning a service. |
|              `0xDECAFBAD`              | ("decaf bad") is often found in coding as an easily recognized magic number when hex dumping memory. |
|              `0xDEFEC8ED`              | ("defecated") is the magic number for [OpenSolaris](https://en.wikipedia.org/wiki/OpenSolaris) [core dumps](https://en.wikipedia.org/wiki/Core_dump).[[25\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-25) |
|              `0xD0D0CACA`              | ("[doo-doo](https://en.wiktionary.org/wiki/doo-doo#English) [caca](https://en.wiktionary.org/wiki/caca#English)") is the uninitialized value of GPIO values on the Nvidia [Tegra](https://en.wikipedia.org/wiki/Tegra) X1.[*[citation needed](https://en.wikipedia.org/wiki/Wikipedia:Citation_needed)*] |
|              `0xE011CFD0`              | ("docfile0") is used as a [magic number](https://en.wikipedia.org/wiki/Magic_number_(programming)) for Microsoft Office files. In [little endian](https://en.wikipedia.org/wiki/Little_endian) this reads `D0CF11E0`, "docfile0".[[26\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-26) |
|                `0xF1AC`                | ("FLAC") is used as the [Free Lossless Audio Codec](https://en.wikipedia.org/wiki/Free_Lossless_Audio_Codec)'s audio format tag.[[27\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-27) |
|              `face:b00c`               | ("[facebook](https://en.wikipedia.org/wiki/Facebook)") used in the [IPv6 addresses](https://en.wikipedia.org/wiki/IPv6_address) of www.facebook.com.[[28\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-28) |
|              `0xFACEFEED`              | ("face feed") is used by Alpha servers running Windows NT. The Alpha [Hardware Abstraction Layer](https://en.wikipedia.org/wiki/Hardware_Abstraction_Layer) (HAL) generates this error when it encounters a hardware failure.[[29\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-29) |
|              `0xFBADBEEF`              | ("bad beef") is used in the [WebKit](https://en.wikipedia.org/wiki/WebKit) and [Blink](https://en.wikipedia.org/wiki/Blink_(layout_engine)) layout engines to indicate a known, unrecoverable error such as out of memory.[[30\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-30) |
|              `0xFEE1DEAD`              | ("feel dead") is used as a magic number in the [Linux](https://en.wikipedia.org/wiki/Linux) reboot system call.[[31\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-31) |
|              `0xFEEDBABE`              | ("feed babe") is the magic number used to indicate the beginning of an [OpenRG](https://en.wikipedia.org/wiki/OpenRG) flash partition descriptor.[[32\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-32) |
|              `0xFEEDC0DE`              | ("feed code") is used as filling pattern by the [OS-9](https://en.wikipedia.org/wiki/OS-9) operating system when initializing its [RAM](https://en.wikipedia.org/wiki/Random-access_memory).[[33\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-33) |
|          `0xFEEDFACECAFEBEEF`          | ("feed face cafe beef") is the magic number used to send as a password via serial wire to rescue some NXP created controller devices from boot failures.[[34\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-34)[[35\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-35)[[36\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-36) |
|              `0xFFBADD11`              | ("bad [DLL](https://en.wikipedia.org/wiki/Dynamic-link_library)"): Used by [Windows](https://en.wikipedia.org/wiki/Windows) internally.[*[citation needed](https://en.wikipedia.org/wiki/Wikipedia:Citation_needed)*] |
|              `0xF00DBABE`              | ("food babe"): The Ledger Nano hardware [cryptocurrency wallet](https://en.wikipedia.org/wiki/Cryptocurrency_wallet) used this magic number in the process of signing that was exploited.[[37\]](https://en.wikipedia.org/wiki/Hexspeak#cite_note-37) |

在上面就有我们经常可以看到的`0xDEADBEEF`的解释了。

## 扩展

在某些不同的语言中，可能存在扩展的用法；

- 比如在C语言中，我们经常用后缀`L`来表示一个数是`long`类型，使用`LL`来表示`long long`，这样就可以写出`0xDEADCELL`(dead cell)或者`0xFEEDBULL`(feed bull)这样的hexspeak了；

## 相关趣闻

hyper-v是微软研发的一款hypervisor，在2009年的时候，有人发现在hyper-v的网络驱动代码中使用了GPL-licensed组件，并且是静态编译到闭源的二进制中，因此被要求公开相关代码。Linux从kernel2.6.32开始，都可以包含hyper-v半虚拟化支持，用来提高在windows host上的Linux guest的性能。

当有人查看微软提交到Linux内核的hyper-v代码时，发现有人使用了`0x__B16B00B5__`这样的幻数，用hexspeak翻译过来就是“BIG BOOBS"。被发现之后微软道歉并修复相关代码。