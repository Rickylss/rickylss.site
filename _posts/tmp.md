# 查看vpc conntrack连接数

1. 登录vpc

   ```bash
   # 登录管理节点
   $ cd $ZSTACK_HOME/WEB-INF/classes/ansible/rsaKeys
   $ ssh -i id_rsa vyos@[vpc_management_ip]
   password: vrouter12#
   ```

2. 通过conntrack命令或ss命令查看连接数

   ```bash
   $ sudo su
   $ conntrack -L | wc -l
   $ ss -n | wc -l
   ```

   

