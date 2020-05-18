---
layout: post
title:  "性能分析课程笔记1"
subtitle: "zstack培训"
date:   2020-5-18 13:13:45 +0800
tags:
  - zstack
categories: [OS]
comment: true
---

> zstack最近想要在性能优化上有所动作，所以大牛们给我们这些小渣渣搞了的个性能分析的培训课程。这篇博客是我自己对课程内容的思考和总结，其中还包括了一些扩展内容。注：本文内容主要来自于[ZStack](https://www.zstack.io/)内部的性能分析课程。

第一节课并没有涉及到具体的性能分析操作或者实践，所讲的东西比较形而上学，比较抽象。但是却能够为我们提供一些新的思维方式，对我们之后的生活学习都会有一些帮助。

# 1、Unknown unknowns

这是前美国国防部长拉姆斯菲尔德的一句名言，我第一次听到这句话是群总和我做weekly one to one的时候，原文是这样的：

*Reports that say that something hasn't happened are always interesting to me, because as we know, **there are known knowns; there are things we know we know. We also know there are known unknowns; that is to say we know there are some things we do not know. But there are also unknown unknowns—the ones we don't know we don't know.** And if one looks throughout the history of our country and other free countries, it is the latter category that tend to be the difficult ones.*

这句话总结出了人们对事物认知的三种情况：

1. known knowns（已知的已知）
2. known unknowns（已知的未知）
3. unknown unknowns（未知的未知）

> 第一次听到这段话，对我的思维产生了极大的震撼。这三种情况几乎应证了我学习工作以来面对的所有难题。当我们遇到一个难题的时候，首先我们对这个问题会有一定的了解（否则你都不会遇到这个问题:)），这就是已知的已知部分；在解决这个问题的时候，我们会遇到困难，困难又有两类，一类是你知道困难的点是什么，但是暂时不知道怎么解决，需要学习，这就是已知的未知；剩下的潜伏在问题里的坑，你还没遇到的，就是未知的未知。

性能调优的优先条件是，性能分析，只有分析出系统的瓶颈，才能进行调优。而分析一个系统的性能，就要面对上面提到的三种情况。计算机系统是非常庞大的，包含了计算机体系结构、操作系统、网络、存储等，单单拎出任何一个方向都值得我们去研究很久，因此，我们在分析系统性能的时候，是无法避免地会遇到很多`未知的未知`问题，而我们要做的事情就是要将它们变成`已知的未知`，再变成`已知的已知`。

![DK效应](\pictures\DK-effect.png)

# 2、什么是优化？

在讨论性能优化之前，首先要注意两个问题：

1. 性能是个系统问题；
2. 性能是个动态问题；

性能是个系统问题，前面提到计算机系统是个非常庞大的体系，它包含了很多东西，它里面的结构错综复杂，各个部分互相牵制影响，如果不能理清你要优化部分的系统部件关系，就会出现按下葫芦浮起瓢的情况（事实上，有时候就算你理清了也避免不了）；

同样的，性能也是个动态问题，对于图形工作者或者游戏爱好者来说，性能好坏更多取决于GPU性能好坏；对于科学计算研究员来说，性能好坏更多由CPU性能决定；对于数据库来说，I/O性能，内存可能更为重要。因此，性能其实是个动态问题，优化某种程度来说就是一种为特定场景的调优。

因此在进行性能优化之前，你需要考虑清楚，你要优化的是什么。

# 3、Observations & Guesstimation

## 3.1、观测

要分析系统的性能，就要对系统进行观测，对系统进行观测有很多手段，常用的工具有：top、perf等，红帽也有非常优秀的[性能工程软件](https://github.com/redhat-performance)。

但是在我们对一个系统施加观测的时候，我们需要注意一些东西：

1. 观测会对系统添加影响，观测工具同样会使用到系统的一些计算资源，因此我们在使用观测工具的时候，也会对系统照成一定的影响，例如，当你在使用top工具的时候，你可能偶尔会发现top进程居然是资源消耗最高的进程:)；
2. 所见非所想，由于缺乏对系统的整体认知，在观测系统的时候难免会陷入盲人摸象的境地，即是说你看到的现象未必是反应出来的事实，也未必就是问题的真相；

## 3.2、 瞎猜

为了能够在性能分析的时候避免陷入盲人摸象的境地，我们需要对系统有非常深刻的理解。对系统进行性能调优，排名第一的品质就是对系统的深刻理解。

但是一般的人（比如我:)）通常是做不到的，所以，我们要学会瞎猜。。当然是合理的瞎猜。群总给我们推荐了一本书*Guesstimation 2.0: Solving Today's Problems on the Back of a Napkin*，大家有兴趣可以买来看看。

学会用科学的方法去分析一个系统：

![](\pictures\science-experiment.png)

## 3.3、（几乎）没有免费的午餐

想要做好性能分析，你需要：

1. 树立并打磨常识；
2. 建立并测试模型；
3. 掌握方法论；
4. 正确的答案建立在对操作系统的深刻理解之上；

这里的常识指的是对常见的一些性能相关的数字的常识：

```txt
Latency Comparison Numbers (~2012)
----------------------------------
L1 cache reference                           0.5 ns
Branch mispredict                            5   ns
L2 cache reference                           7   ns                      14x L1 cache
Mutex lock/unlock                           25   ns
Main memory reference                      100   ns                      20x L2 cache, 200x L1 cache
Compress 1K bytes with Zippy             3,000   ns        3 us
Send 1K bytes over 1 Gbps network       10,000   ns       10 us
Read 4K randomly from SSD*             150,000   ns      150 us          ~1GB/sec SSD
Read 1 MB sequentially from memory     250,000   ns      250 us
Round trip within same datacenter      500,000   ns      500 us
Read 1 MB sequentially from SSD*     1,000,000   ns    1,000 us    1 ms  ~1GB/sec SSD, 4X memory
Disk seek                           10,000,000   ns   10,000 us   10 ms  20x datacenter roundtrip
Read 1 MB sequentially from disk    20,000,000   ns   20,000 us   20 ms  80x memory, 20X SSD
Send packet CA->Netherlands->CA    150,000,000   ns  150,000 us  150 ms

Notes
-----
1 ns = 10^-9 seconds
1 us = 10^-6 seconds = 1,000 ns
1 ms = 10^-3 seconds = 1,000 us = 1,000,000 ns

Credit
------
By Jeff Dean:               http://research.google.com/people/jeff/
Originally by Peter Norvig: http://norvig.com/21-days.html#answers

Contributions
-------------
'Humanized' comparison:  https://gist.github.com/hellerbarde/2843375
Visual comparison chart: http://i.imgur.com/k0t1e.png
```

> 群总：免费的午餐也是有的，比如，Linux新版本的内核对某个东西进行了优化，这就是免费的午餐==。

# 4、常见的优化手段及一些思考题

常见的优化手段包括：

1. 多队列、零拷贝；
2. 大页内存；
3. CPU隔离和NUMA绑定；
4. 硬件直通；
5. Kernel bypass ；
6. 通用 vs. 特定；
7. 关于抽象：Joel Spolsky & John Carmack

思考题：

1. 内核使用MMX指令实现memcpy()会更快吗？
2. Zero Copy Xmit一定能够提高虚拟机网络性能么？
3. 如何科学地测试I/O性能？
4. 如何确定多线程程序的最佳线程数？

参考阅读：

1. [why GNU grep is fast](https://lists.freebsd.org/pipermail/freebsd-current/2010-August/019310.html)。
2. [A faster memcpy and bezero for x86](https://yarchive.net/comp/linux/page_zeroing_strategy.html)。
3. [Brendan D. Gregg's Homepage](http://www.brendangregg.com/)。

# 5、小实验

1. ssh远程到一台服务器上

   ```bash
   $ ssh root@xxx.xxx.xxx.xxx
   ```

1. 使用cat命令打印一个超大的log日志

   ```bash
   $ cat /var/a_huge_log.log
   ```

2. 发现打印速度很慢

3. 分析原因，打印输出慢是否为I/O问题

   ```bash 
   $ echo /var/a_huge_log.log > /var/temp_log.log
   ```

4. 得出结论，输出慢是由于ssh需要对输出文本进行处理。




