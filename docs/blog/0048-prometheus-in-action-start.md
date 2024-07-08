---
title:      "[DevOps] Prometheus监控告警——基础篇"
date:       2020-02-28
tags:
    - prometheus
    - alert
    - monitor
---

最近两年做DevOps相关工作时，学了一些Prometheus监控告警系统的知识并规模化实践落地，这个系列分享一些关于Prometheus的技术干货。

## 目录

- [Prometheus监控告警——基础篇](/blog/0048-prometheus-in-action-start) 
- [Prometheus监控告警——实战篇](/blog/0049-prometheus-in-action-usage) 
- [Prometheus监控告警——原理篇](/blog/0050-prometheus-in-action-impl) 
- [Prometheus监控告警——总结与思考](/blog/0051-prometheus-in-action-thinking) 

### What, 什么是Prometheus？

Prometheus是继Kubernetes之后，**第二个从云原生计算基金会（CNCF）毕业的项目**。**Prometheus是Google监控系统BorgMon类似实现的开源版**，整套系统由**监控服务、告警服务、时序数据库等几个部分，及周边生态的各种指标收集器（Exporter）组成**，是在当下主流的**云原生**监控告警系统，Prometheus有这些特性：
- 开箱即用的各种服务发现机制，可以**自动发现监控端点**；
- 专为监控指标数据设计的**高性能时序数据库TSDB**；
- 强大易用的查询语言**PromQL**以及丰富的**聚合函数**；
- 可以配置灵活的告警规则，支持**告警收敛（分组、抑制、静默）、多级路由**等等高级功能；
- **生态完善**，有各种现成的开源Exporter实现，实现自定义的监控指标也非常简单。
  
### Why, 为什么需要Prometheus？

Prometheus和Kubernetes有很多相通之处，**Kubernetes其中一个功能是提供了弹性动态的部署能力**，而**Prometheus则提供了动态的监控能力**。Kubernetes已经成为实事标准，与之相辅相成的Prometheus自然也成为了云原生监控告警的首选项。  

举个例子：Kubernetes集群里新加了X台机器，Y个服务横向扩容了Z个新的实例，此时Prometheus监控系统的配置需要怎么修改？这个问题是多余的，**不需要任何配置修改**！  

Kubernetes集群的扩容可以自动化是因为所有的**资源对象，调度策略**都已经在**标准化的编排文件中声明**了，搭配云服务器的自适应扩缩容以及Kubernetes提供的Horizontal Pod AutoScaler等机制，可以获得**恐怖的弹性能力和运维自动化水平**。这对**传统运维**（手工执行命令，或工具批量执行脚本）是无法想象的冲击和变革。同样，**传统的监控方案如Zabbix**，使用批量执行的脚本在机器中安装agent、agent上传数据给监控服务器这种模式，也会因为无法适应这种**动态性**而逐渐被**淘汰**，而Prometheus这种能支持**动态部署拓扑**的监控系统成为主流。

上一个小节提到的特性都是Prometheus的优点，如果说缺点，比较有争议的两个：
- 通过HTTP拉取监控数据效率不够高；
- 没有任何监控告警之外的功能（用户/角色/权限控制等等）。

第一个HTTP拉监控数据的效率问题对于**绝大多数场景碰不到**；第二个问题可以通过二次开发，或者把Prometheus完全作为后端内部服务只暴露Grafana这样具有更强管理和可视化功能的前/中端服务来解决。综上，Prometheus非常适合构建云原生环境的监控平台。

### How, 如何快速使用Prometheus？

安利完了，下面说一下基本使用。官方的[Getting Started教程](https://prometheus.io/docs/prometheus/latest/getting_started/)是从二进制文件直接运行开始的，我们来稍微云原生一点的方式来入门：用Docker容器化运行。

首先，Prometheus Server和AlertManager两个容器都需要各外挂两个Volume，一个存储持久化数据的目录，另一个是配置文件，最简单的配置如下（示例配置，分别放置在 /opt/prometheus/prometheus.yml, /opt/prometheus/alertmanager.yml 两个路径）。

prometheus.yml
```yaml
global:
  # 默认每隔30秒执行一次表达式判断告警规则
  evaluation_interval: 30s
  # 默认每隔30秒向各个监控端点拉取一次指标数据
  scrape_interval: 30s
rule_files:
# 表达式计算和记录，告警规则等自定义的配置文件
- /etc/prometheus-data/rules/*.yaml
scrape_configs:
  # 最关键的地方，配置1-N个需要监控的端点，这里配置的是最简单的静态规则，直接从配置的地址抓取监控数据
  - job_name: 'prometheus'
    static_configs:
      # 两个监控的端点，9090是Prometheus自己，9100是机器的监控组件Node Exporter
      - targets: ['127.0.0.1:9090', '127.0.0.1:9100']
alerting:
  alert_relabel_configs:
  - action: labeldrop
    regex: prometheus_replica
  # 配置AlertManager的地址，若触发rules中的告警规则，调用AlertManager的接口发送原始告警数据
  alertmanagers:
  - path_prefix: /
    scheme: http
    # AlertManager地址也是用的静态配置，本地的9093端口
    static_configs:
    - targets:
      - 127.0.0.1:9093
```

alertmanager.yml
```yaml
global:
  resolve_timeout: 5m
  # 发送告警的邮箱账号配置
  smtp_from: from@example.com
  smtp_smarthost: smtp.example.com:587
  smtp_auth_username: from@example.com
  smtp_auth_password: your_email_password
  smtp_require_tls: true
route:
  # 告警的路由规则，支持多级路由和收敛功能，具体参数含义后面再讲
  group_by: ['job']
  group_wait: 15s
  group_interval: 5m
  repeat_interval: 12h
  # 默认的告警接收方式
  receiver: webhook
  routes:
  # 匹配到特定条件后，指定使用某种告警接收方式
  - match_re:
      severity: warning|error|critical
    receiver: email
# 告警接收者的配置
receivers:
- name: webhook
  webhook_configs:
  # webhook测试有个神奇的网站，可以打开 https://webhook.site，
  # 将自动生成的临时链接粘到下面，如果触发告警可以在网站上看到
  # 详细的请求内容 （国内访问可能稍微慢一些）
  - url: https://webhook.site/{random-session-id}
- name: email
  email_configs:
  - to: your-email@example.com,op-team@example.com
```

再分别创建PrometheusServer，AlertManager，Grafana的数据目录 /data/prometheus, /data/alertmanager, /data/grafana （这些目录文件的路径与docker run -v参数冒号前的路径一致即可），确保**目录读写权限**没有问题之后，直接docker run启动如下4个容器：

```bash
# Prometheus Server & TSDB
docker run --net host \
 -v /opt/prometheus/:/etc/prometheus:ro \
 -v /data/prometheus:/etc/prometheus-data \
 --name prometheus --restart always -d prom/prometheus \
 --config.file=/etc/prometheus/prometheus.yml \
 --storage.tsdb.path=/etc/prometheus-data \
 --storage.tsdb.retention.time=30d --web.enable-lifecycle \
 --storage.tsdb.no-lockfile --web.route-prefix=/

# AlertManager
docker run --net host \
 -v /opt/alertmanager/:/etc/alertmanager/config:ro \
 -v /data/alertmanager:/etc/alertmanager \
 --name alert --restart always -d prom/alertmanager \
 --config.file=/etc/alertmanager/config/alertmanager.yml \
 --storage.path=/etc/alertmanager \
 --data.retention=168h --web.listen-address=:9093 --web.route-prefix=/

# Node Exporter
docker run --name node-exporter --restart always --net host -d prom/node-exporter

# Grafana  （-e设置第一次启动的admin初始密码的环境变量）
docker run -d --restart always --net host --name=grafana -e "GF_SECURITY_ADMIN_PASSWORD=your-admin-password" -v /data/grafana:/var/lib/grafana grafana/grafana

# 稍等片刻， 执行 docker ps 看下是否都成功启动了
# 如果失败使用 docker logs alert / docker logs prometheus 查看日志
# 如有写权限问题执行 chmod/chown 命令更改数据目录的写权限
```

注：这里使用**Host Network容器并不是一个好的实践**，只是方便入门，**屏蔽了容器网络互通的复杂技术细节**。一般直接跑Docker容器也比较少见，后面的文章会陆续讲解如何用Prometheus Operator在Kubernetes集群中搭建**生产环境级别**的监控告警系统，以及如何实现**高可用架构**。

运行成功之后，在localhost的**9090端口是Prometheus Server，9093端口是AlertManager，9100端口是Node Exporter，3000端口是Grafana**。浏览器打开即可自行探索。打开 //127.0.0.1:9090，默认的/graph就是监控指标数据的查询界面，在Status下有一些Prometheus的服务器信息，比如 /targets 可以看到已经在监控的两个端点，如下图。

![](//filecdn.code2life.top/prom-targets.png)

再打开 //127.0.0.1:3000 登录到Grafana中（第一次需要修改初始密码），在左侧选取**Configuration->Data Sources->Add DataSource->Prometheus**添加本地的Prometheus数据源。

![](//filecdn.code2life.top/grafana.png)

最后在左侧点Dashboards->Manage->Import**，导入ID为**1860**的Node Exporter Dashboard （也可以到Grafana Labs上搜索其他的Dashboard），即可看到上百项主机监控图表了。

![](//filecdn.code2life.top/grafana-ne.png)

### Prometheus的核心数据流

经过上面的部署运行，我们对Prometheus的几个关键组件：**Prometheus (TSDB + Server)，AlertManager，Exporters**，以及周边组件**Grafana**，有了直观的认知。那么，这些数据是怎么来的呢？又是如何被处理和存储的呢？如果触发告警，告警是如何发送呢？

简化的数据流大概是这样的：
- Prometheus Server启动后读取配置，解析服务发现规则（xxx_sd_configs）**自动收集需要监控的端点**，而上述例子中的**静态监控端点**（static_configs）是最基础的写死的形式，而在Kubernetes中大多使用 [kubernetes_sd_config](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)。
- Prometheus Server **周期"刮取"**（scrape_interval）监控端点的HTTP接口数据。
- Prometheus Server HTTP请求到达Node Exporter，Exporters返回一个文本响应，每个非注释行包含一条完整的时序数据：**监控名称 + 一组标签键值对 + 样本数据**。例如：node_cpu_seconds_total{cpu="0",mode="idle"} 3320.88。
- Prometheus Server收到响应，Relabel处理之后（relabel_configs），存储到TSDB文件中，根据Label建立**倒排索引**（Inverted Index）。
- Prometheus Server 另一个**周期计算**任务（周期是 evaluation_interval）开始执行，根据配置的Rules的表达式逐个计算，若**结果超过阈值并持续时长超过临界点，发送Alert到AlertManager**，下面会说Rule具体是什么样子的。
- AlertManager 收到原始告警请求，根据**配置的策略决定是否需要触发**告警，如需告警则根据配置的**路由链路依次发送告警**，比如邮件，企业微信，Slack，PagerDuty，通用的WebHook等等。
- 当通过界面或来自其他系统（比如Grafana）的HTTP调用**查询时序数据**时，传入一个**PromQL表达式**，Prometheus Server处理过滤完之后，返回三种类型的数据：**瞬时向量** ，**区间向量** ，或**标量数据** （还有一个字符串类型，但目前没有用）。

对于这些数据类型的概念，具体解释如下：
- **样本数据（Sample）**：是一个**浮点数**和一个**时间戳**构成的时序数据基本单位；
- **瞬时向量（Instant Vector）**：某一时刻, 0-N条只有一个Sample的时序数据，直接查询某个指标的当前值，或用offset查询之前某个时间点的指标值，就是瞬时向量，比如：查询3分钟之前那个时间点，每个硬盘挂载点的可用空间， node_filesystem_avail_bytes offset 3m，3个挂载点则返回3条数据；
- **区间向量（Range Vector）**：一段时间范围内，0-N条包含M个不同时刻Sample的时序数据，比如：查询最近3分钟内，每隔30s取样的所有硬盘可用空间，node_filesystem_avail_bytes[3m]，3个盘则返回3×6=18条数据；
- **标量数据（Scalar）**： 一个浮点数，可能是计算出来的单一结果，或是一个单纯的常量，不带任何指标或标签信息。

下图是一个典型的区间向量的查询结果（node_cpu_seconds_total{mode="iowait"}[2m] 当前2分钟内CPU处于iowait的耗时），可见每一行的Value都有4个值，也就是2分钟抓取到的4个该指标样本数据。

![](//filecdn.code2life.top/range-vector.png)

整个流程的具体细节后面讲原理的时候再深入。其中**最关键**的点在于：**Prometheus是主动发现需要监控的Endpoints，然后主动轮询拉取监控数据，Pull模型代替了传统的Push模型**。这种**颠覆性**的设计，让**中心化的Prometheus Server集中配置如何去发现需要监控的东西**，相对于传统agent上传的模式更具有灵活性和动态扩展能力。

注：虽然Prometheus的组件还有一个**Push Gateway**，用来让传统的Agent上传数据，但最终也是**收集并转换成HTTP端点**让Prometheus刮取，Push Gateway常用于监控Job类的组件或衔接遗留系统，本系列不作展开。

### PromQL语法简介及示例

在上面运行的Prometheus Server的Web页面中，直接输入指标名称就可以得到一条指标的瞬时向量，但我们实际上经常要查询复杂的聚合数据，要怎么写查询语句呢？

这时就该PromQL上场了，相比于类似SQL语法的InfluxDB的查询语言，PromQL更加简单易用，直接输入指标名称就是PromQL最基础的写法。除了看Prometheus的文档： [https://prometheus.io/docs/prometheus/latest/querying/basics/](https://prometheus.io/docs/prometheus/latest/querying/basics/)，学习PromQL还有个办法，就是直接在Grafana中看那些开源的Dashboard是怎么写的。

因为一些PromQL的函数只能应用在特定的指标类型上的，在讲PromQL之前我们先了解一下Prometheus的**指标有哪些类型**。Prometheus提供了[4种数据类型](https://prometheus.io/docs/concepts/metric_types/)：**Counter Gauge Summary Histogram**，指标类型在指标数据上方的注释中（#TYPE）。
- **Counter**用来表示递增的指标，可以reset归零，比如： process_cpu_seconds_total 47.82
- **Gauge**用来表示可增可减的指标，比如：go_goroutines 31
- **Summary和Histogram**用来更加精确的分位统计，都包含一个采样点的数量(count)和总值(sum)，区别在于Summary是客户端计算好固定分位的值，而Histogram柱状图只对每个桶做计数，需要Prometheus Server计算分位值。这两种数据类型不太容易理解，详细解释参考这篇文章：[https://blog.csdn.net/wtan825/article/details/94616813](https://blog.csdn.net/wtan825/article/details/94616813)。

下面我们就从Grafana Dashboard中举几个常见的例子来说明PromQL的用法。

**基础题：如何计算磁盘已用空间所占百分比**？

```
100 - (
  (node_filesystem_avail_bytes{instance="$node",device!~'rootfs'} * 100) / 
  node_filesystem_size_bytes{instance="$node",device!~'rootfs'}
)
```


**解析**：node_filesystem_avail_bytes和node_filesystem_size_bytes是Node Exporter的两个指标，"{}"中是按label查询的具体条件（$node是Grafana中的变量，会在调用查询时替换成真正的值），分别是磁盘可用空间和总空间，二者相除后乘100%，再拿100%减去该值，就是已用空间的比例。

**简单题：如何计算CPU在用户态运行所占百分比**？

```
sum by (instance)
  (irate(node_cpu_seconds_total{mode="user",instance="$node",job="$job"}[2m])) * 100
```

**解析**： irate是常用的算区间向量变化速率的函数，因此irate括号中的指标加上"[2m]"表示从2分钟内的区间向量取样计算。但机器有很多核心，因此再加一个sum聚合函数，把每个instance的N个核心加到一起，类似于SQL的"select sum(xx) from ... group by instance"。sum是个使用频率很高的聚合操作，其他的[聚合操作函数](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)还有count min max avg topk bottomk group stddev等等。"by (some_label)" 放在前面和后面都可以，与"by"相反的有个"without"可以对labels集合取差集，比如这个例子也可以写成sum without (cpu,mode)。 

注：
- 这里的百分比不是严格意义的百分数，而是与linux的top命令一致的，总量是核数x100%，也就是说 8核CPU就是800%。
- **irate、rate、increase、deriv、delta、idelta**函数的区别：irate是对区间向量**最后两个样本**求斜率，rate是区间向量**首尾两个样本**求斜率，increase只算了Counter类型区间向量首尾相比增长量有多少而不除时间，deriv是最小二乘法拟合的线性回归斜率，delta作用于Gauge类型的指标算区间首尾差值，idelta算Gauge区间向量最后两个样本的差值。根据这些原理的差别在不同场景选用不同的函数，比如irate适用于像CPU占用时间这类**易突变**的Counter,rate适用于变化**相对缓慢**的Counter。

**普通题： Nginx Ingress每个后端服务的P99请求延迟**？

```
histogram_quantile(0.99, 
  sum(
    rate(nginx_ingress_controller_request_duration_seconds_bucket{ingress=~"$ingress"}[2m])) 
  by (le, ingress)
)
```

**解析**：这是Kubernetes中Nginx Ingress Dashboard中的例子，HTTP的响应延时被分到不同的bucket中分别计总响应时间，le就是区间的分割label，也是柱状图计算函数必要的label，调用histogram_quantile传入0.99表示计算前99%的HTTP请求的响应时间。

**进阶题： 预测硬盘在多少天之后存储空间会使用到95%**?

```
(node_filesystem_avail_bytes / node_filesystem_size_bytes - 0.05) / 
(
  ((predict_linear(node_filesystem_avail_bytes[6h], 3600*24) -
   node_filesystem_avail_bytes)) / node_filesystem_avail_bytes
)
```

**解析**：**predict_linear**函数通过线性回归模型预测某个指标在一段时间之后的值，因此我们计算一天内存储增长了百分之多少，再拿当前可用的空间百分比与95%的差值来做除数，就可以算出存储达到95%需要的天数了，这种预测对于数据库这类存储空间占用随业务稳步增长而增的服务非常有用，让我们可以知道何时需要对硬盘扩容。


通过这几个例子，对Prometheus的运算和函数有了直观的认识，结合官方文档多写一写练一练很快就能熟练使用了。另外，还有几个使用频率颇高的函数：
- **absent和count**： absent判断服务是否还在，由于监控端点消失之后，Prometheus的视角是无法知道是正常消失还是异常退出，一般用absent或count来监控服务还在不在了，或者存在多少个部署实例，对服务健康度。
- **resets和changes**： resets判断是否发生单调性变化，计数器重置，比如判断是否发生了重启；changes判断值的变化次数。
- **round/floor/ceil**： 对结果做舍入，防止计算出来的小数点位数太长。
- **{aggr}_over_the_time**： 对区间向量先做一次聚合，变成瞬时向量，这里的聚合操作符"{aggr}"可以替换成任意一个Prometheus支持的[聚合操作](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)。下图是一个在Grafana上对比avg_over_time区间向量和直接查询瞬时向量的例子。

![](//filecdn.code2life.top/grafana_aggr_over_time.png)

### Alert配置和集成

通过上面对Prometheus数据流的概要理解，我们知道**AlertManager组件只是对收到的Alert做处理，不管Alert是如何触发的，告警的计算和触发是在Prometheus Server**。因此告警的配置也分两块：
- 第一部分在Prometheus中，配置Rules决定原始Alert如何触发
- 另一部分在AlertManager中，配置Alert处理策略

第一部分决定原始告警是否触发，是需要经常维护的；第二部分在AlertManager中的alertmanager.yml中，第一次配好后几乎不用修改。这种设计让**动态配置和静态配置分离**，更易于维护。


Prometheus配置的Yaml中有一行**rule_files**，Prometheus Server启动后会读取匹配该路径的所有文件，载入配置后每隔一段时间（evaluation_interval定义的时间）会逐个计算**record和alert**类型的Rule。

**record类型**的rule是对指标进行二次计算后再存入TSDB方便以后直接查询；**alert类型**的rule会计算后判断是否超过阈值持续了一段时间，符合告警条件就调用AlertManager的API创建原始告警数据。

那么，这两种Prometheus Rule要怎么写呢？

Record Rule的典型的格式如下，包括一个表达式expr和一个新的指标名称record，下面的例子来自Prometheus Operator对Kubernetes中CPU使用率的统计。

```yaml
groups:
- name: k8s.rules
  rules:
  # 根据 Kubernetes Namespace聚合，算出每个Namespace的总CPU占有率
  # 记录到新的指标：“namespace:container_cpu_usage_seconds_total:sum_rate”
  - expr: |
      sum(rate(container_cpu_usage_seconds_total{job="kubelet", image!="", container_name!=""}[5m])) by (namespace)
    record: namespace:container_cpu_usage_seconds_total:sum_rate
  # 根据 namespace, pod_name, container_name 三个label聚合，方便直接查询每个Container的CPU占用
  # 记录到新的指标：“namespace_pod_name_container_name:container_cpu_usage_seconds_total:sum_rate”
  - expr: |
      sum by (namespace, pod_name, container_name) (
        rate(container_cpu_usage_seconds_total{job="kubelet", image!="", container_name!=""}[5m])
      )
    record: namespace_pod_name_container_name:container_cpu_usage_seconds_total:sum_rate
```

Alert Rule的典型格式如下，包括annotation、expr、for、labels等几个部分。"expr"的条件如果满足，并持续了"for"定义的时长，就会根据"annotation"和"labels"定义的元数据生成告警数据。

```yaml
groups:
- name: prometheus-and-exporters
  rules:
  # 告警名称
  - alert: ContainerRestartAlert
    # 告警具体内容的模板字符串
    annotations:
      description: '{{ $labels.application }} restarted {{ $value }} times recently'
      summary: Application has been restarted ({{ $labels.application }})
    # 条件表达式，满足条件还要再判断持续时长
    expr: resets(process_uptime_seconds[5m]) > 0
    # 此例是如果发现容器重启(进程的uptime Counter发生了reset)，持续5s后立即发出告警
    for: 5s
    # 给告警打label，严重性是比较常用的
    # AlertManager能够根据label匹配可以做告警分级通知
    labels:
      severity: warning
```

常用的Alert Rules有个网站可以找到很多现成的写法：[https://awesome-prometheus-alerts.grep.to/rules](https://awesome-prometheus-alerts.grep.to/rules)，Copy-Paste即可避免重复造轮子了。

原始告警发送到Alert Manager之后，会按照上面alertmanager.yaml的配置，经过分组、抑制、静默等流程，最终**收敛后的告警**会路由到不同的**通知方式**。告警的通知方式有很多，除了官方支持的这些常用的邮件、IM等方式（[https://prometheus.io/docs/operating/integrations/](https://prometheus.io/docs/operating/integrations/)），也可以自行开发集成WebHook。我前年业余时间做了个集成Zoom客户端的Webhook转换组件，可以将**告警直接推送到Zoom群聊中，一键点击开启TroubleShooting Meeting**。链接如下：  

[https://github.com/Code2Life/nodess-apps/tree/master/src/zoom-alert-2.0](https://github.com/Code2Life/nodess-apps/tree/master/src/zoom-alert-2.0)

![](//filecdn.code2life.top/prm-alert-zoom.jpg)

### 常用的Exporter合集

我们了解了Prometheus的核心机制是根据xxx_sd_config来自动发现监控端点，这些监控端点就是Exporter提供的监控数据的HTTP接口，所以各种Exporters就是Prometheus监控数据的源头，有哪些常用的Exporter呢？

除了硬件指标收集的Node Exporter, Prometheus官方也提供了一些常用组件的监控指标Exporter，比如**Mysql Exporter、Consul Exporter、JMX Exporter**等等。在官方提供的Exporter之外，开源社区贡献了更多琳琅满目的组件和框架的各种Exporters，项目主页基本都有配置运行教程，绝大多数都是一行Docker命令或者一个Kubernetes Yaml文件，就可以轻松部署。

我们以在这里直接查询到大部分官方或开源社区提供的Exporters： [https://prometheus.io/docs/instrumenting/exporters](https://prometheus.io/docs/instrumenting/exporters/)。

如果是一些具体业务相关的监控指标，找不到满足需求的Exporter，在应用服务中自定义监控指标也不难，下篇我们再详细展开。

### Grafana Dashboards

Grafana是一个通用的**时序数据的可视化平台**，严格意义上并不属于Prometheus系统，因为它经常搭配Prometheus使用，基本的使用步骤已经讲过了，这里分享几个[Grafana Labs](https://grafana.com/grafana/dashboards)上常用的Dashboard，Dashboard翻译成看板、仪表盘都感觉怪怪的。

- Node Exporter Full(1860)，
- JVM Micrometer(4701), Spring Boot Statistics(6756)
- Golang Go Processes(6671)
- Redis Dashboard(763)
- MySQL Overview(7362)
- Kubernetes Nginx Ingress Dashboard (https://github.com/kubernetes/ingress-nginx/tree/master/deploy/grafana/dashboards), 

如果要创建**自定义的Dashboard**，Grafana支持可视化编辑和代码自动补全，掌握PromQL就可以熟能生巧。我业余时间创建了三个Dashboard贡献到Grafana Labs了，分别是Node.js的Dashboard、阿里的Druid数据库连接池的Dashboard、Consul状态以及注册服务的Dashboard，其中Node.js的目前已经一千多下载量了，看来很多人也都有类似的需求，有需要可以直接导入或复制JSON后自行改造。
- NodeJS Application Dashboard (11159): [https://grafana.com/grafana/dashboards/11159](https://grafana.com/grafana/dashboards/11159)
- Druid Connection Pool Dashboard for SpringBoot (11157): [https://grafana.com/grafana/dashboards/11157](https://grafana.com/grafana/dashboards/11157)
- Consul Exporter Dashboard (12049): [https://grafana.com/grafana/dashboards/12049](https://grafana.com/grafana/dashboards/12049)

![](//filecdn.code2life.top/nodejs-app-board.jpeg)

## 小结

现在我们对Prometheus以及周边组件的基本使用和数据流有了大概的了解，能够搭建最基础的监控告警系统了，但无法满足生产环境的要求，下一篇我们来讲解在生产环境中使用Prometheus的一些实战经验。