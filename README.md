# auto-blog

一个能将本地写的文章自动发布到博客上命令行工具，并且会自动压缩文章里使用的本地图片

## 支持的博客类型

使用 Hexo 搭建的博客

## Install

```bash
$ git clone https://github.com/XiaoGaoYang/auto-blog.git
$ cd auto-blog
$ npm install
$ sudo npm link
```

## Usage

```
Usage: auto-blog [--note <path>]  
选项：  
  --note, -n    要发布到博客上的笔记路径  [必需]  
  --blog, -b    博客在本地的存储路径
  --deploy, -d  部署hexo博客           [布尔]  
  --help, -h    显示帮助信息            [布尔]  
```

使用前在文章首部添加如下内容
```
---
title: <文章标题>
tags: <文章标签>
categories: <文章分类>
---
```

在命令行里执行下面命令

```bash
$ auto-blog -n "G:\test.md"
```

## ScreenShots

![使用](./screenshots/1.png)

## TODO

+ [ ] 发布CSDN博客
+ [ ] 发布工作室wiki
+ [ ] 已发布文章修改