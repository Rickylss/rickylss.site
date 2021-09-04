---
layout: post
title:  "github 双因子验证"
subtitle: ""
date:   2018-12-4 19:56:09 +0800
tags:
  - github
  - otp
categories: [DK]
---

 本节介绍如何在 GitHub 上使用双因子验证，让大家对双因子验证有一个客观的认识。

## 在手机上下载谷歌 Authenticator

略。。。。

## github 开启双因子验证

`setting->Security`如图所示：

<div style="text-align: center">
<img src="\pictures\OTP-github-Two-factor.png" width="600" height="300"/>
</div>

这里就是 GitHub 的双因子验证设置面板了。

点击 Enable two-factor authentication 进入如下界面：

![](\pictures\OTP-github-app.png)

在这里我们选择 app 来作客户端，点击`Set up using an app`出现一个 recovery codes；

![](\pictures\OTP-github-recover-code.png) 

这个**Recovery codes 非常重要**，当你的 token 丢失了，或者移动设备更换了，这个 code 就可以让你在没有动态动态口令的情况下登陆网站，同时再设置新的 token 或者 app。点击 download 或者 copy，进行下一步：

![](\pictures\OTP-github-barcode.png)

用刚刚下载的手机 app 扫描二维码，然后将动态口令输入，点击 Enable 开启双因子验证。这样，你的手机作为一个 token 可以随时生成密码了。