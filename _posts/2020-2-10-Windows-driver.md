---
layout: post
title:  "windows 驱动编程环境部署"
subtitle: ""
date:   2020-2-10 9:13:45 +0800
tags:
  - Windows
  - driver
categories: [Windows]
comment: true
---

由于操作系统设计理念的区别，windows 下的驱动编程与 linux 下的驱动编程有较大的差别，这样的差别主要体现在驱动编程的模型上。众所周知，驱动编程需要在操作系统层做工作，而操作系统对此是有约束和限制的，驱动只能够使用操作系统允许的方式插入其中。我认为这种约束和限制就是驱动程序框架。

> 在 Linux 系统下，始终遵循这一个理念——“一切皆文件”，在 linux 的驱动编程中，通过系统提供的接口插入驱动模块，并将硬件设备视为“文件”（/dev 目录下），所有对硬件的操作就是对该“文件”的读写操作，这就是 Linux 下的驱动程序框架。

# 1、windows 驱动模型发展历史

1. windows 最早使用的是 VXD，但是目前已经废弃了也没必要再了解了:)；
2. 从 Windows2000 开始，开发驱动程序必以 WDM 为基础的，意为 Windows Driver Model，是一个标准的驱动模型，意思是说你可以在这个模型上有所改动，WDM 是 Vista 以前平台的驱动模型。（vista 支持大部分的 WDM 驱动）；
3. WDF 是 Vista 及其以后 OS 的驱动模型，意为 Windows Driver Foudation，此模型比 WDM 更先进、合理（微软是这样说的），将 WDM 中关于电源、PnP 等一些复杂的细节由微软实现，所以在此模型上开发驱动会 比以前要简单（个人觉得是要简单一些了，不过隐藏了更多细节）；

Microsoft 定义 WDM 来规定驱动程序的结构，以及 windows 内核如何与 WDM 驱动程序打交道。WDM 不仅包括 I/O 管理器定义的驱动程序框架，还定义了在驱动程序中如何支持 Pnp（Plug and Play）、电源管理和 WMI(Windows Management Instrumentation)。

为了方便 Windows 驱动程序的开发，Microsoft 定义了一个驱动程序框架，WDF。其中针对内核部分称为 KMDF(Kernel-Mode Driver Framework)。KMDF 实际上是一个库，它封装了 WDM 中一些基本的代码逻辑。它可以一定程度上简化 Windows 驱动的开发，但是实际上并没有降低内核驱动程序的复杂性。

# 2、windows 驱动

应用程序调用驱动的方式同样是通过设备符号链接，设备名称对应用程序来说是透明的，因此驱动程序将为设备创建一个符号链接以供应用程序使用。

linux 下设备都在/dev 目录下，在 windows 下设备以/Device/[设备名]形式命名。例如磁盘分区的 C、D 盘名称就是：/Device/HarddiskVolume1 /Device/HarddiskVolume2,

若 IoCreateDevice 时没有指定设备名称，那么 I/O 管理器将自动分配一个数字如/Device/000000001

参考：https://support.microsoft.com/en-us/help/235128/info-understanding-device-names-and-symbolic-links

# 3、windows 驱动开发环境部署

windows 驱动开发环境以 visual studio 2019 和 windows10 为例。我的开发环境是：

- 开发主机：windows10
- 测试主机（客户机）：虚拟机 windows7
- 开发工具：visual studio 2019、wdm

## 3.1、安装 visual studio 2019

进入[Visual Studio](https://visualstudio.microsoft.com/zh-hans/vs/) 下载页面直接下载后安装。安装完成后打开 visual studio installer 通过修改->工作负载，勾选使用 C++的桌面开发。

在单个组件中根据当前使用的版本勾选 Spectre 缓解库，如下图所示：

![](F:\Rickylss.github.io\pictures\windows_driver_Spectre1.png)

![](F:\Rickylss.github.io\pictures\windows_driver_Spectre2.png)

否则在编译驱动时可能出现 Spectre 库缺失的问题。

## 3.2、安装 WDK

WDK 全称 Windows driver kit，是一个 Windows 驱动开发工具包，在[这个](https://developer.microsoft.com/zh-cn/windows/hardware/)页面可以下载。

WDK 中包含了 windows 调试工具，并且同时安装 visual studio 和 wdk 将获得 6 种调试环境，即可使用 6 种调试方式调试 Windows 程序。具体信息可查看[微软官方文档](https://docs.microsoft.com/zh-cn/windows-hardware/drivers/debugger/debuggers-in-the-debugging-tools-for-windows-package)。

在安装 wdk 时需要注意，在安装的最后一步需要勾选安装 visual studio 扩展，否则在 visual studio 中无法直接使用 wdk。

问题 1：安装 WDK 时，显示无法找到对应的 SDK 版本。

解答：查看 SDK 版本是否与 WDK 版本匹配，若 SDK 是使用 visual studio installer 安装的，则需要单独下载一个 SDK 安装包，先将 SDK 安装好，再将 WDK 安装到 SDK 同一位置。

问题 2：安装 WDK 后，如何卸载。

解答：卸载 WDK，可进入命令行，运行`wdksetup.exe /uninstall`，SDK 同理。

## 3.3、安装 windows7 虚拟机

https://docs.microsoft.com/zh-cn/windows-hardware/drivers/gettingstarted/provision-a-target-computer-wdk-8-1

在虚拟机上需要运行与目标计算机平台匹配的 WDK 测试目标设置 msi。该文件可在宿主机的 Remote 目录下找到`C:\Program Files (x86)\Windows Kits\10\Remote\x64\WDK Test Target Setup x64-x64_en-us.msi`

将该文件发送到 windows7 虚拟机，在虚拟机中安装该程序。

为虚拟机添加串口使用命名管道`\\.\pipe\com_1`，如下图：

![](F:\Rickylss.github.io\pictures\window_driver_pipe.png)

## 3.4、 编写驱动程序

驱动程序参考微软官方程序https://docs.microsoft.com/zh-cn/windows-hardware/drivers/gettingstarted/writing-a-very-small-kmdf--driver

## 3.5、编译驱动程序并将程序加载到虚拟机

右击驱动程序项目，选择”属性“->"调试”->"Device Configuration"，添加一个远程调试目标计算机。

![](F:\Rickylss.github.io\pictures\windows_driver_debug.png)

添加一个新的目标机，Displayname 可随意填写，Network host name 则根据具体的虚拟机名称填写，该项需保证能够在命令行中使用该 host name ping 通。

![](F:\Rickylss.github.io\pictures\windows_driver_add_device.png)

### 3.5.1 使用 network 调试（windows7 不支持）

*connection type 选择 network 即可*（**windows7 及更早版本系统不支持网络调试**），HostIP 则使用本机虚拟 IP。点击下一步，将自动配置虚拟机。

![](F:\Rickylss.github.io\pictures\windows_driver_device_kernelmode.png)

![](F:\Rickylss.github.io\pictures\windows_driver_deviceconfig.png)

配置成功后，虚拟机将自动重启，并且多出一个 WDKRemoteUser 用户。使用管理员账户，进入”管理“->”本地用户和组”->“用户”->“修改 WDKRemoteUser 用户密码”，切换用户登录到 WDKRemoteUser。

### 3.5.2、使用串口调试

[参考](https://docs.microsoft.com/zh-cn/windows-hardware/drivers/debugger/attaching-to-a-virtual-machine--kernel-mode-)

若调试器运行在虚拟机上，则输入一下项作为端口：

`\\.\pipe\[pipename]`

若调试器不在虚拟机上，则输入一下项作为端口：

`\\VMHost\pipe\[pipename]`

在 device configuration 中填写如下：

![](F:\Rickylss.github.io\pictures\windows_driver_config_pipe.png)

在 visual studio 2019 中开启调试，弹出如下窗口，部署成功：

![](F:\Rickylss.github.io\pictures\windows_driver_deploy.png)

问题 1：在 visual studio 2019 中点击部署驱动时发生：未能找到路径“...\Microsoft.VC141.DebugCRT”的一部分错误，解决方法参考https://stackoverflow.com/questions/57092418/deploying-a-driver-fails-in-vs-2019 和 https://blog.csdn.net/qiu_pengfei/article/details/102578453

# 4、使用 windbg 调试

第 3 节中只能将驱动 deploy 到虚拟机中，并不能直接调试，要调试驱动需要使用 windbg。

在使用 windbg 前，首先在虚拟机中管理员权限运行 cmd：

```cmd
bcdedit /debug on
bcdedit /dbgsettings serial debugport:n baudrate:115200
```

n 指虚拟机上 COM 端口数量，如果虚拟机有打印设备，那么就有两个 COM 端口。

打开 WinDbg，file->kernel Debug->COM

port 填写`\\.\pipe\com_1`

点击连接后，重启虚拟机，查看虚拟机中是否新增对应的驱动设备。

## 4.1、windbg 设置 symbol

参考http://www.xumenger.com/windbg-symbol-20160521/

attach 进程后运行 ld*命令更新 symbol。
