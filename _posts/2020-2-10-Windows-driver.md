---
layout: post
title:  "windows驱动编程环境部署"
subtitle: ""
date:   2020-2-10 9:13:45 +0800
tags:
  - Windows
  - driver
categories: [Windows]
comment: true
---

由于操作系统设计理念的区别，windows下的驱动编程与linux下的驱动编程有较大的差别，这样的差别主要体现在驱动编程的模型上。众所周知，驱动编程需要在操作系统层做工作，而操作系统对此是有约束和限制的，驱动只能够使用操作系统允许的方式插入其中。我认为这种约束和限制就是驱动程序框架。

> 在Linux系统下，始终遵循这一个理念——“一切皆文件”，在linux的驱动编程中，通过系统提供的接口插入驱动模块，并将硬件设备视为“文件”（/dev目录下），所有对硬件的操作就是对该“文件”的读写操作，这就是Linux下的驱动程序框架。

# 1、windows驱动模型发展历史

1. windows最早使用的是VXD，但是目前已经废弃了也没必要再了解了:)；
2. 从Windows2000开始，开发驱动程序必以WDM为基础的，意为Windows Driver Model，是一个标准的驱动模型，意思是说你可以在这个模型上有所改动，WDM是Vista以前平台的驱动模型。（vista支持大部分的WDM驱动）；
3. WDF是Vista及其以后OS的驱动模型，意为Windows Driver Foudation，此模型比WDM更先进、合理（微软是这样说的），将WDM中关于电源、PnP等一些复杂的细节由微软实现，所以在此模型上开发驱动会 比以前要简单（个人觉得是要简单一些了，不过隐藏了更多细节）；

Microsoft定义WDM来规定驱动程序的结构，以及windows内核如何与WDM驱动程序打交道。WDM不仅包括I/O管理器定义的驱动程序框架，还定义了在驱动程序中如何支持Pnp（Plug and Play）、电源管理和WMI(Windows Management Instrumentation)。

为了方便Windows驱动程序的开发，Microsoft定义了一个驱动程序框架，WDF。其中针对内核部分称为KMDF(Kernel-Mode Driver Framework)。KMDF实际上是一个库，它封装了WDM中一些基本的代码逻辑。它可以一定程度上简化Windows驱动的开发，但是实际上并没有降低内核驱动程序的复杂性。

# 2、windows驱动

应用程序调用驱动的方式同样是通过设备符号链接，设备名称对应用程序来说是透明的，因此驱动程序将为设备创建一个符号链接以供应用程序使用。

linux下设备都在/dev目录下，在windows下设备以/Device/[设备名]形式命名。例如磁盘分区的C、D盘名称就是：/Device/HarddiskVolume1 /Device/HarddiskVolume2,

若IoCreateDevice时没有指定设备名称，那么I/O管理器将自动分配一个数字如/Device/000000001

参考：https://support.microsoft.com/en-us/help/235128/info-understanding-device-names-and-symbolic-links

# 3、windows驱动开发环境部署

windows驱动开发环境以visual studio 2019和windows10为例。我的开发环境是：

- 开发主机：windows10
- 测试主机（客户机）：虚拟机windows7
- 开发工具：visual studio 2019、wdm

## 3.1、安装visual studio 2019

进入[Visual Studio](https://visualstudio.microsoft.com/zh-hans/vs/) 下载页面直接下载后安装。安装完成后打开visual studio installer通过修改->工作负载，勾选使用C++的桌面开发。

在单个组件中根据当前使用的版本勾选Spectre缓解库，如下图所示：

![](F:\Rickylss.github.io\pictures\windows_driver_Spectre1.png)

![](F:\Rickylss.github.io\pictures\windows_driver_Spectre2.png)

否则在编译驱动时可能出现Spectre库缺失的问题。

## 3.2、安装WDK

WDK全称Windows driver kit，是一个Windows驱动开发工具包，在[这个](https://developer.microsoft.com/zh-cn/windows/hardware/)页面可以下载。

WDK中包含了windows调试工具，并且同时安装visual studio和wdk将获得6种调试环境，即可使用6种调试方式调试Windows程序。具体信息可查看[微软官方文档](https://docs.microsoft.com/zh-cn/windows-hardware/drivers/debugger/debuggers-in-the-debugging-tools-for-windows-package)。

在安装wdk时需要注意，在安装的最后一步需要勾选安装visual studio扩展，否则在visual studio中无法直接使用wdk。

问题1：安装WDK时，显示无法找到对应的SDK版本。

解答：查看SDK版本是否与WDK版本匹配，若SDK是使用visual studio installer安装的，则需要单独下载一个SDK安装包，先将SDK安装好，再将WDK安装到SDK同一位置。

问题2：安装WDK后，如何卸载。

解答：卸载WDK，可进入命令行，运行`wdksetup.exe /uninstall`，SDK同理。

## 3.3、安装windows7虚拟机

https://docs.microsoft.com/zh-cn/windows-hardware/drivers/gettingstarted/provision-a-target-computer-wdk-8-1

在虚拟机上需要运行与目标计算机平台匹配的WDK测试目标设置msi。该文件可在宿主机的Remote目录下找到`C:\Program Files (x86)\Windows Kits\10\Remote\x64\WDK Test Target Setup x64-x64_en-us.msi`

将该文件发送到windows7虚拟机，在虚拟机中安装该程序。

为虚拟机添加串口使用命名管道`\\.\pipe\com_1`，如下图：

![](F:\Rickylss.github.io\pictures\window_driver_pipe.png)

## 3.4、 编写驱动程序

驱动程序参考微软官方程序https://docs.microsoft.com/zh-cn/windows-hardware/drivers/gettingstarted/writing-a-very-small-kmdf--driver

## 3.5、编译驱动程序并将程序加载到虚拟机

右击驱动程序项目，选择”属性“->"调试”->"Device Configuration"，添加一个远程调试目标计算机。

![](F:\Rickylss.github.io\pictures\windows_driver_debug.png)

添加一个新的目标机，Displayname可随意填写，Network host name则根据具体的虚拟机名称填写，该项需保证能够在命令行中使用该host name ping通。

![](F:\Rickylss.github.io\pictures\windows_driver_add_device.png)

### 3.5.1 使用network调试（windows7不支持）

*connection type选择network即可*（**windows7及更早版本系统不支持网络调试**），HostIP则使用本机虚拟IP。点击下一步，将自动配置虚拟机。

![](F:\Rickylss.github.io\pictures\windows_driver_device_kernelmode.png)

![](F:\Rickylss.github.io\pictures\windows_driver_deviceconfig.png)

配置成功后，虚拟机将自动重启，并且多出一个WDKRemoteUser用户。使用管理员账户，进入”管理“->”本地用户和组”->“用户”->“修改WDKRemoteUser用户密码”，切换用户登录到WDKRemoteUser。

### 3.5.2、使用串口调试。

[参考](https://docs.microsoft.com/zh-cn/windows-hardware/drivers/debugger/attaching-to-a-virtual-machine--kernel-mode-)

若调试器运行在虚拟机上，则输入一下项作为端口：

`\\.\pipe\[pipename]`

若调试器不在虚拟机上，则输入一下项作为端口：

`\\VMHost\pipe\[pipename]`

在device configuration中填写如下：

![](F:\Rickylss.github.io\pictures\windows_driver_config_pipe.png)

在visual studio 2019中开启调试，弹出如下窗口，部署成功：

![](F:\Rickylss.github.io\pictures\windows_driver_deploy.png)

问题1：在visual studio 2019中点击部署驱动时发生：未能找到路径“...\Microsoft.VC141.DebugCRT”的一部分错误，解决方法参考https://stackoverflow.com/questions/57092418/deploying-a-driver-fails-in-vs-2019和https://blog.csdn.net/qiu_pengfei/article/details/102578453

# 4、使用windbg调试

第3节中只能将驱动deploy到虚拟机中，并不能直接调试，要调试驱动需要使用windbg。

在使用windbg前，首先在虚拟机中管理员权限运行cmd：

```cmd
bcdedit /debug on
bcdedit /dbgsettings serial debugport:n baudrate:115200
```

n指虚拟机上COM端口数量，如果虚拟机有打印设备，那么就有两个COM端口。

打开WinDbg，file->kernel Debug->COM

port填写`\\.\pipe\com_1`

点击连接后，重启虚拟机，查看虚拟机中是否新增对应的驱动设备。

## 4.1、windbg设置symbol

参考http://www.xumenger.com/windbg-symbol-20160521/

attach进程后运行ld*命令更新symbol。
