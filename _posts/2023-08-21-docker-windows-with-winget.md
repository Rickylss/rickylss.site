---
layout: post
title:  "docker windows with winget"
subtitle: ""
date:   2023-08-21 12:52:45 +0800
tags:
  - container
categories: [windows, container]
comment: true
---

由于 windows 容器是纯命令行环境，在纯命令行环境下安装软件包可以使用微软官方提供的 winget。但是目前 windows 提供的 docker base image 默认都没有带 winget，需要自己安装。

有关 docker Windows 的安装等基础内容请参考 [[docker windows with buildtool]]

# 安装

winget 的安装非常简单，主要分为三个步骤：

- 安装对应版本的 vc_redist.x64.exe
- 解包 DesktopAppInstaller.msibundle
- 将解压后的内容加入 PATH 环境变量

在这里我们使用最新的 winget，需要 vs17 的 vc_redist，使用无 GUI 的方式安装。

从官网下载最新的 `DesktopAppInstaller.msibundle `，修改后缀为 `.zip` 后解压，再取出其中的 `AppInstaller_x64.zip` 解压到安装目录（这里是 `%ProgramFiles(x86)%\winget-cli\`）。

再使用 `[Environment]::SetEnvironmentVariable` 命令将路径永久添加到环境变量 PATH 中。

<!-- more -->
# 效果

## 安装 vim 并添加到 PATH

```powershell
PS C:\> winget install vim.vim
PS C:\> $Env:PATH += ';C:\Program Files\Vim\vim90'
```

![image-20220718201054549](https://raw.githubusercontent.com/Rickylss/pics/main/zuler_img/winget-install-vim.png)

![image-20220718201125263](https://raw.githubusercontent.com/Rickylss/pics/main/zuler_img/vim-help.png)

# 参考 Dockerfile

该 Dockfile 未做相关优化，有兴趣可以优化一下指令。

```dockerfile
# escape=`
FROM mcr.microsoft.com/windows/server:ltsc2022 as winget

# Restore the default Windows shell for correct batch processing.
SHELL ["cmd", "/S", "/C"]

USER ContainerAdministrator
ADD [ "https://aka.ms/vs/17/release/vc_redist.x64.exe", "C:\\TEMP\\" ]
ADD [ "https://github.com/microsoft/winget-cli/releases/latest/download/Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle", "C:\\TEMP\\Microsoft.DesktopAppInstaller.zip" ]

RUN C:\TEMP\vc_redist.x64.exe /install /quiet /norestart /log C:\TEMP\vc_redist.log
RUN powershell -Command "Expand-Archive -LiteralPath C:\TEMP\Microsoft.DesktopAppInstaller.zip -DestinationPath C:\TEMP\winget-cli -Force"
RUN powershell -Command "ren C:\TEMP\winget-cli\AppInstaller_x64.msix AppInstaller_x64.zip"
RUN powershell -Command "Expand-Archive -LiteralPath C:\TEMP\winget-cli\AppInstaller_x64.zip -DestinationPath '%ProgramFiles(x86)%\winget-cli\' -Force"
RUN powershell -Command "[Environment]::SetEnvironmentVariable('Path', $Env:PATH + ';%ProgramFiles(x86)%\winget-cli', 'Machine')"

# Define the entry point for the Docker container.
# This entry point starts the developer command prompt and launches the PowerShell shell.
# ENTRYPOINT ["C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\Common7\\Tools\\VsDevCmd.bat", "&&", "powershell.exe", "-NoLogo", "-ExecutionPolicy", "Bypass"]

```

# Reference

https://github.com/microsoft/winget-cli/discussions/1962

https://github.com/microsoft/winget-cli/discussions/1961
