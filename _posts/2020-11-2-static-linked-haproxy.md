---
layout: post
title:  "static linked haproxy"
subtitle: ""
date:   2020-11-2 10:13:45 +0800
tags:
  - haproxy
categories: [haproxy]
comment: true
---

在我们对haproxy1.6.9进行性能测试的时候，为了提升性能，测试出haproxy的极限，我们启用了haproxy**不建议使用**的多进程(nbproc)。结果遇到了一些比较麻烦的问题，由于haproxy上的统计信息都是存放在stats上，但是stats只能绑定到一个进程上，这就意味着我们无法统计所有负载均衡进程上的信息。

为了解决这个问题，我们尝试过将多个进程的数据流合并到一个用于统计的进程上，但是这种方式无法解决haproxy性能问题（因为最终所有的流都要流向同一个进程）。最后决定通过增大进程可用fd数和开启多线程(nbthread)。

# haproxy静态编译概览

为了保证haproxy的稳定性，我们希望系统的变动不会影响到haproxy。我们需要静态编译haproxy。

静态编译haproxy的方式很简单，但是会因为glibc的**一些新特性**导致无法编译成功，下面是对haproxy不同版本静态编译出现的问题及解决方法：

| 版本   | 是否支持多线程 | 报错信息                              | 解决方法                                                     |
| ------ | -------------- | ------------------------------------- | ------------------------------------------------------------ |
| v1.7.0 | 否             | static linked binary use getaddrinfo  | recompile glibc with --enable-static-nss                     |
| v1.8.0 | 是             | static linked binary use getaddrinfo  | recompile glibc with --enable-static-nss                     |
| v1.9.0 | 是             | static linked binary use getaddrinfo  | recompile glibc with --enable-static-nss                     |
| v2.0.0 | 是             | undefined "NSSXXXXX"                  | recompile glibc with --enable-static-nss --disable-nss-crypt |
| v2.1.0 | 是             | undefined "NSSXXXXX"                  | recompile glibc with --enable-static-nss --disable-nss-crypt |
| v2.2.0 | 是             | dynamic STT_GNU_IFUNC symbol `strcmp` | unresolved                                                   |
| master | 是             | dynamic STT_GNU_IFUNC symbol `strcmp` | unresolved                                                   |

其中v1.7.0~v1.9.0中遇到的问题是由于`name service switch`导致的，相关的讨论和解决方法可以参考[stackoverflow。](https://stackoverflow.com/questions/2725255/create-statically-linked-binary-that-uses-getaddrinfo)

v2.0.0~v2.1.0中遇到的undefined “NSSXXXX”问题同样是由于nss导致的，相关的讨论和解决方法可以参考[stackoverflow](https://stackoverflow.com/questions/21465648/updating-openssl-now-link-error-with-nsslow)。

v2.2.0~master中遇到的STT_GNU_IFUNC问题是由于`indirect function`导致的，相关的内容可以参考[stackoverflow](https://stackoverflow.com/questions/26277283/gcc-linking-libc-static-and-some-other-library-dynamically-revisited)。尝试过重新编译gcc关闭IFUNC等相关特性但是貌似不起作用，该问题目前未能解决。

总的来说glibc-static库存在一些问题，对于一些简单的应用来说静态编译不会遇到阻碍，但是如果是比较复杂且使用了glibc或gcc新特性的应用就会遇到很多问题。

# 详细步骤

以v2.1.0为例，静态编译haproxy。

1. 编译静态openssl：

   ```bash
   $ wget openssl-OpenSSL_1_1_0g.zip && tar xvf openssl-OpenSSL_1_1_0g.zip
   $ ./config --prefix=/tmp/staticlibssl -fPIC no-shared
   $ make install -j 16
   ```

2. 从`http://vault.centos.org/centos/`下载对应的src.rpm

   ```bash
   # 解压安装
   $ rpm -i http://vault.centos.org/centos/glibc.src.rpm
   # 修改spec文件，增加--enable-static-nss，替换--enable-nss-crypt为--disable-nss-crypt
   $ vim glibc.spec
   ../configure CC="$GCC" CXX="$GXX" CFLAGS="$configure_CFLAGS" \
           --prefix=%{_prefix} \
           --enable-add-ons=nptl$AddOns \
           --with-headers=%{_prefix}/include $EnableKernel \
   %ifarch ppc64
           --disable-bind-now \
   %else
           --enable-bind-now \
   %endif
           --build=%{target} \
   %ifarch %{multiarcharches}
           --enable-multi-arch \
   %endif
   %ifarch %{elisionarches}
           --enable-lock-elision=yes \
   %endif
           --enable-obsolete-rpc \
           --enable-systemtap \
           --enable-static-nss \
           ${core_with_options} \
   %if %{without werror}
           --disable-werror \
   %endif
           --disable-profile \
   %if %{with bootstrap}
           --without-selinux \
           --disable-nss-crypt ||
   %else
           --disable-nss-crypt ||
   %endif
   { cat config.log; false; }
   # 编译
   $ rpmbuild -bb glibc.spec
   # 安装glibc-static
   $ rpm --force -i glibc-static-xxxxx.rpm
   ```

3. 下载haproxy源码，切换到v2.1.0tag：

   ```bash
   $ git clone https://github.com/haproxy/haproxy.git
   $ git checkout v2.1.0
   ```

2. 修改Makefile文件，删除所有`-Wl,-Bstatic`和`-Wl,-Bdynamic`。
3. 执行make命令：

   ```bash
   $ make TARGET=linux-glibc LDFLAGS="--static" USE_OPENSSL=1 SSL_INC=/tmp/staticlibssl/include SSL_LIB=/tmp/staticlibssl/lib USE_THREAD=1 USE_ZLIB=1 USE_STATIC_PCRE=1 USE_LD=1 -j 16
   ```

# 修改`/etc/nsswitch.conf`

由于在上文中我们使用` --enable-static-nss`选项重新编译了glibc，这个改动导致了在NSS配置`/etc/nsswitch.conf`中无法使用`compat`字段，只支持的`files`和`dns`字段。

如果要支持`compat`字段，需要打上补丁：

```diff
--- glibc-2.17-c758a686/nss/nsswitch.c  2020-11-03 16:11:04.260259122 +0800
+++ glibc-2.17-c758a686/nss/nsswitch.c  2020-11-03 16:10:46.109024870 +0800
@@ -491,12 +491,15 @@
 # include "function.def"
                { NULL, NULL }
              };
-           size_t namlen = (5 + strlen (ni->name) + 1
+           /* "compat" may be used for approx. "files" + "nis" */
+           const char *ni_name = (strcmp (ni->name, "compat") == 0
+                                          ? "files" : ni->name);
+           size_t namlen = (5 + strlen (ni_name) + 1
                             + strlen (fct_name) + 1);
            char name[namlen];
 
            /* Construct the function name.  */
-           __stpcpy (__stpcpy (__stpcpy (name, ni->name),
+           __stpcpy (__stpcpy (__stpcpy (name, ni_name),
                                "_"),
                      fct_name);
```

或者更简单粗暴的方法，直接修改`/etc/nsswitch.conf`文件，增加`files`字段：

```bash
# /etc/nsswitch.conf
#
# Example configuration of GNU Name Service Switch functionality.
# If you have the `glibc-doc-reference' and `info' packages installed, try:
# `info libc "Name Service Switch"' for information about this file.

passwd:         files compat
group:          files compat
shadow:         files compat

hosts:          files dns
networks:       files

protocols:      db files
services:       db files
ethers:         db files
rpc:            db files

netgroup:       nis
```

参考：https://bugzilla.redhat.com/show_bug.cgi?id=111827