---
layout: post
title:  "secure access for libvirt"
subtitle: ""
date:   2018-11-12 09:26:06 +0800
tags:
  - libvirt
  - SASL
categories: [libvirt]
---

 libvirt 提供了安全访问的机制，TLS 是典型的用来保护网络安全的方式，同时 SASL 则用来提供验证。[blog](http://blog.51cto.com/foxhound/2051024) 。在 libvirt 官网上有详细的使用教程[libvirt](https://libvirt.org/auth.html#ACL_server_sasl) 

 <!-- more -->

## 准备工作

​	在为 libvirt 设置 SASL 验证之前，首先要对 SASL 有一定的了解，并且学会简单地使用 SASL。具体的内容可查看[SASL](G:\博客产出\技术概念\SASL.md)。

​	在为 libvirt 设置 SASL 验证之前，我们先安装好 sasl 软件：

``` shell
$ yum install cyrus-sasl*
$ apt-get install cyrus-sasl*
```

​	为了使用方便，我们把所有的包都装上，如果你不想全部安装，挑选你要使用的功能安装就好了。

> 纠正：在这里最好不要安装所有的包，如果安装了某些不需要的包同时却未对其服务进行配置将会出现错误。如 cyrus-sasl-ldap [cyrus-sasl-sql](http://www.linuxfly.org/post/173/) 

##  为 libvirt 设置 SASL 验证（digest-md5）

### SASL 添加用户

​	首先需要在 SASL 数据库中添加一个用户：

```shell
$ saslpasswd2 -a libvirt vdsm@ovirt
$ Password:
$ Again (for verification)
```

​	-a 选项指定了一个应用得名称（libvirt）绑定一个用户（vdsm）@后面添加的是组（ovirt），同时命令中得应用名也是创建得账户（意思就是你创建了一个叫 libvirt 得账户同时将用户 virt 绑定到该账户上，你也可以绑定多个账户）。如果想要查看 SASL 数据库中的所有用户，你可以使用下面这个命令：

``` shell
$ sasldblistusers2 -f /etc/libvirt/passwd.db
$ vdsm@ovirt: userPassword
```

> 注意：假如你在/etc/libvirt/目录下没有发现 passwd.db 文件，那么你需要去/etc/sasl2 目录下修改 libvit.conf 文件，**打开 sasldb_path 选项** 。

### 修改/etc/sasl2/libvirt.conf 配置文件

 ​	在创建了 libvirt 账户后，需要在/etc/sasl2/libvirt.conf 配置文件中修改为如下：

``` shell
# Default to a simple username+password mechanism
mech_list: digest-md5
sasldb_path: /etc/libvirt/passwd.db
```

### 修改/etc/libvirt/libvirtd.conf 文件

​	接下来，你需要在/etc/libvirt/libvirtd.conf 中开启 SASL 验证，如果你只想 TCP 套接字连接你的主机，你要修改 auth_tcp 的配置同时开启 listen_tcp 关闭 listen_tls：

``` shell
#
# Network connectivity controls
#

# Flag listening for secure TLS connections on the public TCP/IP port.
# NB, must pass the --listen flag to the libvirtd process for this to
# have any effect.
#
# It is necessary to setup a CA and issue server certificates before
# using this capability.
#
# This is enabled by default, uncomment this to disable it
listen_tls = 0

# Listen for unencrypted TCP connections on the public TCP/IP port.
# NB, must pass the --listen flag to the libvirtd process for this to
# have any effect.
#
# Using the TCP socket requires SASL authentication by default. Only
# SASL mechanisms which support data encryption are allowed. This is
# DIGEST_MD5 and GSSAPI (Kerberos5)
#
# This is disabled by default, uncomment this to enable it.
listen_tcp = 1

#……………………………………
# Change the authentication scheme for TCP sockets.
#
# If you don't enable SASL, then all TCP traffic is cleartext.
# Don't do this outside of a dev/test scenario. For real world
# use, always enable SASL and use the GSSAPI or DIGEST-MD5
# mechanism in /etc/sasl2/libvirt.conf
auth_tcp = "sasl"
```

​	如果你使用的是 TLS 而不是 TCP 的话，你需要这样修改开启 listen_tls 关闭 listen_tcp 或者**保持默认** 同时还要添加密钥证书文件相关内容后面补充：

``` shell
#
# Network connectivity controls
#

# Flag listening for secure TLS connections on the public TCP/IP port.
# NB, must pass the --listen flag to the libvirtd process for this to
# have any effect.
#
# It is necessary to setup a CA and issue server certificates before
# using this capability.
#
# This is enabled by default, uncomment this to disable it
listen_tls = 1

# Listen for unencrypted TCP connections on the public TCP/IP port.
# NB, must pass the --listen flag to the libvirtd process for this to
# have any effect.
#
# Using the TCP socket requires SASL authentication by default. Only
# SASL mechanisms which support data encryption are allowed. This is
# DIGEST_MD5 and GSSAPI (Kerberos5)
#
# This is disabled by default, uncomment this to enable it.
listen_tcp = 0

#……………………………………
# Change the authentication scheme for TLS sockets.
#
# TLS sockets already have encryption provided by the TLS
# layer, and limited authentication is done by certificates
#
# It is possible to make use of any SASL authentication
# mechanism as well, by using 'sasl' for this option
auth_tls = "sasl"

#…………………………
key_file = "/etc/pki/libvirt/private/serverkey.pem"

cert_file = "/etc/pki/libvirt/servercert.pem"

ca_file = "/etc/pki/CA/cacert.pem"
```

### 修改/etc/sysconfig/libvirtd

​	为 libvirtd 服务添加--listen 参数，修改/etc/sysconfig/libvirtd 文件如下：

``` shell
# Override the default config file
# NOTE: This setting is no longer honoured if using
# systemd. Set '--config /etc/libvirt/libvirtd.conf'
# in LIBVIRTD_ARGS instead.
#LIBVIRTD_CONFIG=/etc/libvirt/libvirtd.conf

# Listen for TCP/IP connections
# NB. must setup TLS/SSL keys prior to using this
LIBVIRTD_ARGS="--listen"
```

### 重启服务

​	重启 libvirtd 服务，查看服务状态，看是否开启监听，查看端口是否开启监听：

``` shell
$ systemctl restart libvirtd
$ systemctl status libvirtd
$ netstat -anp | grep libvirtd
```

### 测试连接

​	查看 libvirtd 服务状态没问题，并且端口监听开启后，就可以测试连接了，我们使用 tcp 连接本地端口：

``` shell
$ virsh -c qemu+tcp://127.0.0.1/system
Please enter your authentication name : vdsm@ovirt
Please enter your password:
Welcome to virsh, the virtualization interactive terminal.

Type:  'help' for help with commands
       'quit' to quit

virsh #
```

​	连接成功。

### libvirt 配置 sasl 后无反应

​	注意：如果你是源码编译 libvirt，你需要注意，假如你在编译之后才安装 sasl 相关组件和依赖，你需要重新编译 libvirt，因为 libvirt 在编译时将检查 sasl，假若未检查到，那么它将不会编译与 sasl 相关部分代码，因此即使你配置正确无法正确运行（因为你的 libvirt 根本就没这部分的代码）。在./autogen.sh 之后，查看 autoconfig 的输出信息，确保如下：

```plain
sasl: yes
```



##  为 libvirt 设置 SASL 验证（gssapi）

> GSSAPI
>
> **This is the current default mechanism to use with libvirtd**. It uses the Kerberos v5 authentication protocol underneath, and assuming the Kerberos client/server are configured with modern ciphers (AES), it provides strong session encryption capabilities.

​	在使用 gssapi 作为 sasl 得 mechanism 的时候，与 digest-md5 相似，只需要将/etc/sasl2/libvirt.conf 文件中的 mech_list 改为 gssapi 即可

``` shell
# Default to a simple username+password mechanism
mech_list: gssapi
sasldb_path: /etc/libvirt/passwd.db
```

### 配置 kerberos

​	要使用 gssapi 还需要配置 kerberos，同时打开/etc/sasl2/libvirt.conf 文件中的 keytab 选项：

``` shell
# Some older builds of MIT kerberos on Linux ignore this option &
# instead need KRB5_KTNAME env var.
# For modern Linux, and other OS, this should be sufficient
#
keytab: /etc/libvirt/krb5.tab
```

​	这里涉及到 kerberos 的配置和使用。[libvirt](https://libvirt.org/auth.html#ACL_server_sasl)

# TODO



---------------------




