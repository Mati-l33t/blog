---
title:      "this call apply的用法总结"
date:       2017-06-27
tags:
    - JS/TS
---

# {{ $frontmatter.title }}



### this的特性与用法
##### 作为对象的方法调用
**指向该对象**

```javascript
var a = {
    func : function(){
        this.b = "b";  //1
    }
};
a.func(); //1处this指向对象a
```

##### 作为普通函数调用
**指向全局对象**

```javascript
function func(){
    this.a = "a"; //1
};
func(); //浏览器中this指向window对象; nodejs环境中指向global对象; 声明'use strict'指向undefined
```
##### 构造器调用
**指向构造器返回的对象**

```javascript
var a = function() {
    this.b = "b";  //1
}
var b = new a(); //1指向b对象
```

##### call或apply调用
**动态改变this**

```js
var a = function() {
    this.b = "b";  //1
}
var b = {};
a.apply(b,[]) //1指向b对象
```

### Call,Apply和Bind

##### 定义、区别以及联系
> bind()方法会创建一个新函数，称为绑定函数，当调用这个绑定函数时，绑定函数会以创建它时传入 bind()方法的第一个参数作为 this，
传入bind()方法的第二个以及以后的参数加上绑定函数运行时本身的参数按照顺序作为原函数的参数来调用原函数.

**call/apply区别:call传入不定参数, apply传入(类)数组对象;**

1. apply 、 call 、bind 三者都是用来<span style="color: #ff0000">改变函数的this对象的指向</span>的;
2. apply 、 call 、bind 三者第<span style="color: #ff0000">一个参数都是this要指向的对象</span>，也就是想指定的上下文;
3. apply 、 call 、bind 三者都可以利用<span style="color: #ff0000">后续参数传参</span>;
4. bind 是<span style="color: #ff0000">返回对应函数</span>，便于稍后调用；apply 、call 则是<span style="color: #ff0000">立即调用.</span>

```js
var obj = {
    x: 1,
}; 
var foo = {
    x: 2,
    getX: function() {
        return this.x;
    }
}
console.log(foo.getX.bind(obj)());  //1, 返回新函数(原函数+call/apply),不立即调用
console.log(foo.getX.call(obj));    //1
console.log(foo.getX.apply(obj));   //1  --call/apply/bind 运行时上下文[obj]
console.log(foo.getX());            //2  --定义时上下文[foo]
```

##### 常用用法   
###### 改变参数类型    
```js
var array1 = [1,2];
var array1 = [3,4];
Array.prototype.push.apply(array1, array2); //[1,2,3,4]

var numbers = [1,2,3];
Math.max.apply(Math, numbers); //3
```

###### 类数组转换为标准数组   

```js
function argumentsToArray(){
    return Array.prototype.slice.call(arguments); //转换后可以使用标准数组对象的所有方法
}
```
###### 运行时绑定参数    

```js
var foo1 = {
    bar : 1,
    eventBind: function(){
        $('a').on('click',
            function(event) {
                console.log(this.bar); //1
            }.bind(this) //click事件绑定了bind返回的新函数,运行时上下文是foo1对象
         );        
    }
}
```