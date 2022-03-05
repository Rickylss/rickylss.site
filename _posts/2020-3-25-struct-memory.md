---
layout: post
title:  "结构体内存分布差异"
subtitle: ""
date:   2020-3-25 11:13:45 +0800
tags:
  - Windows
  - Linux
categories: [Windows, Linux]
comment: true
---

今天在对之前 Cygwin 下编译调用 Windows 动态链接库的项目 () 进行调试的时候发现有一个数据结构里的值总是出错，经过一番调试之后发现是不同环境对结构体内存布局解析不同导致的。
<!-- more -->
# 问题 1

## 描述

现在我有这么一个结构体`student`,我用它在 DLL(Windows 编译) 和 APP(Cygwin 编译) 之间交换数据;

```c
typedef struct class
{
    //该结构体暂时未添加内容，该部分为导致 bug 的原因，后文将会分析。
} CLASS, *CLASS_P;

typedef struct student
{
    char* name;

    int age;

    BOOL gender;

    CLASS class;

    int score;

} STUDENT, * STUDENT_P;
```

现在我在 DLL 中对其进行赋值，并随后在 APP 调用 DLL 方法时，将该结构体的某个实例返回给 APP.

```c
/* DLL: */
int getAStudent(STUDENT_P student){
    /* do something */
	strcpy(student->name, "lili");
	student->age = 11;
	student->gender = true;
	sutdent->score = 100;
     /* do something */
    return 1;
}

/* APP: */
int getAGoodStudent(){
    STUDENT student;
     /* do something */
    getAStudent(&student)
	
    print("name:%s\n", student.name);
    print("age:%d\n", student.age);
    print("gender:%d\n", student.gender);
    print("score:%d\n", student.score); //get score error
     
     /* do something */
    return 1;
}
```

## 现象

其中`name` `age` `gender`的输出都如期，唯独`score`值始终都无法正确读取。

为每个变量添加地址信息打印：

```c
print("%p", val)
```

最后发现问题出现在`CLASS`结构体中。

## 分析

依据对结构体内存的分析：

`name`为指针类型，在 x86 机器上为 64 位，8Byte;

`age`为 int 类型，32 位，4Byte;

`gender`本质为 int 类型，32 位，4Byte;

`class`为 CLASS 类型，大小存疑;

`score`为 int 类型，32 位，4Byte;

实际两边地址打印如下：

```plain
DLL:
0000 0008 0008 74a0
0000 0008 0008 74a8
0000 0008 0008 74ac
0000 0008 0008 74b0
0000 0008 0008 74b4
```

```plain
APP:
0000 0008 0008 74a0
0000 0008 0008 74a8
0000 0008 0008 74ac
0000 0008 0008 74b0
0000 0008 0008 74b0				// different
```

问题就出在 score，在 APP(Cygwin 编译) 中去 score 的值时，由于 CLASS 为空，它直接取了 CLASS 的值，而在 DLL(windows 编译) 则为其保留了 4Byte 空间。

# 问题 2

## 描述

由于再 Windows 下和 Cygwin 下对结构体位域的处理不同，导致的数据解析失败，结构体示例如下：

```c
typedef struct student
{
    int age : 1;

    BOOL gender : 1;

    int score;

} STUDENT, * STUDENT_P;
```

内存分布如下:(注意，%p 无法打印位域的地址)

```plain
DLL:
0000 0008 0008 9910			//student 地址
0000 0008 0008 9912			//student.score 地址
APP:
0000 0008 0008 9910			//student 地址
0000 0008 0008 9911			//student.score 地址
```

由此可见，在 Windows 下编译的 DLL 给位域分配了两个字节，而 cygwin 下只分配了一个。

