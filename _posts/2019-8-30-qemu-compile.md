---
layout: post
title:  "qemu compile"
subtitle: ""
date:   2019-8-30 10:23:45 +0800
tags:
  - qemu
  - can
categories: [QEMU]
---

  ubuntu18.06 中的 qemu 版本不带 CAN，因此需要自己编译最新版的 qemu。

<!-- more -->

## 1. QEMU 编译

1. 安装依赖

   ```shell
   $ apt install git libglib2.0-dev libfdt-dev libpixman-1-dev zlib1g-dev git-email libaio-dev libbluetooth-dev libbrlapi-dev libbz2-dev libcap-dev libcap-ng-dev libcurl4-gnutls-dev libgtk-3-dev libibverbs-dev libjpeg8-dev libncurses5-dev libnuma-dev librbd-dev librdmacm-dev libsasl2-dev libsdl1.2-dev libseccomp-dev libsnappy-dev libssh2-1-dev libvde-dev libvdeplug-dev libvte-2.90-dev libxen-dev liblzo2-dev valgrind xfslibs-dev libnfs-dev libiscsi-dev
   ```

2. 为了不污染系统和开发环境，编译安装到固定目录下，build.sh 内容如下：

   ```shell
   /code/qemu/configure --prefix='/code/qemu-compile/install' --target-list="aarch64-softmmu,microblazeel-softmmu,x86_64-softmmu" --enable-fdt --disable-xen
   
   make -j4  install
   ```

   编译到`/code/qemu-compile/build`目录下，安装到`/code/qemu-compile/install`目录下。

   **如果编译过程中 clone 子模块失败，则需要修改子模块仓库 url**

3. 清空 submodule

   ```shell
   $ git clean -f -x -d
   $ git submodule deinit --all -f
   ```

4. 修改`.gitmodule`文件如下：

   ```plain
[submodule "roms/seabios"]
	path = roms/seabios
	url = https://github.com/qemu/seabios.git/
[submodule "roms/SLOF"]
	path = roms/SLOF
	url = https://github.com/qemu/SLOF.git
[submodule "roms/ipxe"]
	path = roms/ipxe
	url = https://github.com/qemu/ipxe.git
[submodule "roms/openbios"]
	path = roms/openbios
	url = https://github.com/qemu/openbios.git
[submodule "roms/openhackware"]
	path = roms/openhackware
	url = https://github.com/qemu/openhackware.git
[submodule "roms/qemu-palcode"]
	path = roms/qemu-palcode
	url = https://github.com/qemu/qemu-palcode.git
[submodule "roms/sgabios"]
	path = roms/sgabios
	url = https://github.com/qemu/sgabios.git
[submodule "dtc"]
	path = dtc
	url = https://github.com/qemu/dtc.git
[submodule "roms/u-boot"]
	path = roms/u-boot
	url = https://github.com/qemu/u-boot.git
[submodule "roms/skiboot"]
	path = roms/skiboot
	url = https://github.com/qemu/skiboot.git
[submodule "roms/QemuMacDrivers"]
	path = roms/QemuMacDrivers
	url = https://github.com/qemu/QemuMacDrivers.git
[submodule "ui/keycodemapdb"]
	path = ui/keycodemapdb
	url = https://github.com/qemu/keycodemapdb.git
[submodule "capstone"]
	path = capstone
	url = https://github.com/qemu/capstone.git
[submodule "roms/seabios-hppa"]
	path = roms/seabios-hppa
	url = https://github.com/qemu/seabios-hppa.git
[submodule "roms/u-boot-sam460ex"]
	path = roms/u-boot-sam460ex
	url = https://github.com/qemu/u-boot-sam460ex.git
[submodule "tests/fp/berkeley-testfloat-3"]
	path = tests/fp/berkeley-testfloat-3
	url = https://github.com/ucb-bar/berkeley-testfloat-3.git
[submodule "tests/fp/berkeley-softfloat-3"]
	path = tests/fp/berkeley-softfloat-3
	url = https://github.com/ucb-bar/berkeley-softfloat-3.git
   ```

​      .gitmodule 中子模块 url 地址可自行确认。

5. 初始化 submodule

   ```shell
   $ git submodule init
   ```

   更新后，可在.git/config 文件中看到子模块 url 路径同样被更新。

6. 更新 submodule

   ```shell
   $ git submodule update
   ```

   下载子模块内容。

## 2. 制作 x86_64 启动镜像

1. 下载 ubuntu 服务器版镜像，使用 qemu-img 命令创建虚拟磁盘镜像

   ```shell
   $ qemu-img create -f qcow2 ubuntu.img 10G
   ```

2. 启动 qemu 虚拟机，安装系统到虚拟磁盘

   ```shell
   $ qemu-system-x86_64 -enable-kvm -smp 2 -m 2048 -hda ubuntu.img -cdrom ubuntu-18.04.3-amd64.iso -boot once=d
   ```

3. 创建 file.img，通过挂载 file.img 在宿主机和目标机之间传送文件

   ```shell
   $ dd if=/dev/zero of=/code/qemu-test/file.img bs=1M count=200
   $ mkfs.ext4 /code/qemu-test/file.img
   $ mkdir /code/qemu-test/file
   $ mount -o loop /code/qemu-test/file.img /code/qemu-test/file
   ```

4. 等系统安装完成后，将 file.img 挂载到系统上

   ```shell
   qemu-system-x86_64 -enable-kvm -smp 2 -m 2048 -hda ubuntu.img -hdb file.img
   ```

5. 在 qemu 虚拟的操作系统中挂载 sdb 盘，可获取文件。

### 2.1. 带 CAN 启动 x86_64pc

1. 在宿主机上创建虚拟**宿主机上 can0**

   ```shell
   $ ip link add dev can0 type vcan                #创建虚拟 can 设备；类型 vcan 名称 can0
   $ ifconfig -a / ip -details link show can0	    #查看新建虚拟 can0 设备
   $ ip link set can0 up                           #启动 can0，可查看此时 can0 设备状态改变
   ```

2. 启动 x86_64 目标机添加 pci-can，并连接**宿主机上 can0**

   ```shell
   $ qemu-system-x86_64 -enable-kvm -smp 2 -m 2048 -hda ubuntu.img -hdb file.img -object can-bus,id=canbus0 -object can-host-socketcan,id=canhost0,if=can0,canbus=canbus0 -device kvaser_pci,canbus=canbus0
   ```

   目标机启动后，登录目标机，同样通过命令查看**目标机上 can0**设备，设置**目标机 can0**：

   ```shell
   # ip link set can0 type can --help 可查看帮助
   $ ip link set can0 type can bitrate 10000000
   $ ip link set can0 up
   ```

3. 使用 can-utils 测试 can 通信功能

   在宿主机和目标机上分别安装 can-utils

   ```shell
   $ apt install can-utils
   ```

   目标机使用 candump 命令监听目标机 can0 内容

   ```shell
   $ candump can0
   ```

   宿主机上使用 cansend 命令通过宿主机 can0 发送内容

   ```shell
   $ cansend can0 5A1#11.2233.44556677.88
   ```

   在目标机上可看到宿主机发送的内容：

   ![](\pictures\qemu-can.png)

### 2.2. 编译运行 RTE

略

## 3. 制作 ARM 启动内核

> 选择带 PCI 的 arm 板子，由于 QEMU 中实现 CAN 设备需要有 pci 扩展，因此可供选择的设备只有 realview、versatiepb 和 virt，如果要运行 linux，那么最好的设备就是 virt。

1. 下载 arm 版 ubuntu 服务器镜像，使用 qemu-img 命令创建虚拟磁盘镜像

   ```shell
   $ qemu-img create -f qcow2 arm.img 5G
   ```

2. 制作 UEFI flash

   ```shell
   $ apt-get install qemu-efi
   $ dd if=/dev/zero of=flash0.img bs=1M count=64
   $ dd if=/usr/share/qemu-efi/QEMU_EFI.fd of=flash0.img conv=notrunc
   $ dd if=/dev/zero of=flash1.img bs=1M count=64
   ```

3. 启动 QEMU，并加载 cdrom，安装系统到 arm.img 虚拟磁盘镜像

   ```shell
   $ qemu-system-aarch64 -machine virt -cpu cortex-a57 -smp 2 -m 2G --nographic -pflash "flash0.img" -pflash "flash1.img" -device rtl8139,netdev=net0 -device virtio-scsi-device -netdev user,id=net0 -cdrom ubuntu-18.04.3-server-arm64.iso -hda arm.img
   ```

4. 重启 QEMU，挂载 file.img

   ```shell
   $ qemu-system-aarch64 -machine virt -cpu cortex-a57 -smp 2 -m 2G --nographic -pflash "flash0.img" -pflash "flash1.img" -device rtl8139,netdev=net0 -device virtio-scsi-device -netdev user,id=net0 -hda arm.img -hdb file.img 
   ```

### 3.1 .带 CAN 启动 arm Ubuntu

1. 启动 arm 目标机添加 pci-can，并连接**宿主机上 can0**

   ```shell
   $ qemu-system-aarch64 -machine virt -cpu cortex-a57 -smp 2 -m 2G --nographic -pflash "flash0.img" -pflash "flash1.img" -device rtl8139,netdev=net0 -device virtio-scsi-device -netdev user,id=net0 -hda arm.img -object can-bus,id=canbus0 -object can-host-socketcan,id=canhost0,if=can0,canbus=canbus0 -device kvaser_pci,canbus=canbus0
   ```

2. 目标机启动后，登录目标机，同样通过命令查看**目标机上 can0**设备，设置**目标机 can0**：

   ```shell
   # ip link set can0 type can --help 可查看帮助
   $ ip link set can0 type can bitrate 10000000
   $ ip link set can0 up
   ```

3. 测试 can 通信，同 x86_64。

### 3.2. 编译运行 RTE

注意，由于可执行文件与库是 32 位，而系统是 64 位，因此在启动之后，需要添加 32 位库：

```shell
$ dpkg --add-architecture armhf
$ apt-get update
$ apt-get install libc6:armhf libstdc++6:armhf
$ cd /lib
$ ln -s arm-linux-gnueabihf/ld-2.23.so ld-linux.so.3
```

## 4. arm 目标机和 x86_64 目标机通过 can 通信

http://manpages.ubuntu.com/manpages/bionic/man1/cangw.1.html

>在 QEMU 下，/qemu/docs/can.txt 文件中讲解了如何将目标机的 can 设备绑定到宿主机的 can 上，但是没有提供两个目标机之间连接 can 的方式。

### 4.1.分析 QEMU 中 CAN 连接机制

查看代码`/qemu/net/can/can_socketcan.c`中`can_host_socketcan_connect`方法：

```c
static void can_host_socketcan_connect(CanHostState *ch, Error **errp)
{
    CanHostSocketCAN *c = CAN_HOST_SOCKETCAN(ch);
    int s; /* can raw socket */
    struct sockaddr_can addr;
    struct ifreq ifr;

    /* open socket */
    s = qemu_socket(PF_CAN, SOCK_RAW, CAN_RAW);
    if (s < 0) {
        error_setg_errno(errp, errno, "failed to create CAN_RAW socket");
        return;
    }

    addr.can_family = AF_CAN;
    memset(&ifr.ifr_name, 0, sizeof(ifr.ifr_name));
    strcpy(ifr.ifr_name, c->ifname);
    if (ioctl(s, SIOCGIFINDEX, &ifr) < 0) {
        error_setg_errno(errp, errno,
                         "SocketCAN host interface %s not available", c->ifname);
        goto fail;
    }
    addr.can_ifindex = ifr.ifr_ifindex;

    c->err_mask = 0xffffffff; /* Receive error frame. */
    setsockopt(s, SOL_CAN_RAW, CAN_RAW_ERR_FILTER,
                   &c->err_mask, sizeof(c->err_mask));

    c->rfilter_num = 1;
    c->rfilter = g_new(struct qemu_can_filter, c->rfilter_num);

    /* Receive all data frame. If |= CAN_INV_FILTER no data. */
    c->rfilter[0].can_id = 0;
    c->rfilter[0].can_mask = 0;
    c->rfilter[0].can_mask &= ~CAN_ERR_FLAG;

    setsockopt(s, SOL_CAN_RAW, CAN_RAW_FILTER, c->rfilter,
               c->rfilter_num * sizeof(struct qemu_can_filter));

    if (bind(s, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        error_setg_errno(errp, errno, "failed to bind to host interface %s",
                         c->ifname);
        goto fail;
    }

    c->fd = s;
    ch->bus_client.info = &can_host_socketcan_bus_client_info;
    qemu_set_fd_handler(c->fd, can_host_socketcan_read, NULL, c);
    return;

fail:
    close(s);
    g_free(c->rfilter);
    c->rfilter = NULL;
    c->rfilter_num = 0;
}
```

可见，can 也是采用 socket 编程的方式来做的，其中需要关注的是，在进行 socketcan 编程的时候，bind 的对象不是 ip:port，而是 can-id，这个 can-id 其实就是宿主机上的 can 设备。看该方法`qemu_set_fd_handler(c->fd, can_host_socketcan_read, NULL, c);`可知在目标机中获取 CAN 数据是通过 c->fd。由此可分析，目标机上的 can 设备绑定到了宿主机上的 can 设备，而不是连接到宿主机上的 can 设备，因此宿主机上的 can 设备此时就是目标机的 can 设备，对该 can 的任何读写操作都可以认为是对目标机 can 的读写操作。

### 4.2.使用 can-utils 创建路由规则

由 4.1 可知，想要使得两个目标机 can 互相通信，只需要让其绑定的宿主机的 can 互相通信。

```shell
$ modprobe can-gw
$ cangw -A -s can0 -d can1 -e
$ cangw -A -s can1 -d can0 -e
```

这样设置路由规则并不会导致死循环，cangw 会丢掉重复的包

```shell
$ cangw -L
$ cangw -A -s can0 -d can1 -e # 1 handled 0 dropped 1 deleted
$ cangw -A -s can1 -d can0 -e # 3 handled 0 dropped 1 deleted
```

## 5.CAN 通信至物理 CAN

由 4.1 中分析可知，CAN 通信至物理 CAN，只需要将宿主机物理 CAN 绑定到目标机上即可。



   



   