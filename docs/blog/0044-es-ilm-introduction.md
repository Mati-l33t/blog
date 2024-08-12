---
title:      "ElasticSearch索引生命周期管理"
date:       2019-06-05
tags:
    - 分布式系统
    - DevOps
---

# ElasticSearch索引生命周期管理

## 缘起

最近笔者在开发分布式项目过程中遇到了小问题，**本地调试的时候搜索日志很不方便**，因为一个HTTP请求经过多个组件，需要在IDEA来回切多个项目，而且本地重启之后IDEA控制台的日志也丢失了，想对比上次运行的结果只能搜索日志文件。那么问题来了，**本地开发是否也可以把日志集中起来，最好还可以全文搜索呢**？

其实测试环境，预上线环境和产线环境，都有一套日志系统，所有组件的日志通过各种途径上传到Kafka最终写入ElasticSearch中，但这套复杂的日志系统是为了应对产线极其恐怖的日志量，在本地部署一整套比较困难，于是笔者想到了一个简单的办法来索引本地日志，Filebeat直接输出到ES，然后在Kibana中搜索和可视化，也就是极简版EFK栈。

其实本地Filebeat直接输出到ElasticSearch的配置是很简单的，只需要三步：
1. 配置input
2. 配置output
3. 启动filebeat

```yaml
# Step1. input 的配置，告诉crawler抓取哪些文件的变化
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - d:\logs\*
  fields:
    # 自定义传给ES的JSON属性，用来区分不同的组件
    component: 'my-project'
  fields_under_root: true
  # 每条日志以时间戳开头，用来匹配多行日志，
  # 防止一个Stacktrace被分成多个Document
  multiline:
     pattern: ^\d{4}-\d{1,2}-\d{1,2}
     negate: true
     match: after
```

```yaml
# Step2. output和template配置
setup.template:
  name: "log"
  # 这个pattern要与output的index配置一致
  pattern: "log-xxx*"
  settings:
    # 本地日志不需要多副本和分片，这样节省一点ES的资源
    index.number_of_shards: 1
    index.number_of_replicas: 0

# ES的地址和访问方式
output.elasticsearch:
  hosts: ["es-host:9200"]
  protocol: "https"
  username: "xxx"
  password: "xxx"
  index: "log-xxx-%{+yyyy.MM.dd}"
  ssl.verification_mode: none
```

但是，启动filebeat之后，神奇的事情发生了，**在ES中生成的索引，并不是我指定的log-xxx,而是filebeat-xxx**，明明配置文件指定的是log-xxx啊！
作为一个喜欢刨(zuan)根(niu)问(jiao)底(jian)的工程狮，无法忍受这个与预期行为不一样的事情发生，于是顺着问题查下去，结果发现了一个新大陆！
这就是今天要介绍的主角**Index Lifecycle Management(ILM)**

## 笃行

在学习实践ILM之前，首先解释一下为什么Filebeat配置的Index Pattern设置失效了。Filebeat下载的是当前最新版本7.1.1，而恰巧开发环境的ElasticSearch最近重新搭建的，也升级到了7.1.0版本。**而ElasticStack从2019年1月29日的6.6.0版本的开始，引入了索引生命周期管理的功能，新版本的Filebeat则默认的配置开启了ILM，导致索引的命名规则被ILM策略控制**。

详见Release Notes：
[https://www.elastic.co/guide/en/elasticsearch/reference/6.6/release-notes-6.6.0.html](https://www.elastic.co/guide/en/elasticsearch/reference/6.6/release-notes-6.6.0.html)


这里有个历史背景，在2018年3月份的时候，Elastic官方宣布开源包含各种ES高级功能的X-Pack，链接参考这里[https://www.elastic.co/products/x-pack/open](https://www.elastic.co/products/x-pack/open)，开源X-Pack之后也提供了Apache-2.0 License的Open Source Software (OSS) 版本，而带有X-Pack的新版本则用[ELASTIC-LICENSE](https://github.com/elastic/elasticsearch/blob/master/licenses/ELASTIC-LICENSE.txt)免费提供，不用升级License也可以享用X-Pack的高级功能。
![](//filecdn.code2life.top/elastic_license.jpg)

找到根本原因之后，先解决掉上面的问题，然后开始实践一下ES的索引生命周期管理这个新功能。
```yaml
# filebeat 配置关闭 ILM 即可解决Index Pattern不生效的问题
setup.ilm.enabled: false

# 如果要开启ILM的话，这里是Filebeat ILM相关配置的文档
# https://www.elastic.co/guide/en/beats/filebeat/current/ilm.html
```

#### 细说索引生命周期管理

ElasticSearch作为一个全文搜索引擎，索引即是灵魂。在海量数据的场景下，管理索引是非常有挑战的事情：
- 增长过快的索引通常需要切分成多个提高搜索效率；
- 时效性强的数据，比如日志和监控数据，需要定期清理或者归档；
- 旧数据通过索引压缩，减少分片节约计算资源；
- 数据冷热分离到SSD和HDD硬盘节约存储成本等等

曾经这些事情需要专业的ES运维，人工处理或者借助Curator这样的开源工具来操作。而现在新版本的ES自带的索引生命周期管理（ILM），是解决这些问题的最佳实践的官方标准。**ILM把索引分成4个阶段，每个阶段能够调整索引的优先级，在达到临界条件后执行相应的Action**：
- **Hot阶段** 热数据，索引优先级可以比较高，增长过快可以**Rollover**
- **Warm阶段** 还有余热的数据，可以合并索引，**减少Shard分片（Shrink）**，设置只读等等，
- **Cold阶段** 冷数据，食之无味弃之可惜，这些数据可能已经很久都不会查询到一次，但是可能哪天还会用到，可以当做归档数据**Freeze**掉了，
- **Delete阶段** 这些数据可能一辈子都不会查询到了，那就快刀斩乱麻，给新数据腾点存储空间吧

这四个阶段，每个阶段都有独特的Action，也有多个阶段都可以使用的Action，比如**Allocate**就可以在Warm和Cold两个阶段使用，用来**灵活的改变分片Shard数量，副本Replicas数量以及存储节点**，比如这个ILM Policy就可以实现数据的冷热分离：

```
# 存储两个副本, 并且转移索引数据到冷数据节点
PUT _ilm/policy/log_data_policy
{
  "policy": {
    "phases": {
      "warm": {
        "actions": {
          "allocate" : {
            "number_of_replicas": 2,
            "require" : {
              "box_type": "cold"
            }
        }
        }
      }
    }
  }
}
```

为什么这个ILM策略可以实现冷热分离呢? 我们知道ES集群**Master节点用来协调调度, Client节点用来处理API请求, Data节点用来索引存储数据**。其中**Data节点**可以配置 **node.attr.box_type**，比如**SSD节点设置这个值为hot，HDD节点设置这个值为cold**，那么对于达到Warm条件的索引数据, 就会转移到HDD节点了，也就实现了冷热分离。关于不同阶段不同Action的策略配置，详见下面的文档链接：

[https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/_actions.html)

#### ILM的简单实践
在学习应用ElasticStack时，看官方文档是个很棒的办法，文档非常详细，此处Mark一下传送门：

[https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)

以及ES索引生命周期管理的文档传送门：

[https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)


我们可以一边参考文档, 一边在**Kibana的Dev Tools**里面编写API请求来试验, Dev Tools堪称神器, 光标移到每一个请求上**Ctrl + Enter**立刻见效:

```bash
# 常用的 _cluster API 6连
GET _cluster/health?pretty

GET _cluster/health?pretty&level=indices

GET _cluster/health?pretty&level=indices&level=shards

GET _cluster/settings

GET _cluster/state

GET _cluster/stats?human&pretty

# 常用的 _cat API 3连
GET _cat/nodes?v

GET _cat/templates?v

GET _cat/indices?v

# 常用的 _node API 3连
GET _nodes?pretty

GET _nodes/stats

GET _nodes/usage
```

刀磨好了，开始砍柴。给索引添加ILM策略有两个方式，一是调用直接Create/Update Index的API设置**单个索引**的生命周期管理策略，二是通过**Index Template**关联ILM策略，这样可以一劳永逸，所有同一个Template的Indices都能被ILM控制。Filebeat MetricBeat等全家桶组件也都是用这种方式的。我们来尝试把现有的一个Index Template设置ILM。

##### 第一步, 创建ILM策略, 比如这样的策略: **每天或者达到50GB轮滚一次, 30天后缩成1个分片,合并索引,并且增加副本, 60天后转移到冷数据节点, 90天后删除**:
```
PUT _ilm/policy/log_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50G"
          }
        }
      },
      "warm": {
        "min_age": "30d",
        "actions": {
          "forcemerge": {
            "max_num_segments": 1
          },
          "shrink": {
            "number_of_shards": 1
          },
          "allocate": {
            "number_of_replicas": 2
          }
        }
      },
      "cold": {
        "min_age": "60d",
        "actions": {
          "allocate": {
            "require": {
              "box_type": "cold"
            }
          }
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

##### 第二步 找到Template, 通过 **GET _template/log-xxx** 查看一下setting, 确认没有 settings.index.lifecycle.name/rollover_alias 这两个属性

##### 第三步 更新这个Index Template, 应用第一步创建的 "log_policy"
```
PUT _template/log-xxx
{
  "index_patterns": ["log-xxx-*"], 
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 1,
    "index.lifecycle.name": "log_policy", 
    "index.lifecycle.rollover_alias": "log-xxx"
  }
}
```

##### 第四步 查看Policy以及Template创建出来的新的索引策略是否应用成功

```
GET _ilm/policy

GET log-xxx-*/_ilm/explain
# managed 为 true 即已经被ILM管理
```

只要几个API就能完成这么复杂的索引生命周期管理!

#### 与Curator对比
Curator是一个Python实现的开源的ES索引管理项目: [https://github.com/elastic/curator](https://github.com/elastic/curator)

在ILM出现之前，Curator可以说是一个ElasticSearch索引管理的必备品，定时创建新的索引，删除、合并、压缩、备份/恢复旧的索引，通过简单的**YAML配置 + Crontab**即可实现。那么有了ILM之后，Curator的定位就比较尴尬了，Curator能做的ILM都能做，而且还更简单。官方文档也给出了最佳实践，翻译概括一下就是：咱的Beats系列和Logstash都能利用ILM的特性，还不赶紧丢掉Curator来用ILM？
[https://www.elastic.co/guide/en/elasticsearch/client/curator/5.7/ilm-or-curator.html](https://www.elastic.co/guide/en/elasticsearch/client/curator/5.7/ilm-or-curator.html)

## 结语

目前业界常见的日志收集技术栈大多是通过不同的媒介，最终**汇集到ElasticSearch中**，大型应用通常会用Kafka作为Broker削峰填谷，防止ES被压垮。这种架构可以也把日志的**处理分析相关组件**如Logstash、流式计算和大数据分析等与日志收集的Fluentd，Fluent bit，Filebeat这些**收集组件解耦**，构建企业级日志系统。

本篇开头配置的最简版EFK栈，通过配置参数的调优，已经足够很大量级的日志写入和索引了。记得曾经看过一篇文章，那篇文章的作者只用Filebeat + ElasticSearch 就实现了**4000 QPS的吞吐**，大约相当于每天TB级的日志数据。而且Filebeat对数据的预处理能力也非常强大，效率比Logstash还高，因此这种**纯EFK的日志架构**未偿不是一个简单可靠的方案。

另外Filebeat原生支持容器日志收集，配置非常简洁，**寥寥几行就可以网罗整个容器集群的日志**，而如今已经非常成熟的Kubernetes、容器化技术对日志方面带来了更大的便利：**业务应用再也无需考虑日志轮滚，日志归档，文件命名**等等琐事，**一股脑输出到标准输出，标准错误即可**，剩下的交给**云原生基础设施**吧。

总的来说，ElasticSearch如今生态已经逐渐丰富起来，发展成了**ElasticStack全家桶**，各大云服务商也都提供开箱即用的ElasticStack云服务，而同样基于Apache Lucene引擎的**Solr**在全文搜索引擎的市场已经无法与ES匹敌，ES不仅是一个全文搜索引擎，其使用场景也非常广泛：日志，监控，大数据分析，数据可视化，机器学习等等。了解ES对于任何一个从业者都是非常有价值的，不仅是使用方法，了解其设计思路和实现原理也大有裨益。
