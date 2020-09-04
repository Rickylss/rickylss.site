---

layout: post
title:  "QEMU迁移xbzrle压缩"
subtitle: ""
date:   2020-5-25 19:13:45 +0800
tags:
  - qemu
categories: [QEMU]
comment: true
---

xbzrle技术可以减少VM停机和热迁移的时间，当VM存在密集型写内存的工作负载时这种优化尤其明显。对于大型的企业应用如：SAP和ERP系统，或者说任何使用稀疏内存模型的系统来说都有很好的优化作用。

# 1、xbzrle简介

xbzrle，全称Xor Based Zero Run Length Encoding，它是一种差异压缩算法，用来计算前后内存页差异，并对差异生成压缩数据的一种算法。

热迁移和VM downtime操作需要将虚拟机内存迁移到另一台物理机或者保存到磁盘中。

- 传统的做法是，不断地同步在热迁移或downtime过程中出现的脏页（dirty pages）数据，每个脏页数据通常为4K；

但是如果VM上运行着一个频繁**写内存**的工作负载，传统的移动内存方式会遇到性能瓶颈，脏页不断产生，不断同步。

- xbzrle的做法是，在一个脏页中通常被修改的只是一小部分数据，4K中绝大部分数据未被修改，xbzrle计算上次传输和当前内存的差异，获得一个差异update，通过LEB128编码方式将该update整合为xbzrle格式，之后只需要在目标机上同步该差异数据即可。

使用xbzrle方式同步内存，需要在源VM上保存之前内存页的cache，用来和当前内存页比较计算updates。该cache是一个hash table，并可以通过地址对其进行访问。

cache越大，越有机会遇到要更新的内存；反之cache越小，越容易发生缓存miss。

这个cache的值在热迁移期间也是可以修改的。

# 2、xbzrle压缩格式

xbzrle压缩格式需要体现出之前和当前的内存页差异，zero用来表示未改变的值。页面数据增量就是使用zero runs和non zero runs来表示。

- zero run使用它的长度（以bytes为单位）来表示
- non zero run使用它的长度（以bytes为单位）和修改后的新数据来表示
- run长度使用ULEB128进行编码

xbzrle可以有多个有效编码，但是发送方为了减少计算成本会选择发送更长的编码。

```c
# zrun和nzrun是交替的，并且一个page一定以zrun开头
# 当zrun长度为0时，在编码后以0x00代替

page = zrun nzrun
       | zrun nzrun page

zrun = lengthc

nzrun = length byte...

length = uleb128 encoded integer
```

- 以发送方的角度来看，从cache（默认64MB）的旧内存页中检索信息，并使用xbzrle来压缩内存页的增量updates；
- 以接收方的角度来看，将updates通过xbzrle解压缩并合并到已有的内存页中。

该项工作是基于一项公开的研究结果：`VEE 2011: Evaluation of Delta Compression Techniques for Efficient Live Migration of Large Virtual Machines by Benoit, Svard, Tordsson and Elmroth`

在此之上，采用XBZRLE对增量编码器XBRLE进行了改进。

对于典型的工作负载，xbzrle可实现2-2.5 GB/s的持续带宽，这使得它非常适合在线实时编码，例如面对热迁移所需的编码。

示例：

```
old buffer:
1001 zeros
05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12 13 68 00 00 6b 00 6d
3074 zeros

new buffer:
1001 zeros
01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 68 00 00 67 00 69
3074 zeros

encoded buffer:

encoded length 24
e9 07 0f [01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f] 03 01 [67] 01 01 [69]
```

# 3、Cache更新策略

将热迁移的内存页面持续缓存在cache中以减少缓存丢失是有效的。xbzrle使用一个counter记录每个page的年龄。每当内存的脏位图同步，counter就增加。若检测到cache冲突，xbzrle将会驱逐年龄超过阈值的page。

# 4、在QEMU中使用xbzrle

在QEMU monitor中可以直接使用hmp命令查看当前qemu对migrate_capabilities支持能力:

```bash
{qemu} info migrate_capabilities
{qemu} xbzrle: off , ...
```

virsh中没有直接查看migrate_capabilities的API，可以使用qmp的`query-migrate-capabilities`指令（所有与migration相关的的指令可在/dapi/migration.json中查找）

```
virsh # qemu-monitor-command a229570dd59145ef8545a4cf381cb8c8 {\"execute\": \"query-migrate-capabilities\"}

{"return":"xbzrle: off\r\nrdma-pin-all: off\r\nauto-converge: off\r\nzero-blocks: off\r\ncompress: off\r\nevents: on\r\npostcopy-ram: off\r\nx-colo: off\r\nrelease-ram: off\r\nreturn-path: off\r\npause-before-switchover: off\r\nx-multifd: off\r\ndirty-bitmaps: off\r\nlate-block-activate: off\r\n","id":"libvirt-684"}
```

之后的所有做法与此类似。

> 在virsh中可以在迁移时直接指定`--comp-methods`为xbzrle，并使用`--comp-xbzrle-cache`设置page cache。

在我的实验环境中QEMU的xbzrle功能是关闭的。使用hmp命令开启它：

```
{qemu} migrate_set_capability xbzrle on
```

设置cache大小，

```
{qemu} migrate_set_cache_size 256m
```

注意在v2.11.0中`migrate_set_cache_size`被弃用了，使用新的方式指定：

```
{qemu} migrate_set_parameter xbzrle-cache-size 256m
```

开始迁移：

```
    {qemu} migrate -d tcp:destination.host:4444
    {qemu} info migrate
    capabilities: xbzrle: on
    Migration status: active
    transferred ram: A kbytes
    remaining ram: B kbytes
    total ram: C kbytes
    total time: D milliseconds
    duplicate: E pages
    normal: F pages
    normal bytes: G kbytes
    cache size: H bytes
    xbzrle transferred: I kbytes
    xbzrle pages: J pages
    xbzrle cache miss: K
    xbzrle overflow: L
```

virsh下可直接使用`virsh migrate`命令

注意一下迁移过程中的一些参数：

- xbzrle cache-miss：到目前为止缓存丢失的次数，缓存丢失率高意味着cache size太低；
- xbzrle overflow：译码中溢出的次数，在此情况下增量不能被压缩，当内存页的更改过大或者存在太多小更改的时候会出现这种情况，例如每隔一个byte修改一个byte。

> 更多有关qemu migrate的信息可参考另一篇博文：`libvirt->QEMU热迁移`

# 5、xbzrle算法实现（QEMU）

## 5.1、源码分析

QEMU中实现了xbzrle，并且一共只有两个函数：`xbzrle_encode_buffer`和`xbzrle_decode_buffer`

`qemu/migrate/xbzrle.h`头文件非常简单，只暴露了两个函数定义：

```c
#ifndef QEMU_MIGRATION_XBZRLE_H
#define QEMU_MIGRATION_XBZRLE_H

int xbzrle_encode_buffer(uint8_t *old_buf, uint8_t *new_buf, int slen,
                         uint8_t *dst, int dlen);

int xbzrle_decode_buffer(uint8_t *src, int slen, uint8_t *dst, int dlen);
#endif
```

这两个函数调用路径

- `ram_load()->ram_load_precopy()->load_xbzrle()->xbzrle_decode_buffer()`
- `ram_save_iterate()/ram_save_complete()->ram_find_and_save_block()->ram_save_host_page()->ram_save_target_page()->ram_save_page->save_xbzrle_page()->xbzrle_encode_buffer()`

`qemu/migrate/xbzrle.c`中就是这两个函数的具体实现:

```c
int xbzrle_encode_buffer(uint8_t *old_buf, uint8_t *new_buf, int slen,
                         uint8_t *dst, int dlen)
{
	....

    while (i < slen) {
        /* overflow */
        if (d + 2 > dlen) {
            return -1;
        }

        /* 计算zero run的长度 */
        /* not aligned to sizeof(long) */
        /* 未能8字节对齐的一小段，1byte 1byte增加到zrun中 */
        res = (slen - i) % sizeof(long);
        while (res && old_buf[i] == new_buf[i]) {
            zrun_len++;
            i++;
            res--;
        }

        /* word at a time for speed */
        /* 已对齐的，1word 1word增加到zrun中 */
        if (!res) {
            while (i < slen &&
                   (*(long *)(old_buf + i)) == (*(long *)(new_buf + i))) {
                i += sizeof(long);
                zrun_len += sizeof(long);
            }

            /* go over the rest */
            /* 直到任然有一部分不同，1byte 1byte增加*/
            while (i < slen && old_buf[i] == new_buf[i]) {
                zrun_len++;
                i++;
            }
        }

        /* 如果已经到尾部则无需再增加zrun，即最后的zrun放弃 */
        /* buffer unchanged */
        if (zrun_len == slen) {
            return 0;
        }

        /* skip last zero run */
        if (i == slen) {
            return d;
        }

        /* 编码计算zero run长度，放入dst中 */
        d += uleb128_encode_small(dst + d, zrun_len);

        /* 清零zrun，下次使用，位移到不匹配的字节处，开始计算nzrun长度 */
        zrun_len = 0;
        nzrun_start = new_buf + i;

        /* overflow */
        if (d + 2 > dlen) {
            return -1;
        }
        /* not aligned to sizeof(long) */
        res = (slen - i) % sizeof(long);
        while (res && old_buf[i] != new_buf[i]) {
            i++;
            nzrun_len++;
            res--;
        }

        /* word at a time for speed, use of 32-bit long okay */
        if (!res) {
            /* truncation to 32-bit long okay */
            unsigned long mask = (unsigned long)0x0101010101010101ULL;
            while (i < slen) {
                unsigned long xor;
                /* 找到字中第一个xor后为0x00的字节 */
                xor = *(unsigned long *)(old_buf + i)
                    ^ *(unsigned long *)(new_buf + i);
                if ((xor - mask) & ~xor & (mask << 7)) {
                    /* found the end of an nzrun within the current long */
                    while (old_buf[i] != new_buf[i]) {
                        nzrun_len++;
                        i++;
                    }
                    break;
                } else {
                    i += sizeof(long);
                    nzrun_len += sizeof(long);
                }
            }
        }
        
		/* 编码计算no zero run长度，放入dst中 */
        d += uleb128_encode_small(dst + d, nzrun_len);
        /* overflow */
        if (d + nzrun_len > dlen) {
            return -1;
        }
        /* 将差异部分原样放入dst中 */
        memcpy(dst + d, nzrun_start, nzrun_len);
        d += nzrun_len;
        nzrun_len = 0;
    }

    return d;
}
```

解码部分代码更为简单

```c
int xbzrle_decode_buffer(uint8_t *src, int slen, uint8_t *dst, int dlen)
{
	...

    while (i < slen) {

        /* zrun */
        if ((slen - i) < 2) {
            return -1;
        }
		/* 可以确定第一段一定是zrun，解码得到zrun长度 */
        ret = uleb128_decode_small(src + i, &count);
        if (ret < 0 || (i && !count)) {
            return -1;
        }
        i += ret;
        d += count;

        /* overflow */
        if (d > dlen) {
            return -1;
        }
		
        /* 可以确定在zrun后一定接着nzrun，解码得到nzrun长度 */
        /* nzrun */
        if ((slen - i) < 2) {
            return -1;
        }

        ret = uleb128_decode_small(src + i, &count);
        if (ret < 0 || !count) {
            return -1;
        }
        i += ret;

        /* overflow */
        if (d + count > dlen || i + count > slen) {
            return -1;
        }
		
        /* 将nzrun后相应长度的字节放入目标内存页 */
        memcpy(dst + d, src + i, count);
        d += count;
        i += count;
    }

    return d;
}
```

xbzrle算法实现关键在于`xbzrle_encode_buffer`中xor的计算方式，以及`uleb128_decode_small`和`uleb128_encode_small`。

ULEB128算法的作用在于，在解码的时候可以根据最后一字节的第8位（0x80）判断是否已经完成一个`run`的解析。

> QEMU中在`util/cutils.c`下实现了`uleb128_decode_small`和`uleb128_encode_small`，具体的ULEB128算法分析可参考我之前的博客LEB128编码。

## 5.2、示例讲解

下面结合第2节的示例来讲解：

```
old buffer:
1001 zeros
05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12 13 68 00 00 6b 00 6d
3074 zeros

new buffer:
1001 zeros
01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 68 00 00 67 00 69
3074 zeros
```

新旧buffer之间头1001个字节和后3074个字节完全相同，即`1001 zeros`和`3074`zeros。

从第1002个字节到1016字节处不同，1017 1018字节相同，1019不同，1020相同，1021又不同，排列如下：

```
old:
05 06 07 08 09 0a 0b 0c 0d 0e 0f 10 11 12 13 68 [00 00] 6b [00] 6d

new:
01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f 68 [00 00] 67 [00] 69
```

相同处使用`[]`括起来。下面开始计算：

1. 对zrun的长度1001，进行ULEB128编码，得到`0xe9 07`；
2. 从01到0f长度为16，对nzrun的长度16进行编码，得到`0x0f`；
3. 将16字节长度的xor（差异）原样保存；
4. 对接下来的两个字节的zrun编码，得到`0x3`；
5. 接下来是一个nzrun字节，得到`0x1`，将一个字节的差异原样保存`0x67`；
6. 以下同理

最终得到结果如下，zrun部分使用`()`，nzrun部分使用`{}`，xor部分使用`[]`。

```
(e9 07) {0f [01 02 03 04 05 06 07 08 09 0a 0b 0c 0d 0e 0f]} (03) {01 [67]} (01) {01 [69]}
```

# 6、xbzrle性能优化测试

对xbzrle性能优化测试，测试环境为：

1. guestVM:
   1. machine pc-i440fx-rhel7.6.0,accel=kvm
   2. cpu smp 4，mem 8G
2. Host：
   1. 两台主机均为虚拟主机，但两台虚拟主机所在物理机不同。
   2. cpu 8，mem 16G
3. QEMU migrate设置：
4. 对比设置

启动命令行如下：

```bash
#srcVM
$ /usr/libexec/qemu-kvm -machine pc-i440fx-rhel7.6.0,accel=kvm -m 8G -smp 4,sockets=1,cores=4,threads=1 -hda /mnt/902f9d2d469345b7a7364bd774b60802.qcow2 -chardev pty,id=charserial0 -device isa-serial,chardev=charserial0,id=serial0 --monitor stdio

#detVM
$ /usr/libexec/qemu-kvm -machine pc-i440fx-rhel7.6.0,accel=kvm -m 8G -smp 4,sockets=1,cores=4,threads=1 -hda /mnt/902f9d2d469345b7a7364bd774b60802.qcow2 -chardev pty,id=charserial0 -device isa-serial,chardev=charserial0,id=serial0 --monitor stdio -incoming tcp:0:4444
```

## 6.1、无负载

xbzrle off:

```bash
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: off rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off
# common status
Migration status: completed         # 迁移状态：完成
total time: 15549 milliseconds      # 迁移总用时：15549ms
downtime: 113 milliseconds          # srcVM停机时间：113ms
setup: 170 milliseconds             # 发出qmp指令后到开启迁移之前消耗的时间：170ms
# ram migration status
transferred ram: 508788 kbytes		# 已传输的字节数：496M
throughput: 268.24 mbps				# 吞吐量：268.24mbps
remaining ram: 0 kbytes             # 剩余未迁移ram大小： 0Kbytes
total ram: 8405832 kbytes           # 迁移的总ram大小：8G
duplicate: 1982121 pages            # 零页的数量（即未使用的ram数，无需迁移）：1982121页 = 7.56G 
skipped: 0 pages					# 跳过的零页数：0
normal: 122602 pages				# 正常发送的页数：122602页
normal bytes: 490408 kbytes         # 正常发送的bytes数，恰好为正常迁移页数的4倍：478.9M
dirty sync count: 4                 # 脏页同步次数：4次
page size: 4 kbytes                 # 页大小：4K
```

已传输的字节数>正常发送的字节数>（总字节数-零页的数）。

> 注意已传输字节数不等于正常发送的字节数，考虑到校验的问题。

xbzrle on:

```bash
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: on rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed			# 迁移状态：完成
total time: 15314 milliseconds		# 迁移总用时：15314ms
downtime: 73 milliseconds			# srcVM停机时间：73ms
setup: 172 milliseconds				# 发出qmp指令后到开启迁移之前消耗的时间：172ms

transferred ram: 502343 kbytes		# 已传输的字节数：502343 kbytes
throughput: 268.91 mbps				# 吞吐量：268.91mbps
remaining ram: 0 kbytes				# 剩余未迁移的字节数： 0Kbytes
total ram: 8405832 kbytes			# 迁移过程中涉及到的字节数：8G
duplicate: 1982094 pages			# 零页的数量：1982094页
skipped: 0 pages					# 跳过的页数：0
normal: 120994 pages				# 正常发送的页数
normal bytes: 483976 kbytes			# 正常发送bytes数，恰好为正常发送页数的4倍
dirty sync count: 3					# 脏页同步次数：3次
page size: 4 kbytes					# 页大小：4K
cache size: 67108864 bytes          # xbzrle cache：64M

xbzrle transferred: 0 kbytes		# 由xbzrle转发给detVM的数据：0
xbzrle pages: 0 pages				# 由xbzrle转发给detVM的页：0
xbzrle cache miss: 1613				# 发生cache miss次数：1613次
xbzrle cache miss rate: 0.00		# cache miss率：0.0
xbzrle overflow : 0					# 溢出次数：0
```

两者差异不大，且xbzrle未能转运任何字节。

## 6.2、mem_write测试

### 6.2.1、低负载

使用简单的`写内存`程序`mem_test`来验证开启xbzrle前后性能的优化效果：

```c
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>

void* mem_eat(void *arg)
{
  int per_page = 4 * 1024;
  int page_num = 100 * 1024;
  char *buf;
  static int num = 0;

  buf = (char*)calloc(page_num, per_page);

  printf("....%d...\n", num++);

  while(1){
    int i;
    int j;
    for (i = 0; i < per_page; i++){
      for (j = 0; j < page_num; j++){
        buf[per_page*i + j]++;
      }
    }
  }

}

int main()
{
  int thread_num = 10;
  int i;

  for(i = 0; i < thread_num; i++){
    pthread_t p;
    pthread_create(&p, NULL, mem_eat, NULL);
    pthread_detach(p);
  }

  while(1);
}

```

xbzrle off：

```bash
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: off rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed
total time: 25181 milliseconds
downtime: 127 milliseconds
setup: 427 milliseconds

transferred ram: 799857 kbytes
throughput: 260.33 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 1936131 pages
skipped: 0 pages
normal: 195328 pages
normal bytes: 781312 kbytes
dirty sync count: 6
page size: 4 kbytes
```

相比无负载时，总时间更久，脏页同步次数更多，downtime实际相差不大，setup相差较大，吞吐量等相差不大。

xbzrle on：

```bash
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: on rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed
total time: 19255 milliseconds
downtime: 103 milliseconds
setup: 256 milliseconds

transferred ram: 604696 kbytes
throughput: 257.42 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 1975722 pages
skipped: 0 pages
normal: 146537 pages
normal bytes: 586148 kbytes
dirty sync count: 5
page size: 4 kbytes
cache size: 67108864 bytes

xbzrle transferred: 37 kbytes
xbzrle pages: 81 pages
xbzrle cache miss: 17049
xbzrle cache miss rate: 0.86
xbzrle overflow : 888
```

由xbzrle实际转发的数据量为37kbytes，但是其中修改了81次脏页。downtime时间显著减少，总迁移时间变化不大。

### 6.2.2、高负载

分析上面的测试结果，脏页产生速度不够快，xbzrle只转发了81页，未能体现优势。我们加大脏页产生速度，将程序线程数加到200；

> 注意高负载需要使用-d参数，当脏页产生速度大于传输速度的时候，可能会出现无法完成传输的情况

xbzrle off：

```bash
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: off rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed
total time: 3811965 milliseconds
downtime: 144 milliseconds
setup: 169 milliseconds

transferred ram: 124890721 kbytes
throughput: 268.39 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 1832194 pages
skipped: 0 pages
normal: 31157706 pages
normal bytes: 124630824 kbytes
dirty sync count: 13597
page size: 4 kbytes
```

```
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: off rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off
Migration status: active
total time: 10545458 milliseconds
expected downtime: 846 milliseconds
setup: 165 milliseconds
transferred ram: 345495990 kbytes
throughput: 260.76 mbps
remaining ram: 17064 kbytes
total ram: 8405832 kbytes
duplicate: 1812040 pages
skipped: 0 pages
normal: 86201395 pages
normal bytes: 344805580 kbytes
dirty sync count: 30466
page size: 4 kbytes
dirty pages rate: 10003 pages
```



xbzrle on：

```
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: on rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed
total time: 53209 milliseconds
downtime: 104 milliseconds
setup: 517 milliseconds

transferred ram: 1701088 kbytes
throughput: 261.95 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 1738003 pages
skipped: 0 pages
normal: 420614 pages
normal bytes: 1682456 kbytes
dirty sync count: 6
page size: 4 kbytes
cache size: 67108864 bytes

xbzrle transferred: 66 kbytes
xbzrle pages: 152 pages
xbzrle cache miss: 54071
xbzrle cache miss rate: 0.97
xbzrle overflow : 470
```

这次的数据有问题

### 6.2.3、极高负载

## 6.3、mem_balloon测试

```bash
$ ./mem_balloon 200 &
```

xbzrle off:

```
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: off rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off

Migration status: completed
total time: 18120 milliseconds
downtime: 74 milliseconds
setup: 168 milliseconds

transferred ram: 589795 kbytes
throughput: 266.81 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 2003257 pages
skipped: 0 pages
normal: 142768 pages
normal bytes: 571072 kbytes
dirty sync count: 6
page size: 4 kbytes
```

xbzrle on:

```
(qemu) info migrate
globals:
store-global-state: on
only-migratable: off
send-configuration: on
send-section-footer: on
decompress-error-check: on
capabilities: xbzrle: on rdma-pin-all: off auto-converge: off zero-blocks: off compress: off events: off postcopy-ram: off x-colo: off release-ram: off return-path: off pause-before-switchover: off x-multifd: off dirty-bitmaps: off late-block-activate: off
Migration status: completed
total time: 17163 milliseconds
downtime: 19 milliseconds
setup: 168 milliseconds
transferred ram: 559722 kbytes
throughput: 267.33 mbps
remaining ram: 0 kbytes
total ram: 8405832 kbytes
duplicate: 2033242 pages
skipped: 0 pages
normal: 135185 pages
normal bytes: 540740 kbytes
dirty sync count: 6
page size: 4 kbytes
cache size: 67108864 bytes
xbzrle transferred: 54 kbytes
xbzrle pages: 290 pages
xbzrle cache miss: 6837
xbzrle cache miss rate: 0.00
xbzrle overflow : 0
```



```bash
$ ./mem_balloon 500 &
```

xbzrle off:

```

```



## 6.4、总结

迁移的性能其实就是VM迁移总字节流大小（初始字节流和脏页字节流）、迁移速度、脏页生成速度之间的关系。

各数据之间的关系如下：

1. 迁移总时间等于准备时间加上迁移时间和停机时间

   `total_time = setup_time + migrate_time + down_time`

2. 迁移时间等于总迁移字节流除以平均吞吐速度，平均吞吐速度可配置，但是它受物理因素限制（如I/O速度、网络速度）

   `migrate_time = total_ram_size / throughput`

3. 总迁移字节流等于初始迁移字节流（即开始迁移时，固定的内存数，之后内存变动标记为dirty）加上脏数据字节流，初始内存字节流由VM实际使用的内存数决定，未使用的内存数为duplicate，默认为0不进行迁移。

   `total_ram_size = origin_ram_size + dirty_ram_size`

4. 脏字节流大小由脏页生成速度决定和迁移时间决定，准备时间和停机时间不生成脏页，脏页生成速度由VM中写内存的频率决定，若存在密集型写内存应用，生成脏页速度过快，迁移速度不够，则可能永远无法迁移成功。

   `dirty_ram_size = dirty_ram_speed * migrate_time`

5. 迁移公式
   $$
   (tpSpeed-drSpeed)*mTime = oSize/tpSpeed
   $$
`oSize/tpSpeed` 可视为常量`T`，化简：
$$
   (tpSpeed-drSpeed)*mTime=T
$$
   可以得出结论如果迁移速度大于脏页生成速度，那么随着时间的增加，总能迁移完，如果迁移速度小于脏页生成速度，那么则永远无法完成迁移。

6. 优化方式，优化方式有多种，使用xbzrle编码，压缩脏页数据，即减小`drSpeed`，或者降低srvVM的cpu频率，同样也减小`drSpeed`。

>注意：在完成初始字节流的传输之前，不会使用到xbzrle，因此在将origin_ram_size传输完成之前，不会有xbzrle字节流传输。

   





