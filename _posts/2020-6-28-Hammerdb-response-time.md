---
layout: post
title:  "Hammerdb开启time profile"
subtitle: ""
date:   2020-6-25 19:13:45 +0800
tags:
  - DB
categories: [performance]
comment: true
---

> In addition to performance profiles based on throughput you should also take note of transaction response times. Whereas performance profiles show the cumulative performance of all of the virtual users running on the system, response times show performance based on the experience of the individual user. When comparing systems both throughput and response time are important comparative measurements. HammerDB includes a time profiling package called etprof that enables you to select an individual user and measure the response times. This functionality is enabled by selecting Time Profile checkbox in the driver options. When enabled the time profile will report response time percentile values at 10 second intervals as well as cumulative values for all of the test at the end of the test run. The time profile values are recorded in microseconds.

衡量数据库的性能指标除了吞吐另一个更重要的是事务的响应时间，事务的响应快慢直接影响用户的体验。HammerDB使用etprof库来统计一次测试中某个独立用户面对的响应时间。

# 1、开启time profile

要开启`Time Profile`，只需要在`Driver Script->Options`下勾选`Time Profile`，或者在`hammerdbcli`使用命令：

```bash
hammerdb> print dict
Dictionary Settings for Oracle
connection {
...
}
tpcc       {
 count_ware       = 1
...
 rampup           = 2
 duration         = 5
 allwarehouse     = false
 timeprofile      = false
...
 async_delay      = 1000
}

hammerdb> diset tpcc timerprofile true
hammerdb> print dict
connection {
...
}
tpcc       {
 count_ware       = 1
...
 rampup           = 2
 duration         = 5
 allwarehouse     = false
 timeprofile      = true
...
 async_delay      = 1000
}
```

开启之后，hammerdb会每隔10s打印一次当前响应时间情况，并在执行完测试之后统计。统计结果时间以微秒（microseconds）为单位。

> 建议同时开启`logtotemp`，否则数据比较难查找。

# 2、统计结果与分析

hammerdb完成测试之后，最终将打印如下结果：

```
Vuser 1:TEST RESULT : System achieved 66511 Oracle TPM at 22273 NOPM
Vuser 2:+-----------------+--------------+------+--------+--------------+--------------+
Vuser 2:|PROCNAME | EXCLUSIVETOT| %| CALLNUM| AVGPERCALL| CUMULTOT|
Vuser 2:+-----------------+--------------+------+--------+--------------+--------------+
Vuser 2:|neword | 220689640|56.03%| 49910| 4421| 224537415|
Vuser 2:|payment | 120033068|30.48%| 49812| 2409| 123922005|
Vuser 2:|delivery | 39923563|10.14%| 4853| 8226| 40299810|
Vuser 2:|slev | 8308021| 2.11%| 5069| 1638| 8311473|
Vuser 2:|ostat | 3598539| 0.91%| 5044| 713| 3601896|
Vuser 2:|gettimestamp | 1308253| 0.33%| 104575| 12| 7687166|
Vuser 2:|TOPLEVEL | 2876| 0.00%| 1| 2876| NOT AVAILABLE|
Vuser 2:|prep_statement | 304| 0.00%| 5| 60| 319|
Vuser 2:+-----------------+--------------+------+--------+--------------+--------------+
```

> `time profile`会选择一个`virtual user`进行`response time`的统计，通常为`Vuser 2`。

1. 属性解释：
   1. `PROCNAME(procedures name)`，过程（可理解为一个`Tcl`函数）名称；
   2. `EXCLUSIVETOT(exclusive totally)`，该过程独占的消耗时间（即，除去该过程调用的子过程消耗的时间）；
   3. `%`，当前过程占所有过程消耗时间的百分比；
   4. `CALLNUM(call number)`，该过程调用次数；
   5. `AVGPERCALL(AVG per call)`，平均每次调用耗时；
   6. `CUMULTOT(cumulative totally)`，过程累计消耗时间（包含该过程调用的子过程消耗的时间）。
2. 行解释：
   1. `neword(new order)`，客户输入一笔新的订货交易，45%
   2. `payment`，更新客户账户余额以反应其支付状况，43%
   3. `delivery`，发货（批处理交易），4%
   4. `slev(stock level)`，查询仓库库存状况，以便能够及时补货，4%
   5. `ostat(order status)`，查询客户最近交易的状态，4%
   6. `gettimestamp`，获取当前时间戳
   7. `TOPLEVEL`，`etprof`开销
   8. `prep_statement`，开启数据库连接，预处理`SQL`语句

简单分析上面的打印结果，`new order`被调用49910次，每次耗时4.421 ms。`prep_statement`，执行5次，5种交易情况。

# 3、etprof

That's a test for the profiler. From the output it seems working (I also tested it with a neural network simulator and the output is what I expected).

```tcl
 source etprof.tcl

 proc a {} {
     after 1000
     b
     after 1000
     c
 }

 proc b {} {
     c
 }

 proc c {} {
     after 500
 }

 a

 ::etprof::printLiveInfo
```

The test output is the following (with Tcl8.4 under Linux/Intel):

```
 +------------------------+--------------+--------+--------------+--------------+
 |PROCNAME                |  EXCLUSIVETOT| CALLNUM|    AVGPERCALL|      CUMULTOT|
 +------------------------+--------------+--------+--------------+--------------+
 |::a                     |       2003829|       1|       2003829|       3023540|
 |::c                     |       1019194|       2|        509597|       1019408|
 |TOPLEVEL                |           372|       1|           372| NOT AVAILABLE|
 |::b                     |            45|       1|            45|        510095|
 +------------------------+--------------+--------+--------------+--------------+
```

> 这是`etprof`官网的示例，after方法使程序执行延迟指定的时间(ms，毫秒)。请**重点关注**`EXCLUSIVETOT`和`CUMULTOT`之间的关系。

# 4、响应时间分析

根据对`etprof`的示例理解，`etprof`统计每个函数调用运行时间，在`hammerdb`的使用环境中，这个时间是调用一个过程时间，以`neword`为例：

```tcl
proc prep_statement { lda curn_st } {
switch $curn_st {
curn_sl{...}
...
curn_no {
set curn_no [oraopen $lda ]
set sql_no "begin neword(:no_w_id,:no_max_w_id,:no_d_id,:no_c_id,:no_o_ol_cnt,:no_c_discount,:no_c_last,:no_c_credit,:no_d_tax,:no_w_tax,:no_d_next_o_id,TO_DATE(:timestamp,'YYYYMMDDHH24MISS')); END;"
oraparse $curn_no $sql_no return $curn_no
        }
    }
}

#NEW ORDER
proc neword { curn_no no_w_id w_id_input RAISEERROR } {
#2.4.1.2 select district id randomly from home warehouse where d_w_id = d_id
set no_d_id [ RandomNumber 1 10 ]
#2.4.1.2 Customer id randomly selected where c_d_id = d_id and c_w_id = w_id
set no_c_id [ RandomNumber 1 3000 ]
#2.4.1.3 Items in the order randomly selected from 5 to 15
set ol_cnt [ RandomNumber 5 15 ]
#2.4.1.6 order entry date O_ENTRY_D generated by SUT
set date [ gettimestamp ]
orabind $curn_no :no_w_id $no_w_id :no_max_w_id $w_id_input :no_d_id $no_d_id :no_c_id $no_c_id :no_o_ol_cnt $ol_cnt :no_c_discount {} :no_c_last {} :no_c_credit {} :no_d_tax {} :no_w_tax {} :no_d_next_o_id {0} :timestamp $date
if {[catch {oraexec $curn_no} message]} {
if { $RAISEERROR } {
error "New Order : $message [ oramsg $curn_no all ]"
        } else {
;
        } } else {
orafetch  $curn_no -datavariable output
;
        }
}
```

在`neword`这个过程中，包含的操作有：

1. 准备随机数;
2. `orabind`填充预处理SQL语句;
3. `oraexec`执行SQL语句;

通常通过网络访问数据库服务，因此在执行SQL时，包含了发送SQL语句的网络延时、SQL语句解析耗时、执行数据库查找修改的耗时、处理结果返回的网络延时。

在考虑优化响应时间时，需考虑：

1. SQL语句的优化（作为虚拟化平台不考虑该工作，应由用户优化）；
2. 网络延迟的优化；
3. CPU的时间片分配、拓扑结构等优化（是否有足够的cpu资源）
4. 内存缓存的I/O性能优化；
5. 存储介质的I/O性能优化（通常更关注IOPS指标）；

# 5、Reference 

HammerDB：https://hammerdb.com/docs/ch03s07.html

etprof：https://wiki.tcl-lang.org/page/etprof

MySQL prepare原理：https://www.cnblogs.com/justfortaste/p/3920140.html



