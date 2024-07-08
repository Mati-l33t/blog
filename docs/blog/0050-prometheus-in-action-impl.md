---
title:      "[DevOps] Prometheus监控告警——原理篇"
date:       2020-02-26
tags:
    - prometheus
    - alert
    - monitor
---

### 目录

- [Prometheus监控告警——基础篇](/blog/0048-prometheus-in-action-start) 
- [Prometheus监控告警——实战篇](/blog/0049-prometheus-in-action-usage) 
- [Prometheus监控告警——原理篇](/blog/0050-prometheus-in-action-impl) 
- [Prometheus监控告警——总结与思考](/blog/0051-prometheus-in-action-thinking) 

前两篇我们了解了如何使用Prometheus系统，这一篇我们深入Prometheus源码，对最关键的核心代码一探究竟。

## 总览

Prometheus系统在Github下有许多项目，我们只关注最关键的部分，也就是[Prometheus Server](https://github.com/prometheus/prometheus.git)的实现。下图框出来的几个子目录是最核心的几个模块。

![](//filecdn.code2life.top/prom-src.png)

我们逐步分析其中最最核心的几点：

阅读源码最好的办法就是一行一行跟断点，Prometheus代码结构一目了然，命名简洁清晰，我们找到入口文件：cmd/prometheus/main.go，在Debugger模式下编译启动就可以运行了。

Prometheus并没有使用依赖注入框架，入口的main函数比较庞大，包括大量的初始化操作，在第500行之后才是真正启动的地方。

项目用了 [oklog/run](https://github.com/oklog/run) 这个goroutine编排工具，并行启动关键的几个子模块。

```go
var g run.Group

// Termination handler 
// 接受SIGTERM信号优雅退出
g.Add(...)

// Scrape discovery manager
// 自动发现监控端点的goroutine
g.Add(
  discoveryManagerScrape.Run()
)
// Notify discovery manager
// 自动发现AlertManager端点的goroutine
g.Add(
  discoveryManagerNotify.Run()
)

// Scrape manager
// 刮取监控数据的关键入口
g.Add(
  // 传入channel是因为当对应的 discovery 结果变化时需要reload
  scrapeManager.Run(discoveryManagerScrape.SyncCh())
)

// 添加一些其他的goroutine：
// Reload handler / Initial configuration loading / ...

// TSDB：启动时序数据库的关键入口
g.Add(
  ...
  db, err := openDBWithMetrics(...)
)

// Web handler：启动 HTTP/gRPC 服务的入口
g.Add(
  ...
  webHandler.Run(ctxWeb)
)

// Notifier：发送告警通知给AlertManager的入口
g.Add(
  notifierManager.Run(discoveryManagerNotify.SyncCh())
)
```

## TSDB是如何实现的

- 时序向量
- 时序数据压缩
- 倒排索引
- 源码

## 告警消息如何产生

求值 - 阈值判断 - 触发 - 分组 - 等待 - 处理链路 - 路由链路 - 发送 - 结束

Gossip协议，去重实现

AlertManager HTTP API
https://zhuanlan.zhihu.com/p/42190073

告警收敛，从源头上避免疲劳告警。

> 警报疲劳（Alarm Fatigue）是指暴露在大量、频繁的警报之中，被暴露者产生的去敏感化现象。去敏感化现象会导致更长的反应时间，甚至是忽视重要的警报。

Prometheus的杀手锏是自发现的Pull模型代替传统的Push模型，而AlertManager的杀手锏是强大的告警收敛机制。什么是告警收敛？就是通过一系列预处理手段，尽可能的归类、合并、减少最终发送给用户的警报，让用户收到最简单又最重要的信息。AlertManager做了一个大胆的尝试，不允许配置最大告警次数，这在传统的主流告警系统中是史无前例的，AlertManager这样设计的目的就是期望在强大的收敛机制下，告警信息能够万元归一。

https://github.com/prometheus/alertmanager/blob/master/doc/arch.svg

## 思考

时序数据库的本质

LSM Tree

告警收敛