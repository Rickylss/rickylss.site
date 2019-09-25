---
layout: post
title:  "eclipse cdt调试问题"
subtitle: ""
date:   2019-7-29 10:23:45 +0800
tags:
  - eclipse
  - cdt
  - gdb
categories: [others]
---

在测试集成eclipse客户端的时候发现两个添加断点的问题

## 1、无法找到对应文件

若可执行文件并非在当前环境下编译，而是编译后移动到新的地址时，需要在debug中做一定的设置：

右键Debug项，选择`Edit Source Lookup`

![](\pictures\eclipse_debug1.png)

添加一个Path Mapping

![](\pictures\eclipse_debug2.png)

若需要在linux和windows环境下转换，则需要注意路径的写法“\”和“/”。这个时候需要添加Absolute File Path 和Path Relative to Source Folders 以及Program Relative File Path如图。

## 2 、运行debug后无法打断点

在eclipse juno下调试时添加断点后，断点会立刻被删除掉。

gdb trace内容如下：

```
545,747 (gdb) 
548,376 49-break-insert -f source/test_sci.c:47
548,379 49^done,bkpt={number="6",type="breakpoint",disp="keep",enabled="y",addr="0x00004924",func="s\
ciRX",file="../source/test_sci.c",fullname="E:\\code\\ccs\\tms570\\Debug/../source/test_sci.c",line=\
"47",thread-groups=["i1"],times="0",original-location="source/test_sci.c:47"}
```

```
548,379 (gdb) 
548,554 50-break-delete 6
548,555 50^done
```

显然在这种情况下断点无法正常工作。

同时，如果在项目debug之前打上断点，再开启调试那么这些断电就都可用了。。。。令人费解

![](\pictures\emoji_naotou.jpg)

掏出百度

![](\pictures\emoji_xixi.jpg)

没卵用，关掉

![](\pictures\emoji_biechishi.jpg)

打开蓝红黄蓝绿红，搜索`eclipse gdb breakpoint delete automatically`，第一个[链接](https://stackoverflow.com/questions/34821261/why-do-my-eclipse-cdt-breakpoints-get-deleted-immediately-after-they-are-added)就遇到了难兄难弟。

说是CDT8.6有一个众所周知的bug，在cdt8.7中解决了也就是Eclipse Mars。

也就是说，要换版本。

