---
layout: post
title:  "科学上网"
subtitle: ""
date:   2019-2-20 17:56:09 +0800
categories: [shadowsock]
---

# 科学上网

> 本教程适合有相应知识、经验的同学参考。后续或补充细节，若有疑问可以给我发邮件，欢迎打扰。

## 1.挑选境外服务器

境外服务器提供商有很多家，但是挑选时一定请**注意安全**，由于我们要做的事情比较特殊，因此*不建议挑选任何国内提供商在境外的机房*。我曾帮助过一个老哥在“四十大盗”的香港机房搭了这个服务，结果用了两天就受到短信警告，不过，速度是非常爽的。

以本人的经验来说，vultr和digital ocean都是不错的选择，决定速度的关键之一在于机房的位置，下面我会教大家如何挑选。

大家在注册账号的时候可以通过下面链接注册，类似一个推广活动，这样我们都能够获得奖励：

vultr：[https://www.vultr.com/?ref=7791816-4F](https://www.vultr.com/?ref=7791816-4F)

Digital Ocean：[https://m.do.co/c/d1698500bee0](https://m.do.co/c/d1698500bee0)

### 1.1机房位置

以vultr为例，机房位置以美国居多，日本和新加坡虽然看起来物理距离相对较近，但是实际效果却未必有那么好。

![](\pictures\vultr_serverlocation.png)

要判断你所居住的地方购买那个机房的服务比较好，可以访问官方的[测速网站](https://www.vultrvps.com/test-server)，但是这个网站测出来的速度到底几分真假，我就不清楚了，**自己动手ping出来的才是最真实的**。

下面给大家提供一个好用的工具——17monipdb。

> 链接: [https://pan.baidu.com/s/1ViYNKE4ugLSQZguPtiD18w](https://pan.baidu.com/s/1ViYNKE4ugLSQZguPtiD18w ) 
>
> 提取码: 1s36 

使用这个工具就可以跟踪你到固定ip地址的路由信息，并且查看延迟（直接ping也行）。

![](\pictures\17inodb_trac.png)

### 1.2服务器价格

挑最便宜的！！！！这个不用考虑，相信我，你不天天下动作片，这个带宽你是用不完的，但是注意最好挑选带IPv4的服务器，IPv6暂时不清楚如何开vpn。

以vultr为例：

![](\pictures\vultr_create.png)

最便宜的每个月$5，但是带宽有1T/mo，这个够你用了。注意：*vultr曾推出过$2.5每月的机器，但是只有IPv6*。

### 1.3添加SSH Keys

挑选好了地址和配置，最好能够添加一个ssh key 这样下次使用ssh连接服务器的时候就不用去敲那段又臭又长的密码了。

![](\pictures\vultr_sshkey.png)

## 2.创建并连接远程服务器

使用MobaXterm连接远程服务器

![](\pictures\mobaXterm_ssh.png)

如图所示创建一个ssh连接，设置ip和private key（1.3里的ssh private key），可指定用户名，也可连接后再指定。点击确定连接远程服务器。若连接不上，先ping一下远程服务器，确保网络通畅。

*注意：登陆远程服务器后，还要做一个确认操作，在远程服务器上ping一下你本地公网IP或者国内网站，以确定该IP没有被反向墙。*

> 我曾经就被反向墙过，能够连接境外服务器，但是服务器没法把信息传回来，就是因为该IP被墙盯上了，只能换一台服务器，换一个IP。

## 3.配置服务器

安装包，开启对应端口的防火墙，在这里是9010~9015一共五个端口。

``` shell
yum update
yum install python-setuptools libevent python-devel openssl-devel swig
easy_install pip 
pip install gevent shadowsocks

array_port=("9010" 
            "9011"
            "9012"
            "9013"
            "9014"
            "9015")

for i in ${array_port[@]}
do
    firewall-cmd --zone=public --add-port=$i/tcp --permanent
    firewall-cmd --zone=public --add-port=$i/udp --permanent
done
firewall-cmd --reload
```

shadowsocks配置文件`/etc/shadowsocks.json`

```json
{
    "server":"xxx.xxx.xxx.xxx",（如果是遇到阿里云这样的公网IP 无法ifcfg的填0.0.0.0）
    "local_address":"127.0.0.1",
    "local_port":1080,
    "port_password":{
         "9010":"IamThanos",
         "9011":"IamScarletWitch",
         "9012":"IamThor",
         "9013":"IamIronMan",
         "9014":"IamSpiderMan",
         "9015":"IamCaptainAmerica"
    },
    "timeout":300,
    "method":"rc4-md5",
    "fast_open": false
}
```

server填服务器IP或者直接0.0.0.0，port_password可理解为账号，每个不同端口使用不同的密码，这样就可以控制多个用户了。

开启服务，设置开机启动服务。

```shell
$ ssserver -c /etc/shadowsocks.json -d start
$ echo 'ssserver -c /etc/shadowsocks.json -d start' >> /etc/rc.local
```

## 4.下载客户端

shadowsocks的客户端可到github下载，其他下载渠道大多已被屏蔽。

直接搜索shadowsocks，可找到安卓、windows、linux、mac、ios等基本上所有系统的安装包，进入项目选择relleases下载最新的版本。

[https://github.com/search?utf8=%E2%9C%93&q=shadowsocks&type=](https://github.com/search?utf8=%E2%9C%93&q=shadowsocks&type=)