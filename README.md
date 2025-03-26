# Rickylss's Blog

这是一个基于Jekyll的个人技术博客站点，主要记录和分享技术学习笔记、经验总结和项目实践。

## 特点

- 基于Jekyll静态网站生成器
- 支持多语言内容
- 包含技术文章、教程和笔记
- 分类清晰的文章组织结构
- 友好的阅读体验

## 目录结构

```
_posts/      - 博客文章
_drafts/     - 草稿文章
_includes/   - 可重用的页面组件
_layouts/    - 页面布局模板
_data/       - 网站数据文件
_sass/       - 样式文件
assets/      - 静态资源文件
```

## 本地开发

1. 安装依赖

```bash
# 安装Ruby和Bundler
gem install bundler

# 安装项目依赖
bundle install
```

2. 本地运行

```bash
bundle exec jekyll serve
```

访问 http://localhost:4000 查看站点

## 写作指南

1. 在`_posts`目录下创建新的Markdown文件，文件名格式为：`YYYY-MM-DD-title.md`
2. 在文件头部添加YAML前置数据：

```yaml
---
title: 文章标题
date: YYYY-MM-DD HH:MM:SS +/-TTTT
categories: [分类1, 分类2]
tags: [标签1, 标签2]
---
```

3. 使用Markdown语法编写文章内容