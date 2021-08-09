---
layout: post
title:  "使用 curl 为 zstack-utility 模拟请求"
subtitle: ""
date:   2021-1-23 14:37:45 +0800
tags:
  - zstack
categories: [zstack]
comment: true
---

在我们开发[zstack-utilty](https://github.com/zstackio)的时候，我们总希望能够随时替换开发服务器上的代码（这就是用 python 的好处）并且能够对新添加的 Restful 接口进行快速地测试。本文介绍了一种使用`ngrep`和`curl`工具来模拟 request 请求的方法。

> 本文实验所使用到的 zstack-utility 为 zstack 社区开源版本。zstack 的安装方式可参考[官方教程](https://www.zstack.io/product/product_download/)。

# 修改 zstack-utility 代码

zstack-utility 中的 kvmagent 采用了插件的形式，如果我们要向 kvmagent 添加一些新的 API，我们可以在`kvmagent/kvmagent/plugins/`目录下新建一个`hello_plugin.py`文件，写一个 class 继承`kvmagent.KvmAgent`。overwrite `start()`方法和`stop()`方法。简单的示例如下：

```python
from kvmagent import kvmagent

SAY_HELLO_URL = '/say/hello'

logger = log.get_logger(__name__)

class SayHelloCmd(kvmagent.AgentCommand):
    def __init__(self):
        super(SayHelloCmd, self).__init__()
        self.myname = None


class SayHelloResponse(kvmagent.AgentResponse):
    def __init__(self):
        super(SayHelloResponse, self).__init__()

        
class HelloWorlPlugin(kvmagent.KvmAgent):
    
    @kvmagent.replyerror
    def say_hello(self, req):
        cmd = jsonobject.loads(req[http.REQUEST_BODY])
        rsp = SayHelloResponse()
		
        print("hello world, hello %d" % cmd.myname)
        logger.info("hello world, hello %d" % cmd.myname)
        
        rsp.success = True

        logger.debug(http.path_msg(SAY_HELLO_URL,
                                   'done'))
        return jsonobject.dumps(rsp)

    def start(self):
        http_server = kvmagent.get_http_server()

        http_server.register_async_uri(
            SAY_HELLO_URL, self.say_hello)

    def stop(self):
        pass
```

将该文件添加到`/var/lib/zstack/virtualenv/kvm/lib/python2.7/site-packages/kvmagent/plugins/`目录下，重启`zstack-kvmagent`服务：

```bash
$ systemctl restart zstack-kvmagent.service
```

查看日志`/var/log/zstack/zstack-kvmagent.log`，可看到该插件被注册。

# 使用 ngrep 截获 request"hello world"

`zstack-kvmagent`会开启一个 http 服务，该 http 服务会监听在 7070 端口，等待`zstack`端发来的调度请求。现在我们要向`zstack-kvmagent`发送一个‘say hello’的请求，模仿一下`zstack`端的请求格式，我们先使用`ngrep`命令截获一个请求：

```plain
$ yum install ngrep
$ ngrep port 7070
interface: bond0
filter: ( proto 7070 ) and ((ip || ip6) || (vlan && (ip || ip6)))
##
T 172.20.11.200:45234 -> 172.31.6.13:7070 [AP] #19
  POST /network/smart/checkinterfacehardware HTTP/1.1..User-Agent: curl/7.29.0..H
  ost: 172.31.6.13:7070..Accept: text/plain, application/json, application/*+json
  , */*..taskuuid: 7b214c0535ff4432b3c20df137ffffff..callbackurl: http://172.31.6
  .11:8080/zstack/asyncrest/callback..Content-Type: application/json;charset=utf-
  8..Content-Length: 46....{"interfaceNames": ["enp24s0f0", "enp24s0f1"]}        
##
```

可以看到在这里，从 172.20.11.200 向 172.31.6.13 发送了一个 POST 请求，使用的 HTTP/1.1 协议，其中包含了`User-Agent`、`Content-Type`和`request body`等信息。

# 使用 curl 仿造 request

在上一节我们已经可以获取到 request 请求的模板了，我们使用 curl 命令来发送我们的`say hello`的请求：了

```bash
$ curl -H 'Accept: text/plain, application/json, application/*+json, */*' -H 'taskuuid: 7b214c0535ff4432b3c20df137ffffff' -H 'callbackurl: http://172.31.6.11:8080/zstack/asyncrest/callback' -H 'Content-Type: application/json;charset=utf-8' --data '{"myname":"rickylss"}' -X POST 172.31.6.13:7070/say/hello
```

跟踪日志：

```bash
$ tail -f /var/log/zstack/zstack-kvmagent.log
```

就可以看到方法`say_hello()`已经被调用了。

如果要多次重复测试，那么可以做一个 alias：

```bash
$ alias curl_smartnic="curl -H 'Accept: text/plain, application/json, application/*+json, */*' -H 'taskuuid: 7b214c0535ff4432b3c20df137ffffff' -H 'callbackurl: http://172.31.6.11:8080/zstack/asyncrest/callback' -H 'Content-Type: application/json;charset=utf-8'"
$ curl_smartnic --data '{"myname":"rickylss"}' -X POST 172.31.6.13:7070/say/hello
```

