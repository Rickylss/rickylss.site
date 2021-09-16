---
layout: post
title:  "直视 KVM API"
subtitle: ""
date:   2020-8-8 19:13:45 +0800
tags:
  - KVM
categories: [KVM, translation]
comment: true
---

许多开发人员、用户和行业都依赖于由 Xen、QEMU/KVM 或 kvmtool 等软件所提供的虚拟化。尽管 QEMU 可以运行基于软件的虚拟机，Xen 可以在没有硬件支持的情况下运行协作的半虚拟化操作系统，当前大多数对虚拟化的使用和部署都依赖于硬件虚拟化。LInux 通过 **Kernel Virtual Machine(KVM)** API 提供硬件虚拟化功能。在本文中，我们仔细看看 KVM API，直接用它在不使用其他现有的虚拟机实现的情况下直接启动一个虚拟机。

<!-- more -->

使用 KVM 的虚拟机不需要运行完整的操作系统或模拟一套完整的硬件设备。使用 KVM API，程序可以在 sandbox 中运行代码，并为 sandbox 提供任意虚拟硬件接口。如果你想模拟除标准硬件以外其他的硬件，或者除标准操作系统以外的系统，你需要使用被虚拟机实现（如：QEMU）使用的 KVM API。为了演示 KVM 可以比一个完整的操作系统运行更多(或更少)的操作系统，我们将运行一小部分指令，这些指令简单地计算 2+2 并将结果打印到一个模拟的串行端口。

KVM API 提供了对各种平台的硬件虚拟化特性的抽象。但是，任何使用 KVM API 的软件仍然需要处理特定于机器的细节问题，例如处理器寄存器和硬件设备。在本文中，我们将使用[[VT-x]]设置一个 x86 虚拟机。对于其它的平台，您需要处理不同的寄存器、不同的虚拟硬件以及对内存布局和初始状态的不同期望。

Linux 内核在[[KVM API| Documentation/virt/KVM/API.txt ]]中包含了 KVM API 的文档，在`Documentation/virt/KVM/`目录中包含了其他相关的文件。

本文使用了[fully functional sample program](https://lwn.net/Articles/658512/)(MIT 许可)的示例代码片段。该程序广泛地使用 err()和 errx()函数进行错误处理；但是，文章中引用的代码片段只包含了一些重要的错误处理。

# 定义一个虚拟机

使用 KVM 的完整虚拟机通常模拟各种虚拟硬件设备和固件功能，以及可能很复杂的初始状态和初始内存内容。对于我们的示例虚拟机，我们将运行以下 16 位 x86 代码:

```nasm
    mov $0x3f8, %dx
    add %bl, %al
    add $'0', %al
    out %al, (%dx)
    mov $'\n', %al
    out %al, (%dx)
    hlt
```

这些指令将上下文中的`al`和`bl`寄存器（已预先初始化为 2）相加，通过与'0'相加将结果转化为 ASCII，将其输出到 0x3f8 上（即串口），之后 halt。

我们不是从目标文件或可执行文件中读取代码，而是将这些指令(通过 gcc 和 objdump)预先组装成机器代码存储在一个静态数组中:

```c
    const uint8_t code[] = {
	0xba, 0xf8, 0x03, /* mov $0x3f8, %dx */
	0x00, 0xd8,       /* add %bl, %al */
	0x04, '0',        /* add $'0', %al */
	0xee,             /* out %al, (%dx) */
	0xb0, '\n',       /* mov $'\n', %al */
	0xee,             /* out %al, (%dx) */
	0xf4,             /* hlt */
    };
```

在初始化时，我们会先将这段代码预先加载到 guest*物理*内存的第二页（避免与地址 0 处不存在的实模式中断描述符表发生冲突）。`al`和`bl`赋值为 2，代码段(cs)的基数为 0，指令指针(ip)将指向第二个页面的开始即 0x1000（4K）。

与通常由虚拟机提供的大量虚拟硬件不同，我们将只模拟端口 0x3f8 上的普通串行端口。

最后，请注意，运行具有硬件 VT 支持的 16 位实模代码需要具有*unrestricted guest*支持的处理器。最初的 VT 实现只支持*分页启用*的保护模式；因此，像 QEMU 这样的模拟器必须在软件中处理虚拟化，直到进入分页保护模式(通常在 OS 引导之后)，然后将虚拟系统状态输入 KVM 以开始进行硬件仿真。然而，来自“Westmere”一代和新一代的处理器支持*unrestricted guest*模式，这增加了对仿真 16 位真实模式、*big real mode*和不分页保护模式的硬件支持。Linux KVM 子系统从 2009 年 6 月的 Linux 2.6.32 开始支持*unrestricted guest*特性。

# 构建一个 VM

首先我们要打开`/dev/kvm`

```c
kvm = open('/dev/kvm', O_RDWR | O_CLOEXEC);
```

我们需要获取读写权限，并且所有不明确打算跨 exec 继承的 open 都应该使用 O_CLOEXEC。

根据您的系统，您可能可以通过名为“kvm”的组访问`/dev/kvm`，或者通过访问控制列表(ACL)访问`/dev/kvm`，ACL 允许登录到控制台的用户访问。

在你使用 KVM API 之前，你首先需要确认你的 KVM 版本，KVM 早期版本的 API 不稳定，版本号不断增加，但是 KVM_API_VERSION 上次在 Linux 2.6.22 下更改为 12 是在 2007 年 4 月，并在 2.6.24 中将其锁定为一个稳定的接口；从那时起，KVM API 仅通过向后兼容的扩展(与所有其他内核 API 一样)进行更改。因此，您的应用程序应该首先确认它的版本是 12，可以通过:

```c
ret = ioctl(kvm, KVM_GET_API_VERSION, NULL);
if (ret == -1)
	err(1, "KVM_GET_API_VERSION");
if (ret != 12)
	err(1, "KVM_GET_API_VERSION %d, expected 12", ret);
```

完成版本检查后，你需要通过`KVM_CHECK_EXTENSION`检查你要使用的扩展。但是，对于某些添加了新的`ioctl()`调用的扩展，你只能够通过直接调用`ioctl()`来判断，如果失败则会获得一个`ENOTTY`的 error。

如果我们想要检查我们实例中用到的扩展，`KVM_CAP_USER_MEM`（需要首先通过`KVM_SET_USER_MEMORY_REGION`来申请 guest 内存）：

```c
ret = ioctl(kvm, KVM_CHECK_EXTENSION, KVM_CAP_USER_MEMORY);
if (ret == -1)
	err(1, "KVM_CHECK_EXTENSION");
if (!ret)
	errx(1, "Required extension KVM_CAP_USER_MEM not available");
```

接下来我们需要创建一个 VM，用来代表所有与仿真系统相关的内容，包括内存和 cpu。KVM 通过文件描述符的形式向我们返回一个 VM 的句柄：

```c
vmfd = ioctl(kvm, KVM_CREATE_VM, (unsigned long)0);
```

VM 需要一些内存，我们以页面形式提供这些内存。这对应于 VM 所看到的“物理”地址空间。出于性能考虑，我们不希望捕捉每一次内存访问和通过返回相应的数据来模拟它；相反，当一个虚拟 CPU 试图访问内存时，该 CPU 的硬件虚拟化将首先尝试通过我们配置的内存页来满足访问。如果失败了(由于 VM 访问了一个“物理”地址，却没有真实的内存映射到它)，内核就会让 KVM API 的调用者处理访问，例如通过模拟内存映射 I/O 设备或生成错误。

对我们的简单示例来说，我们将分配一个页面的内存来保存我们的代码，使用`mmap()`直接获得页面对齐且用零初始化的内存:

```c
mem = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
```

然后我们将前面提到的代码拷贝进去：

```c
memcpy(mem, code, sizeof(code));
```

最后告诉 KVM 虚拟机它的敞亮的 4096 字节内存:

```c
struct kvm_userspace_memory_region region = {
	.slot = 0,
	.guest_phys_addr = 0x1000,
	.memory_size = 0x1000,
	.userspace_addr = (uint64_t)mem,
};
ioctl(vmfd, KVM_SET_USER_MEMORY_REGION, &region);
```

`slot`字段提供了一个用于标识我们交给 KVM 的每个内存区域的索引；使用相同的`slot`调用`KVM_SET_USER_MEMORY_REGION`将会替代这个映射，如果使用一个新的`slot`那么则会创建一个新的分裂的映射。`guest_phys_addr`表示从 guest 上看到的*物理*地址，`userspace_addr`指向我们在`mmap()`时分配的后备内存。注意，即使在 32 位平台上也要使用 64 位的值。`memory_size`指定要映射多少内存：一个页面 4K 即 0x1000 字节。

现在我们就拥有了一台包含了内存和代码的 VM，现在我们要给它添加一个虚拟 CPU。一个 KVM 虚拟 CPU 代表了一个仿真 CPU 的状态，包括处理器寄存器和其他执行状态。同样的，KVM 提供了一个文件描述符来处理 VCPU：

```c
vcpufd = ioctl(vmfd, KVM_CREATE_VCPU, (unsigned log)0);
```

0 代表了 vcpu 的索引。一个拥有多个 CPU 的 VM 将注册一系列小标识符，从 0 到系统指定的限制（可通过`KVM_CHECK_EXTENSION`的`KVM_CAP_MAX_VCPUS`查看）。

每个虚拟 CPU 都有一个关联的`struct kvm_run`数据结构，用于在内核和用户空间交换 CPU 信息，无论何时硬件虚拟化停止（就是 vmexit），例如需要仿真某些硬件时，`kvm_run`结构体将包含为什么停止的信息。我们使用`mmap()`将这个结构体映射到用户空间，但是首先我们需要知道它需要多少内存，我们可以通过`KVM_GET_VCPU_MMAP_SIZE`来获取：

```c
mmap_size = ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, NULL);
```

请注意，`mmap`的大小通常超过`kvm_run`结构的大小，因为内核还将使用该空间存储`kvm_run`可能指向的其他临时结构。现在我们来 mmap 这个结构体：

```c
run = mmap(NULL, mmap_size, PROT_READ | PROT_WRITE, MAP_SHARED, vcpufd, 0);
```

`vcpufd`中同样包含了处理器寄存器的状态，主要分为两组寄存器：标准寄存器和*特殊*寄存器。分别对应到两个结构体：`struct kvm_regs`和`struct kvm_sregs`，在 x86 上，标准寄存器包括通用寄存器，以及指令指针和标志；*特殊*寄存器主要包括段寄存器和控制寄存器。

在运行代码之前，我们需要设置这些寄存器集的初始状态。对于*特殊*寄存器，我们只需要修改段寄存器（cs）；它的默认状态(连同初始指令指针)指向内存顶部以下 16 字节处的[[reset vector]]，但是我们想要`cs`指向 0 地址。`kvm_sregs`结构体中的每个段都包含了一个完整的[[segment descriptor]]；我们不需要改变各种标志或限制，但是我们将`base`和`selector`字段归零，它们共同决定了内存段指向的地址。为了避免改变任何其他初始的*特殊*注册状态，我们读出它们，改变`cs`，然后写回它们：

```c
ioctl(vcpufd, KVM_GET_SREGS, &sregs);
sregs.cs.base = 0;
sregs.cs.selector = 0;
ioctl(vcpufd, KVM_SET_SREGS, &sregs);
```

对于标准的寄存器，我们通常将它们设置为 0，除了我们的初始指令指针（指向我们的代码在 0x1000，相对于 cs 在 0），我们的两个被加数，以及 flags 的初始状态（由 x86 架构指定为 0x2;如果没有设置这个选项，启动 VM 将失败）：

```c
struct kvm_regs regs = {
	.rip = 0x1000,
	.rax = 2,
	.rbx = 2,
	.rflags = 0x2,
};
ioctl(vcpufd, KVM_SET_REGS, &regs);
```

在完成 VM 和 VCPU 的创建后，内存映射初始化也完成，内部寄存器状态设置完毕后，我们可以使用 VCPU 来执行指令了，通过`KVM_RUN`启动。每次虚拟化停止时都会成功返回，所以我们要在一个循环中使用它：

```c
while (1) {
	ioctl(vcpufd, KVM_RUN, NULL);
	switch (run->exit_reason) {
	/* Handle exit */
	}
}
```

注意，`KVM_RUN`在当前线程的上下文中运行 VM，直到模拟停止才返回。要运行多 cpu 的 VM，用户空间进程必须生成多个线程，并为不同线程中的不同虚拟 cpu 调用`KVM_RUN`。

为了处理退出，我们通过检查`run->exit_reason`来查看为什么退出。这可以包含几十个退出原因中的任何一个，它们对应于`kvm_run`中 union 的不同分支。对于这个简单的 VM，我们只处理其中的几个，并将任何其他`exit_reason`视为错误。

我们把 hlt 指令当作我们完了的标志，因为我们没有任何东西可以唤回我们:

```c
case KVM_EXIT_HLT:
	puts("KVM_EXIT_HLT");
	return 0;
```

为了让虚拟化代码输出其结果，我们模拟 I/O 端口 0x3f8 上的一个串行端口。`run->io`中的字段表示输出方向(输入或输出)，大小（1，2 或者 4），端口以及参数个数。为了传递实际数据，内核使用一个映射在`kvm_run`结构和`run->io`之后的缓冲区。`data_offset`提供了映射开始时的偏移量。

```c
case KVM_EXIT_IO:
	if (run->io.direction == KVM_EXIT_IO_OUT &&
		run->io.size == 1 &&
		run->io.port == 0x3f8 &&
		run->io.count == 1)
		putchar(*(((char *)run) + run->io.data_offset));
	else
		errx(1, "unhandled KVM_EXIT_IO");
	break;
```

为了便于调试设置和运行 VM 的过程，我们处理了几种常见的错误。特别是，`KVM_EXIT_FAIL_ENTRY`经常在更改 VM 的初始条件时出现，这表明底层硬件虚拟化机制(本例中为 VT-x)无法启动 VM，因为初始条件不符合其要求(除此之外，如果标志寄存器没有设置位 0x2，或者段寄存器或任务交换寄存器的初始值在各种设置条件下失败，就会发生此错误。)。hardware_entry_failure_reason 实际上并没有区分其中的许多情况，因此这种类型的错误通常需要仔细阅读硬件文档。

```c
case KVM_EXIT_FAIL_ENTRY:
	 errx(1, "KVM_EXIT_FAIL_ENTRY: hardware_entry_failure_reason = 0x%llx",
		(unsigned long long)run->fail_entry.hardware_entry_failure_reason);
```

`KVM_EXIT_INTERNAL_ERROR`表示来自 Linux KVM 子系统的错误，而不是来自硬件的错误。特别是，在许多情况下，KVM 子系统将模拟内核中的一个或多个指令，而不是通过硬件，例如出于性能原因(为 I/O 合并一系列 vmexit)。`run->internal.suberror`的值`KVM_INTERNAL_ERROR_EMULATION`表示 VM 遇到了一条它不知道如何模拟的指令，这通常表示一条无效的指令。

```c
case KVM_EXIT_INTERNAL_ERROR:
	 errx(1, "KVM_EXIT_INTERNAL_ERROR: suberror = 0x%x",
	      run->internal.suberror);
```

当我们把所有这些放到样例代码中，构建并运行它时，我们将得到以下结果:

```bash
$ ./kvmtest
4
KVM_EXIT_HLT
```

成功啦！我们运行了机器代码，它将 2+2 相加，并将其转换为 ASCII 码的 4，并将其写入端口 0x3f8。这导致`KVM_RUN`通过`KVM_EXIT_IO`停止，并输出 4。然后，我们循环并重新输入`KVM_RUN`，并再次由`KVM_EXIT_IO`触发停止，这次输出的是`\n`。第三次循环以`KVM_EXIT_HLT`触发停止，因此打印了信息并且退出。

# 额外的 KVM API 特性

这个示例虚拟机演示了 KVM API 的核心使用，但是忽略了许多非普通虚拟机关心的其他几个主要领域。

memory-mapped I/O 设备的实现者可能想要查看`exit_reason KVM_EXIT_MMIO`，同样的`KVM_CAP_COALESCED_MMIO`扩展可以减少 vmexits，`ioeventfd`机制异步处理 I/O 并且没有 vmexit。

对于硬件中断，可以查看`irqfd`机制，使用`KVM_CAP_IRQFD`扩展能力。它提供了一个文件描述符，可以将硬件中断注入 KVM 虚拟机，而无需首先停止它。因此，虚拟机可以从单独的事件循环或设备处理线程写入该中断，并且为虚拟 CPU 运行`KVM_RUN`的线程将在下一个可用的机会处理该中断。

x86 虚拟机可能希望支持 CPUID 和特定于模型的寄存器(MSRs)，这两个寄存器都有特定于体系结构的`ioctl()`s，可以最小化 vmexit。

# KVM API 应用

除了学习、调试虚拟机实现或作为小把戏，为什么要直接使用/dev/kvm ？

像 qemu-kvm 或 kvmtool 这样的虚拟机通常模拟目标体系结构的标准硬件；例如，标准的 x86 PC。尽管它们可以支持其他设备和 virtio 硬件，但如果您希望模拟一种完全不同类型的系统，该系统只共享指令集架构，那么您可能需要实现一个新的 VM。甚至在现有的虚拟机实现中，virtio 硬件设备新类的作者也需要清楚地了解 KVM API。

像 novm 和 kvmtool 这样的工具使用 KVM API 来构建一个轻量级 VM，专用于运行 Linux 操作系统。最近，Clear Containers 项目使用 kvmtool 来[运行使用硬件虚拟化的容器](https://lwn.net/Articles/644675/)。

或者，VM 根本不需要运行操作系统。基于 kvm 的 VM 可以实现一个没有虚拟硬件设备和操作系统的硬件辅助沙盒，提供任意虚拟“硬件”设备作为沙盒和沙盒 VM 之间的 API。

虽然运行完整的虚拟机仍然是硬件虚拟化的主要用例，但进来我们已经看到了 KVM API 的许多创新用法，而且我们肯定会在未来看到更多。

[原文](https://lwn.net/Articles/658511/)