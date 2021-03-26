---
layout: post
title:  "springMVC 入门"
subtitle: ""
date:   2019-1-23 14:15:38 +0800
categories: [spring]
---

# springMVC 入门

## 1.springMVC 结构与 DispatcherServlet

## 2.配置 DispatcherServlet

## 3.注解驱动的控制器

## 4.request 取值方式

### 4.1HttpServletRequest

> httpServletRequest 对象代表客户端的请求，因此通过它可以获取整个 request 的信息。

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

也可通过@Autowired，直接注入 HttpServletRequest；

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

1. getRequestURL 方法返回客户端发出请求时的完整 URL。
2. getRequestURI 方法返回请求行中的资源名部分。
3. getQueryString 方法返回请求行中的参数部分。
4. getPathInfo 方法返回请求 URL 中的额外路径信息。额外路径信息是请求 URL 中的位于 Servlet 的路径之后和查询参数之前的内容，它以“/”开头。
5. getRemoteAddr 方法返回发出请求的客户机的 IP 地址。
6. getRemoteHost 方法返回发出请求的客户机的完整主机名。
7. getRemotePort 方法返回客户机所使用的网络端口号。
8. getLocalAddr 方法返回 WEB 服务器的 IP 地址。
9. getLocalName 方法返回 WEB 服务器的主机名。

获取请求头信息：

1. getHeader(string name)方法:String 
2. getHeaders(String name)方法:Enumeration 
3. getHeaderNames()方法

获取客户机请求参数：

1. getParameter(String)方法(常用)
2. getParameterValues(String name)方法(常用)
3. getParameterNames()方法(不常用)
4. getParameterMap()方法(编写框架时常用)

### 4.2 路径变量@PathVariable

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

@PathVariable 匹配 requestMapping 中{}的路径变量，取路径变量中的值。

### 4.3 参数名匹配@RequestParam

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

参数名相同时可省略@RequestParam 注解，但是当参数名不同时需要写注解并写明变量名。

### 4.4 获取请求头中的参数@RequestHeader

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

除了在 HttpServletRequest 中获取 requestheader 之外，还可以直接使用@RequestHeader 注解获取头部信息。

### 4.5 获取请求体信息@RequestBody

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

@RequestBody 可以直接将 json 数据映射成 java 对象。

## 5.response 返回值方式

### 5.1ModelAndMapping 类



