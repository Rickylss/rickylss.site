---
layout: post
title:  "libvirt申威平台适配"
subtitle: ""
date:   2018-11-12 08:26:06 +0800
tags:
  - libvirt
  - SW
categories: [libvirt]
---

 本文主要讲解libvirt在申威平台上的移植方法和需要注意的一些细节。目前已完成基本适配的版本为libvirt3.2+swvm和libvirt4.5.0+qemu2.11.0。

## 1、申威平台编译libvirt

​	获取libvirt源码，进入源码目录切换到你想要移植的分支，再依据该分支创建新的sw分支：

``` shell
$ git clone https://github.com/libvirt/libvirt.git
$ cd libvirt
$ git checkout -t origin/vxx.xx
$ git checkout -b vxx.xx-sw
```

​	编译源码（由于申威平台编译器的原因，需要添加--disable-werror）：

``` shell
$ ./autogen.sh --system --disable-werror
```

​	如果只想编译申威平台支持的hypervisor，而不想编译其他driver，可以添加如下参数，减少编译时间：

``` shell
$ ./autogen.sh --system --disable-werror --without-vmware --without-openvz --without-esx --without-vbox
```

> 如果在这一步遇到了xdr相关的报错，并且确定依赖已安装完成，则可能是libc动态连接库有问题，需要将/lib/libc-2.23.so文件替换（目前符合我们需求的libc-2.23.so文件的md5码后几位是*08bb82，后续或有更新，须与申威方确认）。

​	autoconfig完成后，即可开始make：

``` shell
$ make -j 16
$ make install
```

​	通常完成make install之后就代表完成安装，可以运行libvirtd程序了。但是有几个需要提醒的地方：

> 若运行libvirtd出现动态连接版本冲突问题（通常是由于同时安装了两个不同版本的libvirt，如安装libviirt3.2之后，在未能卸载干净的情况下又安装了libvirt4.5，导致动态连接库冲突）则可以尝试先删除某个不需要版本的动态库再运行ldconfig命令。

``` shell
$ systemctl daemon-reload
$ systemctl restart libvirtd
$ systemctl status libvirtd
```

​	查看libvirtd状态，若需要，则安装dnsmasq和防火墙iptables或ebtables（目前iptable创建网卡相关部分依然存在部分问题，在[libvirt与virbr0]中我们会进行详细讨论）。



***到这里，我们成功地在申威平台上运行了一个未修改过的libvirt，接下来我们为libvirt添加申威平台支持的hypervisor。***



## 2、申威平台虚拟化支持情况

​	在[libvirt使用](G:\博客产出\libvirt\libvirt使用.md) 中我们已经讲解过，想要使用libvirt首先需要connect到一个hypervisor，但目前申威平台能支持的hyperviosr有限，截止到本文完成，申威平台能对虚拟化提供支持的内容包括：

1. swvm：参考lguest，自主开发的半虚拟化；
2. qemu-system-sw64：qemu移植，目前版本为2.11.0，只能够在申威平台模拟申威架构的虚拟机；
3. qemu-img：qemu-img-2.5.0移植，可支持完整的qcow2格式，与磁盘镜像的创建、快照的创建管理相关；
4. qemu-io：qemu-io-2.5.0移植，qemu disk exerciser，应用QEMU I/O path，详细内容参考[QEMU I/O Path](G:\博客产出\QEMU\QEMU IO Path.md)；
5. qemu-nbd：qemu-nbd-2.5.0移植，qemu Network Block Devce，与远程数据仓库相关，详细内容参考[NBD](G:\博客产出\QEMU\NBD.md)；
6. qemu-ga：qemu-ga-2.5.0移植，qemu guest agent，虚拟机与宿主机通信通道，详细内容可参考[GuestAgent](G:\博客产出\QEMU\GuestAgent.md)；
7. kvm-tools：容器虚拟化，正在移植中。

***目前swvm与qemu-system-sw64内核未能合并，同时hmcode不兼容，因此在同一台服务器上只能使用swvm或者qemu-system-sw64，如果想要替换为另一个hypervisor则需要为服务器刷[hmcode](G:\博客产出\申威\hmcode.md)。*** 

​	选择qemu-system-sw64需要修改qemuHypervisorDriver相关内容，选择swvm则需要自行添加一个全新的driver，这是由于libvirt的项目结构导致的，这种模块化的结构极大的方便了不同hypervisor开发者的工作，他们只需要专注于自己要开发的模块即可，无需关注其他模块。但是无论你选择那种Hypervisor，即便是未来要添加的kvm-tools，**有一部分内容是一定要修改的，那就是架构相关的代码**。

## 3、libvirt添加申威架构

### 3.1、添加sw64架构

​	libvirt针对不同的架构会有不同的处理，因此我们需要在libvirt中添加sw64架构信息：

``` diff
diff --git a/src/qemu/qemu_domain.c b/src/qemu/qemu_domain.c
index 4c15d5a36a..ddb016d8fb 100644
--- a/src/qemu/qemu_domain.c
+++ b/src/qemu/qemu_domain.c
@@ -3216,6 +3216,7 @@ qemuDomainDefAddDefaultDevices(virDomainDefPtr def,
         break;

     case VIR_ARCH_ALPHA:
+    case VIR_ARCH_SW_64:
     case VIR_ARCH_PPC:
     case VIR_ARCH_PPCEMB:
     case VIR_ARCH_SH4:
diff --git a/src/cpu/Makefile.inc.am b/src/cpu/Makefile.inc.am
index 5020d40583..770b707dc0 100644
--- a/src/cpu/Makefile.inc.am
+++ b/src/cpu/Makefile.inc.am
@@ -13,6 +13,8 @@ CPU_SOURCES = \
        cpu/cpu_ppc64_data.h \
        cpu/cpu_map.h \
        cpu/cpu_map.c \
+       cpu/cpu_sw64.c \
+       cpu/cpu_sw64.h \
        $(NULL)

 noinst_LTLIBRARIES += libvirt_cpu.la
diff --git a/src/cpu/cpu.c b/src/cpu/cpu.c
index cc93c49418..a66eea0ee6 100644
--- a/src/cpu/cpu.c
+++ b/src/cpu/cpu.c
@@ -29,6 +29,7 @@
 #include "cpu.h"
 #include "cpu_map.h"
 #include "cpu_x86.h"
+#include "cpu_sw64.h"
 #include "cpu_ppc64.h"
 #include "cpu_s390.h"
 #include "cpu_arm.h"
@@ -45,6 +46,7 @@ static struct cpuArchDriver *drivers[] = {
     &cpuDriverPPC64,
     &cpuDriverS390,
     &cpuDriverArm,
+    &cpuDriverSW64,
 };


diff --git a/src/cpu/cpu_sw64.c b/src/cpu/cpu_sw64.c
new file mode 100644
index 0000000000..2a6da0ff7d
--- /dev/null
+++ b/src/cpu/cpu_sw64.c
@@ -0,0 +1,55 @@
+#include <config.h>
+
+#include "viralloc.h"
+#include "cpu.h"
+#include "cpu_sw64.h"
+#include "virstring.h"
+
+#define VIR_FROM_THIS VIR_FROM_CPU
+
+static const virArch archs[] = {
+    VIR_ARCH_SW_64
+};
+
+static int
+virCPUSW64GetHost(virCPUDefPtr cpu,
+                 virDomainCapsCPUModelsPtr models)
+{
+    return 0;
+}
+
+struct cpuArchDriver cpuDriverSW64 = {
+    .name = "sw_64",
+    .arch = archs,
+    .narch = ARRAY_CARDINALITY(archs),
+    .getHost = virCPUSW64GetHost,
+    .compare = NULL,
+    .decode = NULL,
+    .encode = NULL,
+    .baseline = NULL,
+    .update = NULL,
+};
diff --git a/src/cpu/cpu_sw64.h b/src/cpu/cpu_sw64.h
new file mode 100644
index 0000000000..af601bd30e
--- /dev/null
+++ b/src/cpu/cpu_sw64.h
@@ -0,0 +1,31 @@
+/*
+ * cpu_sw64.h: CPU driver for arm CPUs
+ *
+ * Copyright (C) Canonical Ltd. 2012
+ *
+ * This library is free software; you can redistribute it and/or
+ * modify it under the terms of the GNU Lesser General Public
+ * License as published by the Free Software Foundation; either
+ * version 2.1 of the License, or (at your option) any later version.
+ *
+ * This library is distributed in the hope that it will be useful,
+ * but WITHOUT ANY WARRANTY; without even the implied warranty of
+ * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
+ * Lesser General Public License for more details.
+ *
+ * You should have received a copy of the GNU Lesser General Public
+ * License along with this library.  If not, see
+ * <http://www.gnu.org/licenses/>.
+ *
+ * Authors:
+ *      Chuck Short <chuck.short@canonical.com>
+ */
+
+#ifndef __VIR_CPU_SW64_H__
+# define __VIR_CPU_SW64_H__
+
+# include "cpu.h"
+
+extern struct cpuArchDriver cpuDriverSW64;
+
+#endif /* __VIR_CPU_SW64_H__ */
diff --git a/src/qemu/qemu_capabilities.c b/src/qemu/qemu_capabilities.c
index 37c8fbe3d3..1d108f57ea 100644
--- a/src/qemu/qemu_capabilities.c
+++ b/src/qemu/qemu_capabilities.c
@@ -599,6 +599,8 @@ static virArch virQEMUCapsArchFromString(const char *arch)
         return VIR_ARCH_ARMV7L;
     if (STREQ(arch, "or32"))
         return VIR_ARCH_OR32;
+    if (STREQ(arch, "sw64"))
+        return VIR_ARCH_SW_64;

     return virArchFromString(arch);
 }
@@ -612,6 +614,8 @@ static const char *virQEMUCapsArchToString(virArch arch)
         return "arm";
     else if (arch == VIR_ARCH_OR32)
         return "or32";
+    else if (arch == VIR_ARCH_SW_64)
+        return "sw64";

     return virArchToString(arch);
 }
diff --git a/src/util/virarch.c b/src/util/virarch.c
index be48bcfb89..2e22f119a3 100644
--- a/src/util/virarch.c
+++ b/src/util/virarch.c
@@ -76,6 +76,8 @@ static const struct virArchData {
     { "x86_64",       64, VIR_ARCH_LITTLE_ENDIAN },
     { "xtensa",       32, VIR_ARCH_LITTLE_ENDIAN },
     { "xtensaeb",     32, VIR_ARCH_BIG_ENDIAN },
+
+    { "sw_64",        64, VIR_ARCH_LITTLE_ENDIAN},
 };

 verify(ARRAY_CARDINALITY(virArchData) == VIR_ARCH_LAST);
@@ -169,6 +171,8 @@ virArch virArchFromHost(void)
         arch = VIR_ARCH_I686;
     } else if (STREQ(ut.machine, "amd64")) {
         arch = VIR_ARCH_X86_64;
+    } else if (STREQ(ut.machine, "sw_64")) {
+        arch = VIR_ARCH_SW_64;
     } else {
         /* Otherwise assume the canonical name */
         if ((arch = virArchFromString(ut.machine)) == VIR_ARCH_NONE) {
diff --git a/src/util/virarch.h b/src/util/virarch.h
index af5ff83528..d2b7863483 100644
--- a/src/util/virarch.h
+++ b/src/util/virarch.h
@@ -67,6 +67,8 @@ typedef enum {
     VIR_ARCH_XTENSA,       /* XTensa      32 LE http://en.wikipedia.org/wiki/Xtensa#Processor_Cores */
     VIR_ARCH_XTENSAEB,     /* XTensa      32 BE http://en.wikipedia.org/wiki/Xtensa#Processor_Cores */

+    VIR_ARCH_SW_64,        /* SW64        64 LE XHB*/
+
     VIR_ARCH_LAST,
 } virArch;

@@ -90,6 +92,8 @@ typedef enum {
 # define ARCH_IS_S390(arch) ((arch) == VIR_ARCH_S390 ||\
                              (arch) == VIR_ARCH_S390X)

+# define ARCH_IS_SW(arch) ((arch) == VIR_ARCH_SW_64)
+
 typedef enum {
     VIR_ARCH_LITTLE_ENDIAN,
     VIR_ARCH_BIG_ENDIAN,
diff --git a/src/util/virhostcpu.c b/src/util/virhostcpu.c
index 013c95bb56..0968dfa6a8 100644
--- a/src/util/virhostcpu.c
+++ b/src/util/virhostcpu.c
@@ -602,6 +602,8 @@ virHostCPUParseFrequency(FILE *cpuinfo,
         prefix = "clock";
     else if (ARCH_IS_S390(arch))
         prefix = "cpu MHz dynamic";
+    else if (ARCH_IS_SW(arch))
+        prefix = "CPU frequency [MHZ]";

     if (!prefix) {
         VIR_WARN("%s is not supported by the %s parser",
```



### 3.2、添加sysinfo

​	由于截至目前，申威平台无法获取bios信息，也就无法使用dmidecode命令，无法使用该命令获取平台硬件信息；同时/proc/sysinfo文件缺失，无法获取完整的平台硬件信息，所以在这里创建了一个fake_sysinfo文件，用来保存服务器信息，同时为sw架构编写特殊的解析函数。如下：

``` diff
diff --git a/src/qemu/Makefile.inc.am b/src/qemu/Makefile.inc.am
index 2afa67f195..ed004b9ec3 100644
--- a/src/qemu/Makefile.inc.am
+++ b/src/qemu/Makefile.inc.am
@@ -110,7 +110,8 @@ CLEANFILES += \

 endif WITH_DTRACE_PROBES

-conf_DATA += qemu/qemu.conf
+conf_DATA += qemu/qemu.conf qemu/fake_sysinfo
+

 augeas_DATA += qemu/libvirtd_qemu.aug
 augeastest_DATA += test_libvirtd_qemu.aug
@@ -157,6 +158,7 @@ endif WITH_QEMU

 EXTRA_DIST += \
        qemu/qemu.conf \
+       qemu/fake_sysinfo \
        qemu/libvirtd_qemu.aug \
        qemu/test_libvirtd_qemu.aug.in \
        qemu/THREADS.txt \
diff --git a/src/util/virsysinfo.c b/src/util/virsysinfo.c
index 5795d90c7b..4c463e9bb1 100644
--- a/src/util/virsysinfo.c
+++ b/src/util/virsysinfo.c
@@ -51,10 +51,12 @@ VIR_ENUM_IMPL(virSysinfo, VIR_SYSINFO_LAST,
 static const char *sysinfoDmidecode = DMIDECODE;
 static const char *sysinfoSysinfo = "/proc/sysinfo";
 static const char *sysinfoCpuinfo = "/proc/cpuinfo";
+static const char *sysinfoFakeinfo = "/etc/libvirt/fake_sysinfo";

 #define SYSINFO_SMBIOS_DECODER sysinfoDmidecode
 #define SYSINFO sysinfoSysinfo
 #define CPUINFO sysinfoCpuinfo
+#define FAKEINFO sysinfoFakeinfo
 #define CPUINFO_FILE_LEN (1024*1024)    /* 1MB limit for /proc/cpuinfo file */


@@ -1197,6 +1199,55 @@ virSysinfoReadX86(void)
     goto cleanup;
 }

+/* virSysinfoRead for SW64
+ * Gathers sysinfo from a fake_info file
+ * for we can't gathers data from /proc/cpuinfo*/
+virSysinfoDefPtr
+virSysinfoReadSW64(void)
+{
+    virSysinfoDefPtr ret = NULL;
+    char *outbuf = NULL;
+
+    if (VIR_ALLOC(ret) < 0)
+        goto error;
+
+    if (virFileReadAll(FAKEINFO, CPUINFO_FILE_LEN, &outbuf) < 0) {
+        virREportError(VIR_ERR_INTERNAL_ERROR,
+                       _("Failed to open %s"), FAKEINFO);
+        goto error;
+    }
+
+    ret->type = VIR_SYSINFO_SMBIOS;
+
+    if (virSysinfoParseBIOS(outbuf, &ret->bios) < 0)
+        goto error;
+
+    if (virSysinfoParseX86System(outbuf, &ret->system) < 0)
+        goto error;
+
+    if (virSysinfoParseX86BaseBoard(outbuf, &ret->baseBoard, &ret->nbaseBoard) < 0)
+        goto error;
+
+    ret->nprocessor = 0;
+    ret->processor = NULL;
+    if (virSysinfoParseX86Processor(outbuf, ret) < 0)
+        goto error;
+
+    ret->nmemory = 0;
+    ret->memory = NULL;
+    if (virSysinfoParseX86Memory(outbuf, ret) < 0)
+        goto error;
+
+ cleanup:
+    VIR_FREE(outbuf);
+
+    return ret;
+
+ error:
+    virSysinfoDefFree(ret);
+    ret = NULL;
+    goto cleanup;
+}

 /**
  * virSysinfoRead:
@@ -1214,12 +1265,15 @@ virSysinfoRead(void)
     return virSysinfoReadARM();
 #elif defined(__s390__) || defined(__s390x__)
     return virSysinfoReadS390();
+#elif defined(__sw_64__)
+    return virSysinfoReadSW64();
 #elif defined(WIN32) || \
     !(defined(__x86_64__) || \
       defined(__i386__) || \
       defined(__amd64__) || \
       defined(__arm__) || \
       defined(__aarch64__) || \
+      defined(__sw_64__) || \
       defined(__powerpc__))
     /*
      * this can probably be extracted from Windows using API or registry
diff --git a/src/util/virsysinfopriv.h b/src/util/virsysinfopriv.h
index a50b280f64..8ab240497a 100644
--- a/src/util/virsysinfopriv.h
+++ b/src/util/virsysinfopriv.h
@@ -41,4 +41,7 @@ virSysinfoReadS390(void);
 virSysinfoDefPtr
 virSysinfoReadX86(void);

+virSysinfoDefPtr
+virSysinfoReadSW64(void);
+
 #endif /* __VIR_SYSINFO_PRIV_H__ */
```

​	在这里我们创建一个fake_sysinfo文件，用来保存服务器硬件信息，之后直接从该文件读取信息。**这种解决方法是暂时的，待申威方协助提供新的硬件信息获取方式之后再完善** 。

