---
layout: post
title:  "C语言Duff's device"
subtitle: ""
date:   2019-10-31 9:35:45 +0800
tags:
  - C
  - Coroutine
categories: [C]
comment: true
---

今天看`Simon Tatham`有关C语言中协程的分析时，看到了一段有趣的代码——Duff's device。在网上找了很多相关的信息，结果都写的乱七八糟，还好wiki上有原版的代码，赶紧抄下来分析一下。

# 原版代码

> 原版代码要解决的问题非常简单，就是要将一个数组中的16-bit units（通常是short类型）复制到寄存器中，因为是寄存器所以to不需要++操作。

```c
send(to, from, count)
register short *to, *from;
register count;
{
    do {                          /* count > 0 assumed */
        *to = *from++;
    } while(--count > 0);
}
```

如果`count`总是能被8整除，那么可以将循环展开，以减少循环次数：

```c
send(to, from, count)
register short *to, *from;
register count;
{
    register n = count / 8;
    do {
        *to = *from++;
        *to = *from++;
        *to = *from++;
        *to = *from++;
        *to = *from++;
        *to = *from++;
        *to = *from++;
        *to = *from++;
    } while (--n > 0);
}
```

但事实上`count`并不一定总被8整除，或者说，甚至和8没什么关系。Duff意识到，为了处理不能被8整除的`count`，汇编程序员通常会使用到一个技巧，那就是跳转到循环体内部。我们知道在汇编中使用跳转非常简单，在C中或许可以使用`goto`（但是会非常麻烦），但是大部分高级编程语言甚至是不提供跳转的。Duff's device很好地使用了switch语句的特性，巧妙地实现了跳转。

```c
send(to, from, count)
register short *to, *from;
register count;
{
    register n = (count + 7) / 8;
    switch (count % 8) {
    case 0: do { *to = *from++;
    case 7:      *to = *from++;
    case 6:      *to = *from++;
    case 5:      *to = *from++;
    case 4:      *to = *from++;
    case 3:      *to = *from++;
    case 2:      *to = *from++;
    case 1:      *to = *from++;
            } while (--n > 0);
    }
}
```

看这代码，循环次数理想情况下是原来的1/8，当然也可以不是8设置其他值。

>注意：Duff's device最好只作为一个编程技巧来看，如果要将它使用到具体的项目中，需要考虑更多的因素。事实上部分架构的流水线与转移预测机制不同，或者编译器无法针对Duff's device做优化，导致实际效果并不理想。况且，使用Duff's device使得代码难以理解，使用时需要慎重。

# 实现机制

要实现Duff's device有两个非常重要的前提：

1. C语言中规定，在`switch`控制语句中，`case`可以出现在任意子语句之前，充当其前缀。另外，如果没有在`case`结尾加入`break`语句，那么在结束当前语句之后，控制流会无视其他`case`继续执行，直至末尾或`break`，这个特性被称之为“掉落”（fall-through）特性。
2. C语言支持跳转到循环内部，因此在这里可以直接跳转到其他`case`而不是一定要从`case0`进入循环。