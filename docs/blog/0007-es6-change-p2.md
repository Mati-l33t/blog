---
title:      "ES6的变化与新特性(下篇)"
date:       2017-12-03
tags:
    - JS/TS
---

# ES6的变化与新特性(下篇)

## Part3. Set & Map & Iterator
#### Set数据结构
ES6新增了Set数据结构, 其相关知识如下: 
1. Set相当于值唯一的数组, 构造器参数为<span style="color: #ff0000;">数组</span>或<span style="color: #ff0000;">类数组</span>对象
2. 可用于数组去重:<span style="color: #ff0000;"> [...new Set(array)]</span>
3. 具有<span style="color: #ff0000;">size</span>属性
4. Set有以下方法
<span style="color: #ff0000;">add,delete,has,clear: </span>add返回<span style="color: #ff0000;">Set本身</span>,可以链式调用. delete,has返回<span style="color: #ff0000;">true/false</span>
<span style="color: #ff0000;">keys,values,entries,forEach: </span>keys,values,entries返回<span style="color: #ff0000;">Symbol.iterator</span>遍历器entries遍历实体是数组,index 0为key,index 1为value在Set中key-value是<span style="color: #ff0000;">相同</span>的,entries中[0]和[1]也是相同的forEach参数函数的参数分别是value,key
5. Array.from可以转换Set为数组, 或者[...set]
6. Set可以直接使用<span style="color: #ff0000;">for...of</span>遍历

利用Set实现并交差集
```js
let union = new Set([...set1,...set2]); 
let intersect = new Set([...set1].filter(x =&gt; set2.has(x)));
let diff = new Set([...set1].filter(x =&gt; !set2.has(x)));
```

#### WeakSet与WeakMap
- WeakSet: 成员<span style="color: #ff0000;">只能是对象</span>,<span style="color: #ff0000;">无size属性和遍历器,只能add,delete,has,不能clear</span>.  WeakSet中对象的引用不计数,即<span style="color: #ff0000;">弱引用</span>,无需考虑内存泄漏, 用法与Set一样  
- WeakMap: 成员<span style="color: #ff0000;">只能是对象</span>,与WeakSet类似,只有<span style="color: #ff0000;">get,set,has,delete</span>可以用


#### Map数据结构
1. Map相当于键可以为<span style="color: #ff0000;">任意类型</span>的<span style="color: #ff0000;">属性有序</span>的Object
2. 构造器接收数组为参数,参数为<span style="color: #ff0000;">[[key,value],[key,value]]</span>形式
3. Map有<span style="color: #ff0000;">size</span>属性
4. Map有以下方法
<span style="color: #ff0000;">set,get,has,delete,clear</span>调用方式和返回值与Set类似
5. 遍历器有<span style="color: #ff0000;">keys,values,entries,forEach</span>,与Set类似,前三个都可以使用<span style="color: #ff0000;">for...of</span>遍历
entries遍历实体是数组<span style="color: #ff0000;">,index 0为key,index 1为value</span>
6. Map也可以使用...运算符加[],扩展为构造器参数形式的数组

#### ECMAScript6中的Iterator
遍历Iterator每一次调用next方法, 都会返回数据结构的当前成员的信息.具体来说,就是返回一个包含<span style="color: #ff0000;">value和done</span>两个属性的对象.其中,value属性是当前成员的值,done属性是一个布尔值,表示遍历是否结束. 凡是部署了<span style="color: #ff0000;">Symbol.iterator属性</span>的数据结构,就称为部署了遍历器接口.调用这个接口,就会返回一个遍历器对象.也可以使用for...of遍历  
另外, ES6新增的一个基本数据类型Symbol, 作用类似于创建一个唯一的GUID, 并且对相同的键(Symbol.for())返回相同的标识值, 作为属性时不会被遍历到, 详见[此处](//es6.ruanyifeng.com/#docs/symbol)
```js
/* 不同人群遍历js数组的办法 */
//小学生级别
let arr = ['a', 'b', 'c'];
for(let i of arr) {
    console.log(i) //a b c
}

//初中生级别
let it = arr[Symbol.iterator]();

it.next() // { value: 'a', done: false }
it.next() // { value: 'b', done: false }
it.next() // { value: 'c', done: false }
it.next() // { value: undefined, done: true }

//专家级用法, 自定义遍历器
let iterable = {
  0: 'a',
  1: 'b',
  2: 'c',
  length: 3,
  [Symbol.iterator]: Array.prototype[Symbol.iterator]
};
for (let item of iterable) {
  console.log(item); // 'a', 'b', 'c'
}
/* 
 * 注: 通用做法是部署遍历器函数返回this,并在对象中定义返回value和done的next方法
 * 亦可直接部署遍历器函数直接返回带next方法的对象
 * [Symbol.iterator]() { return this;} 
 * this.next = next(){ return { value : obj, done : false } }
 */
```

## Part4. Generator函数
>Generator是ECMAScript6中提供的新特性.在过去,封装一段运算逻辑的单元是函数.函数只存在没有被调用或者被调用的情况,不存在一个函数被执行之后还能暂停的情况,而Generator的出现让这种情况成为可能, 即<span style="color: #ff0000;">函数能执行到yield暂停, 调用next函数生成一个值并执行到下个yield或return.</span>

#### 基本用法
调用Generator函数，返回一个<span style="color: #ff0000;">遍历器对象</span>[Symbol.iterator]，代表Generator函数的内部指针。以后，每次调用遍历器对象的next方法，就会返回一个有着<span style="color: #ff0000;">value和done</span>两个属性的对象。value属性表示当前的<span style="color: #ff0000;">内部状态的值</span>，是yield语句后面那个<span style="color: #ff0000;">表达式的值</span>, 或<span style="color: #ff0000;">next函数传入的参数</span>；done属性是一个布尔值，表示<span style="color: #ff0000;">是否遍历结束</span>。
```js
function* helloWorldGenerator() {
  yield 'hello';
  yield 'world';
  return 'ending';
}


var hw = helloWorldGenerator();
hw.next(); // { value: 'hello', done: false }
hw.next(); // { value: 'world', done: false }
hw.next(); // { value: 'ending', done: true }
hw.next(); // { value: undefined, done: true }
```
<em>注意点</em>
<ul><li>yield 不能用在普通函数中, 只能在带 * 的函数内使用</li><li>yield 用在表达式中, 必须加括号. 并且包含表达式的语句在下一个yield才会执行. 栗子:console.log(1 + (yield 233));</li><li>yield 后的返回值即next()的value, 如果没有return语句, 最后一次next()返回值是undefined, 否则value是返回值</li><li>在函数参数和赋值表达式中, yield可以不加括号</li><li>如果在next()中传入参数, 则yield表达式的返回值强制变成该参数</li><li>如果需要在Generator函数yield另一个Generator函数, 可以写成yield* xx();</li><li>Generator函数只能call不能new</li><li>Generator函数中的this与返回的迭代函数this不一致</li></ul>

```js
function* bar() {
  yield 'x';
  yield* foo();
  yield 'y';
}
//等价于上面的写法
function* bar() {
  yield 'x';
  for (let v of foo()) {
    yield v;
  }
  yield 'y';
}
```

### 使用Generator函数同步化异步操作
>Generator本身是一种半协程的实现, 能够在<span style="color: #ff0000;">函数执行过程中动态改变执行权</span>, 如果在将异步操作yield在一个Generator函数中, 每个<span style="color: #ff0000;">异步操作完成后自动的调用next()</span>, 即可实现看起来像同步代码的异步操作了  

膜拜TJ大神的代码: <a href="https://github.com/tj/co/blob/master/index.js" target="_blank">co模块</a> 实现自动执行Generator的核心只有几十行, 其中最关键的是这几行
```js
/* co模块是一个Generator函数包装器, 自动执行异步的Generator, 返回一个Promise对象 */
function onFulfilled(res) {
  var ret;
  try {
    ret = gen.next(res);  //调用next, 获取next方法返回的 {value, done}对象, 并且给yield的返回值置为返回的Promise对象
  } catch (e) {
    return reject(e);     //如果Generator函数执行过程任意next()中出现异常, 都能catch到
  }
  next(ret);    //调用核心next方法, 递归
  return null;
}
function next(ret) {
  if (ret.done) return resolve(ret.value);  //如果Generator next()执行完毕, 将Promise置为resolve态
  var value = toPromise.call(ctx, ret.value); //如果yield了非Promise对象则转换成为Promise对象,如普通对象和thunk函数
  if (value && isPromise()) return value.then(onFulfilled, onRejected);
  return onRejected(new TypeError('You may only yield a function, promise, generator, array, or object, '
        + 'but the following object was passed: "' + String(ret.value) + '"'));
}
```

## Part5 异步编程
#### 异步的本质
>在浏览器中,每个window中, 一般JS执行引擎是一个线程,DOM渲染是一个线程, 事件循环是一个线程, 不同的浏览器可能有不同的多线程策略, 比如DOM渲染可能与JS执行是一个线程, 但JS执行环境始终是单线程的;
在Node.js中, Event Loop是一个线程, I/O是一个线程池(windows中是IOCP, *nux中是自主线程池), JS执行环境也是一个单线程;
<span style="color: #ff0000;">基于EventLoop的非阻塞式设计决定了无论是浏览器还是后端, I/O, 网络等非CPU计算型操作必须是异步的.</span>
#### 异步编程的方式
<ol><li>回调Hell(最原始的方式, 不进行详述)</li><li>发布/订阅 事件</li><li>Promise规范</li><li>第三方流程控制库</li><li>Generator函数与async/await</li></ol>

#### 1. 事件监听(发布/订阅)
在回调层数很少的情况下, <span style="color: #ff0000;">直接使用回调是</span>最好的方式, 效率最高, 语义最明确, 其次是使用<span style="color: #ff0000;">事件监听</span>来实现.事件机制是JS的核心, 但是在业务逻辑中大量使用事件来处理异步操作会造成<span style="color: #ff0000;">代码逻辑不清晰, 难以阅读和定位</span>. 某些适合<span style="color: #ff0000;">事件队列</span>的情况下, 使用事件的实现方式可能更加适合. 比如下面这个栗子.
```js
var events = require('events');
var proxy = new events.EventEmitter();
var status = "ready";
var select = function (callback) {
  proxy.once("selected", callback);    //订阅事件, 一旦查询完成执行callback
  if (status === "ready") {            //确保同一时间只调用一次查询
    status = "pending";
    db.select("SQL", function (results) {
      proxy.emit("selected", results); //完成查询emit事件
      status = "ready";
    });
  }
};
```
#### 2. Promise/Deferred
Promise是ES6和CommonJS中的标准和规范. 简单说<span style="color: #ff0000;">Promise是一个容器, 里面保存着某个未来才会结束的事件</span>(通常是一个异步操作)的结果.从语法上说,Promise是一个对象,从它可以获取异步操作的消息.Promise提供统一的API(then,catch...),各种异步操作都可以用同样的方法进行处理.
Deferred对象用于内部, 维护异步模型的状态, 是实现<span style="color: #ff0000;">Promise规范的一种方式</span>. 在jQuery1.5版本后, 使用$.Deferred()可以创建一个Deferred对象, Deferred对象拥有then, resolve, reject等等函数, 使用Deferred.promise()可以得到对应的Promise对象.进而链式调用then, done, fail等函数.
Promise的基本用法如下

```js
var promise = new Promise(function(resolve, reject) {
  //code...
  if (success){
    resolve(value);
  } else {
    reject(error);
  }
});
promise.then(function(value) {
  // success
}, function(error) {
  // failure
});
/* 与上面的代码等价 */
promise.then(function(value) {
  // success
}).catch(function(err) {
  // failure
});
```

- Promise.all方法  
传入Promise对象数组并行Promise, 当所有Promise都为resolve状态或某个Promise为reject状态时改变整个Promise的状态
- Promise.race方法  
传入Promise对象数组并行Promise, 在首次发生状态变化时改变整个Promise的状态
- Promise.resolve/reject  
直接返回一个状态为resolve/reject的Promise对象, 调用的参数会传入回调函数中
常用的Promise的实现有: q, bluebird, ES6原生实现等等, 性能和提供的API会有差异

#### 3. 第三方库
第三方异步流程控制库非常多, 其中使用最广泛的是<span style="color: #ff0000;">async</span>库, 详细文档传送门: <a href="//caolan.github.io/async/" target="_blank">点这里</a>
其中常用的API示例如下
```js
//异步迭代器
async.each(openFiles, saveFile, function(err){
  // if any of the saves produced an error, err would equal that error
});
//异步映射, results为map后的集合
async.map(['file1','file2','file3'], fs.stat, function(err, results) {
    // results is now an array of stats for each file
});
//异步规约, arguments[1]是memo, 即规约集
async.reduce([1,2,3], 0, function(memo, item, callback) {
    // pointless async:
    process.nextTick(function() {
        callback(null, memo + item)
    });
}, function(err, result) {
    // result is now equal to the last value of memo, which is 6
});
//串行
async.series([
    function(callback) {
        // do some stuff ...
        callback(null, 'one');
    },
    function(callback) {
        // do some more stuff ...
        callback(null, 'two');
    }
],
// optional callback
function(err, results) {
    // results is now equal to ['one', 'two']
});
//并行, 如需限制并发数, 使用parallelLimit
async.parallel({
    one: function(callback) {
        setTimeout(function() {
            callback(null, 1);
        }, 200);
    },
    two: function(callback) {
        setTimeout(function() {
            callback(null, 2);
        }, 100);
    }
}, function(err, results) {
    // results is now equals to: {one: 1, two: 2}
});
//瀑布流, 参数往下传递, 直到完成整个异步的callback
async.waterfall([
    function(callback) {
        callback(null, 'one', 'two');
    },
    function(arg1, arg2, callback) {
        // arg1 now equals 'one' and arg2 now equals 'two'
        callback(null, 'three');
    },
    function(arg1, callback) {
        // arg1 now equals 'three'
        callback(null, 'done');
    }
], function (err, result) {
    // result now equals 'done'
});
//自动处理前置依赖, 此例showData一定在readData后发生
async.auto...
```

#### 4. Generator函数与async/await
Generator函数的使用和co模块实现异步操作同步化的代码在Part4中已经有描述, 然而类似Python语法并且引入新的符号(*)的Generator函数并没有普及使用,   
**在ES7提案中, 一种新的异步解决方案出现了, 那就是<span style="color:red">async/await</span>**
async/await的使用与普通的函数几乎没有区别, 只需要加上对应的关键字, 虽然其底层是一个包含了自动执行器的Generator函数, 通过Promise控制自动执行. 这种方便且易于理解的异步编程方式目前已经在node.js中原生支持, Babel等转码工具也早已可以使用. async/await目前已经成为最主流的异步控制方式. 使用async/await方式还有一个好处就是当出现错误时可以直接用try...catch捕捉到, 这是其他异步控制方式无法办到的. 

**大道至简, 看似无异步, 处处是异步**

```js
function aFunctionReturnPromise() {
  return new Promise((resolve, reject) => resolve(''));
}
async function asyncFunc () {
  await aFunctionReturnPromise();
}
```
