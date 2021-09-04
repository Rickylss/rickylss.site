---
layout: post
title:  "Event Loop 详解"
subtitle: ""
date:   2019-9-29 10:23:45 +0800
tags:
  - C
  - OS
categories: [OS]
comment: true
---

Event Loop 即事件循环，指的是一种编程概念，它的核心就是等待和分发事件。它向“event provider”发出请求，直到有事件到来（通常阻塞请求，直到有事件到来）后调用相关的“event handler”。如果 event-loop 使用可被选择或者轮询的文件接口（可理解为 fd），那么它就可以结合反射器使用。event-loop 与“message originator”几乎都是异步操作的。

> 如果一个 event-loop 组成了系统核心的控制流，它通常被称为`main loop`或者`main event loop`。这个名字非常贴切，因为这个 event-loop 占据着该程序的最高控制等级。

# 1、概述

## 1.1、Message passing

> Message passing 即消息队列，它是一种调用行为（即运行程序）技术。不同于传统程序设计通过名字直接调用 Message passing 使用对象模型将通用的方法从特定的接口中区分出来。调用程序发送一个消息并且依赖对象来选择运行对应的代码。（之前接触过的 corba 似乎就使用了这种技术）

消息泵将消息冲消息队列里“pump”到程序进程中，在严格意义上，event-loop 属于进程间通信（inter-process communication）的一种实现。事实上，消息传递存在于许多系统中，包括 Mach 系统。event-loop 是使用消息传递的系统的特定实现技术。

## 1.2、Alternative designs

对应 event-loop 机制，还有其他的可选择方案：

- 传统的方式，一个程序只执行一次，然后结束。这种程序在早期的计算机中很常见，同时也缺乏用户交互性。它在命令行驱动的程序中依然使用的很频繁。
- 菜单驱动设计，这种设计依然需要一个主循环，但是和一般认为的事件驱动不同。用户提出一系列选项，直到 task 执行该选项。

## 1.3、Usage

由于图像化用户界面的发展，`main loop`在现代应用中起到重要作用。event-loop 的使用有多种方式：

- 简单的用法，阻塞进程，直到一个请求到来，开始执行该请求对应的方法

# 2、GLib event loop





