---
layout: post
title:  "nvidia k8s device plugin"
subtitle: ""
date:   2022-08-21 12:52:45 +0800
tags:
  - container
categories: [container]
comment: true
---

# nvidia-container-runtime

想要使用带 GPU 的 container 需要先替换 Nvidia 定制的 runtime。

>  Since Kubernetes does not support the `--gpus` option with Docker yet, the `nvidia` runtime should be setup as the default container runtime for Docker on the GPU node. This can be done by adding the `default-runtime` line into the Docker daemon config file, which is usually located on the system at `/etc/docker/daemon.json`:

```json
{
   "default-runtime": "nvidia",
   "runtimes": {
      "nvidia": {
            "path": "/usr/bin/nvidia-container-runtime",
            "runtimeArgs": []
      }
   }
}
```

<!-- more -->

# k8s device plugin 需要做什么

1. 获取/操作 host 上设备资源；
2. 实现 device plugin 需要实现的 gRPC 方法，即控制资源分配；

## container & host

container 运行时和 Host 之间的权限主要由四个选项控制:

| Option         | Description                                                  |
| :------------- | :----------------------------------------------------------- |
| `--cap-add`    | Add Linux capabilities                                       |
| `--cap-drop`   | Drop Linux capabilities                                      |
| `--privileged` | Give extended privileges to this container                   |
| `--device=[]`  | Allows you to run devices inside the container without the --privileged flag. |

默认的情况下 docker container 是没有特权的，举例来说，你无法在一个 docker 容器里运行 docker 守护进程。因为默认情况下，container 是无法访问 devices 的，但是有特权的 container 可以访问。容器的访问隔离是基于 cgroup 做的，对 devices 的访问也是通过 cgroup 实现的。

### container 访问 device 资源

需要在启动容器的时候指定特定的设备，或者在构建容器镜像时指定，则在容器中可以访问该设备。

```bash 
$ docker run --device=<Host Device>:<Container Device Mapping>:<Permissions>   [ OPTIONS ]  IMAGE[:TAG]  [COMMAND]  [ARG...]

$ docker run -it --rm --device=/dev/port:r ubuntu /bin/bash
```

![image-20220803141504284](https://raw.githubusercontent.com/Rickylss/pics/main/zuler_img/image-20220803141504284.png)

上图很好地展示了 `--privileged` 的效果。

### container 加载/卸载内核模块

若要加载内核模块则需要使用 `--privileged` 同时添加 `SYS_MODULE` 能力。

```bash
$ docker run -it --rm --privileged --cap-add=SYS_MODULE ubuntu /bin/bash

# on the host
$ modprobe ashmem
$ modprobe binder
$ modprobe fuse

# in the docker
$ apt install kmod
$ rmmod ashmem_linux
```

![image-20220803150302599](https://raw.githubusercontent.com/Rickylss/pics/main/zuler_img/image-20220803150302599.png)

从上图可以看到，在 docker 中 `rmmod`，确实影响到了 host。

### nvml

Nvidia 通过 nvml 库（NVIDIA Management Library）来监控管理  GPU 设备。它提供了通过 nvidia-smi 暴露的可以直接访问的查询和命令。

> A C-based API for monitoring and managing various states of the NVIDIA GPU devices. It provides a direct access to the queries and commands exposed via [nvidia-smi](https://developer.nvidia.com/nvidia-system-management-interface). The runtime version of NVML ships with the NVIDIA display driver, and the SDK provides the appropriate header, stub libraries and sample applications. Each new version of NVML is backwards compatible and is intended to be a platform for building 3rd party applications.

在 Nvidia device plugin 中监控管理 GPU 使用的也是 nvml。

> container 能够访问 devices 并获取其状态即完成了第一步。

## device plugin implementation

- 初始化，执行特定的初始化确保设备准备完成；
- 开启 gRPC service，在 `/var/lib/kubelet/device-plugins` 目录下创建一个 `unix socket`；
- plugins 通过 `/var/lib/kubelet/device-plugins/kubelet.sock` 将自己注册到 kublet 中;
- 完成注册后，device plugin 进入服务模式，持续监控设备状态，一旦检测到设备变化则向上报告给 kubelet。

### gRPC service

device plugin 需要实现如下几个方法：

```go
service DevicePlugin {
      // GetDevicePluginOptions returns options to be communicated with Device Manager.
      rpc GetDevicePluginOptions(Empty) returns (DevicePluginOptions) {}

      // ListAndWatch returns a stream of List of Devices
      // Whenever a Device state change or a Device disappears, ListAndWatch
      // returns the new list
      rpc ListAndWatch(Empty) returns (stream ListAndWatchResponse) {}

      // Allocate is called during container creation so that the Device
      // Plugin can run device specific operations and instruct Kubelet
      // of the steps to make the Device available in the container
      rpc Allocate(AllocateRequest) returns (AllocateResponse) {}

      // GetPreferredAllocation returns a preferred set of devices to allocate
      // from a list of available ones. The resulting preferred allocation is not
      // guaranteed to be the allocation ultimately performed by the
      // devicemanager. It is only designed to help the devicemanager make a more
      // informed allocation decision when possible.
      rpc GetPreferredAllocation(PreferredAllocationRequest) returns (PreferredAllocationResponse) {}

      // PreStartContainer is called, if indicated by Device Plugin during registeration phase,
      // before each container start. Device plugin can run device specific operations
      // such as resetting the device before making devices available to the container.
      rpc PreStartContainer(PreStartContainerRequest) returns (PreStartContainerResponse) {}
}
```

> **Note:** Plugins are not required to provide useful implementations for `GetPreferredAllocation()` or `PreStartContainer()`. Flags indicating which (if any) of these calls are available should be set in the `DevicePluginOptions` message sent back by a call to `GetDevicePluginOptions()`. The `kubelet` will always call `GetDevicePluginOptions()` to see which optional functions are available, before calling any of them directly.

> ps: nvidia device plugin 用于给 k8s 集群分配 gpu 资源，如果想要所有容器都能够访问 gpu，最好不要安装 nvidia device pluign。

# Reference

https://docs.docker.com/engine/reference/run/#runtime-privilege-and-linux-capabilities

https://www.kernel.org/doc/Documentation/cgroup-v1/devices.txt

https://developer.nvidia.com/nvidia-management-library-nvml
