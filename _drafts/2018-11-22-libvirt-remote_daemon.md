---
layout: post
title:  "libvirtd"
subtitle: "remote_daemon.c->main()"
date:   2018-11-22 14:15:38 +0800
categories: [libvirt]
---



# remote_daemon.c->main()

该程序包含一个标准的守护进程创建过程，是一个非常好的学习linux编程的入门选择。因此本文将详细（啰嗦）地对源码进行分析，读者可选择性阅读。

## 1、基本信息

> remote_daemon.c是libvirt守护进程（libvirtd）的源码入口，在早期版本中（**v4.1-maint之前**），libvirtd源码入口在`/libvirt/daemon/libvirtd.c`中。现已更新为`/libvirt/src/remote/remote_daemon.c`。

- 源码版本：v4.5-maint
- 文件路径：`/libvirt/src/remote/remote_daemon.c`
- 源码作用：libvirtd程序启动入口
- 使用说明：

```shell
 $ ./libvirtd --help

Usage:
  ./libvirtd [options]

Options:
  -h | --help            Display program help:
  -v | --verbose         Verbose messages.
  -d | --daemon          Run as a daemon & write PID file.
  -l | --listen          Listen for TCP/IP connections.
  -t | --timeout <secs>  Exit after timeout period.
  -f | --config <file>   Configuration file.
  -V | --version         Display version information.
  -p | --pid-file <file> Change name of PID file.

libvirt management daemon:

  Default paths:

    Configuration file (unless overridden by -f):
      /etc/libvirt/libvirtd.conf

    Sockets:
      /var/run/libvirt/libvirt-sock
      /var/run/libvirt/libvirt-sock-ro

    TLS:
      CA certificate:     /etc/pki/CA/cacert.pem
      Server certificate: /etc/pki/libvirt/servercert.pem
      Server private key: /etc/pki/libvirt/private/serverkey.pem

    PID file (unless overridden by -p):
      /var/run/libvirtd.pid
```

## 2、源码分析

> 概述：该程序做的主要工作包括：获取options，设置环境变量开启国际化编程语言转换，读取配置文件，设置logger，将进程转换为守护进程（设置信号，pid，多次fork等），注册远程HypervisorDrivers，开启套接字端口，开启事件循环，开启监听。

### 2.1、getoption读取参数

getopt是标准的posix库，用来解析options。

``` c
/libvirt/src/remote/remote_daemon.c
#include <getopt.h>

int main(int argc, char **argv) {

    int verbose = 0;
    int godaemon = 0;
    int ipsock = 0;

    struct option opts[] = {
        { "verbose", no_argument, &verbose, 'v'},
        { "daemon", no_argument, &godaemon, 'd'},
        { "listen", no_argument, &ipsock, 'l'},
        { "config", required_argument, NULL, 'f'},
        { "timeout", required_argument, NULL, 't'},
        { "pid-file", required_argument, NULL, 'p'},
        { "version", no_argument, NULL, 'V' },
        { "help", no_argument, NULL, 'h' },
        {0, 0, 0, 0}
    };
    
    while (1) {
        int optidx = 0;
        int c;
        char *tmp;

        c = getopt_long(argc, argv, "ldf:p:t:vVh", opts, &optidx);

        if (c == -1)
            break;

        switch (c) {
        case 0:
            /* Got one of the flags */
            break;
        case 'v':
            verbose = 1;
            break;
        case 'd':
            godaemon = 1;
            break;
        case 'l':
            ipsock = 1;
            break;

        case 't':
            if (virStrToLong_i(optarg, &tmp, 10, &timeout) != 0
                || timeout <= 0
                /* Ensure that we can multiply by 1000 without overflowing.  */
                || timeout > INT_MAX / 1000) {
                VIR_ERROR(_("Invalid value for timeout"));
                exit(EXIT_FAILURE);
            }
            break;

        case 'p':
            VIR_FREE(pid_file);
            if (VIR_STRDUP_QUIET(pid_file, optarg) < 0) {
                VIR_ERROR(_("Can't allocate memory"));
                exit(EXIT_FAILURE);
            }
            break;

        case 'f':
            VIR_FREE(remote_config_file);
            if (VIR_STRDUP_QUIET(remote_config_file, optarg) < 0) {
                VIR_ERROR(_("Can't allocate memory"));
                exit(EXIT_FAILURE);
            }
            break;

        case 'V':
            daemonVersion(argv[0]);
            exit(EXIT_SUCCESS);

        case 'h':
            daemonUsage(argv[0], privileged);
            exit(EXIT_SUCCESS);

        case '?':
        default:
            daemonUsage(argv[0], privileged);
            exit(EXIT_FAILURE);
        }
    }

}
```

在whil(1)死循环中使用getopt_long循环获取options参数，直至所有参数都被读取，break跳出循环。保存options的值或状态，在后续的设置中使用。

### 2.2、gettext，注册HypervisorDrivers

gettext参考[国际化和本地化编程](https://www.ibm.com/developerworks/cn/linux/l-cn-linuxglb/index.html)

``` c
/libvirt/src/remote/remote_daemon.c
int main(int argc, char **argv) {
----省略----
    if (virGettextInitialize() < 0 ||
        virInitialize() < 0) {
        fprintf(stderr, _("%s: initialization failed\n"), argv[0]);
        exit(EXIT_FAILURE);
    }
    
----省略----
}

/libvirt/src/util/virgettext.c
#include <locale.h>
/**
 * virGettextInitialize:
 *
 * Initialize standard gettext setup
 * Returns -1 on fatal error
 */
int
virGettextInitialize(void)
{
#if HAVE_LIBINTL_H
    if (!setlocale(LC_ALL, "")) {
        perror("setlocale");
        /* failure to setup locale is not fatal */
    }

    if (!bindtextdomain(PACKAGE, LOCALEDIR)) {
        perror("bindtextdomain");
        return -1;
    }

    if (!textdomain(PACKAGE)) {
        perror("textdomain");
        return -1;
    }
#endif /* HAVE_LIBINTL_H */
    return 0;
}
```

使用宏定义查看是否安装libint（gettext所依赖的库），若已安装则可进行本地化设置。

- `setlocale(LC_ALL, "")`将程序环境设置成与系统环境一致，

- `bindtextdomain(PACKAGE, LOCALEDIR)`，*The **bindtextdomain** function sets the base directory of the hierarchy containing message catalogs for a given message domain.*

- `textdomain(PACKAGE)`，*The **textdomain** function sets or retrieves the current message domain.*

本地化语言设置之后，初始化库`virInitialize()`。

> 从1.0.0版本开始，virInitialize()会被virConnectOpen()和virGetVersion()自动调用，除非当你将virEventRegisterImpl()或virSetErrorFunc()当作第一个调用的API时，你需要手动调用一次。

``` c
/libvirt/src/libvirt.c

int
virInitialize(void)
{
    if (virOnce(&virGlobalOnce, virGlobalInit) < 0)
        return -1;

    if (virGlobalError)
        return -1;
    return 0;
}

/libvirt/src/util/virthread.c
int virOnce(virOnceControlPtr once, virOnceFunc init)
{
    return pthread_once(&once->once, init);
}
```

[pthread_once](https://linux.die.net/man/3/pthread_once)函数，调用线程运行virGlobalInit，并且只运行一次(virGlobalOnce)。

### 2.3、virGlobalInit

```c
static void
virGlobalInit(void)
{
    if (virThreadInitialize() < 0 ||
        virErrorInitialize() < 0)
        goto error;

#ifndef LIBVIRT_SETUID_RPC_CLIENT
    if (virIsSUID()) {
        virReportError(VIR_ERR_INTERNAL_ERROR, "%s",
                       _("libvirt.so is not safe to use from setuid programs"));
        goto error;
    }
#endif

    virLogSetFromEnv();

#ifdef WITH_GNUTLS
    virNetTLSInit();
#endif

#if WITH_CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);
#endif

    VIR_DEBUG("register drivers");

#if HAVE_WINSOCK2_H
    if (virWinsockInit() == -1)
        goto error;
#endif

#ifdef HAVE_LIBINTL_H
    if (!bindtextdomain(PACKAGE, LOCALEDIR))
        goto error;
#endif /* HAVE_LIBINTL_H */

    /*
     * Note we must avoid everything except 'remote' driver
     * for virt-login-shell usage
     */
#ifndef LIBVIRT_SETUID_RPC_CLIENT
    /*
     * Note that the order is important: the first ones have a higher
     * priority when calling virConnectOpen.
     */
# ifdef WITH_TEST
    if (testRegister() == -1)
        goto error;
# endif
# ifdef WITH_OPENVZ
----省略----
#endif
#ifdef WITH_REMOTE
    if (remoteRegister() == -1)
        goto error;
#endif

    return;

 error:
    virGlobalError = true;
}
```

#### 2.3.1、virThreadInitialize() || virErrorInitialize()

virThreadInitialize()返回恒为0，无需对pthread做特殊初始化：

``` c
int virThreadInitialize(void)
{
    return 0;
}
```

virErrorInitialize()初始化error data，为每个线程创建一个单独error:

``` c
int
virErrorInitialize(void)
{
    return virThreadLocalInit(&virLastErr, virLastErrFreeData);
}

int virThreadLocalInit(virThreadLocalPtr l,
                       virThreadLocalCleanup c)
{
    int ret;
    if ((ret = pthread_key_create(&l->key, c)) != 0) {
        errno = ret;
        return -1;
    }
    return 0;
}
```

参考[pthread_key_create](http://pubs.opengroup.org/onlinepubs/007904975/functions/pthread_key_create.html)。

#### 2.3.2、判断当前用户是否为执行用户

``` c
bool virIsSUID(void)
{
    return getuid() != geteuid();
}
```

#### 2.3.3、virLogSetFromEnv & VIR_ONCE_GLOBAL_INIT

`virLogSetFromEnv();`

``` c
void
virLogSetFromEnv(void)
{
    const char *debugEnv;

    if (virLogInitialize() < 0)
        return;

    debugEnv = virGetEnvAllowSUID("LIBVIRT_DEBUG");
    if (debugEnv && *debugEnv)
        virLogSetDefaultPriority(virLogParseDefaultPriority(debugEnv));
    debugEnv = virGetEnvAllowSUID("LIBVIRT_LOG_FILTERS");
    if (debugEnv && *debugEnv)
        virLogSetFilters(debugEnv);
    debugEnv = virGetEnvAllowSUID("LIBVIRT_LOG_OUTPUTS");
    if (debugEnv && *debugEnv)
        virLogSetOutputs(debugEnv);
}
```

其中virLogInitialize()是由VIR_ONCE_GLOBAL_INIT(virLog)宏定义展开生成的。**VIR_ONCE_GLOBAL_INIT函数在后面经常出现，在这里需要详细解释一下。**

```c
/**
 * VIR_ONCE_GLOBAL_INIT:
 * classname: base classname
 *
 * This macro simplifies the setup of a one-time only
 * global file initializer.
 *
 * Assuming a class called "virMyObject", and a method
 * implemented like:
 *
 *  int virMyObjectOnceInit(void) {
 *      ...do init tasks...
 *  }
 *
 * Then invoking the macro:
 *
 *  VIR_ONCE_GLOBAL_INIT(virMyObject)
 *
 * Will create a method
 *
 *  int virMyObjectInitialize(void);
 *
 * Which will ensure that 'virMyObjectOnceInit' is
 * guaranteed to be invoked exactly once.
 */
# define VIR_ONCE_GLOBAL_INIT(classname) \
    static virOnceControl classname ## OnceControl = VIR_ONCE_CONTROL_INITIALIZER; \
    static virErrorPtr classname ## OnceError; \
 \
    static void classname ## Once(void) \
    { \
        if (classname ## OnceInit() < 0) \
            classname ## OnceError = virSaveLastError(); \
    } \
 \
    static int classname ## Initialize(void) \
    { \
        if (virOnce(&classname ## OnceControl, classname ## Once) < 0) \
            return -1; \
 \
        if (classname ## OnceError) { \
            virSetError(classname ## OnceError); \
            return -1; \
        } \
 \
        return 0; \
    }

#endif
```

宏展开后如下：

```c
static virOnceControl virLogOnceControl = VIR_ONCE_CONTROL_INITIALIZER; 
static virErrorPtr virLogOnceError; 
 
static void virLogOnce(void) 
{ 
    if (virLogOnceInit() < 0) 
        virLogOnceError = virSaveLastError(); 
} 
 
static int virLogInitialize(void) 
{ 
    if (virOnce(&virLogOnceControl, virLogOnce) < 0) 
        return -1; 
 
    if (virLogOnceError) { 
        virSetError(virLogOnceError); 
        return -1;
    } 
 
    return 0; 
}
```

展开后发现与前面的pthread_create_once相同，即对virLog初始化一次。在这里出现了一个关键的virSaveLastError()，这个就是2.3.1中设置了的单独存储的变量。跟踪到`virCopyLastError()->virLastErrorObject()->virThreadLocalSet()->pthread_setspecific()`。virSaveLastError尝试通过pthread_getspecific()获取LastError这个线程key值，若获取为NULL，则通过pthread_setSpecific()设置该key值。**注意**：该lastError实际上是[errno](http://man7.org/linux/man-pages/man3/errno.3.html)。

#### 2.3.4、virNetTLSInit & virWinSockInit

通过环境变量，设置[gnutls](https://www.gnutls.org/)将要使用的日志程序，在这里是指virNetTLSLog。

初始化[Winsock2](https://docs.microsoft.com/en-us/windows/desktop/winsock/windows-sockets-start-page-2)，可理解为windows下的sock编程接口。

#### 2.3.5、virt-login-shell

注意这个宏：LIBVIRT_SETUID_RPC_CLIENT。在virGlobalInit中，如果定义了该宏，则无需virIsSUID()，同时也无需初始化除remote以外的其他Driver。全局查找后发现与virt-login-shell有关，在编译时，只有该程序定义了LIBVIRT_SETUID_RPC_CLIENT:

``` makefile
virt_login_shell_CFLAGS = \
		-DLIBVIRT_SETUID_RPC_CLIENT \
		$(AM_CFLAGS) \
		$(NULL)
```

打开`/libvirt/tools/virt-login-shell.c`文件，发现如下注释：

```c
/*
 * virt-login-shell.c: a shell to connect to a container
 *
 * Copyright (C) 2013-2014 Red Hat, Inc.
```

该程序是一个连接容器的shell，自然就不需要其他的Driver，因为所有的容器都是通过remote连接的，该部分内容在后文会有提及。

#### 2.3.6、注册driver

标准的注册driver以testRegister()为例：

``` c
static virConnectDriver testConnectDriver = {
    .localOnly = true,
    .uriSchemes = (const char *[]){ "test", NULL },
    .hypervisorDriver = &testHypervisorDriver,
    .interfaceDriver = &testInterfaceDriver,
    .networkDriver = &testNetworkDriver,
    .nodeDeviceDriver = &testNodeDeviceDriver,
    .nwfilterDriver = NULL,
    .secretDriver = NULL,
    .storageDriver = &testStorageDriver,
};

/**
 * testRegister:
 *
 * Registers the test driver
 */
int
testRegister(void)
{
    return virRegisterConnectDriver(&testConnectDriver,
                                    false);
}

virRegisterConnectDriver(virConnectDriverPtr driver,
                         bool setSharedDrivers)
{
    VIR_DEBUG("driver=%p name=%s", driver,
              driver ? NULLSTR(driver->hypervisorDriver->name) : "(null)");

    virCheckNonNullArgReturn(driver, -1);
    if (virConnectDriverTabCount >= MAX_DRIVERS) {
        virReportError(VIR_ERR_INTERNAL_ERROR,
                       _("Too many drivers, cannot register %s"),
                       driver->hypervisorDriver->name);
        return -1;
    }

    VIR_DEBUG("registering %s as driver %d",
           driver->hypervisorDriver->name, virConnectDriverTabCount);

    if (setSharedDrivers) {
        if (driver->interfaceDriver == NULL)
            driver->interfaceDriver = virSharedInterfaceDriver;
        if (driver->networkDriver == NULL)
            driver->networkDriver = virSharedNetworkDriver;
        if (driver->nodeDeviceDriver == NULL)
            driver->nodeDeviceDriver = virSharedNodeDeviceDriver;
        if (driver->nwfilterDriver == NULL)
            driver->nwfilterDriver = virSharedNWFilterDriver;
        if (driver->secretDriver == NULL)
            driver->secretDriver = virSharedSecretDriver;
        if (driver->storageDriver == NULL)
            driver->storageDriver = virSharedStorageDriver;
    }

    virConnectDriverTab[virConnectDriverTabCount] = driver;
    return virConnectDriverTabCount++;
}
```

所谓的注册就是将该driver放入到一个virConnectDriverTab中，在后续的connect连接时，循环该table，取出对应的Driver，进行连接尝试。

### 2.4、virUpdateSelfLastChanged & virFileActivateDirOverride

``` c
void virUpdateSelfLastChanged(const char *path)
{
    struct stat sb;

    if (stat(path, &sb) < 0)
        return;

    if (sb.st_ctime > selfLastChanged) {
        VIR_DEBUG("Setting self last changed to %lld for '%s'",
                  (long long)sb.st_ctime, path);
        selfLastChanged = sb.st_ctime;
    }
}
```

[stat()](http://man7.org/linux/man-pages/man2/stat.2.html)函数获取文件状态stat结构体如下：

``` c
struct stat {
               dev_t     st_dev;         /* ID of device containing file */
               ino_t     st_ino;         /* Inode number */
               mode_t    st_mode;        /* File type and mode */
               nlink_t   st_nlink;       /* Number of hard links */
               uid_t     st_uid;         /* User ID of owner */
               gid_t     st_gid;         /* Group ID of owner */
               dev_t     st_rdev;        /* Device ID (if special file) */
               off_t     st_size;        /* Total size, in bytes */
               blksize_t st_blksize;     /* Block size for filesystem I/O */
               blkcnt_t  st_blocks;      /* Number of 512B blocks allocated */

               /* Since Linux 2.6, the kernel supports nanosecond
                  precision for the following timestamp fields.
                  For the details before Linux 2.6, see NOTES. */

               struct timespec st_atim;  /* Time of last access */
               struct timespec st_mtim;  /* Time of last modification */
               struct timespec st_ctim;  /* Time of last status change */

           #define st_atime st_atim.tv_sec      /* Backward compatibility */
           #define st_mtime st_mtim.tv_sec
           #define st_ctime st_ctim.tv_sec
           };
```

argv[0]为程序可执行文件，该程序的目的是更新selfLastChanged值为可执行文件最后一次状态改变 的时间。

virFileActivateDirOverride函数判断是否运行构建目录下的程序（查找该目录下是否有/.libs/），如果是，那么将useDirOverride设置为true。

### 2.5、读取配置文件libvirtd.conf

读取配置文件的策略非常简单：

1. 通过daemonConfigNew(privileged)在结构体daemonConfig中写入默认的配置参数。
2. 判断在getoption时，是否设置了remote_config_file，如果没有设置，则去默认位置读取文件。
3. 如果指定了remote_config_file，则读取该路径下的配置文件。

### 2.6、合并profile文件







