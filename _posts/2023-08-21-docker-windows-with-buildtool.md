---
layout: post
title:  "docker windows with buildtool"
subtitle: ""
date:   2023-08-21 12:52:45 +0800
tags:
  - container
categories: [windows, container]
comment: true
---

由于 windows 容器是纯命令行环境，想要在 Windows 容器中编译 VS 项目，需要在纯命令行环境下使用 vs_buildtool 安装编译套件。

# Windows 容器安装

Windows 容器的安装使用与 Linux 容器差别不大，但是需要注意一下容器镜像和系统版本的匹配问题。

<!-- more -->
## 安装 docker

去[官网](https://docs.docker.com/desktop/install/windows-install/)下载 Docker Desktop 安装包，完成安装之后右键小图标点击 `Switch to Windows containers...` 切换到 windows container。安装过程中可能要输入一些指令并重启电脑，按指示操作即可。

## 下载镜像

windows 官方提供了 4 种镜像，每种镜像精简程度不同，可按需选用：

- [Windows Server Core](https://hub.docker.com/_/microsoft-windows-servercore) - Supports traditional .NET framework applications.
- [Nano Server](https://hub.docker.com/_/microsoft-windows-nanoserver) - Built for .NET Core applications.
- [Windows](https://hub.docker.com/_/microsoft-windows) - Provides the full windows API set.
- [Windows Server](https://hub.docker.com/_/microsoft-windows-server/) - Provides the full Windows API set.

为了保险起见我们挑选 Windows Server 作为基础镜像，它拥有完整的 Windows API 支持，并且相比 Windows 镜像更小。

```powershell
PS C:\> docker pull mcr.microsoft.com/windows/server:ltsc2022
```

> 由于限速问题，Microsoft 官网镜像下载较慢，可换成内部 harbor。
>
> ```powershell
> PS C:\> docker pull harbor.todesk.com:9443/windows/server:ltsc2022
> ```
>

## 镜像与系统版本匹配问题

在选择镜像的 tag 时需要注意一下该镜像版本支持的 Architecture 和 OsVersion。以 `windows server` 和 `windows` 这两个镜像为例（下表格均来自 docker hub）：

`windows server`:

| Tags                     | Architecture | Dockerfile    | OsVersion      | CreatedTime | LastUpdatedTime |
| ------------------------ | ------------ | ------------- | -------------- | ----------- | --------------- |
| ltsc2022                 | multiarch    | No Dockerfile | 10.0.20348.825 | 08/18/2021  | 07/12/2022      |
| ltsc2022-KB5015827       | multiarch    | No Dockerfile | 10.0.20348.825 | 07/12/2022  | 07/12/2022      |
| 10.0.20348.825           | multiarch    | No Dockerfile | 10.0.20348.825 | 07/12/2022  | 07/12/2022      |
| ltsc2022-amd64           | amd64        | No Dockerfile | 10.0.20348.825 | 08/18/2021  | 07/12/2022      |
| ltsc2022-KB5015827-amd64 | amd64        | No Dockerfile | 10.0.20348.825 | 07/12/2022  | 07/12/2022      |
| 10.0.20348.825-amd64     | amd64        | No Dockerfile | 10.0.20348.825 | 07/12/2022  | 07/12/2022      |

`tag: ltsc2022` 要求当前操作系统版本至少为 `10.0.20348.825` 。

`windows`:

| Tags                  | Architecture | Dockerfile    | OsVersion       | CreatedTime | LastUpdatedTime |
| --------------------- | ------------ | ------------- | --------------- | ----------- | --------------- |
| 20H2                  | multiarch    | No Dockerfile | 10.0.19042.1826 | 11/10/2020  | 07/12/2022      |
| 20H2-KB5015807        | multiarch    | No Dockerfile | 10.0.19042.1826 | 07/12/2022  | 07/12/2022      |
| 10.0.19042.1826       | multiarch    | No Dockerfile | 10.0.19042.1826 | 07/12/2022  | 07/12/2022      |
| 20H2-amd64            | amd64        | No Dockerfile | 10.0.19042.1826 | 11/10/2020  | 07/12/2022      |
| 20H2-KB5015807-amd64  | amd64        | No Dockerfile | 10.0.19042.1826 | 07/12/2022  | 07/12/2022      |
| 10.0.19042.1826-amd64 | amd64        | No Dockerfile | 10.0.19042.1826 | 07/12/2022  | 07/12/2022      |
| 2004                  | multiarch    | No Dockerfile | 10.0.19041.1415 | 05/27/2020  | 12/14/2021      |

`windows`  镜像只支持到 `20H2`，要求操作系统版本至少为 `10.0.19042.1826` 。

若当前操作系统版本不满足镜像要求，则在拉取镜像时会有如下报错：

```powershell
PS C:\> docker pull mcr.microsoft.com/windows/server:ltsc2022
ltsc2022: Pulling from windows/server
no matching manifest for windows/amd64 10.0.19044 in the manifest list entries
```

> 出现该报错还有一种情况是没有切换到 `windows containers`。请参考 [安装 docker](##安装 docker) 小节。

# vs_BuildTool

vs_BuildTool 即 Visual Studio Build Tools。是 Windows 下使用的编译构建工具包，对 Visual Studio 项目的编译来说是必不可少的。[下载链接](https://aka.ms/vs/17/release/vs_buildtools.exe)。

在 DockersWindows 环境中，由于只能使用命令行工具（CMD/Powershell），无法使用我们熟悉的 GUI 方式安装。下面介绍如何使用 vs_BuildTool 命令行安装、添加、删除各工作负荷或组件。

这个是我们熟悉的 GUI 界面，在这个界面勾选想要的工作负荷和组件，点击安装即可：

![熟悉的 GUI 界面](https://raw.githubusercontent.com/Rickylss/pics/main/zuler_img/vs-buildtool-2022.png)

## 命令行使用

在 powershell 中执行 `vs_BuildTool.exe --help`，将会弹出一个`help.html` 

```powershell
PS C:\> & '.\vs_BuildTools.exe' --help
```

主要由 `modify` `update` `repair` `uninstall` 4 个命令组成，和 GUI 上的按钮一一对应，详细的内容可自行查看，下面只介绍常用的几个场景。

### 初次安装

下面的示例安装了 4 个工作负载和 3 个组件。

```powershell
PS C:\> C:\TEMP\vs_buildtools.exe --quiet --wait --norestart --nocache install ^
        --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" ^
        --channelUri C:\TEMP\VisualStudio.chman ^
        --installChannelUri C:\TEMP\VisualStudio.chman ^
        --add Microsoft.VisualStudio.Workload.ManagedDesktopBuildTools ^
        --add Microsoft.VisualStudio.Workload.VCTools ^
        --add Microsoft.VisualStudio.Workload.UniversalBuildTools ^
        --add Microsoft.VisualStudio.Workload.MSBuildTools ^
        --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 ^
        --add Microsoft.VisualStudio.Component.Windows11SDK.22000 ^
        --add Microsoft.VisualStudio.Component.VC.14.32.17.2.x86.x64.Spectre
```

> 注意：该安装过程非常非常的长（需要下载 4G 左右的包），在使用了 `quiet` 和 `wait` 选项的情况下可能会误以为程序卡死了。如果是在容器中，可通过 Docker Desktop 观察网络流量情况。

### 移除某些组件

```powershell
PS C:\> C:\TEMP\Install.cmd C:\TEMP\vs_buildtools.exe --quiet --wait --norestart --nocache modify ^
        --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" ^
        --channelUri C:\TEMP\VisualStudio.chman ^
        --installChannelUri C:\TEMP\VisualStudio.chman ^
        --remove Microsoft.VisualStudio.Component.VC.14.29.16.11.x86.x64.Spectre
```

### 增加某些组件

```powershell
PS C:\> C:\TEMP\Install.cmd C:\TEMP\vs_buildtools.exe --quiet --wait --norestart --nocache modify ^
        --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" ^
        --channelUri C:\TEMP\VisualStudio.chman ^
        --installChannelUri C:\TEMP\VisualStudio.chman ^
        --add Microsoft.VisualStudio.Component.VC.14.29.16.11.x86.x64.Spectre
```

若是想要知道有哪些可选的组件和对应的版本，可去[官网查询](https://docs.microsoft.com/en-us/visualstudio/install/workload-component-id-vs-build-tools?view=vs-2022) 。

> 注意：若仔细观察前面提供的官网链接可发现，vs_BuildTools 有多个版本，目前 v16 指代的是 Visual Studio 2019，v17 指代的是 Viusal Studio 2022。前面提供的下载链接是： https://aka.ms/vs/17/release/vs_buildtools.exe 即 2022 版本。
>
> 请确认你想要编译的 VS 工程使用的版本是多少，若工程使用的是最新的组件，则旧版本可能无法提供支持。

# 编译 winget

在 docker 中下载好最新的 winget 源码包。[下载链接](https://github.com/microsoft/winget-cli/archive/master.zip)。

当前最新的 winget 源码使用的的 VS 2022，相关的 workloads 依赖也在 README.md 中给出。

## Prerequisites

- Windows 10 1809 (17763) or later
- [Developer Mode enabled](https://docs.microsoft.com/windows/uwp/get-started/enable-your-device-for-development)
- Visual Studio 2019
  - Or use winget to install it ;) (although you may need to adjust the workloads via Tools->Get Tools and Features...)
- The following workloads:
  - .NET Desktop Development
  - Desktop Development with C++
  - Universal Windows Platform Development
- The following extensions:
  - [Microsoft Visual Studio Installer Projects](https://marketplace.visualstudio.com/items?itemName=VisualStudioClient.MicrosoftVisualStudio2017InstallerProjects)

> 注意：除了这里提到的 workloads 和组件，还需要安装对应的 Spectre mitigated libs。

## 编译

按照第二段中 [初次安装](#初次安装) 中提到的将依赖安装好，再执行如下命令编译：

```powershell
C:\> cd C:\TEMP && rename winget-cli-master winget-cli
C:\> cd "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build" && vcvarsall.bat x64 && cd C:\TEMP\winget-cli && msbuild -t:restore -m -p:RestorePackagesConfig=true -p:Configuration=Release src\AppInstallerCLI.sln
C:\> cd "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build" && vcvarsall.bat x64 && cd C:\TEMP\winget-cli && msbuild -m -p:Configuration=Release src\AppInstallerCLI.sln
```

> 注意：若要使用这里编译出来的 winget.exe，需要将 `C:\TEMP\winget-cli\src\x64\Release\` 下所有目录内的 `dll`文件拷贝出来和 `winget.exe` 放在同一级目录下。`winget.exe` 的执行依赖于这些 dll。

# 参考 Dockerfile

该 Dockfile 未做相关优化，有兴趣可以优化一下指令。

```dockerfile
# escape=`
FROM mcr.microsoft.com/windows/server:ltsc2022 as buildtool

# Restore the default Windows shell for correct batch processing.
SHELL ["cmd", "/S", "/C"]

USER ContainerAdministrator
ADD [ "https://aka.ms/vs/17/release/vc_redist.x64.exe", "C:\\TEMP\\" ]
RUN C:\TEMP\vc_redist.x64.exe /install /quiet /norestart /log C:\TEMP\vc_redist.log

ADD [ "https://raw.githubusercontent.com/MisterDA/Windows-OCaml-Docker/images/Install.cmd", "C:\\TEMP\\" ]
ADD [ "https://aka.ms/vscollect.exe", "C:\\TEMP\\collect.exe" ]
ADD [ "https://aka.ms/vs/17/release/channel", "C:\\TEMP\\VisualStudio.chman" ]
ADD [ "https://aka.ms/vs/17/release/vs_buildtools.exe", "C:\\TEMP\\vs_buildtools.exe" ]

# It takes a long time to download this workloads and component,
# you can do it after docker build.
RUN C:\TEMP\Install.cmd C:\TEMP\vs_buildtools.exe --quiet --wait --norestart --nocache install `
    --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" `
    --channelUri C:\TEMP\VisualStudio.chman `
    --installChannelUri C:\TEMP\VisualStudio.chman `
    --add Microsoft.VisualStudio.Workload.ManagedDesktopBuildTools `
    --add Microsoft.VisualStudio.Workload.VCTools `
    --add Microsoft.VisualStudio.Workload.UniversalBuildTools `
    --add Microsoft.VisualStudio.Workload.MSBuildTools `
    --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
    --add Microsoft.VisualStudio.Component.Windows11SDK.22000 `
    --add Microsoft.VisualStudio.Component.VC.14.32.17.2.x86.x64.Spectre

# If you want more componets after docker build, 
# run vs_buildtools.exe modify in the container.
# RUN C:\TEMP\Install.cmd C:\TEMP\vs_buildtools.exe --quiet --wait --norestart --nocache modify `
#     --installPath "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools" `
#     --channelUri C:\TEMP\VisualStudio.chman `
#     --installChannelUri C:\TEMP\VisualStudio.chman `
#     --add Microsoft.VisualStudio.Component.VC.14.29.16.11.x86.x64.Spectre

# Test with winget project
ADD [ "https://github.com/microsoft/winget-cli/archive/master.zip", "C:\\TEMP\\winget-cli.zip" ]
RUN powershell -Command "Expand-Archive -LiteralPath C:\TEMP\winget-cli.zip -DestinationPath C:\TEMP\ -Force"
RUN cd C:\TEMP && rename winget-cli-master winget-cli
RUN cd "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build" && vcvarsall.bat x64 && cd C:\TEMP\winget-cli && msbuild -t:restore -m -p:RestorePackagesConfig=true -p:Configuration=Release src\AppInstallerCLI.sln
RUN cd "%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build" && vcvarsall.bat x64 && cd C:\TEMP\winget-cli && msbuild -m -p:Configuration=Release src\AppInstallerCLI.sln

# Define the entry point for the Docker container.
# This entry point starts the developer command prompt and launches the PowerShell shell.
# ENTRYPOINT ["C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat", "&&", "powershell.exe", "-NoLogo", "-ExecutionPolicy", "Bypass"]
```

# Reference

https://docs.microsoft.com/en-us/virtualization/windowscontainers/manage-containers/container-base-images

https://docs.microsoft.com/en-us/visualstudio/install/workload-component-id-vs-build-tools?view=vs-2022

https://docs.microsoft.com/en-us/visualstudio/install/use-command-line-parameters-to-install-visual-studio?view=vs-2022

https://docs.microsoft.com/en-us/visualstudio/install/build-tools-container?view=vs-2022

https://docs.microsoft.com/en-us/visualstudio/install/advanced-build-tools-container?view=vs-2022
