---
layout: post
title:  "后端日志最佳实践"
subtitle: "my logging best practices"
date:   2021-12-12 12:52:45 +0800
tags:
  - translation
categories: [translation, linux]
comment: true
---

原文链接：https://tuhrig.de/my-logging-best-practices/

如果你和我一样是一个后端研发，那么日志对你来说就是一扇面向你的应用的窗户。和前端不一样，后端除了日志以外基本看不到太多东西。以下是一些我在写日志时的个人指导方针。

<!-- more -->

## 记录发生的事

在过去，每艘船上都会有一本航海日志。它就像一本记录每天重要事件的日记。和传统的航海日志一样，我们应该去记录已经发生的事情，而不是那些计划要做的事情。

让我们来看看下面这个例子：

```python
// don't do that
log.info("Making request to REST API")
restClient.makeRequest()
 
// do that
restClient.makeRequest()
log.info("Made request to REST API")
```

第一条日志记录并没有提供什么有用的信息。当你看到它的时候，你无法搞清楚这个 REST 调用是否成功了。要想知道调用成功了没有，你需要查看是否存在异常。如果你看到了这条日志，但忽略了后面的异常，你有可能会被这个问题困扰一整天（相信我）。

第二条日志相比第一条有所改进。它清楚地表明了之前的操作成功了。如果 REST 调用失败了，你就看不到这条日志了——这里将会出现一个异常。

我将这条规则应用到所有 INFO 级别的日志信息中。但是 DEBUG 级别的日志信息是个例外。

## 参数与信息分离

一个典型的日志记录包含了两种数据信息。一种是手写的用于描述当前状态的信息。另一种是该操作中涉及的一系列参数。你应该将这两种数据分隔开来。

```python
// don't do that
restClient.makeRequest()
log.info("Made request to {} on REST API.", url)
 
// do that
restClient.makeRequest()
log.info("Made request to REST API. [url={}]", url)
```

第一条日志有一些瑕疵。它不好解析，例如，解析成 Grok patterns。因此很难用我们的日志工具自动提取 ID 或者参数。同时它也很难阅读。想象一下，如果有一个非常长的 URL，后面跟着很长的一列参数。一半以上的日志信息都会飞到你的屏幕之外。同样的这个日志信息也很难拓展。如果你想增加另一个参数（比如当前使用的 HTTP 模式）你必须重写整条语句。

第二个版本的日志就没有这样的问题。因为它的参数列表语法清晰，所以它很容易解析。阅读起来也很容易，你可以直接看到整个句子。扩展起来也很容易，你可以直接在后面添加另一个参数。

## 区分 WARNING 和 ERROR

很明显，日志是有级别的，因此你要学会在不通情况下恰当地使用。WARNING 和 ERROR 之间有一些关键的区别。

如果你做了一些实际有效的操作，但是出现了一些问题——这是一个 WARNING。但是如果你做了一些单纯无效的操作——这就是一个 ERROR。

让我们再来看一个例子：

```python
try {
    restClient.makeRequest()
    log.info("Made request to REST API. [url={}]", url)
} catch(e: UnauthorizedException) {
    log.warn("Request to REST API was rejected because user is unauthorized. [url={}, result={}]", url, result)
} catch(e: Exception) {
    log.error("Request to REST API failed. [url={}, exception={}]", url, exception)
}
```

这个 REST 调用可能会有三个结果：

- 它工作起来没有问题。记录 INFO 日志（在调用之后）；
- 由于未知的异常它调用失败了。记录 ERROR 日志（而不是 INFO 日志）；
- 它有可能会产生某些已知的异常。记录 WARNING 日志。

因此，WARNING 日志通常意味着，你做了一些操作，但是是还不够完美。ERROR 则意味着你根本没有做这件事情。

当然也要注意，WARNING（或者 ERROR）日志是一种**行动号召**。如果没有人需要对这个警告或者错误做出反应或采取行动，那么你没必要记录。

## INFO 日志是业务，DEBUG 是为了技术

INFO 日志信息看起来应该要像本书。它需要告诉你发生了什么事情，而不必要告诉你怎么发生的。这意味着，相比与技术方面的内容，INFO 日志更适合记录业务方面的信息。技术方面的信息应该记录在 DEBUG 中。

```python
INFO  | User registered for newsletter. [user="Thomas", email="thomas@tuhrig.de"]
INFO  | Newsletter send to user. [user="Thomas"]
INFO  | User unsubscribed from newsletter. [user="Thomas", email="thomas@tuhrig.de"]
```

这种类型的日志从业务的角度上告诉你发生了什么。那么技术日志呢？

```python
DEBUG | Saved user to newsletter list. [user="Thomas", email="thomas@tuhrig.de"]
DEBUG | Send welcome mail. [user="Thomas", email="thomas@tuhrig.de"]
INFO  | User registered for newsletter. [user="Thomas", email="thomas@tuhrig.de"]
DEBUG | Started cron job to send newsletter of the day. [subscribers=24332]
INFO  | Newsletter send to user. [user="Thomas"]
INFO  | User unsubscribed from newsletter. [user="Thomas", email="thomas@tuhrig.de"]
```

每个 (业务) 用例都会产生一行 INFO 日志。对应的，DEBUG 日志会提供更多有关该进程在内部如何工作的信息。

## 更多

当然，想要写好 log 日志还有更多可以做的。你还需要考虑例如跟踪、日志聚合和度量等。但说到单纯的写日志，我非常推荐上面的这些小规则。

