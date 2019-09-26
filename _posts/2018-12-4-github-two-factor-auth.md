---
layout: post
title:  "github双因子验证"
subtitle: ""
date:   2018-12-4 19:56:09 +0800
tags:
  - github
  - otp
categories: [DK]
---

 本节介绍如何在GitHub上使用双因子验证，让大家对双因子验证有一个客观的认识。

## 1、在手机上下载谷歌Authenticator

略。。。。

## 2、github开启双因子验证

`setting->Security`如图所示：

<div style="text-align: center">
<img src="\pictures\OTP-github-Two-factor.png" width="600" height="300"/>
</div>

这里就是GitHub的双因子验证设置面板了。

点击Enable two-factor authentication进入如下界面：

![](\pictures\OTP-github-app.png)

在这里我们选择app来作客户端，点击`Set up using an app`出现一个recovery codes；

![](\pictures\OTP-github-recover-code.png) 

这个**Recovery codes非常重要**，当你的token丢失了，或者移动设备更换了，这个code就可以让你在没有动态动态口令的情况下登陆网站，同时再设置新的token或者app。点击download或者copy，进行下一步：

![](\pictures\OTP-github-barcode.png)

用刚刚下载的手机app扫描二维码，然后将动态口令输入，点击Enable开启双因子验证。这样，你的手机作为一个token可以随时生成密码了。