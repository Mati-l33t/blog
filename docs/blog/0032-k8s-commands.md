---
title:      "[分布式专题] Kubernetes及Helm术语和常用命令"
date:       2018-10-27
tags:
    - Kubernetes
---

# {{ $frontmatter.title }}

## Kubernetes资源对象及管理命令

#### Kubernetes常用资源对象

在汇总Kubernetes常用命令之前, 需要先理解常用的资源对象, 因为Kubernetes集群的管理是声明式的, 大部分命令都是 get / create / apply / edit / delete 加上资源的名称或定义. 这里有[一篇详细一些的文章](https://www.cnblogs.com/zhenyuyaodidiao/p/6500720.html). 如果没有接触过Kubernetes, 可以参考笔者以前分享的一个[PPT](//k8s-share.code2life.top/#/)大概了解一下.  

常见的资源对象:  
- **Node** 节点, 每个物理机/虚拟机就是一个节点
- **Namespace** 命名空间, 大部分资源对象都属于特定的命名空间, 用于隔离不同类型或不同环境的资源
- **ConfigMap / Secret** 明文/密文常量, 集群的配置中心, 可以用于把配置挂载到容器的**文件路径**或**环境变量**中
- **Pod** 容器组 翻译过来是豆荚, 里面的豆子就是容器(container)
   - Pod就是指一组**共享文件/进程上下文的容器集合**, 也是K8S管理的基本单元
   - 一个Pod一般表示一个应用的实例, 一般不会直接创建Pod, Deployment/StatefulSet/Job/DaemonSet等等都会创建Pod
- **Service / EndPoint** 服务和服务端点
  - Service是对一个应用对外提供服务的抽象, 每个服务对应的地址就是端点(Endpoint)
  - Service会对多个Endpoint做**负载均衡**
  - 大部分情况下Endpoint地址的就是Pod的IP+端口
  - 如果Service没有selector, 这时Service就是一个**Headless Service**, 可以手动创建Endpoint指向外部服务
- **Ingress** 入口, 相当于集群的**网关**
  - Ingress是一个抽象的概念, 具体是实现一般是Ingress Controller部署在集群的边缘节点上
  - Ingress Controller有很多选择, 比如K8S官方推荐的traefik, 以及用的比较多的Nginx IngressController
  - 有了Ingress Controller, 就可以声明很多Ingress配置来路由集群的访问规则
  - Ingress可以配置通过URL Path, Hostname路由, 甚至通过Annotation改写URL[等等](https://docs.giantswarm.io/guides/advanced-ingress-configuration/)
- **StatefulSet** 有状态集合, 不能随意调度或水平扩展的有状态应用
  - 大部分服务应该设计为无状态的, 把状态集中到某个外部应用, 比如Redis
  - 最典型的StatefulSet有Redis, MySQL, Consul, Zookeeper等
- **Deployment** 表示一个无状态应用的部署
  - Deployment会生成一个RelicaSet控制Pod的数量和生命周期, 提供应用的蓝绿部署/滚动更新的能力
  - Deployment配置很多, 能够实现大部分运维需求, 比如保留多个revision指定回滚版本等等
- **DaemonSet** 守护进程集, 表示需要在**每个节点上都运行**的Pod, 典型的应用有
  - CNI的实现比如Flannel网络插件
  - 日志收集Agent比如Filebeat
  - 监控收集Agent比如Prometheus NodeExporter
- **ReplicaSet** 副本集
  - Deployment的核心, 声明式的控制Pod的数量, 一般由Deployment生成无需手工创建
- **ReplicaController** 复制控制器, 初始版本的Deployment, 目前基本已经被废弃了
- **Volume** 存储卷, 每个Pod 都可以在模板中声明 Volume 资源, 作为**Pod的存储源**
  - Pod在拥有Volume之后, 决定把这个存储资源挂载到容器的哪个目录中, 需要配置**VolumeMount**
  - Volume有很多类型, 比如默认的emptyDir, 或者ConfigMap, 以及常用的PersistentVolumeClaim
- **PersistentVolume** 持久卷, 简称PV. 是**集群的存储资源**
  - 就像Node是集群统一管理的计算资源, PersistentVolume就是集群统一管理分配的存储资源
  - PV也有很多类型, 比如NFS, 开源文件系统GlusterFS, 云存储提供商的网络磁盘比如EBS等
- **PersistentVolumeClaim** 持久卷声明, 简称PVC, 是Volume常见的一种类型
  - PVC指的是Pod向集群索要存储资源(PV)的一个订单, 比如XXX Pod需要 10G 存储, 读写模式是什么, 这个声明就是一个PVC
  - PVC声明成功绑定PV之后, Pod向PV中读写文件, Pod销毁PV也会回收掉
- **StorageClass** 存储类, 用于**动态创建PersistentVolume**的存储管理器
  - StorageClass像是一个工厂, Pod需要存储资源找StorageClass要, StorageClass就去动态创建一个PV出来
- **HorizontalPodAutoscaler** 水平扩展器, 可以通过**kubectl autoscale**创建出来, 用于在达到某个负载条件时自动扩容
- **NetworkPolicy** 网络策略, 一般很少用到
  - 默认情况下Pod, Service子网内部都是直接能通的. NetworkPolicy就是在**内部子网中的防火墙**
  - 不是所有的CNI实现都支持NetworkPolicy, 比如Calico支持, Flannel就不支持
- **PodSecurityPolicy** 用于限制Pod的权限, 比如可以挂载的卷, 能够使用的端口[等等](https://kubernetes.io/docs/concepts/policy/pod-security-policy/)
- **Job / Cron Job** 短期任务或定时任务, 一般应用服务很少用到
- **ResourceQuota / LimitRange** Namespace级别的资源限制.
  - LimitRange控制namespace下**每个Pod或Container**的资源占用范围,
  - ResourceQuota控制整个namespace的资源占用**总量**
  - 这两者和**Pod模板**的资源限制是不同的, Pod template里面的**resource定义的requests/limits**只对该Pod有效
- **ServiceAccount / Role / ClusterRole / ClusterRoleBinding**
  - 集群的RBAC权限管理相关的, 待补充

#### Kubectl 常用命令

kubectl是管理Kubernetes集群的命令行工具(cli), 很多编辑器插件都是基于kubectl来实现的, 比如VSCode Kubernetes插件. 使用之前需要先配置好 **~/.kube/config** 文件. Windows下则是**C:/Users/xxx/.kube/config**. 该文件是一个yaml文件, 存放集群的**访问授权信息**. 
- config文件主要由**contexts, clusters, users**三个部分组成, 以及current-context声明默认的集群
- 切换集群需要用 **kubectl config use-context** 命令更改当前管理的集群

常用运维命令合集:  
- **给节点打上label** 
```bash
kubectl label nodes node1 label=value 
```
- **删除节点的label** 
```bash
kubectl label nodes node1 label-
```
- **创建一个ServiceAccount** 
```bash
kubectl create serviceaccount tiller -n kube-system
```
- **绑定角色** 
```bash
kubectl create clusterrolebinding tiller --clusterrole cluster-admin --serviceaccount=kube-system:tiller
```
- **更新yml资源** 
```bash
kubectl apply -f fileOrDirectory -n myns
```
- **删除yml资源** 
```bash
kubectl delete -f fileOrDirectory -n myns
```
- **获取yml资源列表** 
```bash
kubectl get po/rs/svc/ep/xxx -n myns
```
- **获取yml详细状态** 
```bash
kubectl describe po/rs/svc/ep/xxx xxx -n myns
```
- **获取某个ServiceAccount的Key** 
```bash
kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}') 
```
- **代理访问集群内部Service** 
```bash
kubectl proxy --address 0.0.0.0 --accept-hosts '.*' -p 8080
```
  - 访问地址是**/api/v1/namespaces/xxns/services/http:servicexx:/proxy/**
  - proxy的原理是通过API Server提供的**Proxy API**代理Service的访问, kubectl proxy默认8001端口且仅本机访问
- **代理访问某个Pod的端口** 
```bash
kubectl port-forward websrv-elasticsearch-client-5cdd5c5589-q479x 9200:9200
```
  - 访问地址是本地设备的某个端口, 比如127.0.0.1:9200
  - port-forward的原理是通过与API-Server建立SPDY连接代理Pod的访问
- **回滚部署** 
```bash
kubectl rollout undo deployment hello-deployment --to-revision=2 
```
  - 不加 **to-revision** 参数则回滚到部署之前的版本
  - 与之对应的还有一个rolling-update命令用于滚动更新ReplicationController, 但这种方式已经弃用了, Deployment直接Apply就是滚动更新
- **更改动态PV的默认StorageClass** 
```bash
kubectl patch storageclass standard -p \
"{\"metadata\":{\"annotations\":{\"storageclass.kubernetes.io/is-default-class\":\"true\"}}}" 
```
- **创建SSL证书** 
```bash
kubectl create secret tls xxx-cert --key /opt/ssl/xxx.key --cert /opt/ssl/xxx.crt -n myns
```

## Helm 术语以及常用命令

> 2020年更新：Helm3.0已经发布，无需服务端Tiller，客户端命令行参数也有所变化，另外除了Helm，对于需求比较简单的场景（只需要动态参数替换功能），Kustomize也是一个不错的选择。

Helm 核心概念:  
- Helm 是一个**Kubernetes应用的包管理工具**, 管理一个应用在Kubernetes中的的部署结构, 版本控制等等
- 一个应用就是一个**Chart**, 包括一堆模板化的yaml定义, 以及values.yaml作为动态模板的默认参数配置
- 一次部署就是一个**Release**, Release就是Chart中的模板yaml传入参数替换成真正的Kubernetes中的yaml, 并且将这些yaml通过**helm服务端(tiller)**部署到集群中的过程, Release是有版本的, 可以**回退或更新**
- Chart存放的地方就是**Repository**, 一般是远程的**HTTP文件服务器**, 用来管理Chart本身的版本. 默认用的中心仓库, [Helm社区维护的Charts](https://github.com/helm/charts)

Helm 命令合集:  
- **helm初始化** 
```bash
helm init --service-account tiller
```
  - 该命令是服务端+客户端初始化, 会创建Tiller镜像的Deployment, 如果仅客户端用 helm init -c
  - 指定ServiceAccount需要首先创建tiller这个Account并绑定ClusterAdmin角色
  - Helm命令会读取kube config, 需要先配置好kubectl

- **搜索中心仓库的Chart** 
```bash
helm search redis 
```
- **获取或列出当前集群中部署的helm Release** 
```bash
helm list / helm get redis-dev
```
- **模拟安装某个Chart用于测试** 
```bash
helm install --name redis-dev --dry-run --debug -f values.yaml ./redis/ 
```
- **安装某个Chart** 
```bash
helm install --name redis-dev --namespace infra-redis -f values.yaml ./redis/ 
```
- **模板内容替换** 
```bash
# 语法与install类似, 输出模板替换后的yaml
helm template --name redis-dev --namespace infra-redis -f values.yaml ./redis/ 
```
- **删除部署过的某个Release** 
```bash
helm delete redis-dev 
```
- **搭建一个本地helm Repo服务器** 
```bash
nohup helm serve --address 0.0.0.0:8879 --repo-path /local-repo & 
```
  - Helm Repo可以是任何一个可以下载文件的http服务器
  - 分布式块存储系统**Minio**也可以作为helm Repo服务器, 甚至Github Pages也可以
- **查看添加更新删除helm Repo** 
```bash
helm repo add local-repo //myrepo:8879
helm repo list / helm update
helm repo remove local-repo
helm repo update stable
```
- **打包发布Chart** 
```bash
# --save标识是否存在本地Repo, 这条命令会打包出来一个tgz文件
helm package --save=false ./redis/
# index命令更新index.yaml, 然后把相应的文件放到http服务器上即可
helm repo index ./redis/ --url //myrepo:8879
```
- **彻底删除一个Release** 
```bash
helm del --purge websrv-grafana 
```
- **更新Release** 
```bash
helm upgrade redis-dev -f values.yaml ./redis/ 
```
- **查看Release历史并且回滚Release**
```bash
# history子命令能够列出所有的历史版本
helm history redis-dev
# 如需回退特定版本, rollback第二个参数填写该版本即可
helm rollback redis-dev 2
```