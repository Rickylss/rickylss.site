---

---

# 1

在进行驱动编程的时候是无法调用 C 库的，这个部分需要格外注意。但是可以使用内核内部的函数代替，例如使用 printk 代替 printf（printk 缺少浮点数支持）

编译驱动程序时，需要用到 linux 内核的头文件，通常路径为/usr/src/linux-xxxx/，若不存在则需要手动安装对应版本的 linux-headers

