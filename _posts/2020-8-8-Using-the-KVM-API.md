---
layout: post
title:  "直视KVM API"
subtitle: ""
date:   2020-8-8 19:13:45 +0800
tags:
  - KVM
categories: [KVM, translation]
comment: true
---

许多开发人员、用户和行业都依赖于由Xen、QEMU/KVM或kvmtool等软件所提供的虚拟化。尽管QEMU可以运行基于软件的虚拟机，Xen可以在没有硬件支持的情况下运行协作的半虚拟化操作系统，当前大多数对虚拟化的使用和部署都依赖于硬件虚拟化。LInux通过 **Kernel Virtual Machine(KVM)** API提供硬件虚拟化功能。在本文中，我们仔细看看KVM API，直接用它在不使用其他现有的虚拟机实现的情况下直接启动一个虚拟机。

使用KVM的虚拟机不需要运行完整的操作系统或模拟一套完整的硬件设备。使用KVM API，程序可以在sandbox中运行代码，并为sandbox提供任意虚拟硬件接口。如果你想模拟除标准硬件以外其他的硬件，或者除标准操作系统以外的系统，你需要使用被虚拟机实现（如：QEMU）使用的KVM API。为了演示KVM可以比一个完整的操作系统运行更多(或更少)的操作系统，我们将运行一小部分指令，这些指令简单地计算2+2并将结果打印到一个模拟的串行端口。

KVM API提供了对各种平台的硬件虚拟化特性的抽象。但是，任何使用KVM API的软件仍然需要处理特定于机器的细节问题，例如处理器寄存器和硬件设备。在本文中，我们将使用[[VT-x]]设置一个x86虚拟机。对于其它的平台，您需要处理不同的寄存器、不同的虚拟硬件以及对内存布局和初始状态的不同期望。

Linux内核在[[KVM API| Documentation/virt/KVM/API.txt ]]中包含了KVM API的文档，在`Documentation/virt/KVM/`目录中包含了其他相关的文件。

本文使用了[fully functional sample program](https://lwn.net/Articles/658512/)(MIT许可)的示例代码片段。该程序广泛地使用err()和errx()函数进行错误处理；但是，文章中引用的代码片段只包含了一些重要的错误处理。

# 定义一个虚拟机

使用KVM的完整虚拟机通常模拟各种虚拟硬件设备和固件功能，以及可能很复杂的初始状态和初始内存内容。对于我们的示例虚拟机，我们将运行以下16位x86代码:

```nasm
    mov $0x3f8, %dx
    add %bl, %al
    add $'0', %al
    out %al, (%dx)
    mov $'\n', %al
    out %al, (%dx)
    hlt
```

这些指令将上下文中的`al`和`bl`寄存器（已预先初始化为2）相加，通过与'0'相加将结果转化为ASCII，将其输出到0x3f8上（即串口），之后halt。

我们不是从目标文件或可执行文件中读取代码，而是将这些指令(通过gcc和objdump)预先组装成机器代码存储在一个静态数组中:

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

在初始化时，我们会先将这段代码预先加载到guest*物理*内存的第二页（避免与地址0处不存在的实模式中断描述符表发生冲突）。`al`和`bl`赋值为2，代码段(cs)的基数为0，指令指针(ip)将指向第二个页面的开始即0x1000（4K）。

与通常由虚拟机提供的大量虚拟硬件不同，我们将只模拟端口0x3f8上的普通串行端口。

最后，请注意，运行具有硬件VT支持的16位实模代码需要具有*unrestricted guest*支持的处理器。最初的VT实现只支持*分页启用*的保护模式；因此，像QEMU这样的模拟器必须在软件中处理虚拟化，直到进入分页保护模式(通常在OS引导之后)，然后将虚拟系统状态输入KVM以开始进行硬件仿真。然而，来自“Westmere”一代和新一代的处理器支持*unrestricted guest*模式，这增加了对仿真16位真实模式、*big real mode*和不分页保护模式的硬件支持。Linux KVM子系统从2009年6月的Linux 2.6.32开始支持*unrestricted guest*特性。

# 构建一个VM

首先我们要打开`/dev/kvm`

```c
kvm = open('/dev/kvm', O_RDWR | O_CLOEXEC);
```

我们需要获取读写权限，并且所有不明确打算跨exec继承的open都应该使用O_CLOEXEC。

根据您的系统，您可能可以通过名为“kvm”的组访问`/dev/kvm`，或者通过访问控制列表(ACL)访问`/dev/kvm`，ACL允许登录到控制台的用户访问。

在你使用KVM API之前，你首先需要确认你的KVM版本，KVM早期版本的API不稳定，版本号不断增加，但是KVM_API_VERSION上次在Linux 2.6.22下更改为12是在2007年4月，并在2.6.24中将其锁定为一个稳定的接口；从那时起，KVM API仅通过向后兼容的扩展(与所有其他内核API一样)进行更改。因此，您的应用程序应该首先确认它的版本是12，可以通过:

```c
ret = ioctl(kvm, KVM_GET_API_VERSION, NULL);
if (ret == -1)
	err(1, "KVM_GET_API_VERSION");
if (ret != 12)
	err(1, "KVM_GET_API_VERSION %d, expected 12", ret);
```

完成版本检查后，你需要通过`KVM_CHECK_EXTENSION`检查你要使用的扩展。但是，对于某些添加了新的`ioctl()`调用的扩展，你只能够通过直接调用`ioctl()`来判断，如果失败则会获得一个`ENOTTY`的error。

如果我们想要检查我们实例中用到的扩展，`KVM_CAP_USER_MEM`（需要首先通过`KVM_SET_USER_MEMORY_REGION `来申请guest内存）：

```c
ret = ioctl(kvm, KVM_CHECK_EXTENSION, KVM_CAP_USER_MEMORY);
if (ret == -1)
	err(1, "KVM_CHECK_EXTENSION");
if (!ret)
	errx(1, "Required extension KVM_CAP_USER_MEM not available");
```

接下来我们需要创建一个VM，用来代表所有与仿真系统相关的内容，包括内存和cpu。KVM通过文件描述符的形式向我们返回一个VM的句柄：

```c
vmfd = ioctl(kvm, KVM_CREATE_VM, (unsigned long)0);
```

VM需要一些内存，我们以页面形式提供这些内存。这对应于VM所看到的“物理”地址空间。出于性能考虑，我们不希望捕捉每一次内存访问和通过返回相应的数据来模拟它；相反，当一个虚拟CPU试图访问内存时，该CPU的硬件虚拟化将首先尝试通过我们配置的内存页来满足访问。如果失败了(由于VM访问了一个“物理”地址，却没有真实的内存映射到它)，内核就会让KVM API的调用者处理访问，例如通过模拟内存映射I/O设备或生成错误。

对我们的简单示例来说，我们将分配一个页面的内存来保存我们的代码，使用`mmap()`直接获得页面对齐且用零初始化的内存:

```c
mem = mmap(NULL, 0x1000, PROT_READ | PROT_WRITE, MAP_SHARED | MAP_ANONYMOUS, -1, 0);
```

然后我们将前面提到的代码拷贝进去：

```c
memcpy(mem, code, sizeof(code));
```

最后告诉KVM虚拟机它的敞亮的4096字节内存:

```c
struct kvm_userspace_memory_region region = {
	.slot = 0,
	.guest_phys_addr = 0x1000,
	.memory_size = 0x1000,
	.userspace_addr = (uint64_t)mem,
};
ioctl(vmfd, KVM_SET_USER_MEMORY_REGION, &region);
```

`slot`字段提供了一个用于标识我们交给KVM的每个内存区域的索引；使用相同的`slot`调用`KVM_SET_USER_MEMORY_REGION`将会替代这个映射，如果使用一个新的`slot`那么则会创建一个新的分裂的映射。`guest_phys_addr`表示从guest上看到的*物理*地址，`userspace_addr`指向我们在`mmap()`时分配的后备内存。注意，即使在32位平台上也要使用64位的值。`memory_size`指定要映射多少内存：一个页面4K即0x1000字节。

现在我们就拥有了一台包含了内存和代码的VM，现在我们要给它添加一个虚拟CPU。一个KVM虚拟CPU代表了一个仿真CPU的状态，包括处理器寄存器和其他执行状态。同样的，KVM提供了一个文件描述符来处理VCPU：

```c
vcpufd = ioctl(vmfd, KVM_CREATE_VCPU, (unsigned log)0);
```

0代表了vcpu的索引。一个拥有多个CPU的VM将注册一系列小标识符，从0到系统指定的限制（可通过`KVM_CHECK_EXTENSION`的`KVM_CAP_MAX_VCPUS`查看）。

每个虚拟CPU都有一个关联的`struct kvm_run`数据结构，用于在内核和用户空间交换CPU信息，无论何时硬件虚拟化停止（就是vmexit），例如需要仿真某些硬件时，`kvm_run`结构体将包含为什么停止的信息。我们使用`mmap()`将这个结构体映射到用户空间，但是首先我们需要知道它需要多少内存，我们可以通过`KVM_GET_VCPU_MMAP_SIZE`来获取：

```c
mmap_size = ioctl(kvm, KVM_GET_VCPU_MMAP_SIZE, NULL);
```

请注意，`mmap`的大小通常超过`kvm_run`结构的大小，因为内核还将使用该空间存储`kvm_run`可能指向的其他临时结构。现在我们来mmap这个结构体：

```c
run = mmap(NULL, mmap_size, PROT_READ | PROT_WRITE, MAP_SHARED, vcpufd, 0);
```

`vcpufd`中同样包含了处理器寄存器的状态，主要分为两组寄存器：标准寄存器和*特殊*寄存器。分别对应到两个结构体：`struct kvm_regs`和`struct kvm_sregs`，在x86上，标准寄存器包括通用寄存器，以及指令指针和标志；*特殊*寄存器主要包括段寄存器和控制寄存器。

在运行代码之前，我们需要设置这些寄存器集的初始状态。对于*特殊*寄存器，我们只需要修改段寄存器（cs）；它的默认状态(连同初始指令指针)指向内存顶部以下16字节处的[[reset vector]]，但是我们想要`cs`指向0地址。`kvm_sregs`结构体中的每个段都包含了一个完整的[[segment descriptor]]；我们不需要改变各种标志或限制，但是我们将`base`和`selector`字段归零，它们共同决定了内存段指向的地址。为了避免改变任何其他初始的*特殊*注册状态，我们读出它们，改变`cs`，然后写回它们：

```c
ioctl(vcpufd, KVM_GET_SREGS, &sregs);
sregs.cs.base = 0;
sregs.cs.selector = 0;
ioctl(vcpufd, KVM_SET_SREGS, &sregs);
```

对于标准的寄存器，我们通常将它们设置为0，除了我们的初始指令指针（指向我们的代码在0x1000，相对于cs在0），我们的两个被加数，以及flags的初始状态（由x86架构指定为0x2;如果没有设置这个选项，启动VM将失败）：

```c
struct kvm_regs regs = {
	.rip = 0x1000,
	.rax = 2,
	.rbx = 2,
	.rflags = 0x2,
};
ioctl(vcpufd, KVM_SET_REGS, &regs);
```

在完成VM和VCPU的创建后，内存映射初始化也完成，内部寄存器状态设置完毕后，我们可以使用VCPU来执行指令了，通过`KVM_RUN`启动。每次虚拟化停止时都会成功返回，所以我们要在一个循环中使用它：

```c
while (1) {
	ioctl(vcpufd, KVM_RUN, NULL);
	switch (run->exit_reason) {
	/* Handle exit */
	}
}
```

注意，`KVM_RUN`在当前线程的上下文中运行VM，直到模拟停止才返回。要运行多cpu的VM，用户空间进程必须生成多个线程，并为不同线程中的不同虚拟cpu调用`KVM_RUN`。

为了处理退出，我们通过检查`run->exit_reason`来查看为什么退出。这可以包含几十个退出原因中的任何一个，它们对应于`kvm_run`中union的不同分支。对于这个简单的VM，我们只处理其中的几个，并将任何其他`exit_reason`视为错误。

我们把hlt指令当作我们完了的标志，因为我们没有任何东西可以唤回我们:

```c
case KVM_EXIT_HLT:
	puts("KVM_EXIT_HLT");
	return 0;
```

为了让虚拟化代码输出其结果，我们模拟I/O端口0x3f8上的一个串行端口。`run->io`中的字段表示输出方向(输入或输出)，大小（1，2或者4），端口以及参数个数。为了传递实际数据，内核使用一个映射在`kvm_run`结构和`run->io`之后的缓冲区。`data_offset`提供了映射开始时的偏移量。

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

为了便于调试设置和运行VM的过程，我们处理了几种常见的错误。特别是，`KVM_EXIT_FAIL_ENTRY`经常在更改VM的初始条件时出现，这表明底层硬件虚拟化机制(本例中为VT-x)无法启动VM，因为初始条件不符合其要求(除此之外，如果标志寄存器没有设置位0x2，或者段寄存器或任务交换寄存器的初始值在各种设置条件下失败，就会发生此错误。)。hardware_entry_failure_reason实际上并没有区分其中的许多情况，因此这种类型的错误通常需要仔细阅读硬件文档。

```c
case KVM_EXIT_FAIL_ENTRY:
	 errx(1, "KVM_EXIT_FAIL_ENTRY: hardware_entry_failure_reason = 0x%llx",
		(unsigned long long)run->fail_entry.hardware_entry_failure_reason);
```

`KVM_EXIT_INTERNAL_ERROR`表示来自Linux KVM子系统的错误，而不是来自硬件的错误。特别是，在许多情况下，KVM子系统将模拟内核中的一个或多个指令，而不是通过硬件，例如出于性能原因(为I/O合并一系列vmexit)。`run->internal.suberror`的值`KVM_INTERNAL_ERROR_EMULATION`表示VM遇到了一条它不知道如何模拟的指令，这通常表示一条无效的指令。

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

成功啦！我们运行了机器代码，它将2+2相加，并将其转换为ASCII码的4，并将其写入端口0x3f8。这导致`KVM_RUN`通过`KVM_EXIT_IO`停止，并输出4。然后，我们循环并重新输入`KVM_RUN`，并再次由`KVM_EXIT_IO`触发停止，这次输出的是`\n`。第三次循环以`KVM_EXIT_HLT`触发停止，因此打印了信息并且退出。

# 额外的KVM API特性

这个示例虚拟机演示了KVM API的核心使用，但是忽略了许多非普通虚拟机关心的其他几个主要领域。

memory-mapped I/O设备的实现者可能想要查看`exit_reason KVM_EXIT_MMIO`，同样的`KVM_CAP_COALESCED_MMIO`扩展可以减少vmexits，`ioeventfd`机制异步处理I/O并且没有vmexit。

对于硬件中断，可以查看`irqfd`机制，使用`KVM_CAP_IRQFD`扩展能力。它提供了一个文件描述符，可以将硬件中断注入KVM虚拟机，而无需首先停止它。因此，虚拟机可以从单独的事件循环或设备处理线程写入该中断，并且为虚拟CPU运行`KVM_RUN`的线程将在下一个可用的机会处理该中断。

x86虚拟机可能希望支持CPUID和特定于模型的寄存器(MSRs)，这两个寄存器都有特定于体系结构的`ioctl()`s，可以最小化vmexit。

# KVM API应用

除了学习、调试虚拟机实现或作为小把戏，为什么要直接使用/dev/kvm ？

像qemu-kvm或kvmtool这样的虚拟机通常模拟目标体系结构的标准硬件；例如，标准的x86 PC。尽管它们可以支持其他设备和virtio硬件，但如果您希望模拟一种完全不同类型的系统，该系统只共享指令集架构，那么您可能需要实现一个新的VM。甚至在现有的虚拟机实现中，virtio硬件设备新类的作者也需要清楚地了解KVM API。

像novm和kvmtool这样的工具使用KVM API来构建一个轻量级VM，专用于运行Linux操作系统。最近，Clear Containers项目使用kvmtool来[运行使用硬件虚拟化的容器](https://lwn.net/Articles/644675/)。

或者，VM根本不需要运行操作系统。基于kvm的VM可以实现一个没有虚拟硬件设备和操作系统的硬件辅助沙盒，提供任意虚拟“硬件”设备作为沙盒和沙盒VM之间的API。

虽然运行完整的虚拟机仍然是硬件虚拟化的主要用例，但进来我们已经看到了KVM API的许多创新用法，而且我们肯定会在未来看到更多。

[原文](https://lwn.net/Articles/658511/)