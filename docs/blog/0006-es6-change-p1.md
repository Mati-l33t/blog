---
title:      "ES6的变化与新特性(上篇)"
date:       2017-12-01
tags:
    - JS/TS
---

# ES6的变化与新特性(上篇)

## Part1. 变量声明与作用域的变化  

ES6有6种姿势声明变量: var let const function class import   
其中<span style="color: #ff0000;">let</span>关键字，用来替代var声明变量。它的用法类似于var，但是所声明的变量，<span style="color: #ff0000;">只在let命令所在的代码块内有效</span>,即{}内有效.let声明的变量<span style="color: #ff0000;">不存在变量提升</span>  

#### var与let的对比
```js
var a = [];
for(var i = 0;i &lt; 10;i++) {
    a[i] = function(){
        console.log(i);
    }
}
a[0]() //10;
//--------------------
var a = [];
for (let i = 0; i &lt; 10; i++) {
    a[i] = function () {
        console.log(i);
    };
}
a[6](); // 6  
//在for循环声明的let变量只在该循环块内有效,
//并且每次循环会重新分配,
//故在新的循环轮次中i是新的变量
```
#### 变量声明的暂时性死区
let变量绑定的代码块不受外部影响,在<span style="color: #ff0000;">代码块开始处</span>到声明<span style="color: #ff0000;">该变量声明处</span>存在暂时性死区,这将导致该部分使用<span style="color: #ff0000;">暂未声明的变量报错</span>,即使全局存在<span style="color: #ff0000;">同名变量也报错</span>.const同理.  

栗子
```js
if (true) {
    /*此处如果用var声明,会报重复声明的错误,
      ES6不允许let和const同作用域重复声明*/
    tmp = 'abc';              
    console.log(tmp);         //报错:变量未定义
    typeof tmp;               //报错:同上

    let tmp;                  //死区结束
    console.log(tmp);         // undefined

    tmp = 123;
    console.log(tmp);         // 123
}
```
#### const关键字
const用于声明常量,其值或指向的<span style="color: #ff0000;">对象引用不能改变</span>;  
const作用域规则同let<span style="color: #ff0000;">,不存在变量提升,存在暂时性死区</span>;  
const声明的<span style="color: #ff0000;">同时必须赋值</span>,'const a;a=1;console.log(a)'这在非严格模式下输出undefined,严格模式报错;  
const声明的对象引用不可变,但<span style="color: #ff0000;">对象属性可变<span style="color: #000000;">;</span></span>  
跨模块常量需要用<span style="color: #ff0000;">export</span>声明 export const xx = xx;

#### 函数作用域
ES5 : 存在函数提升,在代<span style="color: #ff0000;">码块内的函数</span>会提升到<span style="color: #ff0000;">整个函数作用域</span>内  
ES5 严格模式 : 函数<span style="color: #ff0000;">只能在函数内或顶级作用域声明</span>, 不能再if{} for{}等块内声明  
ES6 : 函数<span style="color: #ff0000;">不存在提升</span>, if{} for{}等块内声明的函数<span style="color: #ff0000;">只在块内有效</span>

## Part2. 解构
#### ES6允许按照一定模式，从<span style="color: #ff0000;">数组和对象中提取值，对变量进行赋值</span>，这被称为解构(Destructuring).

<ul><li>允许<span style="color: #ff0000;">不完全解构</span></li><li>解构可运用于<span style="color: #ff0000;">var let const import</span></li><li>对于<span style="color: #ff0000;">Set</span>结构，也可以使用数组的解构赋值。eg: let [x, y, z] = new Set(["a", "b", "c"])</li><li><span style="color: #ff0000;">Generator</span>函数也能解构,赋值过程依次调用函数获取值</li><li>解构<span style="color: #ff0000;">允许附带默认值</span>,生效条件是匹配到<span style="color: #ff0000;">严格undefined</span> eg: let [a=1,b=3] = [2]  //a=2,b=3</li><li>解构比较过程是<span style="color: #ff0000;">严格相等</span>运算 eg: let [a=undefined] = [null] //a=null 因为 undefined!==null</li><li><span style="color: #ff0000;">对象</span>的解构赋值的内部机制，是先找到<span style="color: #ff0000;">同名属性</span>，然后再赋给<span style="color: #ff0000;">对应的变量</span>。真正被赋值的是<span style="color: #ff0000;">后者</span>，即属性名称只是作为匹配模式</li><li><span style="color: #ff0000;">已经声明的对象</span>解构赋值最好<span style="color: #ff0000;">加上()</span>以避免解释器当成代码块 eg : var x; {x} = {x: 1}; //如果解构语句在行首则报错</li><li>解构声明等同于分别声明, let和const关键字声明的同区块<span style="color: #ff0000;">不能出现重复</span></li><li><span style="color: #ff0000;">对象</span>解构时, 若源为基本类型,会<span style="color: #ff0000;">转换为对象类型</span>; <span style="color: #ff0000;">数组</span>解构时, 源必须是<span style="color: #ff0000;">可遍历的结构或字符串</span></li><li><span style="color: #ff0000;">函数参数</span>也能解构, <span style="color: #ff0000;">形参</span>被解构赋值为<span style="color: #ff0000;">实参</span>, eg : function foo([x,y]) {};foo([1,2])</li><li>解构模式<span style="color: #ff0000;">内部不要有括号</span>()</li>
</ul>

示例

```js
var { bar, foo } = { foo: "aaa", bar: "bbb" }; //这是简写形式.
var { foo: foo, bar: bar } = { foo: "aaa", bar: "bbb" }; //真·解构
var { p: [x, { y : z }] } = { // x='Hello'; p和y 是模式,未声明; z = 'World'   EX·嵌套·解构
    p: [
        "Hello",
        { y: "World", z : "GG" }
    ]
};

let [foo, [[bar], baz]] = [1, [[2], 3]];
foo // 1
bar // 2
baz // 3

let [ , , third] = ["foo", "bar", "baz"];
third // "baz"

let [x, , y] = [1, 2, 3];
x // 1
y // 3

let [head, ...tail] = [1, 2, 3, 4]; //...运算符不能放在前面,含义为剩下的参数
head // 1
tail // [2, 3, 4]

let [x, y, ...z] = ['a'];
x // "a"
y // undefined
z // []
```
用途
<ol><li>交换变量 [a,b] = [b,a]</li><li>提取数据, 从返回值提取或从Json提取等等</li><li>函数默认参数</li><li>加载模块指定值 eg: import {A,B} from './xx';</li></ol>

## Part3. 内置对象扩展与字符串模板
#### 字符串和正则的扩展
<ul><li>ES6 unicode: Unicode编码放在大括号内,对于&gt;0xFFFF的字符不会错误解释<span style="color: #ff0000;"> \u{xxxxx}</span></li><li>codePointAt() JS字符以UTF-16的格式储存，每个字符固定为2个字节。对于那些需要4个字节储存的字符,字符长度为2,此方法避免该问题, 返回, 返回字符码点, <span style="color: #ff0000;">扩展charCodeAt</span>方法</li><li>fromCodePoint([...code]) 返回Unicode码的对应字符,<span style="color: #ff0000;">扩展fromCharCode</span>方法</li><li>at() 返回指定位置字符, <span style="color: #ff0000;">扩展charAt</span>方法</li><li>normalize() 统一同一个字符的不同Unicode</li><li><span style="color: #ff0000;"> includes(), startsWith(), endsWith()</span> 终于有这三个方法了,第一个参数是匹配字符,第二个参数是<span style="color: #ff0000;">搜索开始位置</span></li><li>repeat() 重复字符串,参数是自然数</li><li>模板字符串 终于出来了,<span style="color: #ff0000;">here doc</span>写法</li></ul>

```js  
//基本用法, <span style="color: #ff0000;">反引号</span>包含
var str = `
Here

is
doc
`;

/**
 * 模板替换
 * ${}中的变量会被替换成实际值;
 * 非字符串变量会自动调用toString()后替换;
 * 表达式会计算值后替换;
 * 函数会替换为其返回值
 */
var number = 1;
str = `Test ${number} Test`; //Test 1 Test

var bar = {foo : 1 };
var foo = function(){};
`foo ${foo()} ${bar.foo}`; //foo undefined 1

//标签模板(一种函数调用)
var a = 5;
var b = 10;
tag`Hello ${ a + b } world ${ a * b } `;

function tag (){
    console.log(arguments[0]);      //['Hello ', ' world ', ' ']
    console.log(arguments[1]);     //15
    console.log(arguments[2]);    //15
}

//String.raw转义模板字符串
String.raw`Hi\n${2+3}!`  //Hi\\n5
```

#### 数组扩展
<span style="color: #ff0000;">Array.from</span>将任何类数组或实现Iterator的类型转换为<span style="color: #ff0000;">真·数组</span>

```js
Array.from(arguments);
Array.from({length : 3}); //[undefined,undefined,undefined]
Array.from([1,2],x=&gt;x+1); //[2,3] 接受第二个参数进行map, == Array.from([1,2]).map(x=&gt;x+1);
Array.from({length : 3},()=&gt;this.a,{a:1}); //[1,1,1] 接受第三个参数绑定this
```

<span style="color: #ff0000;">Array.of</span>将<span style="color: #ff0000;">从参数构造数组</span>,行为等同于new Array()参数&gt;2时,不存在重载,如Array.of(1,2),返回[1,2]
Array.copyWithin 没卵用..  
<span style="color: #ff0000;">Array.find()和findIndex()</span>, 接受一个函数,返回执行至第一个返回true时的value或者index,接受的函数参数:value, index, arr <span style="color: #ff0000;">弥补indexOf方法, indexOf方法无法识别数组的NaN成员</span>，但是findIndex方法可以借助Object.is方法做到,  
<span style="color: #ff0000;">Array.includes</span>, 返回bool, 相当于可以识别NaN的indexOf === -1  
<span style="color: #ff0000;">Array.fill()</span>, 填充值,不多说  
<span style="color: #ff0000;">entries()，keys()和values()</span> 返回三种遍历器

#### 函数扩展
ES6允许函数拥有<span style="color: #ff0000;">默认值</span>, 并且可以和<span style="color: #ff0000;">解构赋值同时使用</span>

```js
function fetch(url, { method = 'GET' } = {}){
    console.log(method);
}
fetch("test1"); //GET
fetch("test2",{method : "PUT"}); //PUT
```
<span style="color: #ff0000;">函数拥有length属性</span>,含义是预期传入参数个数,不包括默认参数和rest参数, name属性也被标准化  
#### 扩展运算符(...)
在形参列表作用是将剩余变量加入...variable数组中,避免arguments对象的使用(注:只能在参数列表最后出现);
在实参列表作用是将数组转换为参数序列(相当于apply的第二个参数用法);  
另外,扩展运算符也可以合并数组;配合解构生成数组;转换成为数组(相当于Array.from)

```js
function foo(a,...b){
    console.log(b);
}
foo(1,2,3);//[2,3]

function bar(a,b,c) {
    console.log(a,b,c);
}
bar(...[1,2,3]); //1,2,3
```

#### Lambda表达式
<span style="color: #ff0000;">ES6提供了对lambda表达式</span>支持, 又名箭头函数, 格式为 "(/* 参数 */) => {/* 函数体 */}", 以下是其注意点,与匿名函数最大的区别是固化this:  
（1）函数体内的this对象，就是定义时所在的对象，而不是使用时所在的对象  
（2）不可以当作构造函数，也就是说，不可以对lambda表达式使用new命令，否则会抛出一个错误  
（3）不可以使用arguments对象，该对象在函数体内不存在。如果要用，可以用Rest参数代替  
（4）不可以使用yield命令，因此箭头函数不能用作Generator函数  
关于尾调用优化和尾递归柯里化等函数式编程概念, 以后详述

#### 对象扩展
对象有简洁写法, 不写属性值时, 属性值为属性名称变量的值  
对象声明<span style="color: #ff0000;">允许属性名表达式</span>, 代替 obj[expr]的写法

```js
let a=1;b=2;
console.log({a,b}); //{a : 1 , b : 2}
let c = {
    [a] : 'a',
    [foo()] : 'b'
}
console.log(c); //{ '1' : 'a' , foo()的返回值 : 'b'}
```
<span style="color: #ff0000;">Object.is</span>方法, 接受两个参数, 判断两个对象是否相同,这是一种Same-value equality, 相当于可以判断NaN===NaN和+0!==-0的严格等于运算符  
<span style="color: #ff0000;">Object.assign</span>方法, 与_.extent $.extend作用相同,合并对象(注:采用浅拷贝)
ES7提出扩展运算符'...'引入对象, 这已经在Babel实现
Object.keys , Object.values, Object.entries等等其他语法糖不详述.

#### ES6中可用的遍历对象的6种姿势
<ul><li>for...in 循环遍历对象自身的和继承的可枚举属性（不含Symbol属性）</li><li>Object.keys(obj) 返回一个数组，包括对象自身的（不含继承的）所有可枚举属性（不含Symbol属性）</li><li>Object.getOwnPropertyNames(obj) 返回一个数组，包含对象自身的所有属性（不含Symbol属性，但是包括不可枚举属性）</li><li>Object.getOwnPropertySymbols(obj) 返回一个数组，包含对象自身的所有Symbol属性</li><li>Reflect.ownKeys(obj) 返回一个数组，包含对象自身的所有属性，不管是属性名是Symbol或字符串，也不管是否可枚举</li><li>Reflect.enumerate(obj) 返回一个Iterator对象，遍历对象自身的和继承的所有可枚举属性（不含Symbol属性），与for...in循环相同。</li></ul>