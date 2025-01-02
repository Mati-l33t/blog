---
title:      "哪些Serverless Runtime能够安全执行用户代码（下）"
date:       2025-01-03
tags:
    - 分布式系统
    - Serverless
titleTemplate: "Secure Code Sandbox | Serverless Runtime选型 | 安全代码沙箱"
description: "有哪些代码沙箱方案可以用？是否安全？Sandbox代码沙箱原理是什么？Cloudflare Workerd、Edge Runtime、AWS Lambda有什么优缺点？"
---

# 哪些Serverless Runtime能够安全执行用户代码？（下）

## 有哪些Serverless Runtime可以用？

Serverless已经发展多年了，我们可以从宿主提供的API这个维度，给所有Runtime分个类，鸟瞰Serverless Runtime生态。

**第一类是操作系统沙箱**

基于MicroVM或Container，提供底层OS-level API，隔离粒度是OS内核级别或进程级别。

**第二类是WebAssembly沙箱**

基于WASM Runtime封装，提供WASI/WASIX系统调用或应用开发API，隔离粒度在进程线程级别。

**第三类是基于V8解释器的应用层沙箱**

基于一些动态类型编程语言的Runtime封装，提供可以直接写业务的API，隔离粒度比线程级别还细。主流方案几乎都是基于V8 Engine的Isolate实现的。

随着**宿主运行时 封装层次提高和隔离粒度细化**，相比于Serverful的VM/BareMetal，这几类Serverless方案在**多租户并发**情况下，都产生了效率质变。

| Runtime Type​      | Code Footprint​ | Basline Memory​ | Code-start Time​ | Context Switching​     |
|--------------------|-----------------|-----------------|------------------|------------------------|
| Virtual Machine​   | 1-10 GB​        | 1GB​            | 10s​             | Low​(System Space)​    |
| MicroVM/Container​ | 100MB​          | 100MB​          | 500ms​           | Medium​(System Space)​ |
| WebAssembly​       | 1-10MB​         | &lt;10MB​       | &lt;5ms​         | Extreme​(User Space)​  |
| V8 Isolates​       | &lt;1MB​        | &lt;5MB​        | &lt;5ms​         | Extreme​(User Space)​  |

注：这里讨论的几种Serverless Runtime的技术方向，都属于Serverless中的FaaS - Function as a Service子领域。

广义的Serverless定义还包括BaaS -- Backend as a service。而BaaS一般是用来快速搭建后台或者全栈应用，和低代码平台关联更密切，比如Back4App, Firebase, Supabase。

我们的场景是”给SaaS平台增加自定义逻辑的扩展点“，需求就是FaaS，而不是BaaS，BaaS类Serverless不在讨论范围。

### 操作系统级别的沙箱

传统VM冷启动时间过长，无法满足Serverless的弹性要求，业界一般用MicroVM或Container来实现Serverless runtime

- MicroVM，每个实例有独立OS内核
- Containers，同机器的实例间共享OS内核

MicroVM方向的典型代表，是应用最广泛的AWS Lambda。再加上几大云厂商各自的Serverless产品，垄断了这条路线的大部分市场。

开源方案中，大多是基于Container实现的，比如Knative和Kubeless，但在Serverless大市场来看，是小众方案。这两个方案也可以结合起来用，KataContainer就是以容器做编排，底层CRI换成MicroVM实现。

这类方案中规中矩，但基于现有的**虚拟化和容器化**技术，这条路不可能把多租户调度细到线程以下。也就是说，即使Firecraker这类MicroVM把**Guest OS做到了用户态**，多租户的用户代码调度产生的上下文切换，还是在内核态。

![](https://firecracker-microvm.github.io/img/diagram-desktop@3x.png)

这类方案用在公司内部租户较少风险可控的场景挺不错，但显然不是作为”**SaaS系统的客户自定义扩展点**“这个场景的最优解：

- 做不到用户态调度，资源利用率提不上去；
- 如果不组合使用后面两类Runtime，分发的制品是OS或容器镜像，冷启动效率提不上去；
- OS-level API能力溢出，暴露给外部用户，攻击面不好控制。

在有根本性缺陷的路上走下去一定会限制长期发展，我们首先排除掉MicroVM/Containers，重点关注后面两类**控制粒度更细的Runtime**。

### WebAssembly沙箱

WebAssembly这几年在后端非常热闹，除了字节码联盟(ByteCode Alliance)极力推广，CNCF和一众创业公司也都非常看好。CNCF甚至单开了[一级目录](https://landscape.cncf.io/?group=wasm&view-mode=grid)来汇总Wasm技术生态。

WASM字节码是一个真正中立的、开放的字节码系统，已经是跨越编程语言鸿沟的标准答案。
那么，给WASM加上系统调用，不就能**跨越操作系统鸿沟**了么？

有了系统调用能力，不就可以轻松实现任何功能的Serverless Runtime了吗？

的确，在WASM Serverless生态已经有了不少探索者，其中有两家公司值得持续关注：

- 2021年，Helm, OAM, Krustlet的项目创始人，Matt Butcher离开微软，成立了Fermyon公司，专注开发基于WebAssembly的Serverless平台。
- 2023年5月，Wasmer公司在WASI的基础上提出了[WASIX](https://wasix.org/)，实现了完整的System Interface。

> "第一代云计算是虚拟化、第二代云计算是容器化、第三代云计算是WebAssembly"。
>
> -- Matt Butcher, Fermyon Founder & CEO

> If WASM+WASI existed in 2008, we wouldn't have needed to created Docker. That's how important it is.
> Webassembly on the server is the future of computing. A standardized system interface was the missing link. Let's hope WASI is up to the task!
>
> -- Solomon Hykes, Docker Founder

![](https://filecdn.code2life.top/Serverless%20Runtime%20Inquiry.png)

可见，WASM沙箱介于前两者之间，既是语言无关的通用方案，又能提供从**系统层到应用层的API，还足够轻量**。

主流编程语言都有不少优秀的、成熟的WASM Runtime项目。WASM的繁荣，无意间拍死了相同愿景的Oracle GraalVM，用WASM Runtime做Serverless Runtime，性能接近原生应用，还不会被编程语言和云厂商锁死，看上去非常完美。

但我们知道，**工程是关于Trade-off的**。

**那么，代价是什么**？

首先，WASM运行不同语言的代码时，并没有想象的那么无缝。由于每种语言自己的内存编码方式和WASM不一样，跨语言执行时需要引入Binding胶水层做转换，一些性能会在内存拷贝时损耗掉，另一个问题是，编写这层Binding比较耗时，好在最近有个开源项目 Extism 能够部分解决这个问题。第三个问题，也是对开发者最大的问题，是WASM不容易Debug，C/C++还好，Chrome DevTools可以用，但WASM里面再启动一个其他语言的Runtime支持Python/JS的场景就麻烦了。

其次，编译成WASM和编程语言自己的FFI(Foreign Function Interface)生态是竞争关系，一些应用层的依赖如果用调用了更底层的动态链接库，上层迁移WASM依赖底层库也能编译成WASM。

这些问题导致了WASM生态很不健全，一边是Runtime实现很多（字节码简单直白，Carl也顺手写了一个），另一边是以WASM形态提供的三方库很少。

综上，WASM生态目前的成熟度，不足以支撑复杂业务的规模落地，但未来可期。

### V8 Isolates沙箱

V8 Engine对于Java/Go技术栈的同学听上去可能有些陌生，但它可能是从2008年问世以来，世界上运行次数最多的Runtime。

- 所有Chromium内核的浏览器跑的JS Runtime是V8；
- 所有Node.js/Deno的后端服务和前端工具链也是V8；

根据Datadog 2023年的Serverless调研报告，占据40%以上市场的Node.js也是V8。

![](https://filecdn.code2life.top/serverless-lang-trending.png)

**V8 Isolates**是V8 Engine的关键概念，可以简单理解成浏览器中的Tab。

浏览器Tab和Serverless Runtime有什么关系呢？带着这个问题，我们再审视一下浏览器执行引擎。

浏览器为了**让用户尽可能获得接近原生应用的体验**：

- 优化了代码打包和各种网络环境下的分发性能
- 优化了冷启动时间

浏览器为了支持**打开大量不同网站的Tab的性能**，还要互相完全隔离：

- 优化了计算资源调配和多租户的配额
- 从设计上就保障安全隔离

甚至浏览器为了**兼容各种编程语言**、支持**高性能原生代码执行**，还自带了WASM Runtime！

**我们惊讶的发现，浏览器的执行引擎和一个安全高效的Serverless Runtime的需求，竟然是完全一致的**！

既然浏览器引擎本擎，就满足了Serverless Runtime的需求，那为什么还要AWS Lambda这种MicroVM + Node.js 两层Runtime的蹩脚架构？只用V8 Isolates不就够了吗？

对的，当然可以。

以上观点来自创造了Protobuf Protocol(V2)、Cap'n Protol, Cloudflare Workers的巨佬[Kenton Varda](https://github.com/kentonv)。

Cloudflare Workers是这类Serverless Runtime的典型代表。这类Runtime与业务层关联更紧密，要什么能力就直接调用，没有那么多底层的抽象概念，开发者体验做的很好。

![](https://filecdn.code2life.top/cloudflare-deploy-sc.png)

但是，我们还要回答一个问题，**抛弃了MicroVM/Container这层OS-level Runtime的隔离，还足够安全吗**？

**Kenton作为Cloudflare Workerd Founder，自己用[12页安全模型分析](https://blog.cloudflare.com/mitigating-spectre-and-other-security-threats-the-cloudflare-workers-security-model/)，完美回答了这个问题**。

我们划下重点：

- V8 Isolates自带的机制，结合一些简单的Eviction策略，就能实现资源隔离和高效调度
- 平台主动升级V8，不仅借了Google的顶级安全团队的力量，而且避免了传统Serverless Runtime模式下，厚重的Guest层的漏洞没人管的困境
- 主动对不同用户的代码进行动态监控、分级、分区调度，定时轮换对内存洗牌
- 不暴露POSIX系统调用，尽可能确保代码运行的确定性，有效缓解了幽灵漏洞这类边信道攻击

![](https://filecdn.code2life.top/unique-mitigation-workderd.png)

但深入阅读Cloudflare Workers的[workerd源码](https://github.com/cloudflare/workerd)后，发现Cloudflare Workers也有一些局限性，比如：

- 深度绑定了Cloudflare的其他云产品
- 对TypeScript的支持不够好
- 使用Pyodide支持WASM运行Python解释器仍早期实验阶段。

个人认为真正把V8 Isolates这条路线走到极致的，是一个2023年开源的新项目，[Supabase Edge Runtime](https://github.com/supabase/edge-runtime)。

EdgeRuntime的架构和设计思路完全致敬了Cloudflare Workers，但最大的区别在于：

- Cloudflare Workers基于 Node.js API + C++实现
- EdgeRuntime基于 Deno API + Rust实现

注：基于V8 Isolates的方案，还有一个更早的isolated-vm。比V8 Isolates更轻的方案中，有个有趣的Serverless runtime项目是AWS前不久开源的LLRT，LLRT是一个基于QuickJS的非常轻量的Runtime。但QuickJS其实只是冷启动Quick，对于每个Request创建一个Worker的场景比较合适，如果是池化后长期跑，性能与V8差1-2个数量级。

另一个常见的选项是Goja，压测工具K6就是用Goja实现的大量Virtual User并行执行自定义的压测脚本的。Goja实际使用下来，没有大问题，但对ECMA新标准的支持不足，项目活跃度比较差，也没有内嵌WASM运行时，所以支持不了除了JS以外的语言。

### 总结

我们再从Host和Guest上分别有什么，来总结这几类Serverless Runtime方案的差异。

拿 #1(VM/Containers) 和 #3 (V8 Isolates) 对比，可以发现 VM/Containers是轻Host重Guest的，而Isolates方案是重Host轻Guest的。Guest越轻，攻击面越小，用户也能更聚焦自己的业务，而非Runtime的底层概念。

![](https://filecdn.code2life.top/compare-vm-v8.png)

拿 #2 (WASM )和 #3 (V8 Isolates) 对比，可以发现WASM方案的架构更合理，但复杂度最高。

![](https://filecdn.code2life.top/compare-wasm-v8.png)

最后，一句话总结一下这三条Serverless Runtime技术路线的特点：

- V8-based runtime：把浏览器Tab玩出了艺术
- VM/Container-based runtime: 缝缝补补，小破小立
- WASM-based runtime: 思想超前，大破大立

## 我们该选哪个？

这三种路线该什么选呢？我们回到最开始的目标：”构建SaaS平台自定义扩展点“，展开分析Serverless Runtime / Code Sandbox的需求，看看跟这些技术方案的匹配程度。

| 需求​             | 指标​               | 预期效果​                                        |
|-----------------|-------------------|----------------------------------------------|
| 安全需求：安全沙箱​      | CPU/Mem资源配额能力​    | 能够分别限制CPU I/O等待时间和计算时间 (缓解while true DoS问题)​ |
| ​               | 细粒度的网络访问控制能力​     | Deny All Network Access by default​          |
| ​               | 细粒度的文件系统访问控制能力​   | Deny All FS Access by default​               |
| ​               | 细粒度的宿主函数指针访问控制能力​ | Deny All System Interface by default​        |
| ​               | 处理安全问题的活跃度​       | 对安全问题能在半月内响应。1月内修复​                          |
| 用户需求：工具链与开发体验​  | 调试测试工具成熟度​        | 有单测和Mock工具链​有断点调试工具链​                        |
| ​               | 部署运维工具成熟度​        | 能够一键部署应用/函数，无需配置就有所有关键指标和对应的告警​              |
| ​               | 生态丰富度​            | 能够使用所支持语言自己的标准库和大部分主流的三方库​                   |
| ​               | 多语言支持​            | 至少支持JS/Python两种语言，其他静态类型语言nice-to-have​      |
| 平台需求：稳定性/性能/成本​ | 冷启动性能​            | &lt; 5ms​                                    |
| ​               | 运行时性能​            | 相比于所支持的编程语言原生运行时，性能下降不能超过1个数量级​              |
| ​               | 租户调度的上下文切换效率​     | &lt; 1ms, 尽可能在用户态实现租户切换​                     |
| ​               | 开发和集成的成本​         | Runtime能够支持在不fork项目的情况下，扩展或定制宿主提供的能力API​     |
| ​               | 计算资源成本​           | 运行成本低于﻿AWS Lambda价格的50%​                     |
| ​               | 技术成熟度/采纳度​        | 该Runtime能找到大规模落地案例​                          |
| ​               | 问题排查工具链成熟度​       | 有完善的Troubleshooting工具链和问题排查案例​               |
| ​               | 更换成本​             | 有办法更换迭代底层Runtime的实现，避免云厂商的Vendor-lockin​     |

三种技术路线的主流方案效果对比，**结论是Supabase EdgeRuntime**胜出。

| 指标\Runtime选型​     | Supabase EdgeRuntime​(V8 Isolates)​ | Cloudflare Workerd​(V8 Isolates)​       | Wasmer​(multiple WASM backends)​ | Firecraker​(MicroVM)​ | AWS Lambda​(Hosted MicroVM)​   |
|-------------------|-------------------------------------|-----------------------------------------|----------------------------------|-----------------------|--------------------------------|
| CPU/Mem资源配额能力​    | Good​                               | Perfect (﻿refer this)​                  | Good​                            | Good​                 | Good​                          |
| 细粒度的网络访问控制能力​     | Good​(can disable all net access)​  | Good​(need extent the proxy interface)​ | Good​(disabled by default)​      | N/A​                  | Good​(VPC configurable)​       |
| 细粒度的文件系统访问控制能力​   | Good​(no access by default)​        | Good​(no access by default)​            | Good​(config with wasmer.toml)​  | N/A​                  | Good​(/tmp ephemeral storage)​ |
| 细粒度的宿主函数指针访问控制能力​ | Perfect​(add them in main worker)​  | Perfect​(specify wranger.toml)​         | Perfect​(specify dependency)​    | N/A​                  | N/A​                           |
| 处理安全问题的活跃度​       | Active​                             | Active​                                 | Active​                          | Active​               | Active​                        |
| 调试测试工具成熟度​        | Good​                               | Perfect​                                | Not Good​                        | Good​                 | Good​                          |
| 部署运维工具成熟度​        | Not Good​                           | Not Good​                               | Good​                            | Not Good​             | Good​                          |
| 生态丰富度​            | Good​                               | Good​                                   | Not Good​                        | All Supported​        | All Supported​                 |
| 多语言支持​            | Good (JS/TS/PY)​                    | Good (JS/TS/PY)​                        | Good (Major popular langs)​      | All Supported​        | All Supported​                 |
| 冷启动性能​            | Perfect​                            | Perfect​                                | Perfect​                         | Good​                 | Good​                          |
| 运行时性能​            | Perfect (for TS/JS)​Good (for Py)​  | Perfect (for TS/JS)​Good (for Py)​      | Good​                            | Perfect​              | Perfect​                       |
| 租户调度的上下文切换效率​     | High​                               | High​                                   | High​                            | Medium​               | Medium​                        |
| 开发和集成的成本​         | Cheap​                              | High​                                   | High​                            | High​                 | High​                          |
| 计算资源成本​           | Cheap​                              | Cheap​                                  | Cheap​                           | Expensive​            | Expensive​                     |
| 技术成熟度/采纳度​        | Medium​                             | High​                                   | Low​                             | High​                 | High​                          |
| 问题排查工具链成熟度​       | Medium​                             | High​                                   | Low​                             | Medium​               | High​                          |
| 更换Runtime难度​      | Medium​                             | Medium​                                 | Easy​                            | N/A​                  | N/A​                           |

## 对EdgeRuntime的详细评估

### 源码阅读

```
main.rs → commands.rs → server.rs → worker_ctx.rs →
| → worker_pool.rs → worker.rs → deno_runtime.rs 
|                                 → sb_core/permissions.rs
|                                 → sb_fs/virtual_fs.rs | static_fs.rs
| → supervisor.rs
```

- 启动逻辑大部分在 worker_ctx.rs 中，组装参数，创建pool，worker，supervisor等等；
- 处理请求的逻辑，从server.rs 的 accept_stream() 开始，一层一层把消息传到main worker / user worker 中，完全用channel进行消息传递，没有函数指针传递；
- permissions.rs主要限制网络和deno core中非fs部分的权限 (由于需要细粒度的fs控制，deno core本身不够动态，所以fs的权限在这里放过，专门由sb_fs处理);
- virtual_fs.rs用于 main worker，有完整的FS权限； static_fs.rs 用于 user worker, 啥权限都没有，read_file_sync的逻辑只有根据net access 来判断是否允许加载import依赖的逻辑，非mem fs路径的全部返回path not found, 测试没有办法读到任何路径。

### 渗透测试

对User Worker做了一些渗透测试，发现一个安全问题，给他们提了个Issue。
https://github.com/supabase/edge-runtime/issues/340

### 性能测试

单机启动100个Worker，混合并发请求压测。压测代码如下：

```js
console.log('main function started');

const createWorker = async (servicePath: string) => {
    const noModuleCache = false;
    const importMapPath = null;
    const envVars = [] as [string, string][];
    const forceCreate = false;
    const netAccessDisabled = true;
    const workerTimeoutMs = 60 * 60 * 1000;
    const cpuTimeSoftLimitMs = 2000;
    const cpuTimeHardLimitMs = 3000;
    const memoryLimitMb = 16;

    return await EdgeRuntime.userWorkers.create({
    servicePath,
    memoryLimitMb,
    workerTimeoutMs,
    noModuleCache,
    importMapPath,
    envVars,
    forceCreate,
    netAccessDisabled,
    cpuTimeSoftLimitMs,
    cpuTimeHardLimitMs,
    });
};

const userWorkers = [] as any[]
const userWorkersPromise = [] as Promise<unknown>[]

async function start500UserWorkers() {
    const baseDir = Deno.env.get("HOME") + '/SourceCode/edge-runtime-benchmark'
    for (let i = 0; i < 500; i++) {
        const tempDir = baseDir + `/function_${i}`
        userWorkersPromise.push(createWorker(tempDir).then(worker => userWorkers.push(worker)))
        // await createWorker(tempDir).then(worker => userWorkers.push(worker))
    }
}

start500UserWorkers()

console.time('create 500 workers')
await Promise.all(userWorkersPromise)
console.timeEnd('create 500 workers')

Deno.serve((req: Request) => {
 // request with header: functionId: 0-1999
 const worker = userWorkers[req.headers.get('functionId') as unknown as number]

 if (!worker) {
  return Response.json({ error: true, msg: 'function not exists'}, { status: 400})
 }

 return worker.fetch(req)
});
```

K6测试代码

```js
import http from "k6/http";
import { check } from "k6";

export const options = {
    scenarios: {
        simple: {
            executor: 'constant-vus',
            vus: 100,
            duration: '1m',
        },
    },
};

export default function () {
    const functionIdValue = Math.floor(Math.random() * 500);

    const res = http.get('http://localhost:8989/', {
        headers: {
            'functionId': `${functionIdValue}`
        }
    });

    check(res, {
        'status is 200': r => r.status === 200,
    });
}
```

MacPro M1的测试结果，单机100个Worker的QPS是4784。

```bash
k6 run benchmark-100

          /\      |‾‾| /‾‾/   /‾‾/
     /\  /  \     |  |/  /   /  /
    /  \/    \    |     (   /   ‾‾\
   /          \   |  |\  \ |  (‾)  |
  / __________ \  |__| \__\ \_____/ .io

     execution: local
        script: benchmark-2000.ts
        output: -

     scenarios: (100.00%) 1 scenario, 100 max VUs, 1m30s max duration (incl. graceful stop):
              * simple: 100 looping VUs for 1m0s (gracefulStop: 30s)


     ✓ status is 200

     checks.........................: 100.00% ✓ 287124      ✗ 0
     data_received..................: 46 MB   770 kB/s
     data_sent......................: 28 MB   459 kB/s
     http_req_blocked...............: avg=5.12µs  min=0s     med=1µs     max=13.43ms  p(90)=2µs     p(95)=2µs
     http_req_connecting............: avg=2.68µs  min=0s     med=0s      max=8.36ms   p(90)=0s      p(95)=0s
     http_req_duration..............: avg=20.81ms min=1.48ms med=20.5ms  max=237.88ms p(90)=28.33ms p(95)=32.2ms
       { expected_response:true }...: avg=20.81ms min=1.48ms med=20.5ms  max=237.88ms p(90)=28.33ms p(95)=32.2ms
     http_req_failed................: 0.00%   ✓ 0           ✗ 287124
     http_req_receiving.............: avg=24.9µs  min=4µs    med=13µs    max=36.93ms  p(90)=30µs    p(95)=45µs
     http_req_sending...............: avg=8.13µs  min=1µs    med=5µs     max=27.71ms  p(90)=8µs     p(95)=11µs
     http_req_tls_handshaking.......: avg=0s      min=0s     med=0s      max=0s       p(90)=0s      p(95)=0s
     http_req_waiting...............: avg=20.78ms min=1.44ms med=20.47ms max=237.86ms p(90)=28.29ms p(95)=32.15ms
     http_reqs......................: 287124  4784.152692/s
     iteration_duration.............: avg=20.89ms min=1.89ms med=20.57ms max=248.07ms p(90)=28.41ms p(95)=32.28ms
     iterations.....................: 287124  4784.152692/s
```

## 参考资料

- <https://blog.cloudflare.com/mitigating-spectre-and-other-security-threats-the-cloudflare-workers-security-model/>
- <https://www.youtube.com/watch?v=HK04UxENH10>
- <https://deno.com/blog/roll-your-own-javascript-runtime>
- <https://github.com/fermyon>
- <https://wasmer.io/>
- <https://github.com/firecracker-microvm/firecracker>
- <https://spectreattack.com/spectre.pdf>
- <https://supabase.com/blog/edge-runtime-self-hosted-deno-functions>
- <https://landscape.cncf.io/?group=serverless&view-mode=grid>
- <https://www.datadoghq.com/state-of-serverless/>
- <https://blog.cloudflare.com/workerd-open-source-workers-runtime/>
