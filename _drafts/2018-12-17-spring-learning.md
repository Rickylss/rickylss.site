# 学习 spring 时的思考

1. spring boot 与 spring 有什么区别与联系？
   1. spring boot 并非一个全新的框架，它的本质也是 spring（这一点可以从它的 start 依赖包中看出来），它整合了 spring 的一些功能例如 springmvc springjdbc 等。它的作用是减少 spring 繁琐的配置，使用户可以更快更方便地创建一个 spring 框架。
2. 为什么 spring 中要用到依赖注入？
   1. 使用依赖注入的目的是解耦合，如果使用传统的方法在 A 类中 new 另一个 B 类，一旦项目大起来，若要修改 B 类，则需要将所有 new 过 B 类的 A 类进行修改，如果使用依赖注入的方法，则只需修改配置中注入部分的代码。这便是解耦合的意义。
3. spring 中注入一个类的具体实现？





Consolas, 'Courier New', monospace





vscode 输出控制台中文乱码问题

utf-8 65001