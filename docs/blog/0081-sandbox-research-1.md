---
title:      "哪些Serverless Runtime能够安全执行用户代码（上）"
date:       2025-01-03
tags:
    - 分布式系统
    - Serverless
titleTemplate: "Secure Code Sandbox | Serverless Runtime选型 | 安全代码沙箱"
description: "有哪些代码沙箱方案可以用？是否安全？Sandbox代码沙箱原理是什么？Cloudflare Workerd、Edge Runtime、AWS Lambda有什么优缺点？"
---

# 哪些Serverless Runtime能够安全执行用户代码（上）

## 为什么需要安全沙箱

平台型产品，总是会遇到各种各样的高级需求、定制需求，通用设计很难满足所有场景。

因此，平台型产品的归宿，一定是**平台通用功能 + 用户自定义逻辑**的方式来Scale out。

用户在平台上的自定义逻辑，简单需求可以用DSL、Expression Language解决，比如[Google CEL](https://github.com/google/cel-spec)、[AviatorScript](https://github.com/killme2008/aviatorscript)等等。

复杂到无法用DSL或Expression Language描述时，就需要上通用编程语言代码了。

这时，必然需要一个Runtime，来承载和运行用户的非可信代码。

## 有哪些Runtime方案，它们安全吗？

业界有4类常见的运行自定义逻辑的方案：

- Script Engine路线：Java Rhino、GraalVM.js等等
- MicroVM路线：AWS Lambda这类Serverless Runtime
- 容器路线：让用户代码运行在自定义的K8S Pod中
- Custom Sandbox路线：基于Goja、QuickJS等Runtime二次封装

除了第一种路线从设计上不是Secure by default，其他三类都是Secure by default。

但实际上是否真的安全，是一个复杂的问题。比如Script Engine从Runtime Security的角度不安全，但如果在使用这个功能的人上做限制，也能通过纵深防御(Defend in-depth)避免安全问题。

### 为什么第一条路线ScriptEngine不安全？

我们对“执行非可信代码”建立威胁模型，除了业务层的Sproofing, Tampering, Information Disclosure的威胁，Runtime自身的关键风险可以归为两方面问题：
DoS - 本质上是资源滥用
越权和逃逸 - 本质上是让非可信代码，拿到了宿主上的非预期的函数指针

和宿主共享同一个Runtime的Scripted Engine，DoS攻击是几乎没法防范的，写个while true轻松搞死宿主。

第二类逃逸越权威胁，在没有share nothing的设计下，也几乎无法防范，我们举3个语言的例子：

- Java JSR-223 ScriptEngine
- Node.js VM
- Python eval

#### Java - Rhino ScriptEngine 逃逸案例

```java
import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class Main {
    public static void main(String[] args) throws Exception {
        String dynamicCode = "new java.lang.ProcessBuilder[\"(java.lang.String[])\"]([\"env\"]).start()";
        ScriptEngineManager scriptEngineManager = new ScriptEngineManager();
        ScriptEngine scriptEngine = scriptEngineManager.getEngineByExtension(args[0]);
        if (scriptEngine == null) {
            System.out.printf(String.format("no script engine of %s found", args[0]));
        }

        Process process = (Process) scriptEngine.eval(dynamicCode);
        process.waitFor();
        BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
        StringBuilder output = new StringBuilder();
        String line;

        while ((line = reader.readLine()) != null) {
            output.append(line).append(System.lineSeparator());
        }
        System.out.println(output);
    }
}
```

新版本的rhino引入了ClassShutter限制script的Context中对java class的访问，通过ClassShutter能解决吗？

还是不行，对Hacker来说只是多走一步路的问题，任何对象调一下 getClass() 拿到reflection包就全部沦陷了。

因此，一个稍微安全一些的ScriptEngine，至少要禁掉所有可能导致反射和拿到constructor的代码路径

有一篇文章详细讲了[怎么在Rhino上构建安全沙箱](https://codeutopia.net/blog/2009/01/02/sandboxing-rhino-in-java/)，但在不安全的基础上再缝缝补补，也存在很大的隐患。

因此，这些直接在宿主上跑的**非隔离型ScriptEngine**都有这个问题，JSR 223规范下这些常见的包都不能暴露给用户用：

- org.graalvm.js:js
- org.graalvm.js:js-scriptengine
- org.python:jython-standalone
- org.codehaus.groovy:groovy-jsr223
- org.codehaus.groovy:groovy-json

另外，SpringEL也不是Secure by default，默认能访问的类和方法太多了，需要额外配置才能禁用访问。

#### Node.js vm.runInNewContext 逃逸示例

```js
const vm = require("vm")
vm.runInNewContext("this.constructor.constructor('return process')().exit()");
vm.runInNewContext("this.constructor.constructor('return require')()('fs')");
```

#### Python eval 逃逸示例

```python
eval("__builtins__.__dict__['__import__']('os').environ")
```

### MicroVM路线真的安全吗？

AWS Lambda和Fargate背后的runtime，都是一个Rust写的MicroVM - [Firecraker](https://github.com/firecracker-microvm/firecracker)，Firecraker这个项目的技术水平非常高，把创建虚拟机的时间直接干到了Container同一个水平，我们可以简单理解成：

Lambda的安全性 = 虚拟机的安全性 = 给用户创建一台EC2的安全性。

可见，AWS Lambda是一个“既要又要”的产物，既要给用户最大的自定义程度，又要追求极致的安全性。

如果不深入思考，很容易陷入AWS Lambda安全又弹性的营销陷阱。

理性思考一下我们的应用场景 -- “给我们的客户运行代码”：

- 除了发一台物理服务器给客户，VM Level的沙箱已经是最底层的沙箱了
- 最底层的OS沙箱，相当于给了一个完整的Linux内核，暴露了最多的系统调用
- 最多的系统调用意味着：如果不加一层应用层沙箱，用户代码可以做任何事情
- 用户能做任何事情，要么意味着拿你的Lambda资源挖挖矿，造成DoS或者巨额Bills；要么意味着顺藤摸瓜SSRF搞你的服务

用Lambda执行用户代码，一般ScriptEngine这类高层Runtime没法调用的底层CPU指令，在Lambda中用户却可以任意构造，也就是说，**所有的VM逃逸漏洞或幽灵漏洞一旦有EXP，暴露在外面的Lambda，就是黑客免费的试验场**。

Lambda跑的结果，总归要和内部服务交互的，一旦有Lambda的网络和AWS权限(VPC Subnet / AWS IAM) 出问题，或者通信机制有问题，黑客可以摸到整个产线。

这个风险在DataDog的Serverless研究报告中也有描述：[65%的组织把Lambda使用了其他服务同一个VPC](https://www.datadoghq.com/state-of-serverless/#8)而不是没有任何网络权限的隔离VPC。

你说不对啊，我们只要在信任边界上把把关，确保让AWS Lambda可以让Execution IAM Role权限最小化，可以让Lambda运行在独立的VPC设置独立的Security Group啊？

且不说我们公司目前IAM Role和VPC/SecurityGroup管理是多么的手动，**即使全部能自动化，灵活性和管控粒度也太粗了**，总不可能给每个Function搞一套Security Group吧。

至此，可以得出结论：**Lambda对于AWS自己是安全的，如果要基于Lambda再来构建第二层非可信代码执行沙箱，攻击面大，控制粒度粗，并不安全**。

**除非，再做一个资源限额和计费/限流层防DoS + 再做一层应用层Runtime隔离危险操作**。

既然MicroVM路线不结合其他方案，不能保障运行用户代码的安全性，那容器路线更不可能满足安全需求了，相比于VM，容器多出了一个共享OS内核可能导致宿主机级联失败(Cascade Failure)的风险，还要再多做一些**租户分级和风险识别**的事情，结合应用层沙箱和使用限额，才有可能安全的执行用户自定义代码。

### 那么，只剩下Custom Sandbox路线了

开源社区找不到完整的非可信代码执行平台。AWS只开源了Firecraker运行时，Serverless公司大多只开源了SDK和Runtime。

比较可行的方案是：用现存成熟的Runtime，**减去所有OS Level API，加上业务能力层API，再把威胁模型的其他风险处理好**。

我们再结合”托管和执行外部用户非可信代码“的威胁模型，可以得出理想方案的两个基本要求：

1. 在沙盒中只提供充分且必要的能力层，避免能力溢出，导致用户脱离预期的用例，导致DoS风险
2. 宿主与沙盒之间必须是**两种不同的Runtime, share nothing**。必须要定义通信协议而非直接函数调用，才能从根本上解决 宿主运行时的高权限函数指针 暴露给用户的风险，通俗的说，就是要**避免宿主被夺舍**。

带着这个需求不难发现，**Secure CodeSandbox这枚硬币的反面，就是Serverless Runtime**，都是用来执行用户的非可信代码。

因此，我们只要寻找最**适合集成和扩展的Serverless Runtime即可**满足**构建平台型产品扩展点的需求**。

市面上有大量Serverless Runtime项目，可以使用或借鉴，具体分析请看下篇。
