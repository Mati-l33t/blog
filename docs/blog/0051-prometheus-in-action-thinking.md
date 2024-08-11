---
title:      "[DevOps] Prometheus监控告警——总结与思考"
date:       2020-02-25
tags:
    - DevOps
---

# {{ $frontmatter.title }}

### 目录
- [Prometheus监控告警——基础篇](/blog/0048-prometheus-in-action-start) 
- [Prometheus监控告警——实战篇](/blog/0049-prometheus-in-action-usage) 
- [Prometheus监控告警——原理篇](/blog/0050-prometheus-in-action-impl) 
- [Prometheus监控告警——总结与思考](/blog/0051-prometheus-in-action-thinking) 


前面三篇从基本概念到具体实践，再到原理分析，我们大致了解了Prometheus监控告警系统以及周边技术。

本篇主要探讨在实践中遇到的3个**发散性问题**：
- ELK也可以做监控，和Prometheus有什么区别？
- Prometheus在多个数据中心怎么部署？
- 监控告警系统有哪些最佳实践？

## Prometheus与ELK方案对比

ELK这个名字不太准确，分布式日志系统通常是基于ElasticSeach，结合Filebeat/Fluentd/Logstash/Kibana等一系列组件一起服用。虽然成本不低，效果也非常明显，除了日志分析、日志流式计算、链路追踪，也可以做**监控告警**。

ElasticSearch的存储和查询能力加上Kibana不输Grafana的可视化能力，做监控毫无压力，Elastic官方也提供了更专业的全家桶方案：Metricbeat + ElasticSearch + Elastic APM + Kibana。这里主要讨论**日志打点**的监控方案和**Prometheus**方案的区别。

ELK栈监控方案有哪些优点呢？
- 对现有系统**侵入小**，比如监控QPS，只需要加一个日志关键字的搜索结果的折线图即可；
- 可以做**更具体也更灵活**的事情来扩展监控，比如可以基于日志记录Tracing信息，做分布式链路追踪，或是聚合分析Json日志的自定义属性；
- 可以结合**流式计算**等大数据处理相关技术，配合机器学习做更高阶的事情比如AIOps，而不仅仅是单纯的监控告警。

凡是有两面，其局限性也很明显：
- 文本数据往往需要额外的数据清洗转换，做全文索引存下来，才可以做复杂的业务监控，ELK栈各组件也都不是省油的灯，**运维成本较高**；
- 没有像Prometheus这样生态完善的Exporters，业务监控绰绰有余，但基础设施监控不够方便；
- 日志的异步处理，使得ELK方案的**实时性**相比时序数据库方案更不稳定；
- Elastic的告警功能得花钱买商业版License，**OSS版本或Basic License没有告警功能**，自己开发有一定的成本。

其实ELK与Prometheus二者并不矛盾，往往是**结合两种方式，在不同层次上用更合适的方案，实现功能互补**，自底向上我们是这样使用的：
- **物理机/虚拟机节点硬件指标** - Prometheus / 云服务自带的方案（CloudWatch等）
- **容器以及容器编排系统** - Prometheus 天生完美支持
- **依赖组件或中间件（数据库、缓存、消息队列等）** - Prometheus / 云服务自带的方案
- **应用服务运行时(Runtime)** - 集成Prometheus的Instrument库，或挂上对应的Exporter比如JMX Exporter
- **能够输出日志的具体业务**  - Prometheus & ELK 并用
- **更加宏观的应用性能管理（APM）时序数据** - Prometheus & ELK 并用

也就是说，越偏向业务层，使用ElasticSeach的日志方案做监控优势越明显。

## 多数据中心的监控告警方案

我们遇到的另一个挑战是数据中心分布在全球各地。因此需要有集中化的监控告警，实现**多级、立体**的监控告警。在**大于两个数据中心的生产环境**中，Prometheus用起来就没有那么方便了：
- 每个DC部署一套：数据分散，没有**整体监控入口**
- 只部署一套收集所有DC的监控数据：可用性相对较低，容易遇到Prometheus HTTP方式收集监控数据导致的**性能瓶颈**
- Federation模式：N+1部署加上数据同步，**相对复杂**而且数据复制到顶层Prometheus的可靠性有待考证（[https://www.robustperception.io/federation-what-is-it-good-for](https://www.robustperception.io/federation-what-is-it-good-for)）
- 使用开源项目[Thanos](https://github.com/thanos-io/thanos)：通过Sidecar延伸Prometheus的能力，使用云服务商或自建的对象存储作为中心化存储方案。Thanos虽然是很优秀的项目，但涉及的组件较多，部署运维也不简单，另外性能受对象存储的影响比较大。
- 其他开源项目，如[VictoriaMetrics](https://github.com/VictoriaMetrics/VictoriaMetrics): VictoriaMetrics和Thanos一样，也是CNCF孵化项目，二者有个对比的文章在这里：[https://medium.com/faun/comparing-thanos-to-victoriametrics-cluster-b193bea1683](https://medium.com/faun/comparing-thanos-to-victoriametrics-cluster-b193bea1683)。VictoriaMetrics的架构非常简单，直接用Prometheus的Remote Write API写入，但部署维护起来组件也不少。

虽然理论上Federation、Thanos、VictoriaMetrics都各有优势，似乎都是不错的选择，但在实践中我们却用了另外一种更加**接地气**的方案，这里分享一下。
- 对于监控：**每个DC一套2实例Prometheus**，不部署顶层Prometheus，但把**Grafana部署在全局，配置N个Prometheus数据源，创建跨DC监控图表选择Mixed数据源即可**；
- 对于告警：**每个DC部署3实例AlertManager，告警规则在统一的Git仓库维护**；
- 由于监控系统化整为零，部署分散开，每个DC的Prometheus可以额外监控其他DC的一些服务，互相巡检。

这套监控方案实践起来效果不错，一方面每个DC独立的Prometheus确保的收集性能，**全局Grafana虽然查询稍慢**但能够统一入口，只是不方便聚合出所有集群的全局视图；另一方面DC内部的AlertManager直接告警，使得告警链路最短，搭配**冗余告警策略**解决告警系统的可用性和自告警问题。

不过也有个缺点：如果业务体量再大一个数量级、或者需要保留更久的历史数据，这套方案也不可行了，因为没有全局的**降频采样**和集中化存储。

期间走了一个弯路：在Grafana上配置告警。Grafana做图表可视化一流，但目前不太适合做告警：
- Grafana的Alert并不支持分布式特性，**因为每个实例都会计算所有告警规则**（[https://grafana.com/docs/tutorials/ha_setup/—](https://grafana.com/docs/tutorials/ha_setup/—)），多实例部署Alert会有问题。
- 违背了尽量**减少链路上可能的故障点**这一原则，多一层Grafana挂了导致收不到告警的风险。
- Grafana缺少对告警的分组，静默，抑制等功能特性，不满足需求。
 
因此告警方面我们最终使用了**集中**在Git维护告警规则，**分散**部署AlertManager的方案。

## 监控告警策略最佳实践

在学习使用过程中，也沉淀了一些"最佳实践"，这里分享出来。

#### 应该关注哪些核心指标

哪些指标应该告警呢？这个问题可以转换成"**哪些指标会影响到用户**？"，最终我们可以提炼出来四个核心指标"**延迟，流量，错误，饱和度**"。

  - **延迟和错误**直接影响了用户，添加告警时尤其要注意延迟中的**长尾效应**；
  - **流量**指标比如PV、UV、QPS、TPS其重要性不言而喻，是商业和技术决策的核心指标，并且与饱和度相关联；
  - **饱和度**可以理解为**当前实际负载占最大承载能力的比例**，一旦超出某个界限可能导致**雪崩效应**。根据历史指标数据**预测承载能力的临界点，能够防患于未然**，比如预警磁盘什么时候将要写满，预测几个月后的用户量是否会让CPU处于高负载等等。

结合上节提到的告警收敛，我们一定要**避免"狼来了"问题，减少虚警**。告警过多 = 0 告警。

#### 预留容量，未雨绸缪

告警规则设置时留出足够的缓冲容量，避免**过饱和**。比如部署两个实例时每个实例峰值CPU不应该超过50%，超过50%就应该告警，否则一旦其中一个在高峰时段挂了，另一个实例是无法承受转移过来的压力的。

#### 分级响应，设置轮值机制

小问题不应该惊动所有人，大问题应当尽早通知到所有相关人员，需要从流程制度上对各种级别的问题做好预案。**明确分工，确保无障碍沟通机制**，这与抗疫的道理是一样的。

#### 先解决问题，后排查问题根源

遇到影响用户的问题首先是解决问题，不管是重启，降级还是主备切换，**应该当机立断采取措施**，而不是保留问题现场找原因。

#### 交叉监控，增强监控的纵深和层级

告警越少越好，上层的监控也越少越好，但底层监控却多多益善。黑盒、白盒监控搭配使用，上层黑盒，底层白盒。

监控指标之间的相关性也是定位根源的利器，举个例子：

传统运维大多**只监控**机器的CPU、内存、网络、磁盘四大件，定位问题的手段就会**有限且低效**。

如果这时发生了一个缓存击穿问题，多一个**业务层的Cache监控**立刻就可以发现问题根因，而不用等到数据库CPU爆掉才发现。

如果再多一层**外部巡检**，立刻就可以推算出事故在哪些区域产生了多大的影响，帮助进一步决策。

#### 监控图表立体化

例如Prometheus Operator的Helm Chart自带的Kubernetes Dashboard做的就非常棒，从顶层整个Cluster到底层Pod的关键指标，能够很容易**下钻查询**到问题所在。

Dashboard应该是**N维数据立方**，而不是一堆**孤零零的二维图表**。监控图表进行**聚合、分组、立体化**，也就是根据关联性对图表建立有机的层级关系、组合关系，这对**快速定位问题根源**是非常关键的。

#### 总结

其实这里有很多道理是学习了《SRE:Google运维解密》之后，在实战中踩了坑才彻底理解的。《SRE》是一本好书，浓缩了Google保障服务可靠性实践经验的精华，之前写过一篇读后感： [/0041-goole-sre-thinking](/blog/0041-goole-sre-thinking)。

总之，对于我们做业务开发的程序猿来说，很重要的一点是**不要划清和运维的界限，你的代码90%以上的时间是在运维阶段而非开发阶段，意识到到做好运维远远不是部署到服务器那么简单，开发-运维闭环互相反馈不断成长，才能构建出抗得住狂风暴雨的系统**。
