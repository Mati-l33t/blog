---
title:      "[分布式专题] 一次Etcd集群宕机引发的思考"
date:       2018-04-12
tags:
    - etcd
    - raft
    - cluster
---

前一段时间学习Kubernetes的过程中接触到Etcd, 它是一个**强一致性**的分布式**键值存储数据库**, 亦可作为**服务发现的存储仓库**, Kubernetes将所有集群的信息存储在Etcd中. 在应用场景和功能特性上与**ZooKeeper**非常类似, 但也有一些区别。笔者前不久在虚拟机中折腾了一个单节点的Kubernetes"集群", 但几次不小心一脚踹掉了电源线导致了整个"集群"断电. **第三次踹掉电源线时, 意外发生了, kubectl命令全部因为请求kube-apiserver超时失败.**

## 定位原因
一开始发现这个问题是虚拟机启动后, 打开Kubernetes的Dashboard无法显示, SSH进去执行kubectl报错:
![err](//filecdn.code2life.top/k8s-timeout-error.png)
然后开始检查各项服务是否正常
```bash
#报错: timeout
kubectl get componentstatus
kubectl cluster-info

systemctl status -l kube-apiserver.service
systemctl status -l kubelet.service
systemctl status -l etcd.service
```
执行到查询etcd服务状态时, 发现服务启动失败了, 一直在自动重启中的状态, 用journalctl命令查询日志
```
journalctl -xe
journalctl -u etcd
```
![err](//filecdn.code2life.top/etcd-fail.png)
问题很明确了, 是因为断电导致Etcd的日志wal文件损坏, 而且Etcd集群节点数量只有1, **损坏数量超过了 (N - 1) / 2**, 所以Etcd集群无法恢复数据, 导致启动失败.

## 刨根问底: CAP定理与一致性算法
>CAP定理：一个分布式系统**不可能**同时满足**一致性(C), 可用性(A)和分区容错性(P)**这三个基本需求, 最多只能同时满足其中的两项.

Etcd与Mongodb这样的分布式存储数据库一样, 选择了**一致性(C)和分区容错性(P)**, 一定程度上牺牲了可用性. 笔者从[这里](https://www.cnblogs.com/xybaby/p/6871764.html)摘录了一张主流数据库选择了CAP中的哪两个的图片:
![cap](//filecdn.code2life.top/cap.png)

#### 从一致性算法说起
>一致性算法需要解决的问题是: 如何在一个可能发生**机器宕机或网络异常**等异常情况的分布式系统中, 快速且正确地在集群内部对某个数据的值达成一致, 并且保证不论发生以上任何异常, 都不会破坏整个系统的**一致性**.  

常见的一致性算法有**Paxos、Raft、PBFT**等. ZooKeeper底层使用**基于Paxos扩展出来的Zab协议**实现一致性, 而本文的主角Etcd底层使用的是**Raft协议**. PBFT(拜占庭容错算法)也是一种共识算法, 主要在可能存在不可信节点的集群中保障一致性, 应用场景在区块链中, 这里不做展开.
- [Paxos算法原理与推导](https://www.cnblogs.com/linbingdong/p/6253479.html)
- [PBFT算法原理](https://www.jianshu.com/p/fb5edf031afd)
- [Raft算法动画演示](//thesecretlivesofdata.com/raft)

#### Raft算法简述
Raft算法的确比Paxos算法要容易理解的多, 算法的核心是一个状态转换机, 任何一个节点的状态为这三种状态之一:  
- **Leader:** 处理所有客户端交互, 日志复制等, 一般一次只有一个Leader, 在出现网络分区时会选举出多个Leader, Leader发现存在别的Leader比自己的任期长就回归Follower
- **Follower:** 接受Leader的消息被动改变自己的状态, 如追加日志, 接受commit等
- **Candidate:** 当Follower在150~300ms内未接受到Leader的Heartbeat时, 会开始Leader选举, 转换为候选节点拉票, 当Candidate拉到半数以上节点的票票后就会成为Leader  
![state](//filecdn.code2life.top/raft-state.png)

在节点的状态转换过程中涉及到这几个概念: **任期(Term)、Leader选举、日志复制**等, 算法的细节较多, 完整的算法详细可参考这篇[斯坦福大学的论文](https://raft.github.io/raft.pdf). Raft算法中关键的几个点如下, 部分摘录自[这篇Blog](//www.cnblogs.com/cchust/p/5634782.html).

**如何进行leader选举**  
- 每个follower节点都有成为leader的想法, 在初始化阶段或leader节点宕机时, 一轮任期的选举开始. 
- follower节点在一个随机的时间片结束后会进入候选状态, 告诉其他节点投自己的票. 
- 每个任期中每个follower只能投一票, 并且会投给第一个接受到的投票请求对应的候选节点.
- 当一个候选节点的票数过半时就成为leader, 新一轮任期正式开始, 同时leader向其他节点发送心跳包(包含日志复制的消息)来确认数据的一致性.

**如何进行日志复制**  
- 客户端发送一个改变数据的请求X,
- Leader将X写入自己的日志中, 并向所有Follower发送日志追加(Append Entries)请求A(X)
- Follower接受A(X), 将X的数据变更写入日志并返回给Leader
- 当不少于(N - 1) / 2 个Follower(加上自己已经过半)响应成功时, Leader发起commit该数据并向所有节点发送commit请求C(X), 同时响应客户端

**如何确保宕机节点恢复后数据的一致性:**  
- leader向follower发送日志时, 会顺带邻近的前一条日志, follwer接收日志时, 会在相同任期号和索引位置找前一条日志, 如果存在且匹配, 则接收日志; 否则拒绝, leader会**减少日志索引位置并进行重试**, 直到某个位置与follower达成一致. 然后follower**删除索引后的所有日志**, 并追加leader发送的日志, 在follower落后太多超过某个阈值时leader会选择直接**发送快照**让follower尽快与最新的数据保持一致, 一旦日志追加成功, 则follower和leader的所有日志就保持一致. 只有在多数派的follower都响应接受到日志后, 表示事务可以提交, 才能返回客户端提交成功. 这是保障数据一致性的关键点, 确保了Follower节点一定与Leader节点的数据完全一致. 这与ZAB协议不同, Raft算法是不允许节点出现数据"空洞"的.

**如何在网络异常导致出现多leader的情况下恢复:**  
- 网络分区可能会导致出现多个leader, 当分区被消除时需要恢复成单个leader. 这时如果任期小的leader达成了多数派, 则说明任期大的节点以前是leader, 拥有最多的日志, 但是**没有达成多数派, 因此它的日志可以被覆盖**. 但该节点会尝试继续投票, 新leader发送日志给该节点, 如果leader发现返回的termT>currentTerm, 且还没有达成多数派, 则重新变为follower, 促使TermId更大的节点成为leader. 但并不保证拥有较大TermId的节点一定会成为leader, 因为leader是优先判断是否达成多数派, 如果**已经达成多数派了, 则继续为leader, 即使是任期较小的leader**.

## 按图索骥: Etcd的原理和架构
#### Etcd的组件结构
Etcd主要分为四个部分:
- **HTTP Server：** 用于处理用户发送的API请求以及其它etcd节点的同步与心跳信息请求. 
- **Store：**用于处理etcd支持的各类功能的事务, 包括数据索引、节点状态变更、监控与反馈、事件处理与执行等等, 是etcd对用户提供的大多数API功能的具体实现. 
- **Raft：**Raft强一致性算法的具体实现, 是Etcd的核心. 
- **WAL：**Write Ahead Log（预写式日志）, 是etcd的数据存储方式. 除了在内存中存有所有数据的状态以及节点的索引以外, etcd就通过WAL进行持久化存储. WAL中, 所有的数据提交前都会事先记录日志. Snapshot是为了防止数据过多而进行的状态快照；Entry表示存储的具体日志内容. 
![arch](//filecdn.code2life.top/etcd-arch.jpg)

通常, 一个用户的请求发送过来, 会经由**HTTP Server转发给Store**进行具体的事务处理(如果是Proxy模式的Etcd节点接受请求会反向代理给Etcd集群的其他节点), 如果涉及到节点的**修改**, 则交给**Raft模块**进行状态的变更、日志的记录, 然后再同步给别的etcd节点以确认数据提交, 最后进行数据的提交, 再次同步. 官网有详细的[参考文档](https://coreos.com/etcd/docs/latest/)

#### 实现集群化
由于Raft算法在做决策时需要多数节点的投票, 所以Etcd一般部署集群推荐**奇数个节点**, 推荐的数量为3、5或者7个节点构成一个集群, 官方推荐数量为5个节点.Etcd集群有三种配置方案, 在[这篇文章](https://blog.csdn.net/u010511236/article/details/52386229)中有详细的描述:
- **静态配置启动:** 通过**initial-cluster**参数配置预先指定的Etcd节点实例
- **Etcd自身服务发现:** 通过**discovery**参数指定用已有的Etcd服务来作为服务注册中心发现服务, 官方提供了一个公用的接口:[https://discovery.etcd.io/new?size=N](https://discovery.etcd.io/new?size=3), 
- **通过DNS进行服务发现:** 通过**discovery-srv**参数以及约定的DNS配置实现   

这是笔者虚拟机中Kubernetes连接的Etcd集群配置, 使用的是静态配置方式, 只配置了一个名为etcd1的节点
```bash
/root/local/bin/etcd --name=etcd1 \
    --cert-file=/etc/etcd/ssl/etcd.pem  \
    --key-file=/etc/etcd/ssl/etcd-key.pem  \
    --peer-cert-file=/etc/etcd/ssl/etcd.pem \
    --peer-key-file=/etc/etcd/ssl/etcd-key.pem \
    --trusted-ca-file=/etc/kubernetes/ssl/ca.pem \
    --peer-trusted-ca-file=/etc/kubernetes/ssl/ca.pem \
    --initial-advertise-peer-urls=https://192.168.113.131:2380 \
    --listen-peer-urls=https://192.168.113.131:2380 \
    --listen-client-urls=https://192.168.113.131:2379,//127.0.0.1:2379 \
    --advertise-client-urls=https://192.168.113.131:2379 \
    --initial-cluster-token=etcd-cluster-0 \
    --initial-cluster=etcd1=https://192.168.113.131:2380 \
    --initial-cluster-state=new \
    --data-dir=/var/lib/etcd
```

## 解决问题
Etcd集群中出现**(N - 1) / 2** 个节点异常或损坏对集群是**没有影响**的, 但在**单节点**的情况下一次断电就可能导致数据无法恢复了. 所以最可靠的办法就是**定期的备份**, 出现灾难性的事件时也能恢复, 具体做法在[这里](https://coreos.com/etcd/docs/latest/op-guide/recovery.html), 通过**etcdctl snapshot save/restore**来备份/恢复快照.  

然而这次的问题比较麻烦, 不仅是单节点的Etcd, 而且没有备份过数据. 经过了以下尝试:
- 删除wal目录中的.broken文件: 再次启动仍然报错(read wal error (walpb: crc mismatch) and cannot be repaired)
- 查看损坏的.wal文件, 发现结尾处写入了很多无意义的字符串和空白. 直接删除文件, 会报错找不到wal文件
- 删除整个wal目录, etcd启动无问题, 但kubernetes内部相关的容器中除了flannel网络, 其他全挂
- 继续通过kubectl命令查询(kubectl describe po kube-dns-566c7c77d8-n8hkf -n kube-system), 发现Pod启动错误
- 继续深入kubectl logs和docker logs查询容器粒度的日志信息, 并未找到有用的错误信息

一番折腾之后感觉已经无力回天, 还有最后两个办法: **通过yml重新设置Kubernetes的Pods, Service, Ingress等; 或者恢复虚拟机快照.** 用了第一个办法简单粗暴的解决了问题, 所有的Pod/Service都正常运行了, 但总感觉还是没有解决源头的问题, 日后还需多加学习啊.   
这是重新部署恢复后的Pod面板监控截图:
![k8s](//filecdn.code2life.top/k8s-dashboard.png)

## 总结
通过一次无意间的断电引发的问题, 可以引申出很多背后原理性的知识. 依葫芦画瓢学会怎么用一项技术没有意义, 怎么在出现问题时通过对**原理和本质**的思考快速定位解决问题才算是到达了掌握的水平. 
![dake](//filecdn.code2life.top/dake.jpg)
最近深感跌入绝望之谷, 送自己一句话吧: **万丈高楼平地起, 勿在浮沙筑高台.**