---
layout: post
title:  "springMVC入门"
subtitle: ""
date:   2019-1-23 14:15:38 +0800
categories: [spring]
---

# springMVC入门

## 1.springMVC结构与DispatcherServlet

## 2.配置DispatcherServlet

## 3.注解驱动的控制器

## 4.request取值方式

### 4.1HttpServletRequest

> httpServletRequest对象代表客户端的请求，因此通过它可以获取整个request的信息。

``` java
@Controller
public class MyTestController {
	@RequestMapping("/address")
	public String PrintInfo(HttpServletRequest request) {
		System.out.println("name:" +request.getParameter("name"));
		System.out.println("index:" + request.getParameter("index"));
		return "testpage";
	}
}
```

也可通过@Autowired，直接注入HttpServletRequest；

``` java
@Controller
public class MyTestController {
    @Autowired
    private HttpServletRequest request;
    
    @RequestMapping("/address")
	public String PrintInfo() {
		System.out.println("name:" +request.getParameter("name"));
		System.out.println("index:" + request.getParameter("index"));
		return "testpage";
	}
}
```

获取客户机信息：

1. getRequestURL方法返回客户端发出请求时的完整URL。
2. getRequestURI方法返回请求行中的资源名部分。
3. getQueryString 方法返回请求行中的参数部分。
4. getPathInfo方法返回请求URL中的额外路径信息。额外路径信息是请求URL中的位于Servlet的路径之后和查询参数之前的内容，它以“/”开头。
5. getRemoteAddr方法返回发出请求的客户机的IP地址。
6. getRemoteHost方法返回发出请求的客户机的完整主机名。
7. getRemotePort方法返回客户机所使用的网络端口号。
8. getLocalAddr方法返回WEB服务器的IP地址。
9. getLocalName方法返回WEB服务器的主机名。

获取请求头信息：

1. getHeader(string name)方法:String 
2. getHeaders(String name)方法:Enumeration 
3. getHeaderNames()方法

获取客户机请求参数：

1. getParameter(String)方法(常用)
2. getParameterValues(String name)方法(常用)
3. getParameterNames()方法(不常用)
4. getParameterMap()方法(编写框架时常用)

### 4.2路径变量@PathVariable

```java
@Controller
public class MyTestController {
    @RequestMappping("/address/{name}/{index}")
    public String printInfo(@PathVariable String name, @PathVariable int index) {
		System.out.println("name:" + name);
		System.out.println("index:" + index);
		return "testpage";
    }
}
```

@PathVariable匹配requestMapping中{}的路径变量，取路径变量中的值。

### 4.3参数名匹配@RequestParam

``` java
@Controller
public class MyTestController {
	@RequestMapping(value="/address")
	public String PrintInfo(@RequestParam("name") String name, @RequestParam("the_index") int index) {
		System.out.println("name:" +name);
		System.out.println("index:" + index);
		return "testpage";
	}
}
```

参数名相同时可省略@RequestParam注解，但是当参数名不同时需要写注解并写明变量名。

### 4.4获取请求头中的参数@RequestHeader

```java
@Controller
public class MyTestController {
	@RequestMapping(value="/address")
	public String PrintInfo(@RequestHeader Map<String, String> headers) {
		for (String elem: headers.keySet()) {
			System.out.println(elem + " : " + headers.get(elem));
		}
		return "testpage";
	}
}
```

除了在HttpServletRequest中获取requestheader之外，还可以直接使用@RequestHeader注解获取头部信息。

### 4.5获取请求体信息@RequestBody

``` java
@Controller
public class MyTestController {
	@RequestMapping(value="/address")
	public String PrintInfo(@RequestBody String body) {
		System.out.println("body:" +body);
		return "testpage";
	}
}
```

@RequestBody可以直接将json数据映射成java对象。

## 5.response返回值方式

### 5.1ModelAndMapping类



