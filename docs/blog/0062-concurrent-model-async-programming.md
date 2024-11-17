---
title:      "白话并发模型和异步编程范式"
date:       2021-05-31
description: "协程、线程、I/O多路复用、CSP、Actor模型、函数响应式编程、async/await、Generator函数、Node.js单线程、Java无协程"
tags:
    - 软件设计
    - 分布式系统
---

# 白话并发模型和异步编程范式

![](https://filecdn.code2life.top/blog/%2A%2Alangs-influence.png)

在编程领域，**并发**和**异步**这两个概念并没有初学者想象的那么高深，本文将以最普通的白话，拆解这两个概念，读完后下面这一系列问题，或许你就有了答案。

- **协程**是什么？
- **协程**和**线程**的本质区别是啥？
- 哪些编程语言支持协程？**有栈协程**和**无栈协程**有什么区别？
- **CSP模型**是什么意思？
- **Actor模型**是什么意思？
- **I/O多路复用**到底解决了什么问题？
- 线程间**上下文切换**的成本真的很高吗？
- 为什么用**同步原语**进行并发编程常常出BUG？
- 怎么解决**异步回调模式**的可维护性问题？
- **async/await**算协程吗？和Generator函数是什么关系？
- 什么是**函数响应式编程（FRP）**？
- 为什么Node.js要用**单线程**？真的只有一个线程吗？
- 为什么Java到JDK 16还**没有协程**？
- 为什么更优雅的**Actor模型、FRP**没有成为主流？

目录：

- [白话并发模型和异步编程范式](#白话并发模型和异步编程范式)
  - [主流编程语言的并发模型](#主流编程语言的并发模型)
      - [三头六臂：多线程模型](#三头六臂多线程模型)
      - [万剑归宗：I/O多路复用 + 单线程模型](#万剑归宗io多路复用--单线程模型)
      - [千手观音：协程模型](#千手观音协程模型)
      - [多面手: 你有我有全都有](#多面手-你有我有全都有)
  - [异步编程范式](#异步编程范式)
      - [异步回调模式](#异步回调模式)
      - [Callback的蜕变：async/await范式](#callback的蜕变asyncawait范式)
      - [Callback的涅槃：函数响应式编程](#callback的涅槃函数响应式编程)
      - [CSP/Actor模型：一切皆消息](#cspactor模型一切皆消息)
  - [到底哪个范式最好？](#到底哪个范式最好)
      - [理论 vs 现实](#理论-vs-现实)
      - [插曲: 为什么Java至今没有协程](#插曲-为什么java至今没有协程)
      - [结语](#结语)

## 主流编程语言的并发模型

为了方便理解，我们用餐厅打个比方，贯穿整篇文章。

CPU核心，或者说Processor，是**厨师**。

<img src="https://filecdn.code2life.top/blog/%2A%2Acooker.png" width="598" />

Thread是**灶台**。

![](https://filecdn.code2life.top/blog/%2A%2Ameiqizao.png)

**理想情况下，一个厨师一个灶台，厨师一刻不停的炒菜。这种情况餐厅老板是最开心的。**

但是，客人不仅吃炒菜，也喜欢喝鸡汤。**厨师**（Processor）需要在一个灶台**炖汤**（I/O操作）的时候，换到别的灶台（Thread）炒菜，**换灶台**就叫**线程间上下文切换**。

于是，一系列问题就出现了。

我们先从大家熟悉的多线程编程开始讲。

#### 三头六臂：多线程模型

典型代表：Java。

![](https://filecdn.code2life.top/blog/%2A%2Asantouliubi.png)

哦，放错图了。

![](https://filecdn.code2life.top/blog/%2A%2Asantouliubi2.png)

加入客人要100锅鸡汤，最朴素的办法就是放100个灶台，每个灶台炖一锅。厨师需要有**三头六臂**来回奔波，哪个炖了多久、哪个要加调料，都要厨师操心。

这种方案好像除了换灶台费点事，好像也没什么大问题。编程语言实现多线程模型，大多基于操作系统提供的原生线程，再包装一层出来给开发者用。而**封装的线程**和**OS线程**是**一对一**关系，线程调度**完全交给操作系统**就完事了，编程语言的Runtime实现也相对简单。

不过，当生意越来越好，老板雇两个厨师来一起干（多核并行编程），问题就出来了。对于同一锅鸡汤：

- 1号厨师放过盐了，2号厨师不知道又放了一次，客户非常生气；
- 两个厨师都以为对方放了盐，结果都没放盐，客户非常生气；
- 1号厨师和2号厨师正巧准备一起放，两人互相扯皮了半天还没放，所有客户都非常生气。

这叫**竞态条件**（Race Condition）。解决这类问题，需要用到各种**同步原语**：从CPU硬件层面的**CAS指令**；到OS级别的**临界区、信号量、互斥量**；再到编程语言的**原子类型、各种锁、同步栅栏、并发安全的集合**，都是让**内存数据**能被**多核CPU安全地修改**。

除了同步原语，有没有其他办法呢？餐厅的老板很聪明，想到了两种新的方案，下面两节分别介绍。

#### 万剑归宗：I/O多路复用 + 单线程模型

典型代表：JavaScript。

<img src="https://filecdn.code2life.top/blog/%2A%2Awanjianguizong.png" width="598" />

回顾上一节那个餐厅的难题：炖的汤越来越多，**换灶台要时间，灶台太多放不下，厨师多了会打架**。

餐厅老板脑袋一拍：咱就炖个汤还请那么多厨师干嘛？就雇**一个厨师**不就好了吗！什么，厨师忙不过来？雇勤杂工！

厨师放调料要1秒，炖的过程要等1小时。类比计算机世界也类似，不同部件的**执行速度**严重失衡：[CPU计算 >> 主存读写 >> 网络或文件I/O](/blog/0056-performance2)。

- CPU很快：1核CPU在一眨眼的功夫，100毫秒，就可以执行数亿条指令。
- I/O很慢：如果一次主存访问想象成1天的话，一趟局域网数据传输就要13.7年。

老板雇了勤杂工之后，炖鸡的这些锅，全都交给勤杂工一起**批量照看**就好了，**大厨只负责在恰当的时候放调料**。脑补一下关东煮就明白了：

![](https://filecdn.code2life.top/blog/%2A%2Aguandongzhu.png)

我们把每个小格子想象成一个Socket连接，这就叫**I/O多路复用**。

在餐厅里：有一个手持任务队列、名为EventLoop的大厨线程，加上N个任劳任怨的勤杂工线程一起干活。

以Node.js为例，厨师是这样的：

```js
cooker.on("该放调料了", () => {
  console.log("一眨眼功夫就放好啦")
})
```

苦逼的勤杂工们，被关在一个叫“libuv”的小黑屋里，切到内核态进行系统调用，干着类似这样的活：

```c++
// 设置Socket非阻塞
setnonblocking(socket_fd);
ep_fd = epoll_create(max_events);

while (true) {
  // 被困在系统里的“勤杂工”
  epoll_wait(..)
  // 阻塞式读取数据，交给大厨处理
}
```

从这个模型来看，I/O多路复用，本质上是解决了**I/O与计算职责分离**的问题。当**网络I/O**的脏活、累活分离出去了，只要一位大厨，炖百万只鸡不在话下。Node.js、Redis都是这么干的。篇幅原因，只简单说明了网络I/O的案例。定时器、文件I/O等异步任务的实现原理是**不一样**的，和I/O多路复用**无关**。

然鹅，这里有一个巨大的隐患。

如果不仅要做关东煮或者炖鸡（I/O密集型任务），还时常要做炒菜（CPU密集型任务）怎么办？

协程，该出场了。

#### 千手观音：协程模型

典型代表：Erlang / Golang。

<img src="https://filecdn.code2life.top/blog/%2A%2Aqianshouguanyin.png" width="598" />

为了解决**既要炒菜又要炖汤**的问题，聪明的餐厅老板又脑袋一拍，想到一个**万全之策**：
- 多雇几个厨师，但是**每个人只管面前这一个灶台** —— 不需要线程切换，有多少核CPU就建多少OS线程；
- 不用增加灶台，但要购置一大批锅 —— 这些“锅”就是协程（coroutine）；
- 之前雇的勤杂工继续照看炖鸡的锅和关东煮的锅 —— 继续保留 非阻塞I/O + I/O多路复用 的优良传统；
- 再雇一波勤杂工，就叫他们“**换锅侠**”吧，**专门负责看厨师们面前的锅**有没有炒好、放好调料，弄好了就立刻**帮厨师换锅** —— [协程调度](https://golang.org/src/runtime/proc.go)。

协程最核心的特点就是：**不用OS线程的上下文切换，在用户态实现超轻量的执行单元调度**。协程的实现有很多，可以根据**协程之间有无调用栈**分为**有栈协程**和**无栈协程**；也可以根据协程间是否存在从属关系分为**对称协程**和**非对称协程**。

#### 多面手: 你有我有全都有

其实，编程语言的演进过程也是互相“借鉴”的过程，最后的结果就是“你有我有全都有”。其中最典型的“借鉴”就是Generator函数，搭配async/await或yield实现**无栈协程**。

async/await模式我们在下面讲异步编程范式再细谈，是一个兼顾实现成本、迁移成本、性能、可维护性的方案，因此多数主流编程语言都可以看到async/await协程的身影。比如：
- C++(20): co_await/co_return/co_yield
- C#: async/wait, yield
- JavaScript: async/await, yield
- Dart: async/await, yield
- Python：async/await, yield

注：
- 虽然C++ 20在语法层面提供的是无栈协程，C/C++ 生态也有诸多使用汇编或其他方式实现的**有栈协程库**。
- 执行线程是单线程的Node.js，也早已提供了多线程的支持，用于处理CPU密集型任务。

## 异步编程范式

上面一节我们讲了3种并发模型，基于编程语言实现的并发模型，又演化出了多种异步编程范式。下面一节，我们逐个讲解各类异步编程范式，仍然举餐厅的例子，设想一个场景：现在想让厨师做鸡汤给我们喝，需要 startBoil/coolDown/drinkSoap 3个耗时操作。

在讲异步编程范式之前，我们先看同步编程是怎么做的。为了保持简洁，假设都在一个线程执行了，不涉及多线程间共享数据。

```java
new Thread(() -> {
    startBoil();
    coolDown();
    drinkSoap();
}).start();
```

#### 异步回调模式

这三个操作要转换成异步调用模式，最直观的解决方案就是用**回调函数**。什么是回调函数呢？

声明一个函数，把函数指针丢给调度器，这次I/O搞定了就来执行它，这就是一个Callback。

```js
startBoil(function callback() {
    console.log("炖好了，撒点盐")
    coolDown(function callback() {
        console.log("现在可以喝了")
        drinkSoap(function callback() {
          console.log("嗝~~")
        })
  })
})
```

虽然避免了线程间上下文切换的问题，但这样写异步代码，写着写着屏幕就不够宽了。嵌套回调越来越深，变成了回调地狱，下面几节就是常见解法。

- async/await/yield：熨平callback嵌套褶皱；
- 发布订阅模式：把callback丢出去不管了；
- 函数响应式编程：把callback做成烤串；
- CSP模型/Actor模型：回归同步调用，放到有栈的协程/线程。

#### Callback的蜕变：async/await范式

async/await本质上是编程语言对generator/yield的一层语法糖。懂了Generator也就明白了async/await的原理，以及**为什么Generator函数可以熨平回调函数的嵌套褶皱**。

具体的原理分析网上有很多文章，比如这个Node.js的：[async/await 源码实现](https://juejin.cn/post/6844903967298682888)

一句话概况就是：Generator可以看做状态机，遇到yield就进入Pending状态出让执行权，遇到resume/next就继续执行，直到下一个yield。编程语言或者SDK把generator函数包装成 async/await 关键字，就能在看似同步的代码块中异步执行，由于Generator实现的协程是在当前栈顶上继续调用函数，只能模拟携带上下文，并不是真正的保存当前上下文，切换到另一个协程栈，因此是无栈协程。


```js
async () => {
  await startBoil();
  await coolDown();
  await drinkSoap();
}

```

这种看上去像同步的调用，让心智负担大大降低，也是实际工程中权衡利弊的工程中**非常实用**的方案。

不过，async/await存在一个小问题：**关键字传染**。

```js
async () => {
  someArray.forEach(async () => {
    // 只要调用链底存在异步，一条链全部都要带上async关键字
  })
}
```

下次新入职的前端遇到"SyntaxError: await is only valid in async functions"报错的时候，你就可以拍拍她：写**Generator状态机实现的无栈协程**的时候会出现async关键字传染问题，显式告诉V8引擎，即可解决这类问题。

#### Callback的涅槃：函数响应式编程

除了async/await/yield，异步回调地狱还有另一个解法 —— 函数响应式编程（FRP）。


FRP简单的理解可以认为是：

> 函数响应式编程（FRP） ≈ 函数式编程（FP） + 发布订阅模式


在讲FRP之前，我们先复习一下“发布订阅模式”。

```js
// cooker.js
eventBus.on("炖好了", () => {
  eventBus.emit("可以喝了")
})

// eater.js
eventBus.on("可以喝了", () => {
  console.log("嗝~~")
  
  console.log("对了，汤咋做出来的，炖汤之前嘎哈了？")
})
```

发布订阅模式在异步编程中，从另一个维度解决掉了回调地狱问题。让**Event Bus统一管理一大锅Callback**，每个Callback挂了一个onXXXEvent的标签，来了什么异步事件，就让Event Bus统一来调用对应的函数。

既然一个Event Bus就解决了回调地狱问题，为什么还要函数响应式编程呢？

因为事件模式，解开了Callback，会带来**逻辑碎片化**的问题。也就是说，完全靠Event Listener无法写出高内聚的代码。

那有没有办法，把**碎片化**的回调函数整合起来，让代码重新内聚呢？

有的。萝卜加大棒，听说**发布订阅模式**和**函数式编程**更配哦？

函数式编程（FP）是一个自古有之的概念，把一沓纯净的函数声明式地组合起来，理论上就可以实现任何功能。事件驱动的异步回调函数，经过FP的洗礼，变成了Callback烤串，外酥里嫩。

我理解的函数响应式编程：就是通过一系列**操作符**对函数**组合**，实现复杂的**异步事件流的操纵和处理**，异步事件与函数式编程的完美结合。

比如下面是一段用RxJS实现异步事件流处理的代码实例，没有回调地狱，也不需要async/await。

```js
// incoming$ is a stream that flows
MessageBus.incoming$.pipe(
  // delay messages after call pauseDispatcher()
  delayWhen(() => this.pauseWhenUnAvailable()),

  // dispatch input messages, transform input stream to output stream
  mergeMap((input) => this.handleCommand(input)),

  // publish output messages
  mergeMap((output) => this.sendAckIfNeed(output)),

  // record output
  tap((output) => {
    this.logOutput(output);
  })
).subscribe(() => {
  // do something
})
```

脑补一下植物大战僵尸游戏里，biubiubiu的豌豆射手，源源不断的豌豆异步发射出来，经过火炬的Pipeline变成了火豌豆，最终真正起作用是在砸到目标的瞬间，也就是上面subscribe里的逻辑。

![](//filecdn.code2life.top/zombie.png)

FRP范式下经常提到背压控制，我们脑补一下水坝，上游的水流速度时快时慢，但水坝可以缓冲整流，让下游流速非常平缓，在传统编程范式要实现复杂的整流逻辑挺复杂的，而在Rx中实现“水坝”功能，仅仅需要一个操作符。这种操作符组合的黑魔法，尤其适合作为框架层的实现基础。因此，大家熟知的Java界新秀：Vert.x, WebFlux 等框架，前端的Angular/Vue/React框架都有FRP的影子。

#### CSP/Actor模型：一切皆消息

> Do not communicate by sharing memory; instead, share memory by communicating.

上面这句名言，Share Nothing架构，也解释了CSP模型和Actor模型的共性：把编程问题转换为通信问题，不同的执行单元**不共享同一份内存数据**，因此就不需要任何同步原语控制共享数据的访问。

我们先说CSP模型，CSP是上个世纪七十年代提出的，用于描述**两个独立的并发实体**通过**共享的 channel 进行通信**的并发模型。Golang用channel炖鸡汤的代码如下：

```go
package main

import (
  "fmt"
  "time"
)

func main() {
  boiled := make(chan struct{})
  drinkable := make(chan struct{})
  finished := make(chan struct{})

  go func() {
    fmt.Printf("开始炖\n")
    time.Sleep(time.Second)
    fmt.Printf("炖好了\n")
    boiled <- struct{}{}
  }()

  go func() {
    <-boiled
    fmt.Printf("凉一凉\n")
    time.Sleep(time.Second)
    fmt.Printf("凉好啦，可以喝了\n")
    drinkable <- struct{}{}
  }()

  go func() {
    <-drinkable
    fmt.Printf("喝完啦\n")
    finished <- struct{}{}
  }()

  <-finished
}
```

注：Golang虽然部分实现了CSP模型，但语言本身也**允许共享内存数据**，如果不用channel机制，直接多协程更新共享数据，不正确使用**同步原语**也一样会出现并发BUG。

至于常常一起被提到的Actor模型，我们常说Erlang/OTP、Scala-Akka就是典型的Actor模型（虽然Erlang的诞生比Actor模型概念的提出更早，Erlang的作者也不认为Erlang是Actor模型），其主要特点也是在于把**编程问题转换为通信问题**：
- Actor之间**完全不存在共享数据**，创建Actor非常廉价；
- 每个Actor，在Erlang中叫微进程，有自己的执行栈，互相之间**完全隔离**；
- 每个Actor有一个“邮箱”， Actor之间通过收发邮箱通信。

与CSP模型不同的是，**Actor模型**更进一步，**每个独立的并发实体**都有一份自己的“Channel”，在Erlang中叫“具名邮箱”。可以看出，这种抽象非常适合消息相关的领域，比如曾经WhatsApp增长到9亿用户也只有50人维护的聊天服务器、Zoom的聊天服务器、一些著名的分布式消息队列组件，都是用Erlang开发的。

因此，简单的理解Actor模型就是：有栈协程/线程 + 发布订阅模式 + Share-nothing 架构。CSP模型与Actor更细节的原理可以阅读这篇文章：[并发之痛 Thread，Goroutine，Actor](//jolestar.com/parallel-programming-model-thread-goroutine-actor/)

结合对OOP和FRP的理解，我自创了一个词来概括CSP/Actor范式 —— 面向对象响应式编程（OORP）。OORP可以看作是原教旨面向对象编程在异步事件流场景下的特化产物。

## 到底哪个范式最好？

我们从主流编程语言的并发模型出发，了解了几类异步编程范式及其演化历程，学习了5种“喝鸡汤”的姿势。那么，这些并发模型下的异步编程范式，哪个最好？

#### 理论 vs 现实

理论上，上面介绍的4种范式中：函数响应式编程、Sharing noting的Actor模式 似乎是最优雅的解决方案；
实际上，目前世界上大部分代码，都是在用同步编程或Async/Await的假装同步，这两个看似一堆缺点的方案。

**为什么会这样呢？**

其原因我们从FP的发展历程可以看出来。猿界有一支神秘的学院派**函数式编程**的崇拜者，念叨着函子，单子、纯函数、柯里化之类的咒语，膜拜Lisp、Pascal，鄙视新泽西派简陋的C、C++、Golang、蓝领语言Java。从工程师的视角看，FP的确在一些基础库和特定领域解决了非常关键的问题，但很难成为软件系统中的砖头和水泥。

类似的，Actor模型、FRP这类技术或许一直将是小众选型，因为：

- 世界是不确定的：世界充满不确定的变化，无法用完美的模型来表示，打补丁才是常态；
- 人脑带宽有限：当一种知识，学习它的心智成本过高，学习它的人数就会呈**幂律分布**骤减。

现实世界常常是 [Worse is better](https://en.wikipedia.org/wiki/Worse_is_better)。能解决掉实际问题的技术，就会有市场，不管我们是认为它们是好还是坏、优雅还是丑陋，即使是被诟病的回调模式也有应用场景。

#### 插曲: 为什么Java至今没有协程

广泛使用的Java就是线程池、JUC类库撸到底，协程是什么，我不听，我不听。Java官方的协程特性支持（Project Loom）从JDK 14就说要发布了，难产了好几个大版本，至今还没生出来。

那么，为什么Java头这么铁，是道德的沦丧还是人性的扭曲？

其实也不能怪Java，这里有一系列很棒的回答：[为什么Java坚持多线程不选择协程？](https://www.zhihu.com/question/332042250/answer/734115120)，总结一下主要原因有：

- 数据库操作无法协程化，20多年的JDBC标准就是同步的、一个连接一个线程。其他部分花里胡哨的NIO/Reactor也没法根除线程池模式，除非不用JDBC；
- 大部分网络I/O已经被Netty们剥离出去，性能瓶颈问题已经解决大半，JDBC的数据库I/O剥不出去也没太大问题，毕竟大部分数据库自己就处理不了太高并发；
- 同步编程的业务线程池就算切换白耗一点CPU又咋地了，毕竟JVM已经那么吃内存了，Spring全家桶各种AOP、反射的损耗已经那么多了，不在乎再多耗一点；
- 同步编程模式符合直观思维模式，已经深入广大JAVAer的心，Reactor/ReactiveX那一套即使学会了，习惯了传统的Java编程模式的开发者用起来也别扭；
- 历史包袱太沉，核心生态对线程池、ThreadLocal、JDBC这些东西的依赖太强，迁移成本很高，从Project Loom的Virtual Thread的设计也可以看出来；
- 其实[线程上下文切换的开销](https://blog.csdn.net/guangcheng0312q/article/details/110358905)也没有那么恐怖，现代CPU可以做到**约每秒33万次线程切换**，一次耗时**约3μs**，即使相比于Golang的协程切换慢了30倍，这些开销也可以接受。

没有协程的Java活的很好。其实多线程模型下，内存数据共享也不是原罪，关键在于数据共享时，执行上下文**自动**被外部调度器切换了才是BUG之源，于是需要依靠**同步原语**和**头发稀疏程度**来保障不出BUG。

因此，Java的面试总要问成堆的并发、同步栅栏、锁、线程池问题，JavaScript的面试就不会。

#### 结语

哪个语言的并发模型最好、哪种异步编程范式最好，不会存在标准答案。

对于编程语言和范式的选择，也不一定是单选题。实际开发中，我们完全可以混合范式编程，对特定的业务类型应用特定的编程范式，找最优解对付现实问题。

从异步编程范式，归结到面向对象编程与函数式编程，这二者像是**编程领域的的波粒二象性**。**面向对象是粒，函数式是波**：面向对象更关注数据结构，强调信息隐藏、消息传递；而函数式编程更关注行为，由变而生、一切皆函数。

> 不管黑猫白猫，抓到老鼠就是好猫。

