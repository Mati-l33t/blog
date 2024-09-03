---
title:      "工作流引擎Temporal学习笔记"
date:       2023-01-23
tags:
    - 分布式系统
    - Golang
    - Java
    - JS/TS
---

# 工作流引擎Temporal学习笔记

## 目录

[[toc]]

## Temporal简介

Temporal是一个新兴的分布式的工作流引擎。如果你在工作中遇到过以下这些场景，都可以来了解一下Temporal这个底层引擎。
（长文预警，建议分次服用）

1. 跨服务、跨时间周期的复杂业务流程
2. 业务工作流建模（BPM）
3. DevOps工作流
4. Saga分布式事务
5. BigData数据处理和分析Pipeline
6. Serverless[函数编排](https://github.com/serverlessworkflow/specification)

这些场景看上去互相没有太大关联，但有一个共同点：需要**编排**（Orchestration）。

Temporal解决的关键痛点，就是**分布式系统中的编排问题**。

#### 编排的本质是什么？

要理解编排，可以借助和Orchestration对应的另一个概念：Choreography。找不到合适的中文翻译，还是看图理解吧：

![](https://filecdn.code2life.top/orches_vs_choreo.png)

举个例子，我们开发微服务时，经常借助消息队列（MQ）做事件驱动的业务逻辑，实现最终一致的、跨多个服务的数据流，这属于Choreography。而一旦引入了MQ，可能会遇到下面一系列问题：

- 消息时序问题
- 重试幂等问题
- 事件和消息链路追踪问题
- 业务逻辑过于分散的问题
- 数据已经不一致的校正对账问题
- ...

在复杂微服务系统中，MQ是一个很有用的组件，但MQ不是银弹，这些问题经历过的人会懂。如果过度依赖类似MQ的方案事件驱动，但又没有足够强大的消息治理方案，整个分布式系统将嘈杂不堪，难以维护。

如果转换思路，找一个“调度主体”，让所有消息的流转，都由这个"指挥家"来控制怎么样呢？对，这就是Orchestration的含义。

- **Choreography** 是无界上下文，去中心化，每个组件只关注和发布自己的事件，完全异步，**注重的是解耦**；
- **Orchestration** 是有界上下文，存在全局编排者，从全局建模成状态机，**注重的是内聚**。

**Temporal的所有应用场景，都是有全局上下文、高内聚的「编排」场景**。比如BPM有明确的流程图，DevOps和BigData Pipeline有明确的DAG，长活事务有明确的执行和补偿流程。

Temporal让我们像写正常的代码一样，可以写一段工作流代码，但并不一定是在本机执行，哪一行在什么时间yield，由服务端信令统一控制，很多分布式系统韧性问题也被封装掉了，比如，分布式锁、宕机导致的重试失败、过期重试导致的数据错误，并发消息的处理时间差问题等等。

#### Temporal关键概念

1. **Workflow**，Workflow是在编排层的关键概念，每种类型是注册到服务端的一个WorkflowType，每个WorkflowType可以创建任意多的运行实例，即WorkflowExecution，每个Execution有唯一的WorkflowID，如果是Cron/Continue-as-New, 每次执行还会有唯一的RunID。Workflow可以有环，可以嵌套子工作流（ChildWorkflow）；
2. **Activity**，Workflow所编排的对象主要就是Activity，编排Activity就行正常写代码一样，可以用if / for 甚至 while(true) 等各种逻辑结构来调用Activity方法，只要具备确定性即可；
3. **Signal**，对于正在运行的WorkflowExecution，可以发送携带参数的信号，Workflow中可以等待或根据条件处理信号，动态控制工作流的执行逻辑。

下图是Temporal Dashboard中一个Workflow的执行详情示例。

![](https://filecdn.code2life.top/temporal_sample.jpg)

## 5分钟上手Temporal

#### 搭环境

**方法1：本地运行Temporalite**

本地调试一般没有性能和稳定性要求，建议下载运行All in one的Binary：[Temporalite](https://github.com/temporalio/temporalite)。

```bash
temporalite start --namespace default 
```

下载Binary放到Path后，一行命令启动就能连localhost 7233端口使用Temporal服务了，也可以打开浏览器进入Dashboard查看运行状态：http://127.0.0.1:8233

**方法2：开发或产线环境Helm部署分布式Temporal**

Dev/Prod环境建议用[Helm + Kubernetes](https://github.com/temporalio/helm-charts)部署，存储层准备独立运维的MySQL或PostgreSQL。

提前跑create database temporal & temporal_visibility命令创建好数据库，等Helm install完成后，通过admintools进去初始化数据库Schema：
```bash
helm dependency build  # optional

helm install -f values/values.mysql.yaml my-temporal . \
  --namespace temporal --create-namespace=true
  --kube-context *** \
  --set elasticsearch.enabled=false \
  --set server.config.persistence.default.sql.user=*** \
  --set server.config.persistence.default.sql.password="***" \
  --set server.config.persistence.visibility.sql.user=*** |
  --set server.config.persistence.visibility.sql.password="***" \
  --set server.config.persistence.default.sql.host=*** \
  --set server.config.persistence.visibility.sql.host=***

# 更新版本执行 helm upgrade 同理
```

安装如果遇到helm dependency的问题，可以注释掉Prometheus、Grafana、ES等没有用到的依赖Chart。

注意：如果连接AWS Aurora数据库，需要在values.mysql.yaml下面需要加上 connectAttributes：

```yaml
server:
  config:
    persistence:
      default:
        sql:
          connectAttributes:
            tx_isolation: 'READ-COMMITTED'
```

第一次Install后，admintools这个Pod会正常运行，其他Pod会找不到数据库表失败，这时可以进去admintools的Pod shell，执行命令更新DB Schema，Schema的源文件在这里：[https://github.com/temporalio/temporal/tree/master/schema/mysql/v57](https://github.com/temporalio/temporal/tree/master/schema/mysql/v57)
。

```bash
export SQL_PLUGIN=mysql
export SQL_HOST=mysql_host
export SQL_PORT=3306
export SQL_USER=mysql_user
export SQL_PASSWORD=mysql_password

cd /etc/temporal/schema/mysql/v57/temporal
temporal-sql-tool --connect-attributes "tx_isolation=READ-COMMITTED" --ep mysql-endpoint -u *** --password "***" --db temporal setup-schema -o -v 0.0 -f ./schema.sql

cd /etc/temporal/schema/mysql/v57/visibility
temporal-sql-tool --connect-attributes "tx_isolation=READ-COMMITTED" --ep mysql-endpoint -u *** --password "***" --db temporal_visibility setup-schema -o -v 0.0 -f ./schema.sql
```

等其他Pod自动重启或手动删除后，所有Temporal组件都会正常运行，可以Forward一个temporal-web的8080端口，检查Temporal服务是否运行正常。

#### 写代码

搭建完Temporal服务后，我们就可以开始写第一个Workflow代码了。下面我们以Java为例，详细讲解一下完整的Workflow是如何开发的，其他的编程语言道理是完全一样的。

在开始之前，需要给项目添加一下SDK依赖，以Gradle为例。

```groovy
// 最新版本参考：https://github.com/temporalio/sdk-java/releases
dependencies {
    implementation('io.temporal:temporal-sdk:1.17.0')
}
```

**第1步，设计工作流本身的关键行为和输入输出（参数-返回值），即定义Workflow的执行函数、查询函数、信号函数**。

```java
@WorkflowInterface
public interface MyWorkflow {
    @WorkflowMethod
    String execute(Object param);

    @QueryMethod
    List<String> getSomeStatus();

    @SignalMethod
    void manualComplete();
}
```

**第2步，设计工作流涉及的所有子活动的名称和输入输出数据，即定义Activity的执行函数，每个Workflow中的子活动的输入输出**。

```java
@ActivityInterface
public interface MyActivities {
    String doSometing(Object param);
}
```
**第3步，最关键的一步：设计工作流的状态机逻辑，即在代码中编排Activity**。

注意这里是不用关心Activity的具体实现实例的，因为Temporal需要感知到调用逻辑流，不能直接new Activity的实现类，需要建Activity的Stub对象进行编排，真正的实现类的实例后面会丢给Temporal Client管理，这里也无需实例化真正的Activity类。

```java
public class MyWorkflowImpl implements MyWorkflow {
    private final MyActivities activities;
    private boolean someSignal = false;
    public MyWorkflowImpl() {
        activities = Workflow.newActivityStub(MyActivities.class, ActivityOptions.newBuilder()
            .setStartToCloseTimeout(Duration.ofHours(1))
            .build());
    }

    @Override
    public String execute(Object param) {
        // 这是一个真正的“分布式Sleep”
        Workflow.sleep(Duration.ofSeconds(25));
        activities.doSomething();
        // 等待信号，用来实现cancel，或者多个独立工作流之间的信号协同
        Workflow.await(() -> this.someSignal);
        // 异步执行，通常用于批量并行Activity，多个Promise可以Promise.all/anyOf
        Promise<String> promise = Async.function(() -> {
            log.info("do something async");
            return "Cancelled";
        })
        // 批量Async之后需要对Promise进行同步，防止工作流提前结束
		promise.get();
        // return即WorkflowExecution结束，return值也会被支持化，作为这次Execution的Output
        // 工作流可以是无限的，for / while / 递归 都是支持的
        return "Workflow Done!";
    }

    @Override
    public void manualComplete() {
        // 调用 SignalMethod 后，Temporal会evaluate所有await的表达式
        this.someSignal = true;
    }
}
```

**第4步，实现真正干业务的Activity函数，可以是任意多个类和函数**。

```java
@Slf4j
@Service
public class MyActivitiesImpl implements MyActivities {
    @Override
    public String doSomething(Object param) {
        try {
            // 这里可以干任意业务逻辑，但不要在这里越俎代庖，调用Workflow的函数
            log.info("Activity: {}, {}", Activity.getExecutionContext().getInfo().getRunId(), Activity.getExecutionContext().getInfo().getActivityId());
        } catch (Exception e) {
            // 在Activity的实现里面包装一下Exception，对记录异常更友好
            // 异常的Activity会自动Retry，Retry策略可以在初始化ActivityOptions的Builder里面配置
            throw Activity.wrap(e);
        }
        // 执行时间太长的Activity可以阶段性发送heartbeat保活
        Activity.getExecutionContext().heartbeat("I'm still running");
        // Activity函数的所有参数、返回值也会被自动持久化，Workflow状态机产生状态转移和记录
        return "Activity Done !";
    }
}
```

**第5步，准备干活：初始化Temporal Client，连接本地或远程的Temporal的Front服务，注册代码定义的WorkflowType、Activity的实现类**

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class WorkflowManager{

    // 这里获取真正的Activity实现实例，在registerActivitiesImplementations传递给Temporal Client用来反射调用
    @Resource
    private DeployActivities myActivities;

    @Getter
    private WorkflowClient client;

    @PostConstruct
    public void initWorkflowFactory() { 
        // 如果是本地测试，不想依赖真正的服务端，可以用newLocalServiceStubs()
        // WorkflowServiceStubs service = WorkflowServiceStubs.newLocalServiceStubs();
        WorkflowServiceStubs service = WorkflowServiceStubs.newConnectedServiceStubs(WorkflowServiceStubsOptions.newBuilder()
                .setTarget("127.0.0.1:7233")
                .validateAndBuildWithDefaults(), Duration.ofSeconds(5));

        this.client = WorkflowClient.newInstance(service);
        WorkerFactory factory = WorkerFactory.newInstance(client);
        
        Worker worker = factory.newWorker("MyTaskQueue");
        // 这个地方注册的每个类都是一个Workflow的定义，每一种是一个WorkflowType
        worker.registerWorkflowImplementationTypes(MyWorkflow.class);
        worker.registerActivitiesImplementations(deployActivities);
        
        factory.start();
    }

    // 一个简单的函数，封装通用的创建WorkflowStub的逻辑
    public <T> Stub<T> startWorkflow(Class<T> workflowType, Object... params) {
        String workflowId = UUID.randomUUID().toString();
        WorkflowOptions workflowOptions = WorkflowOptions.newBuilder()
                .setWorkflowId(workflowId).setTaskQueue("MyTaskQueue").build();
        T workflowStub = this.client.newWorkflowStub(workflowType, workflowOptions);
        return new Stub<>(workflowId, workflowStub);
    }

    @Data
    @AllArgsConstructor
    public static class Stub<T> {
        private String workflowId;

        private T stub;
    }
}
```
**第6步，真的开始干活了：调用WorkflowStub，开始一次WorkflowExecution**。

```java
@Service
@RequiredArgsConstructor
public class WorkflowExecutor {

    @Resource
    private WorkflowManager workflowManager;

    public String startMyWorkflow(Object param) {
        String workflowId = UUID.randomUUID().toString();
        WorkflowOptions workflowOptions = WorkflowOptions.newBuilder()
                .setWorkflowId(workflowId).setTaskQueue("MyTaskQueue").build();
        WorkflowManager.Stub<MyWorkflow> myWorkflowStub = workflowManager.startWorkflow(MyWorkflow.class, param);
        myWorkflowStub.getStub().execute("Hello");
        return workflowId;
    }
}
```
**第7步，写测试用例，或者加断点Debug代码**。

单元测试和调试步骤可以参考这个文档：
[https://docs.temporal.io/java/testing-and-debugging](https://docs.temporal.io/java/testing-and-debugging)

如果要加断点，需要注意环境变量加上 **TEMPORAL_DEBUG=true**， 否则会报 PotentialDeadlockException。

运行起来之后，就可以在Web UI看到这样的Workflow数据了：

![](https://filecdn.code2life.top/temporal_running.png)

## 实践与思考

#### 实践历程

2022年，我们基于Temporal开发了DevOps工作流引擎，覆盖公司内部多种类型的CI/CD/CV操作和系统集成，已经在公司产线广泛使用。

前端用蚂蚁开源的[x6](https://github.com/antvis/X6)对DSL和执行过程做了业务层的可视化，后端是用Temporal SDK处理编排逻辑，核心代码不到1000行，绝大多数后端代码只需聚焦在业务开发上，而不是分布式系统的各种复杂问题处理。调试过程甚至不需要打断点，只要在Dashboard查看Event History就有完整的、持久化的“分布式调用栈”，开发调试的体验完美。

当时选型DevOps工作流的底层引擎时，一开始没有发现Temporal这个大杀器，走了一些弯路。2022年国庆期间，我重新评估了系统的架构选型，综合18个维度来看，Temporal无疑是开发复杂工作流业务的不二选择。最后用Temporal把代码推倒重来，花了一整月的时间重构，目前来看结果还是不错的，下面的表格是当时的部分评估结果。

|                             | Jira Workflow            | Temporal                      | Argo Workflow              | Prefect              | ConcourseCI                | Petri Nets                          |
|-----------------------------|--------------------------|-------------------------------|----------------------------|----------------------|----------------------------|-------------------------------------|
| Allow Cyclic                | Yes                      | Yes                           | DAG only                   | DAG only             | DAG only                   | Yes                                 |
| Programing Language         | Java - SaaS              | Golang                        | Golang                     | Python               | Golang                     | Paper(Scala / Ruby implementations) |
| Workflow as Code            | No                       | Yes (in Go/Java/TS/…)         | No                         | Yes (in python)      | No                         | N/A                                 |
| Workflow as YAML/DSL        | No                       | No (but easy to develop)      | Yes                        | No                   | Yes                        | N/A                                 |
| Support RESTful API         | Yes                      | Yes                           | Yes                        | Yes                  | Yes                        | N/A                                 |
| Task Processing Approach    | N/A SaaS                 | Lightweight Reentrant Process | Container                  | Python backend       | Container                  | N/A                                 |
| Extensibility               | Medium(need automation)  | High                          | Medium                     | Medium               | Medium                     | High                                |
| Popularity                  | High                     | High                          | High                       | High                 | Medium                     | Low                                 |
| Integration Difficulty      | Easy                     | Easy                          | Easy                       | Medium               | Easy                       | Hard                                |
| Dynamic Workflow Creation   | No                       | Yes                           | Yes                        | Yes                  | Yes                        | Yes                                 |
| Support Cron / Timer        | No                       | Yes                           | Yes                        | Yes                  | Yes                        | N/A                                 |
| Support Generic Request     | Yes with automation      | Yes with stub code            | Yes with image and command | Yes with python code | Yes with image and command | N/A                                 |
| Web UI                      | Yes                      | Yes                           | Yes                        | Yes                  | Yes (simple)               | No                                  |
| Storage                     | Cloud                    | Cassandra/MySQL/Postgres      | Kubernetes CR              | SQLite/Postgres      | Postgres                   | N/A                                 |
| Client Integration Security | SaaS + API Token / OAuth | OnPrem + gRPC with mTLS       | On-Prem + Kubernetes RBAC  | On-Prem + API Token  | On-Prem + mTLS             | N/A                                 |
| Scalability                 | High                     | High                          | Medium                     | High                 | Medium                     | N/A                                 |
| Performance                 | Low (HTTP latency)       | High                          | Low (start container)      | High                 | Low (start container)      | N/A                                 |
| License                     | Enterprise Licensed      | MIT                           | Apache 2.0                 | Apache 2.0           | Apache 2.0                 | N/A (Ruby FlowCore - MIT)           |
|                             |                          |                               |                            |                      |                            |                                     |


#### 使用关键注意点

- 事件溯源模式的本质，要求**工作流代码必须是确定性的**（使用Workflow库提供的**async**函数，**current time**函数），一切非确定性的行为需要显式记录副作用，比如随机数；
- 不要在Activity代码里面调用Workflow，编排逻辑要全部放到Workflow的实现里；
- 由于Workflow的执行需要被跟踪状态和事件，Stub是每次调用动态创建的，因此，不要用IoC容器托管或者尝试实例化Workflow，但可以用IoC容器托管Activity的实现；
- Workflow的参数和返回值会被记录，因此**参数的类型不要出现自引用或嵌套递归**，即用到WorkflowInfo之类的对象，否则会导致类似Direct self-reference leading to cycle的错误；
- 写Workflow代码的时候，**思维模式需要切换到上帝视角，不需要关心在哪里运行**。代码中的第一行可能跑在第一个Worker上，第二行可能跑在另一个Worker，第三行是在100天后等来了第四个另一个编程语言客户端的Worker发送的控制信令。

#### 亮点和局限性

在学习和实践过程中，有一些Temporal的亮点和局限性也顺便总结一下，个人感觉用的非常舒服的地方有这些：

1. 客户端提供了完善的多语言SDK和样例、单元测试：Go/Java/TS/Python/PHP/C#/Ruby，工作流的编程方式非常友好；
2. 背后是从Uber出来创业的商业公司，高性能、稳定性好，可大规模用于产线；
3. 自带WebUI对Workflow和Activity进行查询很方便；
4. 对应用层的灵活性非常高，应用场景广泛；
5. 在**中心化状态机+事件溯源模式**的模式下开发运行的代码非常健壮，Bug率低；
6. 对于长时间跨度的业务处理很方便，无需引入一套分布式CronJob/Timer方案，一行代码可以实现分布式Timer/CronJob。

体感比较明显的局限性不多，我能想到的有下面几个：

1. 偏底层，没有提供Workflow as DSL/Yaml，需要自己实现DSL和对应的可视化UI；
2. SDK的多语言和多框架的支持还没有特别完善，比如官方对SpringBoot自动配置的支持在开发中，更多编程语言的SDK还在陆续发布；
3. Temporal的Cron Job目前支持到分钟级别，不能设置秒级的Cron Job。

#### 总结

在学习Temporal的过程中，越深入越感觉到其设计之精妙，Temporal本质上是把Golang单机的CSP协程模型，扩展到了分布式系统，实现了Fault-tolerant分布式CSP。完善的持久化机制和跨时间和网络分区的容灾能力，尤其适合做复杂的业务流程、长时间跨度的业务，甚至是业务工作流引擎。

最后用几句不说人话的方式，总结一下Temporal的基本原理和设计思想：

**Temporal服务端**本质上是**通过信令和队列调度实现的中心化工作流引擎**、及**事件溯源模式实现的持久化长活事务和分布式的可重入进程**。
**Temporal客户端**通过**代理模式对执行逻辑进行切面控制，将单机函数输入输出，通过gRPC转为分布式的中心化调度和状态存取，进而实现编码阶段集中化、执行阶段分布式化**。

**可重入进程+事件溯源思想的厉害之处在于，解决了分布式持久化状态机问题，**同时用事件溯源保障了状态机的**重入一致性**。
**去中心化的Worker保持了极致弹性能力、中心化状态机实现了跨应用的全局响应式编程，**保障了全局的**逻辑内聚性**。

Temporal的3个关键特性，可中断、可恢复、响应式，正好是3个”R“：Resumable, Recoverable, Reactive。

> A Temporal Workflow Execution is a Reentrant Process. A Reentrant Process is resumable, recoverable, and reactive. 
> Resumable: Ability of a process to continue execution after execution was suspended on an awaitable. 
> Recoverable: Ability of a process to continue execution after execution was suspended on a failure. 
> Reactive: Ability of a process to react to external events

我惊叹于其设计精妙时，也好奇是谁创造了这个项目呢？原来Temporal的核心创始人之一Maxim Fateev，有超过15年消息队列和工作流平台的积累，领导了AWS SQS, Azure Service Bus, Azure Durable Functions, Uber Cherami、Cadence项目。

Maxim Fateev和Samar Abbas[2019年出来创业](https://temporal.io/about)，在2022年初Temporal已经是估值[**15亿美元**](https://www.geekwire.com/2022/temporal-is-a-unicorn-developer-productivity-startup-lands-120m-at-1-5b-valuation/))的独角兽企业。Temporal的商业模式果然也是云服务，走Cloud的SaaS模式。基于一个纯开源的工作流引擎的公司，能给到这么高的估值，足以说明背后硅谷投资人的技术视野和基金实力。

#### 学习参考

- 源码仓库：[https://github.com/temporalio/temporal](https://github.com/temporalio/temporal)
- 官网文档：[https://docs.temporal.io/](https://docs.temporal.io/)
- 创始人Maxim讲解的Temporal详细原理：[https://www.youtube.com/watch?v=t524U9CixZ0&ab_channel=Temporal](https://www.youtube.com/watch?v=t524U9CixZ0&ab_channel=Temporal)
- Temporal分布式集群组件和原理：[https://docs.temporal.io/clusters](https://docs.temporal.io/clusters)
- 7分钟快速入门案例：[https://www.youtube.com/watch?v=2HjnQlnA5eY&ab_channel=Temporal](https://www.youtube.com/watch?v=2HjnQlnA5eY&ab_channel=Temporal)
- 3种使用场景详细介绍：[https://www.youtube.com/watch?v=eMf1fk9RmhY&ab_channel=Temporal](https://www.youtube.com/watch?v=eMf1fk9RmhY&ab_channel=Temporal)

**支持的主流编程语言示例**

- TypeScript SDK文档: [https://docs.temporal.io/typescript/introduction/](https://docs.temporal.io/typescript/introduction/)
- TypeScript示例代码：[https://github.com/temporalio/samples-typescript/](https://github.com/temporalio/samples-typescript/)
- Java SDK文档：[https://docs.temporal.io/java/](https://docs.temporal.io/java/)
- Java示例代码：[https://github.com/temporalio/samples-java](https://github.com/temporalio/samples-java)
- Golang SDK文档: [https://docs.temporal.io/go/](https://docs.temporal.io/go/)
- Golang示例代码：[https://github.com/temporalio/samples-go](https://github.com/temporalio/samples-go)
