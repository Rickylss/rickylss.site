---
layout: post
title:  "GNU Coding Standards"
subtitle: ""
date:   2019-10-19 10:23:45 +0800
tags:
  - GNU
categories: [GNU]
---
最近在做一个项目的时候遇到了一些麻烦，以前都是在现有的框架上开发，这次需要自己搭建一个框架就感到无从下手了。我在网上找了许多参考，无意间看到 GNU 对 GNU 体系软件的编程标准和维护标准都有一套完整的实践，真是如获珍宝本文（GNU 万岁！！）。但是看到[GNU Coding Standards](https://www.gnu.org/prep/standards/standards.html )好像没有对应的翻译，我就顺便做了笔记，同时增加了一些自己的理解，增加的部分会特别标注出来。



GNU 编程规则，最后更新于 2019 年 2 月 19 日。

 Copyright © 1992, 1993, 1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018 Free Software Foundation, Inc. 

 Permission is granted to copy, distribute and/or modify this document under the terms of the GNU Free Documentation License, Version 1.3 or any later version published by the Free Software Foundation; with no Invariant Sections, no Front-Cover Texts, and no Back-Cover Texts. A copy of the license is included in the section entitled “GNU Free Documentation License”. 

> 这一段的意思是只要满足 GNU Free Documentaion 许可证的条款，就可以合法的复制分发或者修改这份文档。这段就偷懒不翻译了:)



| • [Preface](https://www.gnu.org/prep/standards/standards.html#Preface): |      | 关于 GNU 编程规范.                               |
| ------------------------------------------------------------ | ---- | ---------------------------------------------- |
| • [Legal Issues](https://www.gnu.org/prep/standards/standards.html#Legal-Issues): |      | 让免费软件免费下去.                            |
| • [Design Advice](https://www.gnu.org/prep/standards/standards.html#Design-Advice): |      | 通用编程设计.                                  |
| • [Program Behavior](https://www.gnu.org/prep/standards/standards.html#Program-Behavior): |      | Program behavior for all programs              |
| • [Writing C](https://www.gnu.org/prep/standards/standards.html#Writing-C): |      | Making the best use of C.                      |
| • [Documentation](https://www.gnu.org/prep/standards/standards.html#Documentation): |      | Documenting programs.                          |
| • [Managing Releases](https://www.gnu.org/prep/standards/standards.html#Managing-Releases): |      | The release process.                           |
| • [References](https://www.gnu.org/prep/standards/standards.html#References): |      | Mentioning non-free software or documentation. |
| • [GNU Free Documentation License](https://www.gnu.org/prep/standards/standards.html#GNU-Free-Documentation-License): |      | Copying and sharing this manual.               |
| • [Index](https://www.gnu.org/prep/standards/standards.html#Index): |      |                                                |

# 1 关于 GNU 编程规范

GUN 编程规范是由 Richard Stallman 和其他 GNU 项目志愿者编写的。他们的目的是为了让 GNU 项目更加的干净、纯粹并且便于安装。你也可以将它当作编写可移植、具备鲁棒性和可靠性的软件指导手册来阅读，虽然它针对的是使用 C 语言编写的程序，但是当你使用其他编程语言时，其中的许多规则也同样适用。规则通常以某种方式陈述写作的原因。

如果你不是最近从 GNU 项目直接获得这份文件，请查看最新版本。你可以从[GNU]( https://www.gnu.org/prep/standards/.)网站上获取“GNU Coding Standards”文档的不同版本，包括 Texinfo 源码，PDF，HTML，DVI，plain text 等。

如果你正在维护一个官方的 GNU 项目，除了这份文档之外，请同样阅读 GNU maintainer information（请查看 GNU 软件维护者文档中的[Contents]( https://www.gnu.org/prep/maintain/maintain.html#Top )）

如果你想获取所有对该文档更改的 diffs，请加入邮件列表  `gnustandards-commit@gnu.org` ，网站入口在  https://lists.gnu.org/mailman/listinfo/gnustandards-commit。在这里同样可以找到归档的文件。

请将对本文档的修正和建议发送到 [bug-standards@gnu.org](mailto:bug-standards@gnu.org)。如果你想提出一个建议，请在文中添加建议的新措辞，以帮助我们有效地考虑该建议。我们更愿意你提供 Texinfo 源码的 diff，但是如果对你来说有难度，你也可以提供其他格式的 diff，又或者其他能够清晰表达的方式。有关该文档的源码仓库可以在 https://savannah.gnu.org/projects/gnustandards 找到。

> diff 是一个工具，用于比较两份文件。在这里可解释为差异文件。

这份标准涵盖了当你编写一个 GNU 项目时需要注意的重要事项的最小集。也许，对附加标准的需求会增加。你也许会建议在这份文档中增加新的标准。如果你认为你的标准会普遍的适用，请务必提出建议。

你也应该为你的项目针对一些没有在本文中明确提出的问题设定标准。最重要的是一定要始终如一——尽量坚持你选择的标准，同时尽可能地用文档记录下来。这样，你的程序的对他人来说维护性更佳。

GNU Hello 项目作为一个遵循 GNU 编程规范的小项目是一个很好的例子。 https://www.gnu.org/software/hello/hello.html. 

该 GNU 编程规范发布版，最后更新于 2019 年 2 月 19 日。

# 2 让免费软件免费下去

本章节讨论如何去保证 GNU 软件避免法律难题和其他相关的问题。

| • [阅读非免费代码](https://www.gnu.org/prep/standards/standards.html#Reading-Non_002dFree-Code): |      | 参考专有程序      |
| ------------------------------------------------------------ | ---- | ----------------- |
| • [贡献](https://www.gnu.org/prep/standards/standards.html#Contributions): |      | 接受贡献.         |
| • [商标](https://www.gnu.org/prep/standards/standards.html#Trademarks): |      | 如何处理商标问题. |

## 2.1 参考专有程序

无论在什么情况下都不要在你编写 GNU 程序时涉及到 Unix 源程序！！！（或者任何其他专有程序）

> 所谓专有程序，原文为`Proprietary Programs`，指的是他人拥有所有权的程序。

如果你对一个 Unix 程序内部构件又模糊的印象，这绝不意味着你不能编写一份它的仿制品，但是一定尽量以不同的线路来组织这份仿制品，因为这可能让你的结果和 Unix 版本在细节上不相干、不相似。

例如，Unix 的实用程序通常优化成最小化内存的使用；如果你优化的目的是速度，你的程序将会变得非常不同。你可以将整个输入文件保持在内存中，然后扫描它而不是使用 stdio。使用一个最新发现的更聪明的算法。减少临时文件的使用，尽量一次完成（我们在汇编程序中这么做）。

或者，相反的，强调简易而不是速度。对于某些应用来说，如今的计算机速度让简单的算法也可以胜任。

或者普遍一点。比如，Unix 程序通常拥有静态表或者固定大小的字符串，这样使得范围设置的比较武断；可以使用动态分配的方式代替。确定你的程序可以处理 NULs 和其他奇怪的字符输入。添加一种编程语言作为扩展，并且使用它编写部分程序。

又或者将部分程序转变成独立可用的库。或者当释放内存的收使用一个简单的垃圾回收器代替精确跟踪，或者使用一个新的 GNU 设置，例如 obstacks。

## 2.2 接受贡献

如果你正在开发的程序版权所有为 Free SoftwareFoundation，那么当某人给你一小块代码加入到程序中时，我们需要一份法律文件（legal papers）——就像我们最初要求你签署文件一样。每个对程序做出非凡贡献的人都必须签署一些法律文件，为了让我们的程序有一个清楚的标题；只有主作者是不够的。

> 这里的法律文件，指的是在程序源码中常常看到的头部注释，这部分注释通常指明了该份代码文档的版权和所有者。

因此，在添加其他人的任何贡献内容之前，请告诉我们，这样我们才能够协商去获取对应的法律文件。然后等我们通知你，我们获得了签署的文件，你就可以真正的使用这个贡献内容了。

这在你发布程序之前或之后都适用。如果你接受 diffs 来修复一个 bug，并且他们做了有效的更改，我们同样需要这些更改的法律文件。

这同样适用于注解和文件记录。对于版权法律来说，注解和代码仅仅是文本，版权适用于所有类型的文本，所以我们需要所有类型的法律文件。

我们知道去要法律文件通常让人沮丧；对我们来说同样也很沮丧。但是如果你不愿意等待，你是在冒险——比如，如果贡献者的雇主不愿意签署放弃权限呢？你又必须再次将代码移除。

在这里或那里修改几行代码并不需要文件，因为它们在版权方面没有意义。同时，如果你从中只是获得了一些灵感而不是确切的代码，那你也不需要文件。例如，如果有人给你一个实现代码，但是你用这个点子写了一个不一样的实现，你同样也不需要文件。

最糟糕的事情是，如果你忘了告诉我们有关另一个贡献者的事情，我们可能会因此在法庭上非常尴尬。

我们有更多的详细的建议给 GNU 项目维护者。如果你到了维护一个 GNU 项目的阶段（无论是否发布），请看一下这个：查看 GNU 软件维护者文档中的 [Legal Matters](http://www.gnu.org/prep/maintain/maintain.html#Legal-Matters) 

## 2.3 商标

请不要在 GNU 软件包中添加任何的商标鸣谢。

商标鸣谢通常声明某某东西是某某人的商标。GNU 项目对商标鸣谢的想法没有任何异议，但是这些鸣谢让人觉得卑躬屈膝，并且没有法律要求必须这么做，所以我们不用它。

对于其他人的商标，法律上要求的是避免以读者可能合理理解的方式适用它们来命名或者标记我们自己的程序或活动。例如，由于“Objective C”是（或至少曾是）一个商标，我们一定要说我们提供一个“支持 Objective C 语言的编译器”而不是一个“Objective C 编译器”。后者是前者的一个简短说法，但是它没有明确声明它们的关系，所以使用“Objective C”作为一个编译器的标签而不是一个语言的标签可能会招致误解。

请不要在 GNU 软件或者文档中使用“win”作为一个 Microsoft Windows 的缩写。在黑客的术语中，把某样东西称为“win”是一种赞美。如果你想的话，你可以随意赞美 Microsoft Windows。但是请不要在 GNU 软件中这么做。请写“Windows”全称，或者缩写为“w”。详见  [System Portability](https://www.gnu.org/prep/standards/standards.html#System-Portability)。

# 3 通用编程设计

本章节讨论了一些在你设计程序时需要重点关注的一些问题。

| • [Source Language](https://www.gnu.org/prep/standards/standards.html#Source-Language): |      | 使用何种编程语言.                             |
| ------------------------------------------------------------ | ---- | --------------------------------------------- |
| • [Compatibility](https://www.gnu.org/prep/standards/standards.html#Compatibility): |      | 与其他实现的兼容性.                           |
| • [Using Extensions](https://www.gnu.org/prep/standards/standards.html#Using-Extensions): |      | 使用非标准的特性.                             |
| • [Standard C](https://www.gnu.org/prep/standards/standards.html#Standard-C): |      | Using standard C features.                    |
| • [Conditional Compilation](https://www.gnu.org/prep/standards/standards.html#Conditional-Compilation): |      | Compiling code only if a conditional is true. |

## 3.1 使用何种编程语言

当你想要使用一种运行速度快的编译型语言，最好的语言就是 C 了。C++也 OK，但是请不要大量使用模板。如果你编译它的话，Java 也一样。

> 事实上 Java 有编译的过程，但是它的编译结果是.class 中间码，之后再由 JVM 解释执行。因此也可将其看作编译型语言。

如果对高效率没有需求，其他自由软件社区通常使用的编程语言，例如 Lisp、Scheme、Python、Ruby 和 Java 都是 OK 的。Scheme，由 GNU Guile 实现，在 GNU 系统中扮演了重要的角色： 它是扩展用 C/ C++编写的程序的首选语言 ，同时也是适用于广泛应用的优秀语言。 越多 GNU 组件使用 Guile 和 Scheme，就有越多的用户能够扩展和组合它们 （详见 GNU Guile 参考手册中的[[The Emacs Thesis]( https://www.gnu.org/software/guile/manual/guile.html#The-Emacs-Thesis )）。

许多程序被设计为可扩展的：它们包含了一个比 C 语言级别更高的解释器。通常很多程序也是使用这种语言编写的。Emacs 编辑器就是这项技术的先驱。

> 这里指的是程序插件，Emacs 用 C 语言编写，但是你可以使用更高级的语言给它编写插件。这是因为它包含了一个解释器。

GNU 软件的标准可扩展解释器是 Guile（ https://www.gnu.org/software/guile/ ），它实现了 Scheme 编程语言（一个干净简单的 Lisp 方言）。Guile 同样还绑定了 GTK+/GNOME， 使得在 Guile 中编写现代 GUI 功能变得实际。我们不排斥程序使用其他“脚本语言”编写，例如 Perl 和 Python，但是使用 Guile 可以让 GNU 系统整体一致。

## 3.2 与其他实现的兼容性

除了偶尔的意外，GNU 的程序和库都应该对 Berkeley Unix 向上兼容，如果指定了标准 C 行为需要与标准 C 向上兼容，同时如果指定了 POSIX 行为则需要与 POSIX 向上兼容。

当这些标准发生冲突时，为它们提供兼容性模式是很有用的。

标准 C 和 POSIX 禁止了许多扩展。 无论如何，您都可以随意进行扩展，并包含一个' -ansi '、' -posix '或' -compatible '选项来关闭它们。但是，如果这些扩展很可能破坏任何程序和脚本，那么这就不是真正的向上兼容。那么你就应该尝试重新设计它来让它向上兼容。

 如果定义了环境变量 POSIXLY_CORRECT，许多 GNU 程序都会禁止与 POSIX 冲突的扩展（即使它是用空值定义的）。 请让您的程序在适当的情况下识别这个变量。 

当某个特性只被用户使用（不被程序或命令文件使用），同时在 Unix 上做的很差，你可以自由地使用完全不同的更好的东西来代替（例如，用 Emacs 代替 vi）。但是提供一个兼容的特性也很好。（这有一个免费的 vi，所以我们也提供它）。

 其他有用的功能是受欢迎的，无论是否有任何先例。

## 3.3 使用非标准的特性

相比于同类的 Unix 工具现在有许多 GNU 工具都已经支持许多方便的扩展。是否需要使用这些扩展来实现你的项目是一个困难的问题。

一方面，使用这些扩展会使得项目更清晰。另一方面，除非能够使用其他的 GNU 工具，不然没法构建这个项目。这可能就会导致你的项目只能在少数几种支持相应 GNU 工具的机器上运行。

通过扩展可以方便地提供多种代替方案。例如，你可以使用关键字`INLINE`来定义一个方法，然后将它定义为一个宏，根据编译器来决定它是 inline 还是 nothing。

通常来说，如果你能够不适用扩展直接完成任务，那么最好不要使用它，但是如果它对程序有巨大的改善，那还是使用它。

这规则的一个例外是，对于庞大且已建立的运行在各种各样的系统上的项目（例如 Emacs）。在这种项目中使用 GNU 扩展会让许多用户感到不开心，所以我们没有这么做。

其他的例外是用于编译的程序： 为了引导 GNU 编译工具而必须用其他编译器编译的任何东西。如果依赖 GNU 编译器，那么除非它们早就安装好了，没人能够编译它。这在某些情况下会非常麻烦。

## 3.4 

# 4 编程习惯

# 5 更好的使用 C

# 6 用文档记录程序

# 7 发布流程



