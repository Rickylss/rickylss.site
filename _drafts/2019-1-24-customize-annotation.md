---
layout: post
title:  "自定义 annotation"
subtitle: ""
date:   2019-1-24 14:15:38 +0800
categories: [spring]
---

# 自定义 annotation

## 1.元注解

元注解负责注解其他注解，它是用来对其他注解进行说明的的注解，Java5.0 开始定义了 4 个标准的 meta-annotation 类型：

1. @Target
2. @Retention
3. @Documented
4. @Inherited

这四个元注解的相关信息在 java.lang.annotation 包中可以找到。

### 1.1@Target

@Target 说明了 annotation 所修饰的对象范围：例如类、接口、方法、变量等。**即自定义 annotation 的作用范围**。

打开`java.lang.annotation.ElementType`：

``` java
public enum ElementType {
    /** Class, interface (including annotation type), or enum declaration */
    TYPE,

    /** Field declaration (includes enum constants) */
    FIELD,

    /** Method declaration */
    METHOD,

    /** Formal parameter declaration */
    PARAMETER,

    /** Constructor declaration */
    CONSTRUCTOR,

    /** Local variable declaration */
    LOCAL_VARIABLE,

    /** Annotation type declaration */
    ANNOTATION_TYPE,

    /** Package declaration */
    PACKAGE,

    /**
     * Type parameter declaration
     *
     * @since 1.8
     */
    TYPE_PARAMETER,

    /**
     * Use of a type
     *
     * @since 1.8
     */
    TYPE_USE
}
```

ElementType 枚举类中包含的即是@Target 能指定的修饰对象类型。

举例：

```java
@Target(ElementType.PARAMETER)
public @interface LoginUser {

}
```

注解一般的变量。

### 1.2@Retention

@Retention 定义了该 annotation 被保留的时间长短：某些 Annotation 仅出现在源代码中，而被编译器丢弃；而另一些却被编译在 class 文件中；编译在 class 文件中的 Annotation 可能会被虚拟机忽略，而另一些在 class 被装载时将被读取（请注意并不影响 class 的执行，因为 Annotation 与 class 在使用上是被分离的）。**即自定义 annotation 的生命周期。**

打开`java.lang.annotation.RetentionPolicy`：

```java
public enum RetentionPolicy {
    /**
     * Annotations are to be discarded by the compiler.
     */
    SOURCE,

    /**
     * Annotations are to be recorded in the class file by the compiler
     * but need not be retained by the VM at run time.  This is the default
     * behavior.
     */
    CLASS,

    /**
     * Annotations are to be recorded in the class file by the compiler and
     * retained by the VM at run time, so they may be read reflectively.
     *
     * @see java.lang.reflect.AnnotatedElement
     */
    RUNTIME
}
```

RetentionPolicy 枚举类中包含的即是@Retention 能指定的修饰对象类型。

举例：

```java
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginUser {
	
}
```

注解运行时保留。

### 1.3@Documented

@Documented 用于描述其它类型的 annotation 应该被作为被标注的程序成员的公共 API，因此可以被例如 javadoc 此类的工具文档化。Documented 是一个标记注解，没有成员。

### 1.4@Inherited

@Inherited 元注解是一个标记注解，@Inherited 阐述了某个被标注的类型是被继承的。如果一个使用了@Inherited 修饰的 annotation 类型被用于一个 class，则这个 annotation 将被用于该 class 的子类。

注意：@Inherited annotation 类型是被标注过的 class 的子类所继承。类并不从它所实现的接口继承 annotation，方法并不从它所重载的方法继承 annotation。

当@Inherited annotation 类型标注的 annotation 的 Retention 是 RetentionPolicy.RUNTIME，则反射 API 增强了这种继承性。如果我们使用 java.lang.reflect 去查询一个@Inherited annotation 类型的 annotation 时，反射代码检查将展开工作：检查 class 和其父类，直到发现指定的 annotation 类型被发现，或者到达类继承结构的顶层。

## 2.自定义注解

使用@interface 来自定义注解，自动继承 java.lang.annotaion.Annotation 接口，由编译程序自动完成其他细节。

格式：

public @interface 注解名 {定义体}