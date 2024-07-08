---
title:      "软件设计杂谈——性能优化的十种手段（下篇）"
date:       2020-08-13
tags:
    - architect
    - performance
---


## 索引

- [软件设计杂谈——性能优化的十种手段（上篇）](/blog/0055-performance)，我们总结了六种**普适**的性能优化方法，包括 **索引、压缩、缓存、预取、削峰填谷、批量处理**，简单讲解了每种技术手段的原理和实际应用；
- [软件设计杂谈——性能优化的十种手段（中篇）](/blog/0056-performance2)，我们简单了解了程序是如何消耗执行时间和内存空间的；
- [软件设计杂谈——性能优化的十种手段（下篇）](/blog/0056-performance3)，再讲另外几类**涉及更多技术细节**的性能优化方向。

本篇也是本系列最硬核的一篇，本人技术水平有限，可能存在疏漏或错误之处，望斧正。仍然选取了《火影忍者》的配图和命名方式帮助理解：

- 八门遁甲 —— 榨干计算资源
- 影分身术 —— 水平扩容
- 奥义 —— 分片术
- 秘术 —— 无锁术

（注：这些“中二”的前缀仅是用《火影》中的一些术语，形象地描述技术方案）

## 八门遁甲 —— 榨干计算资源

![](//filecdn.code2life.top/perf/eight-gate.jpg)

**让硬件资源都在处理真正有用的逻辑计算，而不是做无关的事情或空转**。

从晶体管到集成电路、驱动程序、操作系统、直到高级编程语言的层层抽象，每一层抽象带来的**更强的通用性**、**更高的开发效率**，多是以**损失运行效率**为代价的。但我们可以在用高级编程语言写代码的时候，在**保障可读性、可维护性基础上**用**运行效率更高、更适合运行时环境**的方式去写，**减少额外的性能损耗**《Effective XXX》、《More Effective XXX》、《高性能XXX》这类书籍所传递的知识和思想。

落到技术细节，下面用四个小节来说明如何减少“无用功”、避免空转、榨干硬件。

## 聚焦

减少系统调用与上下文切换，让CPU聚焦。

https://stackoverflow.com/questions/21887797/what-is-the-overhead-of-a-context-switch
https://stackoverflow.com/questions/23599074/system-calls-overhead

less copy, less context switch, less system call
fsync 10-50ms, ssd 100-10000μs (SATA NVME)  
ctx switch : system call -> mode switch,  thread switch: cache change, work set change, full ctx switch (1-30 μs)


大部分互联网应用服务，耗时的部分不是计算，而是I/O。

减少I/O wait， 各司其职，专心干I/O，专心干计算，epoll批量捞任务，（refer: event driven）

//jolestar.com/parallel-programming-model-thread-goroutine-actor/

- 利用DMA减少CPU负担 - 零拷贝 NewI/O Redis SingleThread (even 6.0), Node.js  

避免不必要的调度 - Context Switch

CPU亲和性，让CPU更加聚焦

#### 蜕变

用更高效的数据结构、算法、第三方组件，让程序本身蜕变。

从逻辑短路、Map代替List遍历、减少锁范围、这样的编码技巧，到应用FisherYates、Dijkstra这些经典算法，注意每一行代码细节，量变会发生质变。更何况某个算法就足以让系统性能产生一两个数量级的提升。

#### 适应

因地制宜，适应特定的运行环境

在浏览器中主要是优化方向是I/O、UI渲染引擎、JS执行引擎三个方面。I/O越少越好，能用WebSocket的地方就不用Ajax，能用Ajax的地方就不要刷整个页面；UI渲染方面，减少重排和重绘，比如Vue、React等MVVM框架的虚拟DOM用额外的计算换取最精简的DOM操作；JS执行引擎方面，少用动态性极高的写法，比如eval、随意修改对象或对象原型的属性。前端的优化有个神器：[Light House](https://github.com/GoogleChrome/lighthouse)，在新版本Chrome已经嵌到开发者工具中了，可以一键生成性能优化报告，按照优化建议改就完了。

与浏览器环境颇为相似的Node.js环境，
https://segmentfault.com/a/1190000007621011#articleHeader11

Java

C1 C2 JIT编译器
栈上分配


Linux

- 各种参数优化
- 内存分配和GC策略
- Linux内核参数  Brendan Gregg
内存区块配置（DB，JVM，V8，etc.）

利用语言特性和运行时环境 - 比如写出利于JIT的代码
- 多静态少动态 - 舍弃动态特性的灵活性 - hardcode/if-else，强类型，弱类型语言避免类型转换  AOT/JIT vs 解释器， 汇编，机器码 GraalVM

减少内存的分配和回收，少对列表做增加或删除

对于RAM有限的嵌入式环境，有时候时间不是问题，反而要拿时间换空间，以节约RAM的使用。


#### 运筹

把眼界放宽，跳出程序和运行环境本身，从整体上进行系统性分析最高性价比的优化方案，分析潜在的优化切入点，以及能够调配的资源和技术，运筹帷幄。

其中最简单易行的几个办法，就是花钱，买更好或更多的硬件基础设施，这往往是开发人员容易忽视的，这里提供一些妙招：
- 服务器方面，云服务厂商提供各种类型的实例，每种类型有不同的属性侧重，带宽、CP、磁盘的I/O能力，选适合的而不是更贵的
- 舍弃虚拟机 - Bare Mental，比如神龙服务器
- 用ARM架构CPU的服务器，同等价格可以买到更多的服务器，对于多数可以跨平台运行的服务端系统来说与x86区别并不大，ARM服务器的数据中心也是技术发展趋势使然
- 如果必须用x86系列的服务器，AMD也Intel的性价比更高。

第一点非常重要，软件性能遵循木桶原理，一定要找到瓶颈在哪个硬件资源，把钱花在刀刃上。如果是服务端带宽瓶颈导致的性能问题，升级再多核CPU也是没有用的。我有一次性能优化案例：把一个跑复杂业务的Node.js服务器从AWS的m4类型换成c4类型，内存只有原来的一半，但CPU使用率反而下降了20%，同时价格还比之前更便宜，一石二鸟。

这是因为Node.js主线程的计算任务只有一个CPU核心在干，通过CPU Profile的火焰图，可以定位到该业务的瓶颈在主线程的计算任务上，因此提高单核频率的作用是立竿见影的。而该业务对内存的消耗并不多，套用一些定制v8引擎内存参数的方案，起不了任何作用。

毕竟这样的例子不多，大部分时候还是要多花钱买更高配的服务器的，除了这条花钱能直接解决问题的办法，剩下的办法难度就大了：

- 利用更底层的特性实现功能，比如FFI WebAssembly调用其他语言，Java Agent Instrument，字节码生成（BeanCopier, Json Lib），甚至汇编等等
- 使用硬件提供的更高效的指令
- 各种提升TLB命中率的机制，减少内存的大页表
- 魔改Runtime，Facebook的PHP，阿里腾讯定制的JDK
- 网络设备参数，MTU
- 专用硬件：GPU加速（cuda）、AES硬件卡和高级指令加速加解密过程，比如TLS
- 可编程硬件：地狱级难度，FPGA硬件设备加速特定业务
- NUMA
- 更宏观的调度，VM层面的共享vCPU，K8S集群调度，总体上的优化

#### 小结

有些手段，是凭空换出来更多的空间和时间了吗？天下没有免费的午餐，即使那些看起来空手套白狼的优化技术，也需要额外的人力成本来做，副作用可能就是专家级的发际线吧。还好很多复杂的性能优化技术我也不会，所以我本人发际线还可以。

这一小节总结了一些方向，有些技术细节非常深，这里也无力展开。不过，即使榨干了单机性能，也可能不足以支撑业务，这时候就需要分布式集群出场了，因此后面介绍的3个技术方向，都与**并行化**有关。


## 影分身术 —— 水平扩容

本节的**水平扩容**以及下面一节的**分片**，可以算整体的性能提升而不是单点的性能优化，会因为引入额外组件**反而降低了处理单个请求的性能**。但当业务规模大到一定程度时，再好的单机硬件也无法承受流量的洪峰，就得水平扩容了，毕竟"众人拾柴火焰高"。

在这背后的理论基础是，硅基半导体已经接近物理极限，随着摩尔定律的减弱，阿姆达尔定律的作用显现出来，https://en.wikipedia.org/wiki/Amdahl%27s_law

水平扩容必然引入负载均衡

![](//filecdn.code2life.top/perf/hpa-yml.png)

多副本
水平扩容的前提是无状态
读>>写， 多个读实例副本 （CDN）
自动扩缩容，根据常用的或自定义的metrics，判定扩缩容的条件，或根据CRON
负载均衡策略的选择

原理：并行化

## 奥义 —— 分片术

水平扩容针对无状态组件，分片针对有状态组件。二者原理都是提升并行度，但分片的难度更大。负载均衡也不再是简单的加权轮询了，而是进化成了各个分片的**协调器**

![](//filecdn.code2life.top/perf/sharding.png)

分片 - 百科全书分册
Java1.7的及之前的 ConcurrentHashMap分段锁 https://www.codercto.com/a/57430.html
有状态数据的分片
如何选择Partition/Sharding Key
负载均衡难题
热点数据，增强缓存等级，解决分散的缓存带来的一致性难题
数据冷热分离，SSD - HDD

分开容易合并难

区块链的优化，分区域

## 秘术 —— 无锁术

![](//filecdn.code2life.top/perf/nolock.png)

> Don’t communicate by sharing memory, share memory by communicating

有些业务场景，比如库存业务，按照正常的逻辑去实现，水平扩容带来的提升非常有限，因为需要锁住库存，扣减，再解锁库存。票务系统也类似，为了避免超卖，需要有一把锁禁锢了横向扩展的能力。

不管是单机还是分布式微服务，锁都是制约并行度的一大因素。比如上篇提到的秒杀场景，库存就那么多，系统超卖了可能导致非常大的经济损失，但用分布式锁会导致即使服务扩容了成千上万个实例，最终无数请求仍然阻塞在分布式锁这个串行组件上了，再多水平扩展的实例也无用武之地。

避免竞争Race Condition 是最完美的解决办法。上篇说的应对秒杀场景，预取库存就是减轻竞态条件的例子，虽然取到服务器内存之后仍然有多线程的锁，但锁的粒度更细了，并发度也就提高了。
线程同步锁
分布式锁
数据库锁 update select子句
事务锁
 顺序与乱序
乐观锁/无锁 CAS Java 1.8之后的ConcurrentHashMap
pipeline技术 - CPU流水线 Redis Pipeline 大数据分析 并行计算
原理：并行化

TCP的缓冲区排头阻塞 QUIC HTTP3.0 

## 总结

以ROI的视角看软件开发，初期人力成本的投入，后期的维护成本，计算资源的费用等等，选一个合适的方案而不是一个性能最高的方案。

本篇结合个人经验总结了常见的性能优化手段，这些手段只是冰山一角。在初期就设计实现出一个完美的高性能系统是不可能的，随着软件的迭代和体量的增大，利用压测，各种工具（profiling，vmstat，iostat，netstat），以及监控手段，逐步找到系统的瓶颈，因地制宜地选择优化手段才是正道。

有利必有弊，得到一些必然会失去一些，有一些手段要慎用。Linux性能优化大师Brendan Gregg一再强调的就是：切忌过早优化、过度优化。

持续观测，做80%高投入产出比的优化。

除了这些设计和实现时可能用到的手段，在技术选型时选择高性能的框架和组件也非常重要。

另外，部署基础设施的硬件性能也同样，合适的服务器和网络等基础设施往往会**事半功倍**，比如云服务厂商提供的各种字母开头的instance，网络设备带宽的速度和稳定性，磁盘的I/O能力等等。



多数时候我们应当使用更高性能的方案，但有时候甚至要故意去违背它们。最后，以《Effective Java》第一章的一句话结束本系列吧。

> 首先要学会基本的规则，然后才能知道什么时候可以打破规则。

### 参考
- 《高性能JavaScript》 —— Nicholas C. Zakas
- 《Effective Java》 第三版 —— Joshua Bloch
- //www.brendangregg.com/ —— Brendan Gregg
- https://colin-scott.github.io/personal_website/research/interactive_latency.html
- https://stackoverflow.com/questions/23599074/system-calls-overhead
- https://stackoverflow.com/questions/21887797/what-is-the-overhead-of-a-context-switch
- //jolestar.com/parallel-programming-model-thread-goroutine-actor/
- https://www.codercto.com/a/57430.html
- https://segmentfault.com/a/1190000007621011#articleHeader11