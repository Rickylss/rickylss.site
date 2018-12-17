---
layout: post
title:  "科学上网"
subtitle: ""
date:   2018-12-4 19:56:09 +0800
categories: [shadowsock]
---

# 科学上网

``` shell
yum update
yum install python-setuptools libevent python-devel openssl-devel swig
easy_install pip 
pip install gevent shadowsocks

array_port =("9010" 
             "9011"
             "9012"
             "9013"
             "9014"
             "9015")

for i in ${array_port[@]}
do
    firewall-cmd --zone=public --add-port=$i/tcp --permanent
    firewall-cmd --zone=public --add-port=$i/udp --permanent
done
firewall-cmd --reload
```



```shell
ip = "`ip addr | grep inet |grep -v inet6 | grep -v 127.0.0.1 |awk '{print $2}' |awk -F '/' '{print $1}'`"

{
    "server":"207.148.24.244",（如果是遇到阿里云这样的公网IP 无法ifcfg的填0.0.0.0）
    "local_address":"127.0.0.1",
    "local_port":1080,
    "port_password":{
         "9010":"IamThanos",
         "9011":"IamScarletWitch",
         "9012":"IamThor",
         "9013":"IamIronMan",
         "9014":"IamSpiderMan",
         "9015":"IamCaptainAmerica"
    },
    "timeout":300,
    "method":"rc4-md5",
    "fast_open": false
}

ssserver -c /etc/shadowsocks.json -d start
echo 'ssserver -c /etc/shadowsocks.json -d start' >> /etc/rc.local

```

