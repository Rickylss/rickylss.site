---
layout: post
title:  "C IDL Compound Indexes"
subtitle: ""
date:   2021-1-7 14:37:45 +0800
tags:
  - ovs
categories: [network]
comment: true
---

# 简介

本文描述了*C IDL Compound Indexes* 特性的设计和使用，*C IDL Compound Indexes* 使得 OVSDB 客户端程序（如：ovn、ovsdb-client 等）能够通过通用的方式设置任意的列值来高效地搜索数据库表中的内容。

> ovn-controller 通过 ovsdb 协议来访问 Open vSwitch 数据库（ovsdb-server），并且通过 OpenFLow 来访问 ovs-vswitchd。ovn-controller 通过 ovs 数据库来了解当前的 ovs 配置信息，在默认的情况下通过 ovs run 目录（/run/openvswitch/）下的 db.sock 来获取信息。详细的情况可`man ovn-controller`。

这个特性完全由客户端 IDL 实现，不需要对 ovsdb 服务端、ovsdb 协议(OVSDB RFC (RFC7047))做任何修改，或是增加与 ovsdb 服务端额外的交互。

请注意，在本文中术语“index”指的是通用的数据库术语，定义为“便于数据检索的数据结构”。除非另有说明，否则不使用 OVSDB RFC (RFC 7047)的‘“index”定义。

# 典型的使用场景

## 快速查找

依赖于网络拓扑结构，网络设备的路由表可能管理着上千条路由。像`show ip route <specific route>`这样的命令为了找到特定的路由会在路由表中进行连续的查找。通过建立"index"，可以快速查找。

同样的情况可能发生在访问列表规则或者接口列表中。

## 字典序

在许多情况下，可能需要按照特定的字典顺序检索数据。例如，SNMP。当管理员甚至是 NMS 希望从特定设备检索数据时，他们可能会从整个表(而不仅仅是特定的值)请求数据。此外，他们也希望能够按照字典顺序显示这些信息。这个操作可以由 SNMP 守护进程或 CLI 完成，但是如果数据库能够提供准备使用的数据就更好了。同时，不同过程的重复工作将被避免。按照字典顺序请求数据的另一个用例是在用户界面(web 或 CLI)中，如果 DB 发送排序后的数据，而不是让每个进程自己对数据进行排序，会更好、更快。

# 实现设计

该特性为每个表维护一个索引集合。应用程序可以为每个表创建任意数量的索引。

索引可以定义在任意数量的列上，并且支持以下选项：

- 添加一个类型为 string、boolean、uuid、integer 或 real 的列(使用默认比较器)；
- 选择列的排序方向(升序或降序，创建索引时必须选择)；
- 使用自定义的排序比较器(例如:将字符串列视为 IP，或者按照 map 列中的“config”键的值进行排序)。

可以根据 key 搜索匹配的索引。它们还可以在 key 范围内或整个范围内进行迭代。

对于查找，用户需要提供一个用于定位满足其条件的特定行的 key。这个 key 可以是一个 IP 地址、一个 MAC 地址、一个 ACL 规则等。如果有几行与查询匹配，那么用户可以轻松地遍历所有匹配项。

为了按字典顺序访问数据，用户可以使用区间迭代器，它使用“from”和“to”值来定义一个范围。

索引维护一个指向本地副本中的行的指针，避免了对数据进行额外复制的需要，从而减少了维护所需的任何额外内存和 CPU 开销。创建和维护索引的成本应该非常低。

另一个潜在问题是创建数据结构所需的时间和添加/删除元素所需的时间。索引总是要与副本同步。出于这个原因，比较函数(内置的和用户提供的)的执行速度**非常重要**。

[`Skiplists`](https://www.cs.cmu.edu/~ckingsf/bioinfo-lectures/skiplists.pdf)是用来实现索引的主要数据结构。因此，索引在插入、删除、修改时预期开销为`O(log(n))`，通过 key 检索某行开销为`O(log(n))`，检索第一行和下一行的开销为`O(1)`。

当从 OVSDB 服务器接收到数据库更改通知时，在副本中增量地维护索引，如下图所示。

```plain
               +---------------------------------------------------------+
               |                                                         |
    +-------------+Client changes to data                            IDL |
    |          |                                                         |
+---v---+      |                                                         |
| OVSDB +--------->OVSDB Notification                                    |
+-------+      |   +                                                     |
               |   |   +------------+                                    |
               |   |   |            |                                    |
               |   |   | Insert Row +----> Insert row to indexes         |
               |   |   |            |                   ^                |
               |   +-> | Modify Row +-------------------+                |
               |       |            |                   v                |
               |       | Delete Row +----> Delete row from indexes       |
               |       |            |                                    |
               |       +----+-------+                                    |
               |            |                                            |
               |            +-> IDL Replica                              |
               |                                                         |
               +---------------------------------------------------------+
```

# C IDL API

## 创建索引

每个索引都必须使用`ovsdb_idl_index_create()`方法创建，或者其它简单的便利方法`ovsdb_idl_index_create1()`或`ovsdb_idl_index_create2()`。在首次调用`ovsdb_idl_run()`之前必须创建好所有的索引。

索引创建示例

```plain
/* Define a custom comparator for the column "stringField" in table
 * "Test". (Note that custom comparison functions are not often
 * necessary.)
 */
int stringField_comparator(const void *a, const void *b)
{
    struct ovsrec_test *AAA, *BBB;
    AAA = (struct ovsrec_test *)a;
    BBB = (struct ovsrec_test *)b;
    return strcmp(AAA->stringField, BBB->stringField);
}

void init_idl(struct ovsdb_idl **, char *remote)
{
    /* Add the columns to the IDL */
    *idl = ovsdb_idl_create(remote, &ovsrec_idl_class, false, true);
    ovsdb_idl_add_table(*idl, &ovsrec_table_test);
    ovsdb_idl_add_column(*idl, &ovsrec_test_col_stringField);
    ovsdb_idl_add_column(*idl, &ovsrec_test_col_numericField);
    ovsdb_idl_add_column(*idl, &ovsrec_test_col_enumField);
    ovsdb_idl_add_column(*idl, &ovsrec_test_col_boolField);

    struct ovsdb_idl_index_column columns[] = {
        { .column = &ovsrec_test_col_stringField,
          .comparer = stringField_comparator },
        { .column = &ovsrec_test_col_numericField,
          .order = OVSDB_INDEX_DESC },
    };
    struct ovsdb_idl_index *index = ovsdb_idl_create_index(
        *idl, columns, ARRAY_SIZE(columns));
    ...
}
```

## 使用索引

### 迭代器

推荐的查询方法是在索引上使用“range foreach”、“equal foreach”或“full foreach”。运作机制如下：

1. 创建索引行对象，其索引列设置为所需的搜索键值(相等迭代器需要一个，范围迭代器需要两个，完整索引迭代器不需要搜索键)。
2. 将索引、迭代变量和索引行对象传递给迭代器。
3. 使用迭代器循环中的值。

标准库实现了三种不同的迭代器：范围迭代器、相等迭代器和全索引迭代器。

- 范围迭代器接收两个值，并遍历该范围内的所有行(包括定义范围的两个值)。
- 相等迭代器遍历所有与传递的值完全匹配的行。
- 完整索引迭代器遍历索引中的所有行，其顺序由比较函数确定，并配置了方向(升序或降序)。

注意，索引是按照所有索引列中的值的“连结”排序的，因此，range 迭代器返回“from.col1 from.col2……from.coln”和“to.col1 to.col2……to.coln"。而不是在 from.col1 和 to.col1 之间的一个值，等等。

迭代器是特定于每个表的宏。下面是这些迭代器的使用示例:

```plain
/*
 * Equality iterator; iterates over all the records equal to "value".
 */
struct ovsrec_test *target = ovsrec_test_index_init_row(index);
ovsrec_test_index_set_stringField(target, "hello world");
struct ovsrec_test *record;
OVSREC_TEST_FOR_EACH_EQUAL (record, target, index) {
    /* Can return zero, one or more records */
    assert(strcmp(record->stringField, "hello world") == 0);
    printf("Found one record with %s", record->stringField);
}
ovsrec_test_index_destroy_row(target);

/*
 * Range iterator; iterates over all records between two values
 * (inclusive).
 */
struct ovsrec_test *from = ovsrec_test_index_init_row(index);
struct ovsrec_test *to = ovsrec_test_index_init_row(index);

ovsrec_test_index_set_stringField(from, "aaa");
ovsrec_test_index_set_stringField(to, "mmm");
OVSREC_TEST_FOR_EACH_RANGE (record, from, to, index) {
    /* Can return zero, one or more records */
    assert(strcmp("aaa", record->stringField) <= 0);
    assert(strcmp(record->stringField, "mmm") <= 0);
    printf("Found one record with %s", record->stringField);
}
ovsrec_test_index_destroy_row(from);
ovsrec_test_index_destroy_row(to);

/*
 * Index iterator; iterates over all nodes in the index, in order
 * determined by comparison function and configured order (ascending
 * or descending).
 */
OVSREC_TEST_FOR_EACH_BYINDEX (record, index) {
    /* Can return zero, one or more records */
    printf("Found one record with %s", record->stringField);
}
```

### 通用索引访问

虽然当前定义的迭代器适用于许多用例，但也可以使用更通用的 API 创建自定义迭代器，现有的迭代器都是在这些 API 上构建的。具体请参见 ovsdb-idl.h。