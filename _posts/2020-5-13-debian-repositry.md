---
layout: post
title:  "搭建 Debian 仓库"
subtitle: "以及管理"
date:   2020-5-12 19:13:45 +0800
tags:
  - Linux
categories: [OS, Linux]
comment: true
---

> Debian 仓库本质上就是把一堆*.deb 包放到一个文件夹，在此基础上，为了方便 apt 工具的管理，将这些 deb 包按照一定的规则存放，并额外提供一些元数据文件来协助 apt 工具快速地访问 deb 包。

Debian 仓库支持通过不同的协议访问，如 http 协议、ftp 协议或者普通的 file 访问。所有访问的目录只需要满足[debian 仓库格式](https://wiki.debian.org/DebianRepository/Format)即可。

# 1、Debian 仓库搭建

构建 Debian 仓库有很多[工具](https://wiki.debian.org/DebianRepository/Setup#apt-ftparchive)，主要分为两类：生成 Debian 仓库的工具、制作 Debian 镜像库的工具。制作镜像库的工具从其他仓库复制，之后更新到本地的仓库。

## 1.1、Debian 仓库的类型

Debian 仓库有两种类型：

- official archive，“deb http://example.org/debian unstable main”，支持 apt-pinning，支持 secure APT；
- trivial archive， “deb http://example.org/debian ./”，不支持 apt-pinning，支持 secure APT。

总地来说，trivial archive 就是简单的 Debian 仓库，official archive 是复杂的 Debian 仓库，这里的简单和复杂是指仓库组织结构。

trivial archive 不采用 pool 结构，对 trivial archive 仓库文件夹使用`tree`命令，查看文件组织结构如下：

```plain
.
..
|-- Packages
|-- conntrack-dbgsym_1.4.5-2_arm64.deb
|-- conntrack_1.4.5-2_arm64.deb
|-- hvinfo-dbgsym_1.2.0_arm64.deb
...
```

使用时只需要在`/etc/apt/sources.list`中添加：

```plain
deb http://example.org/debian ./
```

而 official archive 文件组织结构如下：

```plain
├── dists/
│   ├── buster/
│   ├── jessie/
│   │   ├── InRelease
│   │   ├── main/
│   │   │   ├── binary-aarmhf/
│   │   │   │   ├── Packages
│   │   │   │   └── Release
│   │   │   ├── binary-all/
│   │   │   │   ├── Packages
│   │   │   │   └── Release
│   │   │   └── binary-amd64/
│   │   │   └── Contents-amd64.gz
│   │   │   └── Contents-armhf.gz
│   │   ├── Release
│   │   └── Release.gpg
│   └── stretch/
└── pool/
    └── main/
        ├── c/
        │   └── contrack/
        │       ├── conntrack-dbgsym_1.4.5-2_arm64.deb
        │       ├── conntrack_1.4.5-2_arm64.deb
        └── h/
            └── hvinfo/
                ├── hvinfo-dbgsym_1.2.0_arm64.deb
```

对应的`/etc/apt/sources.list`配置如下：

```plain
deb http://example.org/debian jessie main
```

## 1.2、构建 trivial archive 仓库

构建 trivial archive 类型仓库很简单，将想要的 deb 包放仓库目录下，再使用 dpkg 工具构建出 Packages 文件和 Release 文件，使用 gpg 工具创建密钥对，用于访问仓库的验证即可。

1. 将下载好的包放入仓库中：

   ```bash
   $ mkdir -p /debian-mirror
   $ cp ~/Downloads/*.deb /debian-mirror
   ```

2. 创建 Packages 文件：

   ```bash
   $ dpkg-scanpackages -m .> Packages
   ```

   APT 工具会从每个软件源导入 Packages 文件（或者它的各种压缩）（若是二进制包的仓库）和 Sources 文件（若是软件包源的仓库）。APT 将根据 Packages 文件中的内容了解仓库中包的版本状态。

3. 创建 Release 文件：

   ```bash
   $ apt-ftparchive release . &gt; Release
   ```

   用户端 Ubuntu16.04/Devian 8（jessie)或者更高版本，需要提供 Release 文件。release 文件包含了 Packages 等文件的大小和校验和。

4. 创建 gpg 密钥：

   ```bash
   # 创建私钥，用于签名
   $ gpg --list-keys || gpg --gen-key
   # 创建公钥，用于分发
   $ gpg --export --armor <uid> -o my-repo.gpg-key.asc
   
   $ gpg --armor --detach-sign --sign -o Release.gpg Release
   $ gpg --clearsign -o InRelease Release
   ```

5. 在客户端上使用自建的 trivial 仓库：

   ```bash
   $ cp file:/debian-mmirror/my-repo.gpg-key.asc ./ && sudo apt-key add my-repo.gpg-key.asc
   $ echo "deb file:/debian-mmirror ./" | sudo tee /etc/apt/sources.list.d/my-repo.list
   ```

## 1.3、使用`reprepro`构建 official archive 仓库

使用 reprepro 构建仓库的方式与 1.2 相似，只不过使用 reprepro 构建，可以以 official archive 的文件组织结构存放软件包，将软件包信息存入对应的源文件。

1. 创建私钥

   ```bash
   $ gpg --gen-key
   # 查看私钥
   $ gpg -K
   ```

2. 创建公钥

   ```bash
   $ gpg --armor --export dev@zstack.io --output zstack-vyos.key
   ```

3. 使用`dpkg-sig`给 deb 包签名（也可以不签）

   ```bash
   $ dpkg-sig --sign [builder] mypackage.deb
   ```

   注意：若遇到`gpg: signing failed: Inappropriate ioctl for device`问题

   ```bash
   $ export GPG_TTY=$(tty)
   ```

   这是由于 gpg 在当前终端无法弹出密码输入窗口。

4. 创建仓库目录，设置配置文件

   ```bash
   $ mkdir -p /debian-mirror/conf
   $ vim /debian-mirror/conf/distributions
   ```

   distributions 文件中填写如下：

   ```bash
   Origin: ZStack
   Label: vyos 
   Codename: vyos
   Architectures: arm64 amd64 source
   Components: main
   Description: vyos debian package repo
   SignWith: yes
   ```

5. 使用 reprepro 创建 official 目录

   ```bash
   $ reprepro --ask-passphrase -Vb . includedeb vyos ~/Downloads/*.deb
   ```

## 1.4、使用 apache2 发布本地仓库

```bash
# 安装apache2
$ apt install apache2
# 将仓库目录链接到/var/www/下
$ ln -s /debian-mirror /var/www/packages/vyos
# 设置apache2
$ cat /etc/apache2/site-enabled/apt-mirror.conf
 
<VirtualHost *:80>
  ServerAdmin dev@zstack.io
  DocumentRoot /var/www/packages
 
  <Directory /var/www/packages>
    Options Indexes FollowSymLinks
    AllowOverride All
    Require all granted
  </Directory>
 
  LogLevel warn
  CustomLog ${APACHE_LOG_DIR}/apt-mirror_access.log combined
  ErrorLog ${APACHE_LOG_DIR}/apt-mirror_error.log
</VirtualHost>

# 重启服务
$ systemctl restart apache2
```

## 1.5、修改或替换本地仓库中的包

修改或者替换本地仓库中的包可以同样可以使用 reprepro 命令。

```bash
$ reprepro --help
reprepro - Produce and Manage a Debian package repository

options:
 -h, --help:                        Show this help
 -i  --ignore <flag>:               Ignore errors of type <flag>.
     --keepunreferencedfiles:       Do not delete files no longer needed.
     --delete:                      Delete included files if reasonable.
 -b, --basedir <dir>:               Base directory
     --outdir <dir>:                Set pool and dists base directory
     --distdir <dir>:               Override dists directory.
     --dbdir <dir>:                 Directory to place the database in.
     --listdir <dir>:               Directory to place downloaded lists in.
     --confdir <dir>:               Directory to search configuration in.
     --logdir <dir>:                Directory to put requeted log files in.
     --methodir <dir>:              Use instead of /usr/lib/apt/methods/
 -S, --section <section>:           Force include* to set section.
 -P, --priority <priority>:         Force include* to set priority.
 -C, --component <component>:        Add,list or delete only in component.
 -A, --architecture <architecture>: Add,list or delete only to architecture.
 -T, --type <type>:                 Add,list or delete only type (dsc,deb,udeb).

actions (selection, for more see manpage):
 dumpreferences:    Print all saved references
 dumpunreferenced:   Print registered files without reference
 deleteunreferenced: Delete and forget all unreferenced files
 checkpool:          Check if all files in the pool are still in proper shape.
 check [<distributions>]
       Check for all needed files to be registered properly.
 export [<distributions>]
        Force (re)generation of Packages.gz/Packages/Sources.gz/Release
 update [<distributions>]
        Update the given distributions from the configured sources.
 remove <distribution> <packagename>
       Remove the given package from the specified distribution.
 include <distribution> <.changes-file>
       Include the given upload.
 includedeb <distribution> <.deb-file>
       Include the given binary package.
 includeudeb <distribution> <.udeb-file>
       Include the given installer binary package.
 includedsc <distribution> <.dsc-file>
       Include the given source package.
 list <distribution> <package-name>
       List all packages by the given name occurring in the given distribution.
 listfilter <distribution> <condition>
       List all packages in the given distribution matching the condition.
 clearvanished
       Remove everything no longer referenced in the distributions config file.

```

通过 actions 下的指令可以对分支，包进行管理。

## 1.6、镜像一个仓库

> 很多时候我们并不想自己从头创建一个仓库，或者我们只想把公有仓库拉到自己的公司的企业网中。将 deb 包一个个从公有仓库中下载下来是不切实际的，我们可以使用 apt-mirror 工具来协助我们。

1. 首先安装 apt-mirror 工具，完成安装后会发现`/etc/apt/`目录下会多出一个 mirror.list 文件:

   ```bash
   $ apt install apt-mirror
   $ ls /etc/apt
   apt.conf.d   listchanges.conf  preferences.d  sources.list~   trusted.gpg
   auth.conf.d  mirror.list       sources.list   sources.list.d  trusted.gpg.d
   ```

2. 修改 mirror.list 文件

   ```bash
   ############# config ##################
   #
   # set base_path    /var/spool/apt-mirror			# 镜像仓库基地址
   #
   # set mirror_path  $base_path/mirror				# 镜像仓库地址
   # set skel_path    $base_path/skel					# 镜像仓库skel地址
   # set var_path     $base_path/var					# 镜像仓库var地址
   # set cleanscript $var_path/clean.sh				# 清理脚本，默认为空
   # set defaultarch  <running host architecture>		# 默认的仓库包架构类型
   # set postmirror_script $var_path/postmirror.sh		# 镜像发布脚本，一般用于更新镜像仓库
   # set run_postmirror 0								# 脚本运行周期
   #
   
   set base_path    /vyos-mirror
   
   set mirror_path  $base_path/mirror
   set skel_path    $base_path/skel
   set var_path     $base_path/var
   set cleanscript $var_path/clean.sh
   #set defaultarch  amd64
   #set postmirror_script $var_path/postmirror.sh
   set run_postmirror 0
   set nthreads     20									# 仓库下载最大线程
   set _tilde 0
   #
   ############# end config ##############
   
   #deb http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-src http://ftp.us.debian.org/debian unstable main contrib non-free
   
   # mirror additional architectures
   #deb-alpha http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-amd64 http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-armel http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-hppa http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-i386 http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-ia64 http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-m68k http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-mips http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-mipsel http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-powerpc http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-s390 http://ftp.us.debian.org/debian unstable main contrib non-free
   #deb-sparc http://ftp.us.debian.org/debian unstable main contrib non-free
   
   #clean http://ftp.us.debian.org/debian			# 仓库地址
   #
   
   deb http://dev.packages.vyos.net/repositories/current current main
   deb-arm64 http://dev.packages.vyos.net/repositories/current current main
   
   clean http://dev.packages.vyos.net/repositories/current
   
   ```

3. 运行 apt-mirror 指令，等待同步公有仓库

   ```bash
   $ apt-mirror
   ```

等待同步完成，需要较长时间。

**镜像仓库的发布方式与一般的仓库相同，也可以使用 apache2 发布。**

## 1.7、为镜像仓库添加新的包

> 在完成对一个公共仓库的镜像之后，我们往往也想要为仓库添加新的、自制的 deb 包。这个时候，我们可以通过 1.3 中提到的 rerepro 工具来实现添加新包。

注意：首先要进入到对应分支的`dists/`和`pool/`所在的目录，创建`conf/distrabution`配置文件，再添加 deb 包时，指定`distribution`类型的时候将其指定成该分支的名称。

如：

```plain
current/
|_ conf
|    |_ distrabution
|_ dists
|    |_ current
|_ pool
     |_ main
```

```bash
$ reprepro --ask-passphrase -Vb . includedeb current ~/Downloads/*.deb
```

**注意：**在使用这种方式为镜像仓库添加新的包之后，如果再次从公共仓库拉去更新，则会覆盖 reprepro 所做的更改，同时 conf 文件夹将被删除。

