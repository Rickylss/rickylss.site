---
layout: post
title:  "可执行文件分析"
subtitle: ""
date:   2019-5-22 16:30:09 +0800
categories: [QEMU]
---

# BIN 与 ELF

<https://blog.csdn.net/qq_27522735/article/details/75042199>



```plain
{pc = 800, cs_base = 0, flags = 33554464, size = 4, icount = 1, 
  cflags = 0, tc_ptr = 0x7fffe9e7b028 <code_gen_buffer>, 
  tc_search = 0x7fffe9e7b082 <code_gen_buffer+90> "", orig_tb = 0x0, 
  page_next = {0x0, 0x0}, page_addr = {0, 18446744073709551615}, 
  jmp_reset_offset = {65535, 65535}, jmp_insn_offset = {0, 0}, 
  jmp_list_next = {0, 0}, jmp_list_first = 140737108267026}
```

