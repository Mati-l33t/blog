---
title:      "[DevOps] 打通Kubernetes内网和局域网的N种方法"
date:       2019-04-15
tags:
    - Kubernetes
    - DevOps
---

# {{ $frontmatter.title }}

由于Kubernetes集群会使用CNI插件创建Pod/Service内部子网，外面一般无法访问内部IP和域名，给开发、测试、 联调带来了很大的麻烦，因此打通开发测试环境Kubernetes集群内部子网和办公室的局域网、实现互联互通是经常遇到的问题。

本篇介绍**四种**解决方案以及其**适用场景和优缺点**，这四种方案分别利用了OSI网络模型的不同层级实现。

![](//filecdn.code2life.top/k8s-net-osi.png)  
  

- 方案一：在L7 **应用层**，使用**kubectl自带的子命令**（proxy port-forward）打通部分服务；
- 方案二：在L3 **网络层**，使用**自定义路由**无缝打通Kubernetes集群内网；
- 方案三：在L4/L5+ **传输/应用层**，使用**Socks5代理**基本打通Kubernetes集群内网；
- 方案四：在L2/L3 **数据链路/网络层**，实用Kubernetes集群内搭建的**VPN服务器**实现无缝打通集群内网。

## 方案一：Kubernetes的Proxy和Forward

Kubernetes本身提供了基于API Server的Proxy和Port Forward机制。比如Proxy子命令：

```bash
# 执行Proxy命令，或直接使用API Server的地址访问类似下面的URL
kubectl proxy --port 8001

# 运行后即可在本地直接访问到Kubernetes API Server
# API Server提供了Proxy接口来访问到内部的Service
https://localhost:8001/api/v1/namespaces/${ns}/services \
/${schema}:${service_name}:${port}/proxy/
```

Proxy一般用的不多，因为需要Token才能调用API Server的接口，不能比较透明地打通某个服务。

常用的一般是Port Forward，在本地监听某个端口，本地流量通过网络隧道到达某个Pod的端口，实现访问localhost:xx等价于在访问集群内网的某个Pod/Service。

```bash
# 冒号前面的是本地监听的Port，后面是Pod/Service声明的Port
# 另外，K9S、Kube-Forwarder 等工具可以更方便的操作，无需执行完整命令
kubectl port-forward pods/some-pod-name 8080:8080 -n some-namespace
```

这两种方式的**原理**都是在第七层，利用kubectl建立与API Server的**WebSocket连接**，作为网络隧道部分打通内部服务，而不是底层和局域网实现网络互通，因此IP和端口会变成localhost的，集群内DNS也无法解析（除非自定义hosts）。

**适用场景**：
- 联调时调用Kubernetes内**个别**的HTTP服务、简单的TCP服务，以及**无需查找集群内DNS**的场景。

**优点：**  

- Kubernetes原生解决方案，开箱即用，只需执行kubectl命令即可，也有可视化工具可以做；
- Port Forward具体哪些Pod的权限可通过RBAC机制控制，比较安全。

**缺点：**  

- 需要每个使用者都执行命令，而且每个组件都要Forward一下，不方便；
- Pod发生改变时需要重新执行kubectl来Forward；
- 对于一些需要打通Kubernetes DNS的TCP服务，或者直连同样的内网IP的场景不适用（Redis Cluster， Kafka，MongoDB等等，比如：Forward集群的MongoDB到本地，本地连接到localhost:27017是MongoDB的Primary节点，服务端返回了一个 mongo-secondary.mongo.cluster.local 的域名让客户端去连，客户端就懵逼了）。

## 方案二：通过路由跳转打通容器网络

如果Kubernetes集群就部署在局域网内或者部署在自己的数据中心，整个链路上的**网关可配**的话，用**静态路由表**是最简单的办法，其原理是作用在网络模型的第三层 **网络层**，直接告诉网关某些IP要发给谁。

举一个最简单的例子，某开发环境的Kubernetes部署在和办公室同一个局域网，有下面两条线路可以打通网络：

![](//filecdn.code2life.top/k8s-tunnel-static-route.png)

此时在网关路由器上添加**静态路由规则**，把属于Kubernetes的**Pod/Service CIDR**的IP包全转给其中某个Kubernetes节点，这样访问10.96.0.1这样的IP，网络包会到达某个集群物理节点，而集群内的物理节点或VM，一般K8S网络插件(CNI)都会做与Pod/Service CIDR的互通。

如果Kubernetes和本地机器处于**同一个网关**下，甚至仅在**本地机器上**添加一条静态路由到路由表即可（即图中下面的那个箭头，直接可以实现与Kubernetes内网的互通）：

```bash
# 命令中下面两处需要替换成真实的值
# 集群子网： 10.96.0.0  /12 or 255.240.0.0
# 集群某节点： 192.168.1.20

# Windows 
route ADD 10.96.0.0 MASK 255.240.0.0 192.168.1.20

# Linux
sudo ip route add 10.96.0.0/12 via 192.168.1.20 dev eth0

# MacOS
sudo route -n add -net 10.96.0.0 -netmask 255.240.0.0 192.168.1.20

# 如果在网关上（路由器/交换机）统一配置时，各个厂商设备的命令有所不同
```

如果Kubernetes部署的机器和公司办公室**不在同一个网关下**，或者部署在自建数据中心的，整个链路会多几个网关，链路上**每个网关**都需要配置路由表路由相应的CIDR到相邻的跃点，类似下图：

![](//filecdn.code2life.top/k8s-static-route2.png)

有了第三层的路由支持，**DNS的问题**也迎刃而解了，直接把Kubernetes的DNS Server（如CoreDNS），当作本地DNS服务器，或者插入到DNS查找链中作为一个Forwarder即可。这样整个局域网已经与Kubernetes内网完全互联互通了。

**适用场景：**

- 网关配置可以修改，比如都在公司局域网内，或集群所在数据中心的网关路由器是可修改的；
- 内部的开发环境Kubernetes，不担心敏感数据等安全问题。

**优点：**

- 方便，无需部署任何组件，仅在一个或多个网关上做静态路由配置即可，透明、高效；
- 对开发测试人员几乎完全透明，不需要任何额外操作。

**缺点：**
- 需要负责网络的IT人员额外配置；
- Pod/Service网段不能和本地局域网的网段有冲突，多个Kubernetes集群之间也不能有CIDR冲突，否则不好配置路由表；
- 除了一些局域网或自建DC中的Kubernetes，大部分情况下可能用的是**云服务**，我们没办法修改云服务商的路由表，此方案很难实现，就要用方案三和四了。

## 方案三：通过Shadowsocks打通容器网络

方案三、四的原理类似：通过在Kubernetes内网搭建一个"间谍"服务，客户端连到这个服务建立一个虚拟的隧道，让局域网的部分网络流量通过这个专属的隧道打到Kubernetes内网中，感觉就像在Kubernetes内网一样。方案三的Shadowsocks与方案四的VPN两个方案不同的地方在于，前者在L4/L5而后者一般作用在L2/L3。

Shadowsock Server的方案大致原理如图所示：

![](//filecdn.code2life.top/k8s-tunnel-ss.png)

- 首先本机通过RFC 1928定义的标准的[Socks5协议](https://www.ietf.org/rfc/rfc1928.txt)代理TCP连接的流量；
- 然后SS Client和SS Server通过加密通信把流量丢给SS Server；
- SS Server最终发送这些TCP包到目标机器，再原路返回回去，通过两重转发实现“代理”的目的。

在Kubernetes中部署Shadowsocks Server很简单，直接**Apply下面的Yaml**即可。如果不想每个客户端都安装一个Shadowsocks Client，也能让其中某台客户端开启Socks5**允许局域网连接**，让其他局域网机器都连过来。

```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: shadowsocks-deployment
  namespace: default
  labels:
    app: ssserver
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ssserver
  template:
    metadata:
      labels:
        app: ssserver
    spec:
      containers:
      - name: ssserver-container
        image: shadowsocks/shadowsocks-libev:v3.2.0
        command: [
          # need to modify "-d" to k8s core-dns
          "ss-server", "-p", "8388", "-t", "300", "-k", "your-password", "-m", "aes-256-cfb", "--fast-open", "-d", "10.96.0.10,8.8.8.8", "-u"
        ]
        ports:
        - containerPort: 8388
          protocol: TCP
          name: tcp
        - containerPort: 8388
          protocol: UDP
          name: udp
      nodeSelector:
        "some-condition": "true"
---

apiVersion: v1
kind: Service
metadata:
  name: socks-proxy-svc
  namespace: default
spec:
  type: NodePort
  ports:
  - port: 8388
    targetPort: 8388
    nodePort: 32088
    protocol: TCP
    name: tcp
  - port: 8388
    targetPort: 8388
    nodePort: 32088
    protocol: UDP
    name: udp
  selector:
    app: ssserver
```

我们再看这个方案的**DNS问题**，由于TCP流量被代理到内网中，才真正发送到目标机器的，因此对于本机的应用程序来说**压根就不用提前自己发UDP包做DNS解析**了，**一股脑把流量塞给Sock5代理**即可。

但还有一个问题，怎么确保我们要联调测试的应用程序，流量一定会走Sock5代理呢？

我们在运行Shadowsocks Client时，开启系统代理时它会帮我们做一件事情，就是给**操作系统自动设置Sock5代理**，像下面这样的:

![](//filecdn.code2life.top/ss-win-proxy.png)

浏览器和一些应用软件，也可以读取操作系统的设置作为默认值，但仍然**不能确保**所有进程的TCP流量，都走Sock5代理。

比如Java进程的**JVM启动参数**如果不加：**-DsocksProxyHost和-DsocksProxyPort** 两个参数，并不一定会走Socks5代理。这时有个更彻底的办法，用Proxifier**强制某些进程**的流量全部走Sock5代理，传送门：[https://www.proxifier.com/download/](https://www.proxifier.com/download/)。Proxifier是个非常好用的工具，在更底层拦截了网络流量转到代理服务器中，这里就不扯远了。

**适用场景：** 

- 想**几乎**无缝透明的访问集群的任何内部Pod/Service IP和Domain，定向透传到Kubernetes集群内的流量；
- Kubernetes集群在云服务器上，有公网IP可以当作SS Server服务器IP。

**优点：**

- 服务端方案比较轻量，维护相对简单；
- 代理开关方便，客户端比较灵活；
- 按需代理，不影响大多数网络流量，即使有瓶颈扩容也很方便。

**缺点：**

- 客户端初次使用可能稍微有些麻烦；
- 虽然浏览器或程序用代理能使用集群内部DNS，但即使开了代理，本地直接nslookup解析Kubernetes内部域名也不通，**DNS问题是间接解决的**。

## 方案四：通过VPN打通容器网络

VPN是在远程办公场景时常用的方案，借用VPN的思路打通Kubernetes内网也可以实现。常用的VPN有两类，作用于网络模型的L2或L3：

- L2TP（Layer Two Tunneling Protocol）：主要是作用于第二层，支持非IP网络，开销稍高，搭配第三层的IPSec协议可以做隧道验证，密钥协商和流量的加密；
- PPTP（Point to Point Tunneling Protocol）：点对点隧道协议， 使用第三层的GRE（Generic Routing Eneapsulation）建立隧道，以及第二层的点对点协议传输数据。

在Kubernetes环境中部署VPN服务器实现办公室局域网到Pod/Service网络的互通，网络上也有一些教程。有个Github项目是在容器环境下搭建IPSec VPN的：[https://github.com/hwdsl2/docker-ipsec-vpn-server](https://github.com/hwdsl2/docker-ipsec-vpn-server)，把运行容器命令改成Apply Deployment/StatefulSet Yaml，或者以在某个Kubernetes节点上以Host Network的模式运行容器，也相当于在Kubernetes集群中放了一个“间谍”，搭好服务端之后，客户端用操作系统自带的VPN工具连进去即可。

**适用场景：**

- 需要完全**无缝透明地**访问Kubernetes的Pod/Service内部网络。

**优点：**

- 操作系统自带VPN功能，客户端比较简单，只需要开关VPN即可实现透明的网络互通了；
- 作用于网络模型更底层，能实现完全透传。

**缺点：**

- VPN打开会影响所有网络流量，导致大量不需要走Kubernetes的流量走到集群内了；
- VPN的实现相对比较重，效率可能不如其他方案。

## 总结

本文讲解了四种打通Kubernetes Pod/Service内部子网的方案，但上述各个方案都有一个前提：打通的是**开发测试环境的**Kubernetes集群。

在**生产环境**上做这些事情是**非常危险**的，即使是原生的Port Forward也要严格**控制权限**，任何一个后门都可能被黑客当做突破口**一锅端**。因此做之前一定要考虑安全方面的影响，开发测试环境也同样不能大意，尽量避免暴露内部的东西到公网。

我个人推荐的各个方案**使用优先级**是和本文顺序一致的：
- 能用方案一Port Forward解决的就不要看下面三种方案了，Forward虽然不能做到透传，但相对更安全可靠；
- 能有条件配置方案二的路由表的，也不用考虑方案三和四了，静态路由过去、DNS解析链条配置好，对使用端几乎完全透明，也没有任何性能损耗；
- 方案三和四的思路差不多，在集群内部放一个“间谍”（SS Server 、 VPN Server），网络流量从代理服务器发出去。VPN的管理复杂一些，没有IP和域名级别细粒度的流量控制，可能导致无关流量都涌进来成为瓶颈；Socks代理对使用端稍微麻烦一些，不是完全的透传，但效率和灵活度更高，方案三和四**按需选择**吧。
