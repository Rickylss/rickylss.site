# 基本情况：

实验平台基于centos7.6和centos7.4，mlnx_ofed使用的是最新的5.4-1.0.3.0。

# 问题

## 1. centos7.4 openvswitch安装包问题

### 现象

centos7.4下mlnx_ofed包安装后，ovs-vswitchd可执行文件只有4M，而centos7.6下mlnx_ofed包安装过后，ovs-vswitchd可执行文件有20M。centos7.4下ovs-vswitchd启动dpdk失败，而centos7.6正常。

![centos7.4](/home/rickylss/文档/image-2021-08-13-18-32-49-436.png)

![centos7.6](/home/rickylss/文档/image-2021-08-13-18-32-25-404.png)

使用官方文档中提到的命令重新编译安装mlnx-ofed驱动包：

```shell
$ ./mlnxofedinstall --ovs-dpdk --upstream-libs --add-kernel-support
```

发现实际上openvswitch包并没有被重新编译。

因为7.6和7.4上mlnx-ofed中提供的openvswitch包版本一致，目前我们已将centos7.6上的openvswitch安装到centos7.4上，可成功安装，无依赖问题；具体兼容情况还没做进一步测试。

### 疑问

mlnx-ofed为centos7.4提供的openvswitch包是否有问题，还是因为暂时不支持在7.4上使用dpdk才没有提供静态链接了dpdk的openvswitch。

## 2. cx6 hardware vdpa卸载问题

### 现象

我们平台的应用场景主要是虚拟机，在通过libvirt对vdpa网卡进行卸载的时候，偶尔会导致虚拟机crash，即便不会crash也会花费非常长的时间；而在cx5（software vdpa）并不会导致该问题。

虚拟机的配置方法和cx6 hardware vdap的配置方法，均参考自mlnx官方手册。

### 疑问

该问题是否和hardware vdpa有关，有没有修复方法。

## 3. dpdk bond无法下发flow规则问题

### 现象

出于方便配置以及灵活性的目的，我们采用的是dpdk bond方案，使用pf0和pf1组成active-backup模式，在开始发包之后，会出现`slave 1 can not enable `的错误。具体报错如下：

![image-20210826142158514](../../../.config/Typora/typora-user-images/image-20210826142158514.png)

![image-20210826143215660](../../../.config/Typora/typora-user-images/image-20210826143215660.png)

此时，网络是能够通的，只不过slave1无法enable，在我们拔下slave0的网线之后，网络断开；随后插回网线，网络依旧断开；最后拔下slave1的网线，网络恢复。

根据现象及报错推测：dpdk bond主备正常切换，只不过slave1上由于flow规则下载失败，导致无法正确处理网络流量，随后插回网线，拔下slave1网线，再次触发主备切换，此时slave0上flow规则正常，网络恢复。

### 疑问

使用dpdk bond是否需要对网卡做额外配置，无法解析flow的原因。

## 4. openvswitch编译问题

### 现象

由于2、3问题，我们尝试过在centos7.6上编译`openvswitch-debuginfo`，想要做调试。由于1中提到的`./mlnxofedinstall --ovs-dpdk`不会触发openvswitch的编译，我们查看了`install.pl`脚本，根据脚本上的内容指定了openvswitch的编译参数：

```perl

    }
    if (not $packages_info{'ucx-cma'}{'available'}) {
        $cmd .= " --without cma";
    }
    if ($packages_info{'ucx-ib-cm'}{'available'}) {
        $cmd .= " --with ib_cm";
    } else {
        $cmd .= " --without ib_cm";
    }
}
if ($parent =~ /openvswitch/) {
    $cmd .= " --without check ";
    if ($with_ovs_dpdk) {
        $cmd .= " --define 'dpdk_datadir $dpdk_prefix/share'";
        $cmd .= " --with dpdk";
        $cmd .= " --with static";
    }
}
 
if ($parent =~ /mlnx-dpdk/) {
    if ($with_bluefield) {
        $cmd .= " --with bluefield";
    }
}
```

我们使用的编译参数：

```shell
# mlnx_dpdk已提前安装在/opt/mellanox/dpdk/下
$ rpmbuild -bb openvswitch.spec --without check --define 'dpdk_datadir/opt/mellanox/dpdk/share' --with dpdk --with static
```

编译出来的openvswitch，安装之后，ovs-vswitchd大小也是4M。似乎与1中openvswitch情况一样。

- 重编译的ovs-vswitchd

![image-20210826141338119](../../../.config/Typora/typora-user-images/image-20210826141338119.png)

- mlnx-ofed提供的默认ovs-vswitchd

![image-20210826141429877](../../../.config/Typora/typora-user-images/image-20210826141429877.png)

### 疑问

通过read_elf查看ovs-vswitchd，并非没有静态链接到dpdk，而是缺少了某些库。`install.pl`中对openvswitch的编译在`./mlnxofedinstall --ovs-dpdk`下是不被会触发的，我们想要知道正确的编译方法。
