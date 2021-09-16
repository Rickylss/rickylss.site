---
layout: post
title:  "git 工作流"
subtitle: ""
date:   2020-10-12 10:13:45 +0800
tags:
  - git
categories: [translation]
comment: true
---

## 1、Basic Git Workflow

基本的 git 工作流只有一个分支——master 分支。开发者直接提交到 master 分支上，并且使用 master 分支来部署生产环境。

![Basic Git Workflow](/pictures/Basic Git Workflow.png)

通常我们不建议使用这种工作流，除非你想快速开始一个项目，或者这是一个业余项目。

因为这里只有一个分支，因此实际上是没什么流程的。这使得 git 的使用毫不费力。但是，在使用这种工作流方式时，你需要注意一些点：

1. 协作开发代码时很容易导致冲突；
2. 很容易将有 bug 的版本部署到生成环境；
3. 很难维护干净的代码；
<!-- more -->
## 2、Git Feature Branch Workflow

当有多名开发者在同一个代码库上工作时，`Git Feature Branch Workflow`模式是必须的。

想象一下，当有一个开发人员在开发一个新 feature，这个时候另一个开发人员在开发另一个 feature。如果这两个开发人员在同一个分支上工作、提交，将会让代码库变得一团糟，产生一堆冲突。

![Git Feature Branch Workflow](/pictures/Git Feature Branch Workflow.png)

为了避免这种情况，两个开发者从 master 分支上分别创建一个 feature 分支，各自在新分支上工作，当他们完成了自己的 feature 之后，他们可以将自己的分支 merge 到 master 分支，并且无需等待未完成的 feature，就可以直接部署。

使用这个工作流的优点是，允许你协作开发代码，而不必担心代码冲突。

## 3、Git Feature Workflow with Develop Branch

这种工作流是开发者 team 里面最受欢迎的工作流方式。它和`Git Feature Branch Workflow`模式很像，除此之外它有一个和 master 分支并行的 develop 分支。

在这种工作流下，master 分支总是保持一个产品就绪状态。即，无论合适想要部署，都可以直接从 master 分支获取源码。

develop 分支则反映了下一个版本的最新交付的开发变更状态。开发者从 develop 分支创建 feature 分支。一旦 feature 完成，经过测试，merge 到 develop 分支，再与 develop 分支代码一起进行测试，最终合并到 master 分支。

![Git Feature Workflow With Develop Branch](/pictures/Git Feature Workflow With Develop Branch.png)

这种工作流的优点是，它允许团队一致地合并新特性，在准备阶段测试它们，并部署到生产环境中。虽然维护代码比较容易，但是对于一些团队来说，它可能会有点烦人，因为它感觉像是在经历一个冗长乏味的过程。

## 4、Gitflow Workflow

`Gitflow Workflow`在我们之前讨论的工作流的基础上增加了两种新的 branch——release 分支和 hot-fix 分支

### The hot-fix branch

hot-fix 是唯一一个从 master 分支创建出来，并且直接 merge 到 master 分支的分支（代替 develop 分支）。只有当你要快速地给一个产品问题打 patch 的时候才使用到它。它的好处是可以让你快速地修复一个产品问题，而不用打扰其他的工作流，或者不用等待下一轮版本发布。

一旦修复合并到 master 分支并且部署出去，那么它也需要合并到 develop 和当前的 release 分支。这是为了确保任何从 develop frok 下来的代码都是最新的代码。

### The release branch

release 分支是在 develop 分支将所有为发布计划的特性成功地合并到其中之后从 develop 分支派生出来的。

与新 feature 相关的代码不会加入到 release 分支，只有与发布版本相关的代码才会添加到 release 分支。例如，文档，bug 修复，以及其他与版本相关的任务都添加到这个 branch 种。

一旦该分支与 master 分支合并，并且部署到产品上，它同时也要合并回 develop 分支，因此，当一个新特性从开发中派生出来时，它拥有最新的代码。

![Gitflow workflow](/pictures/Gitflow workflow.png)

Vincent Driessen 首先发布了这个工作流模式，并使之流行起来，从那时起，它被那些有发布周期计划的组织广泛使用。

由于 git-flow 是 Git 的一个包装器，你可以在当前存储库中安装 git-flow。这个过程很简单，它除了为你创建分支之外，不会改变库中的任何东西。

在 mac 中可以运行`brew install git-flow`安装。

在 Windows 下需要下载[git-flow](https://git-scm.com/download/win)，安装后运行`git flow init`。

## 5、Git Fork Workflow

> [[zstack]]目前使用的工作流就是这种。

这种工作流在开源软件开发组很受欢迎。

这种工作流通常是这样：

1. 开发者首先使用自己的账户从开源软件官方仓库（upstream）中 fork 一份代码到自己的仓库（origin）；
2. 随后从仓库（origin）中克隆一份代码到本地系统（local）；
3. 在克隆到本地的仓库（local）中添加官方仓库（upstream）到 remote，作为 upstream；
4. 在本地仓库（local）中创建一个新的 feature 分支，修改，并提交；
5. 首先将修改提交到自己的远程仓库（origin）中；
6. 向官方仓库（upstream）发出 pr（pull request）；
7. 官方仓库的管理员，检查更改，确认无误后将修改 merge 到官方的仓库中。