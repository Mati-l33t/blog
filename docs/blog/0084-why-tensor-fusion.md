---
title:      "为什么Tensor Fusion能够颠覆GPU虚拟化"
date:       2022-11-12
tags:
    - AI
---

[[toc]]

## 背景
最近在搞公司的云成本治理，大多数云资源成本控制思路很明确，但贵到离谱的GPU费用，一直是头疼的问题。

十月跟一位好友叙旧，碰巧他正在研究GPU虚拟化，看完他的原型演示，直觉告诉我这是个**颠覆性技术**，甚至有机会创造出**独角兽级别的企业**。

我们一拍即合，业余时间支棱起来，项目名为[Tensor Fusion]([](https://docs.tensor-fusion.ai/)](https://docs.tensor-fusion.ai/))。

随着对GPU虚拟化的研究深入，我整理了一些干货，既回答我们自己**为什么要投身这件事**，也回答用户和投资者**我们的产品价值在哪**。

在展开技术讨论之前，可以先看下原型产品的演示，对Tensor Fusion是什么有个印象，原型产品公开在这里：[https://docs.tensor-fusion.ai/](https://docs.tensor-fusion.ai/)，欢迎试用、反馈。


《TBD video》


**读完这篇文章，下面几个问题你也会有答案。**

+ 为什么需要GPU虚拟化？
+ 实现GPU虚拟化有哪些技术，核心原理分别是什么？
+ 这些GPU虚拟化技术的优缺点是什么？
+ 为什么业界至今没有出现一个完美的GPU虚拟化和池化方案？
+ 凭什么说我们的方案能够颠覆整个领域，哪来的勇气和自信？

## 为什么要虚拟化GPU

在调查公司的GPU成本问题时，我看到每个服务实例独占GPU，虽然每个GPU在业务高峰期使用率能达到70%，但整个GPU集群的综合使用率却从来没有超过20%。

这个例子充分说明了为什么需要GPU虚拟化。如果不做虚拟化，就没法**安全地共享GPU设备**，也就是浪费了**80%的资源，给云厂商多付了400%的钱**！


**用专业语言说，GPU虚拟化作用在于：**

1. 虚拟化是**共享**底层物理资源的手段，可以避免浪费昂贵的GPU资源
2. 虚拟化能够隔离故障、内存地址、控制配额，这是**安全实现多租户的前提**
3. 虚拟化是**弹性扩缩容的基础**，能够在业务高并发时，**减小尾部延迟，提升吞吐量**



IaaS发展这么多年，CPU虚拟化已经近乎完美了，但GPU竟然还在挂载调用物理设备，明显不合常理。

那GPU能虚拟化么？可以，业界有哪些方案，分别存在什么问题呢？

## 四种GPU虚拟化技术

目前业界有四类解决方案，我们按照抽象层次**从低到高**逐个展开：

1. 硬件和驱动层自带的共享机制，**严格意义上不属于虚拟化**
2. 分出虚拟设备实现**半虚拟化**
3. 共置任务调度的**仿虚拟化**
4. 基于计算库API转发的**算力虚拟化**

### 硬件和驱动层的共享机制

GPU硬件和驱动层，一般会自带多用户的隔离和共享机制，每个GPU厂商的做法都不一样。

以NVIDIA为例，自带的共享机制主要有3类：

1. [Multi-instance GPU](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/) (MIG) ，**多实例GPU**。类似切蛋糕，把显卡切成完全隔离的几份。但跟葫芦娃一样，最多只能变出来7个，显存隔离是也GB级起步，也只有2020年的**Ampere架构**之后才支持。
2. [Time-slicing](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html#comparison-time-slicing-and-multi-instance-gpu)，时间片轮转。本质上是显卡默认的多进程共享模式，没有内存隔离，没有故障隔离。NVIDIA在Kubernetes中的实现也很简单粗暴，**假装有多个GPU，背后就是同一个设备**，塞给多个Pod用而已，其实没法限制每个Pod内再启动N个进程抢更多的时间片。Time-slicing就好比聚餐时，大家轮流捞火锅，但谁真要一勺子捞走一锅肉也没办法。
3. [Multi-process Service](https://docs.nvidia.com/deploy/mps/index.html) (MPS), 多进程GPU服务。MPS是Time-slicing的变体，大致原理是GPU自带的调度器见缝插针，让多个任务在有闲置资源时**并行**，而不是Time-slicing的**并发**。在2017年之前，NVIDIA提供了mps-server在软件层调度，2017年之后的Volta架构GPU，引入了Hyper-Q硬件调度，MPS模式同时使用GPU的进程数数也扩大到了48个，显存地址空间隔离也做了，但没有内存OOM保护和故障隔离。MPS机制可以通俗理解成餐厅叫号，只要桌子空出来就能进去。

总结一下，**MIG是空分复用（Space division multiplexing），Time-slicing和MPS是时分复用（Time division multiplexing）**，详细的对比可以参考[这篇文档](https://github.com/rh-aiservices-bu/gpu-partitioning-guide)。

**MIG和Time-slicing/MPS结合，可以实现类似GPU虚拟化的效果，但粒度太粗，无法从根本上提高GPU使用率**，也都不可能做到**显存超卖**，如果用了Time-slicing还会带来**降低可用性、增加延迟**的风险。

在实际应用中，虽然这种方案做不到对GPU的细粒度资源控制，但好在简单易行，搭配上Kubernetes集群自带的池化调度能力，**能满足最基本的业务需求**。

社区有个开源项目[Nebuly NOS](https://nebuly-ai.github.io/nos/dynamic-gpu-partitioning/partitioning-modes-comparison)，基于NVIDIA的MIG+MPS在Kubernetes中**动态切分GPU设备**，比NVIDIA提供的原生Kubernetes方案更自动化、调度效果更好。

### 用虚拟设备实现半虚拟化

#### 虚拟设备是什么？

虚拟I/O设备在IaaS领域发展多年了，这条路算是”原教旨主义GPU虚拟化”。

实现时虚拟设备，为了尽可能避免性能损失，一般不会用纯软件模拟设备做**全虚拟化**，而是采用兼顾性能和安全的**半虚拟化**。

大体思路是：把危险的**设备控制层**隔离在Hypervisor、把**设备的数据和功能层**直通(Passthrough)到虚拟机中。

虚拟设备在技术层面比较复杂，比如用IOMMU隔离内存页表，隔离驱动函数指针等等，这里不再展开。

#### 实现虚拟设备的3种变体
实现GPU虚拟设备有3种变体，VFIO + SR-IOV, GRID vGPU, VirtIO。

1. **VFIO + SR-IOV**。VFIO怎么理解呢？我们把VFIO拆成“VF”和“IO”，VF就是虚拟函数(Virtual Function)，虚机调用VF，设备再映射成PF(Physical Function)。那VF是怎么实现呢，答案就是后面的**SR-IOV**。SR-IOV这是一种PCIe设备虚拟化标准，硬件厂商支持了这种标准，Hypervisor就能按这个标准来管理“设备分身”了，GPU虚拟化用VFIO+SR-IOV的主要是AMD，性能损失在4%以下。
2. **GRID vGPU**。GRID vGPU是NVIDIA独有的商业化虚拟设备方案。NVIDIA很久之前就搞出了GRID vGPU，不仅不开源，还单独收费，License挺贵的，逼的云厂商也得想办法自研NVIDIA显卡的虚拟化。技术细节不展开，大体上是用Mediated Device (mdev)和修改设备驱动，实现了类似VFIO + SR-IOV的效果。毕竟NVIDIA已经世界第一市值了，还遵循什么标准，他自己就是标准。除了NVIDIA, Intel显卡虚拟化技术Intel GVT实现思路类似。
3. **VirtIO**。在SRV标准推广之前，2008年就有了VirtIO框架。实现思路很简单，是给虚拟机注入一个“假的驱动”，Hypervisor再从Host-Guest共享内存中读取I/O请求，转发到宿主上“真的驱动”，最后通过共享内存返回给Guest VM，完成一次设备I/O。VirtIO引入了“驱动前端”和“驱动后端”两个概念，在VM中看到的只是一个可以灵活修改的驱动前端，性能损失比前两者稍高一些，但灵活性强。在GPU虚拟化方面，社区有一个[qCUDA](https://github.com/coldfunction/qCUDA) 玩具级项目用的是VirtIO。

在应用方面，卖GPU虚机的云厂商最需要传统的虚拟设备技术方案，因此各大云厂也自研出各种类似的方案，比如 [阿里云cGPU]([https://www.alibabacloud.com/help/en/egs/what-is-cgpu](https://www.alibabacloud.com/help/en/egs/what-is-cgpu)) 、[华为云xGPU](https://support.huaweicloud.com/intl/en-us/usermanual-hce/hce_xgpu_0002.html)。

#### 为什么虚拟设备不是终解
虚拟设备看起来已经不错了，对**单个GPU设备**的显存控制能到MB级别，算力能控制到1%级别，在OS内核层实现隔离，安全性也有成熟技术的保障。

GPU虚拟化到此为止了吗？

当然没有。

我们只要问一个问题：**用户需要什么？**

用户是要一台带GPU的虚机吗？是GPU上的6912个CUDA core，4200MB VRAM吗？

都不是，我们从**第一性原理**思考。

用户要的是各类神经网络模型的训练/推理，来完成业务目标。所以，要有一种“东西”，帮Ta完成**以每秒万亿浮点数计的张量计算。**

**用户要的，是完成AI计算任务**！



那有没有办法，在有限的GPU资源池中，尽可能**又快、又多、又安全**的完成多个租户提交的计算任务呢？

思考到这个维度，GPU设备本身的虚拟化就不再重要了，**设备提供出来的算力的隔离和共享 -- 算力的虚拟化**，才能从根本上满足用户需求。



再从**业务**角度看，虚拟设备这条路有什么局限性呢？

1. 虚拟设备的**资源配额是固定**的，不能跟随**业务**峰谷自动调整，导致动态调度空间不大，**整体资源利用率还是上不去**
2. 能超卖CUDA Core，但一般没法超卖显存(VRAM)，二者比例失衡，VRAM极有可能成为超卖瓶颈，**业务**调度不上去
3. 物理GPU设备必须挂在宿主机上，还必须要在**业务**运行环境引入设备挂载、设备驱动安装这些复杂的事情
4. 不可能做到跨机多卡共同加速一组计算任务，没办法降低**业务延迟**
5. 过于依赖硬件厂商，没办法构建多个厂商GPU设备混一起的异构集群，**业务**还是很容易被GPU厂商锁定

### 共置任务调度的仿虚拟化 

在虚拟设备的局限性中，第一条最严重：当业务有明显峰谷时，GPU利用率还是上不去。

因此，市面上还有第三类方案，专注于解决GPU利用率问题，这类方案的关键创新在于：**把调度粒度从粗的设备级别，下钻到了细的计算任务级别。**

相当于在设备之上，抽象出了一个“算力中介”，用户只要告诉这个中介自己要算什么，至于用哪些GPU上的哪些StreamMultiprocessor去算，由中介统一调度。也就是说，虚拟化的对象，**从GPU设备，升维成算力**。

就像盖房子去找包工头，包工头可以同时接多个项目，按事情的最优顺序一件一件分给施工队，对于施工队来说，抽象出“包工头”后，整体效率远高于让客户直接雇佣工人。因为，**调度粒度从”工人“变成了“任务”**。

具体怎么实现呢？首先系统允许多个应用并发使用GPU执行计算任务，这些任务叫**共置任务**（Co-location tasks），应用层会调用用户态计算库，比如NVIDIA libcuda和AMD HIP SDK，那么，在这里**横切一刀，截面上加一个限流器**，控制这些共置任务**如何流进物理设备，就能实现精准的资源配额**。

这个截面，通常是用LD_LIBRARY_PATH / LD_PRELOAD两把刀切开的，完全在用户态处理，性能损失极低。
限流器一般用令牌桶算法，桶里剩多少，是异步线程调用nvml库获取的GPU实时监控数据判断的。

![](https://cdn.nlark.com/yuque/0/2024/png/1549834/1730604330524-5daed2c0-775f-4487-8a74-297d037b3068.png?x-oss-process=image%2Fformat%2Cwebp%2Fresize%2Cw_1596%2Climit_0)

调度器上层，再通过Kubernetes Device Plugin暴露算力配置接口给用户，让用户在resources中写上类似"nvidia.com/vgpu: 1%" 的requests/limits，搭配原生的或定制的Kubernetes调度器，实现集群级别的池化算力分配。

这样实现效果很像虚拟设备，但并没有做内存地址隔离和故障隔离，不能算严格意义的虚拟化，我们姑且叫**共置任务调度的仿虚拟化**。

下面是学界和业界比较典型的几个实现：

- **Gaia GPU**：这篇2018年[腾讯和北大一起发的论文](https://ieeexplore.ieee.org/document/8672318)的引用目前有43次，其他近几年类似研究大多是GaiaGPU的后续优化
- **Ark GPU**：引入了负载预测模型提升任务调度效率，并且区分两种不同的QoS作为调度优先级，LC(Latency-Critical)和BE(Best-Effort)
- **KubeShare & Kernel Burst**：引入Kernel burst概念，进一步提升了调度效率，GPU资源配额在单卡上实现了Auto Scale
- **多个云厂商共建的CNCF Sandbox项目 [HAMI](https://github.com/Project-HAMi/HAMi)**：以前叫k8s-vGPU-scheduler，侧重于在业界落地，支持了更多GPU设备厂商，关键的拦截和调度控制代码在[HAMi-core]([https://github.com/Project-HAMi/HAMi-core/blob/main/src/cuda/hook.c](https://github.com/Project-HAMi/HAMi-core/blob/main/src/cuda/hook.c))

还有一个有意思的项目是**HuggingFace [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)**，HuggingFace CEO Clem Delangue在2024年上半年，投了一千万刀建设了免费使用的A100推理集群，降低开发者做AI的门槛，半公益半商业化性质。

从Gradio SDK的源码看，这个项目Hook的是更高层的Pytorch API，而不是底层的NVIDIA Driver API，搭配Gradio SDK中实现的@**space.GPU装饰器**，拦截Python推理函数，让调度器对GPU资源进行配额判断，配额不足就让任务等待，足够就本地8xA100选择GPU执行推理，当函数冷却后，把上下文从GPU中置换出来，放入NVMe盘。

ZeroGPU这种Hook高层API也能做到GPU分时复用和QoS，做起来更简单，但没法细粒度控制每个应用能使用多少VRAM，比如ZeroGPU就允许每个应用最多占据一个完整的A100-40G VRAM。


总结一下，第三类共置任务调度的算力虚拟化方案，已经把**虚拟化的对象做到了算力这一层**，对AI底层计算库加装限流器，再配合Kubernetes自带的池化静态调度，实现了相对灵活的资源控制和多租户共享。

**但这还不够，为什么呢？**

除了上述虚拟设备路线的**问题2/3/4/5没有解决**，从整个GPU池的角度看，还有这几个新问题没有解决：

- 仍然没有脱离GPU设备的桎梏，CPU部分和GPU部分的调度耦合在一起，无法独立扩缩容，也很难做到Scale to Zero
- 拉远视角，看整个GPU集群，虽然借助Kubernetes的分布式调度器部分实现了池化，但没有做主动碎片整理、GPU池本身的扩缩容，运维成本仍然很高
- 这类方案都没有做故障隔离、内存地址隔离，在多个不可信租户共享的场景下不够安全。


**那是否可以沿着这条路，再往后想一层**：如何在**任务级算力调度**的基础上，**最大化多个不可信租户共享GPU的利用率？**

### 基于计算库API远程转发的算力虚拟化
我们回到第一性原理继续思考下去，找根本解。

既然要共享GPU算力，就得想办法把**所有算力集中到一个大池**，**对整池进行细粒度调度。**

就像解决IaaS层的存储效率问题，分布式的NFS/ObjectStorage已经成了事实标准。

NFS把硬盘变成远端存储服务，实现了存算分离架构。以此类推，如果把**GPU变成远端算力服务**，实现**GPU-CPU分离**，就能在独立的GPU节点组中实现**大池算力融合+细粒度调度控制的**架构，**就像把GPU当成NFS用**。

GPU独立池化后的极致状态是，**每个应用都可以用到所有的GPU资源**。这种AI算力融合的架构，也是我们把产品名定为**Tensor Fusion**的原因。

打个比方，就像为什么鸟类用极小的、皮层没有褶皱的大脑，做到了跟哺乳动物同级别的智能？

**鸟类大脑结构 （TBD）**

实现GPU-CPU分离架构后，独立出来一层算力虚拟化，上面提到的问题都能从更高维度彻底解决：

+ **GPU利用率问题。**GPU as service后，造出了一个跟业务解耦的控制面，能够实现复杂的调度策略、资源碎片整理、甚至是业务无感的Scale to Zero、GPU物理池的自动扩缩容。这种对**GPU池使用率极致的整形能力**，能产生GPU利用率提升的质变。
+ **超卖资源短板问题。**GPU-GPU解耦，宿主上的CPU/Memory不再成为GPU超卖瓶颈。最关键的显存不够问题也能轻松解决，因为多了一层算力抽象，很容易实现内存/NVMe找补显存，这些慢一点的“假显存”分配给低QoS的业务使用，接收到推理请求时，在毫秒到亚秒级置换到真显存中，就能打破显存超卖瓶颈。
+ **业务和GPU设备耦合问题。**GPU远程池化后，AI Infra和AI App的关注点分离，允许AI业务跑在没有驱动、没有GPU的CPU机器上，系统只需要自动注入一个KB级别的libcuda stub，就能在不侵入业务的情况下让任意CUDA程序跑起来。而动辄3-6GB的Pytorch/CUDA/CUDA-cudnn镜像，也能瘦身到MB级别。解耦后对业务还有一个惊喜，远程GPU池化架构很容易做到**跨机多卡**的计算加速，降低业务延迟，增加吞吐量。
+ **GPU厂商锁定问题。**当业务不再依赖底层驱动库和CUDA Runtime，就有办法借助类似ZLUDA的技术，构建多个厂商GPU设备混在一起的异构集群，对业务层提供一致的CUDA API。而不用像现在一样，换一种GPU要把整个业务和Pytorch改一遍。
+ **虚拟化的安全问题。**算力虚拟化的实现在远端，业务侧只有一个Stub，那么故障隔离、内存地址隔离都更容易实现，让多个不互信租户共享GPU池。


既然这条路看上去很好，可行性如何呢？其实不管是学术界和工业界，都有过尝试远程+池化路线，先驱是500多次引用的rCUDA论文，另一篇论文是GPULess。大致原理是，通过LD_LIBRARY_PATH或LD_PRELOAD拦截CUDA Runtime库，对CUDA API调用进行网络转发，到有实际GPU设备的服务端创建一个影子线程或进程，重放客户端的CUDA调用。

(TBD arch diagram)


然而，命运的馈赠都暗中标好了价格，这个看上去完美的架构，相比前几种路线只要拦截驱动层API，算力虚拟化路线**要拦截和实现所有的计算库API**，做大量的底层优化来避免网络转发带来的性能影响，**技术难度、工作量都远高于前三种。**


前一代比较知名先驱都达不到大规模商用的成熟度。rCUDA在4年前停止更新了，GPULess只实现了60多个CUDA函数的Stub，走商业化路线BitFusion被VMWare收购后，去年也宣布停止维护了。

前辈们验证了可行性，后浪推前浪，现在仍然有一群极客在这条路上继续探索：

- 趋动科技 Virt AI ，没开源，从产品介绍中推测出可能用的是CUDA API转发方案，在2020/2021年拿到了拿到了$30M融资
- 开源项目 scuda
- TBD 还有两家新公司也刚刚拿到了种子轮，


**这是一条少有人走的路，难，且正确。**

## Tensor Fusion机会在哪里？
从上面的分析可以得出结论，第四种基于计算库API远程转发的算力虚拟化技术，从架构上看是最优解。

那么，既然现在有极个别创业公司在做同一件事，**我们做Tensor Fusion的机会在哪呢？**

我们从市场、产品、团队、技术方面逐个分析。


**市场方面**

+ 市场规模方面，GPU硬件市场611.5亿美元，95%是英伟达，年复合增长率28%，GPU管理的SaaS 哪怕只占硬件市场规模的 1%，也有 6.1亿美元的规模，至少28%的年复合增长率。目前只有极个别AI Infra公司在做GPU management as a service，因此市场前景看是一片蓝海。
+ 目标市场主要是：海外的云厂商、GPU集群的AI SaaS，和国内相对较为成熟的Virt AI错开生态位
+ 市场细分方面，会先从SMB云厂商和AI SaaS开始，GPU... 落地成功后逐步向中大型企业销售，比如HuggingFace，AWS



**产品方面**

我们目前的底气来自于原型产品已经实现了，并且在一家公司落地验证了。

**这家公司经验一个AI动手实验室产品，用户购买后能得到一个ComfyUI环境，部署在CPU机器上，用户可以自定义绘图流，选择不同的AI模型和输入，当用执行AI绘图时，CPU机器上的ComfyUI调远程GPU池进行AI模型推理，10秒不活跃后将显存置换出去，GPU共享给其他用户使用。**

**系统上线后，为这家公司至少降低了AI Lab产品90%成本，顺便解决了云厂商GPU库存不足购买失败问题。**

+ 产品形态上，提供端到端的GPU管理解决方案，专注服务于云厂商、AI PaaS/SaaS
+ 产品战略上，我们不会去自建算力池跟客户抢蛋糕，而是与云厂商/AI SaaS的合作双赢，为他们提供更多的AI Infra产品、技术咨询服务，在长期形成产品壁垒和渠道壁垒。

**团队方面**

+ 两位项目发起人 [https://github.com/code2life](https://github.com/code2life)  [https://github.com/nooodles2023](https://github.com/nooodles2023) 都具备多年的IaaS/PaaS经验，Andy是连续创业者，我是在ZOOM内部的连续创业者，技术底子和产品力都还可以。另一位创始团队成员是 0x5457，是Golang/Kubernetes/TiKV contributor，吸纳融资后，创始团队还会引入几位有强烈创业意愿的技术大咖。
+ 目前团队最大的问题在于，缺少一位海外销售和运营负责人，我正在跟一些海外的有过连续创业经验的前同事沟通，希望尽快找到这位海外的联合创始人。

**技术方面**

+ 凭借团队对CUDA的深入理解和算力虚拟化落地经验，Tensor Fusion实现了内存补显存、launchKernel底层优化、高性能通信协议等等，这些技术壁垒短期不太可能被超越
+ 我们正在开发GPU上下文热迁移 + 分布式算力调度器，JIT主动调度相比于传统的Kubernetes Scheduler Plugin被动的AoT分配资源，调度能力将会产生质变，跟业界现有方案形成代差
+ 基于Kubernetes生态和一些非常有意思的跨界技术，实现了业务0侵入接入、0配置迁移，极大降低了用户的采纳成本

## 总结
本文介绍了GPU虚拟化的背景和目的，展开讲解了学界和业界四种GPU虚拟化技术路线。

通过递进的分析和对比，回答了为什么Tensor Fusion要走计算库API远程转发的算力虚拟化路线，在AI Infra里的这个细分赛道上，Tensor Fusion的机会在哪。

我自己坚信Tensor Fusion的价值，源自对云计算的理解：不管是IaaS/PaaS/SaaS，云的根本价值是**共享**。

在IaaS领域，这种**抽象、隔离、调度来实现资源共享的机制**，就叫**虚拟化**。**虚拟化的本质，或者说共享的本质，是把高边际成本的物理资源，抽象、封装成极低边际成本的逻辑资源，通过对逻辑资源的调度，提升效能。**

**逻辑资源是隔离的，物理资源是共享的。**

逻辑资源的抽象越接近用户需求，物理资源的调度粒度越细致，云的**能效比**就越高，用户就会认为越有价值。

因此，我们坚信Tensor Fusion有机会成为AI Infra领域的新星，助力AI浪潮改变世界。

目前我们也在寻找**能够理解硬核技术创新、具有全球化市场资源的投资机构**，**欢迎有投资意向的大咖垂询。**

## Reference

- Duato, José, et al. "rCUDA: Reducing the number of GPU-based accelerators in high performance clusters." 2010 International Conference on High Performance Computing & Simulation. IEEE, 2010.
- Reaño, Carlos, and Federico Silla. "Redesigning the rCUDA communication layer for a better adaptation to the underlying hardware." Concurrency and Computation: Practice and Experience 33.14 (2021): e5481.
- Tobler, Lukas. Gpuless–serverless gpu functions. Diss. Master’s thesis. ETH, 2022.
- Gu, Jing, et al. "GaiaGPU: Sharing GPUs in container clouds." 2018 IEEE Intl Conf on Parallel & Distributed Processing with Applications, Ubiquitous Computing & Communications, Big Data & Cloud Computing, Social Computing & Networking, Sustainable Computing & Communications (ISPA/IUCC/BDCloud/SocialCom/SustainCom). IEEE, 2018.
- Song, Shengbo, et al. "Gaia scheduler: A kubernetes-based scheduler framework." 2018 IEEE Intl Conf on Parallel & Distributed Processing with Applications, Ubiquitous Computing & Communications, Big Data & Cloud Computing, Social Computing & Networking, Sustainable Computing & Communications (ISPA/IUCC/BDCloud/SocialCom/SustainCom). IEEE, 2018.
- Liu, Zijie, et al. "KubFBS: A fine‐grained and balance‐aware scheduling system for deep learning tasks based on kubernetes." Concurrency and Computation: Practice and Experience 34.11 (2022): e6836.
- Yeh, Ting-An, Hung-Hsin Chen, and Jerry Chou. "KubeShare: A framework to manage GPUs as first-class and shared resources in container cloud." Proceedings of the 29th international symposium on high-performance parallel and distributed computing. 2020.
- Chen, Hung-Hsin, et al. "Gemini: Enabling multi-tenant gpu sharing based on kernel burst estimation." IEEE Transactions on Cloud Computing 11.1 (2021): 854-867.
- Lou, Jie, et al. "ArkGPU: enabling applications’ high-goodput co-location execution on multitasking GPUs." CCF Transactions on High Performance Computing 5.3 (2023): 304-321.
- Hong, Cheol-Ho, Ivor Spence, and Dimitrios S. Nikolopoulos. "GPU virtualization and scheduling methods: A comprehensive survey." ACM Computing Surveys (CSUR) 50.3 (2017): 1-37.
- A Closer Look at VirtIO and GPU Virtualisation | Blog | Linaro. www.linaro.org/blog/a-closer-look-at-virtio-and-gpu-virtualisation
- Brief Introduction of GPU Virtualization | Blog | Aliyun. developer.aliyun.com/article/590916







