# 学习spring时的思考

1. spring boot与spring有什么区别与联系？
   1. spring boot并非一个全新的框架，它的本质也是spring（这一点可以从它的start依赖包中看出来），它整合了spring的一些功能例如springmvc springjdbc等。它的作用是减少spring繁琐的配置，使用户可以更快更方便地创建一个spring框架。
2. 为什么spring中要用到依赖注入？
   1. 使用依赖注入的目的是解耦合，如果使用传统的方法在A类中new另一个B类，一旦项目大起来，若要修改B类，则需要将所有new过B类的A类进行修改，如果使用依赖注入的方法，则只需修改配置中注入部分的代码。这便是解耦合的意义。
3. spring中注入一个类的具体实现？