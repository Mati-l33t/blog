---
title:      "单例模式学习笔记"
date:       2017-10-23
tags:
    - 软件设计
    - Java
---

# 单例模式学习笔记
### 单例模式简介
##### Point 1.单例模式的作用
1. 节省不必要的内存开销
2. 屏蔽对象创建的复杂性
3. 避免了类在外部被实例化

##### Point 2.单例模式的特性
1. 单例类只能有一个实例
2. 单例类必须自己创建自己的唯一实例
3. 单例类必须给所有其他对象提供这一实例  

##### Point 3.单例模式使用场景
只有一个实例的对象或只需要一个实例的对象

### 静态语言中的单例模式
静态类型语言需要定义单例类,封装构造方法,并提供返回单例对象接口

##### 1.懒加载形式(需要额外去实现线程安全)
```java
public class Singleton {
    private Singleton() {}
    private static Singleton single=null;
    public static Singleton getInstance() {
        if (single == null) {
            single = new Singleton();
        }
        return single;
    }

    //线程安全的, 但每次调用都会synchronized这个方法, 有额外性能损耗
    public static synchronized Singleton getInstanceSafe() {
        if (single == null)         
            single = new Singleton();
        return single;              
    }
}

```

##### 2.直接实例化形式(线程安全)
```java
public class Singleton1 {
    private Singleton1() {}
    private static final Singleton1 single = new Singleton1();
    public static Singleton1 getInstance() {
        return single;
    }
}
```

##### 3.双重校验形式(基本线程安全)
```java
//只有第一次调用会执行同步, 无额外性能损耗
public static Singleton getInstance() {
    if (instance == null) {
        synchronized(Singleton.class) {
            if (instance == null)
                instance = new Singleton();
        }
    }
    return instance;
}
```
[产生线程不安全的原因, 看完后如提壶灌顶](//blog.csdn.net/kufeiyun/article/details/6166673)

### 动态语言中的单例模式

> JS中无需创建单独的单例"类"的概念,函数作为一等对象,利用高阶函数可以实现抽象的单例工厂   

1. 全局变量 &nbsp;JS中可以使用带命名空间的全局变量"实现"单例模式
2. 闭包实现的单例工厂(<span class="turn-red">重点</span>)

```js
/* 惰性单例工厂:单例管理 */
var getSingleton = function(fn) {
    var singleton = null;
    return function(){
       return singleton || (singleton = fn.apply(this,arguments));
    }
}
/* 单例生成 */
var A = function(){
    return { /*create object*/ };
}
/* 闭包中的singleton不会被回收,返回特定单例工厂 */
var singletonA = getSingleton(singleObject);

/* 调用可获得特定单例 */
var singleInstance1 = singletonA();
var singleInstance2 = singletonA();
console.log(singleInstance1 === singleInstance2); //true
```

### Summary
- Java,C#等静态语言需要创建单例类实现,也可以利用反射机制创建单例,需要考虑线程安全问题.
- js中也可以采用静态语言的思维创建单例类, 添加一个生成单例的函数获取单例
- js闭包的特性提供了更加灵活和抽象的解决方案, 并且单线程的js无需考虑线程安全问题.