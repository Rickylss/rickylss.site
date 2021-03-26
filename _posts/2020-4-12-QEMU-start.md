---
layout: post
title:  "QEMU 运行流程分析"
subtitle: ""
date:   2020-4-12 9:13:45 +0800
tags:
  - qemu
categories: [QEMU]
comment: true
---

最近在面试，之前被问到一个问题，结果因为时间太久了忘记了，自己有没有复习，导致场面一度很尴尬。今天有时间就再来复习一下，顺便做个笔记方便以后翻看。

# 1、QEMU 启动

以当前 master 分支为例（>stable4.1），在 shell 环境下调用 QEMU 指令输入对应的参数之后，QEMU 进程开始运行。以如下 QEMU 指令为例：

```shell
$ qemu-system-x86_64 test.img
```

# 1.1、main()

程序进入`main.c->main()`方法：

```c
int main(int argc, char **argv, char **envp)
{
    qemu_init(argc, argv, envp);
    qemu_main_loop();
    qemu_cleanup();

    return 0;
}
```

`main()`调用了三个方法，`qemu_init()` `qemu_main_loop()` 和`qemu_cleanup()`。

### 1.1.1、qemu_init()

`qemu_init()`方法主要负责初始化 qemu 中可仿真的设备，解析输入参数并根据输入参数对虚拟机进行配置。

```c
void qemu_init(int argc, char **argv, char **envp)
{
	os_set_line_buffering();

    error_init(argv[0]);
    module_call_init(MODULE_INIT_TRACE);
}
```

`os_set_line_buffering()`设置 stdout 为行缓冲；

`error_init(argv[0])`使用 glib 提供的 log 功能为 qemu 添加日志记录；



### 1.1.2、qemu_main_loop()

`qemu_main_loop()`方法开始轮询处理 events。

### 1.1.3、qemu_cleanup()

`qemu_cleanup()`停止虚拟机运行清理环境。



