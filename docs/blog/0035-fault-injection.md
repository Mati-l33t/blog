---
title:      "[DevOps] Linux操作系统层的故障注入"
date:       2019-05-02
tags:
    - DevOps
---

# [DevOps] Linux操作系统层的故障注入

某些情况下，为了特殊的测试场景和鲁棒性测试，我们需要模拟各种软硬件故障，尤其是网络故障注入测试。除了**拔网线，断电源，删文件**以外，本文讲解Linux下一些简单的网络故障注入命令，建议配合**Wireshark**抓包以及常用的性能监控分析工具一同食用更佳。

## 进程故障注入
kill 命令用于给进程发送特定的信号，其中包括了进程关闭挂起等信号来制造正常或异常的进程退出，可以用"kill -l"查看所有可以发送的信号。关闭或挂起进程的方法很简单，如果有父-子进程的话，可以试试分别kill。
```bash
# 正常的SIGTERM杀进程
kill -TERM pid
 
# 强制关闭SIGKILL杀进程
kill -9 pid
 
# SIGSTOP用来挂起进程， SIGCONT恢复进程运行
kill -STOP pid
kill -CONT pid
```

容器环境下进程相当于整个容器，干掉进程的方法更多一点，以docker为例：
```bash
# rm子命令对于正在运行的容器，-f参数等价于 SIGKILL强杀
docker rm -f <container-id>

# stop子命令，SIGTERM信号发过去，默认10秒SIGKILL强杀
docker stop <container-id>

# exec进入容器交互式Shell，执行kill，花式杀进程
docker exec -it <container-id> /bin/bash
# 进入后杀掉1号进程（通常docker内运行的应用主进程ID为1）
kill 1 或者 kill -9 1

# 还有一种方法是在宿主机ps找到对应的docker-containerd-shim进程，在宿主机直接执行kill
```

Kubernetes下杀进程/容器的方法与docker类似，除了容器级别操作以外，还可以通过kubectl告诉Kubernetes API Server哪个Pod需要关。
```bash
# 给Pod内所有容器发送SIGTERM关闭，超过GracePeriod发送SIGKILL
kubectl delete po <pod-name>

# 直接给Pod所有容器发送SIGKILL强关，没有商量的余地
kubectl delete po <pod-name> --grace-period=0 --force
```

## 使用iptables注入网络故障

iptables是一个命令行工具，用于控制Linux内核的**IP包过滤系统Netfilter**。iptables的配置是运维必备技能，网上有太多资料了，这里不深入讲解，只列出几个关于网络故障注入的配置命令，作用在默认的Filter表上，NAT表也可以实现故障注入，但没有Filter表来的直接明了。

```bash
# 查看一下Filter表和NAT表的已配置规则
sudo iptables -L -n 
sudo iptalbes -t nat -L

# 每个参数的含义可以用Explain Shell在线工具查看 https://explainshell.com/
# 13.57.193.230添加一个规则：目的地192.168.100.101的443端口的TCP包全部丢弃
sudo iptables -d 192.168.100.101 --dport 443 -A OUTPUT -p tcp -j DROP
# 删除上述规则
sudo iptables -d 192.168.100.101 --dport 443 -D OUTPUT -p tcp -j DROP

# 添加一个规则：目的地192.168.100.101的443端口的TCP包有10%的概率丢弃
sudo iptables -d 192.168.100.101 -A OUTPUT -p tcp --dport 443 -m statistic --mode random --probability 0.1 -j DROP
# 删除上述规则
sudo iptables -d 192.168.100.101 -D OUTPUT -p tcp --dport 443 -m statistic --mode random --probability 0.1 -j DROP

# 修改规则记得保存，否则重启失效
sudo iptables-save
```

注意，在RHEL7或CentOS7上，有的比较"完整"的版本默认安装了**firewalld**控制iptables，可能造成直接修改iptables失效，Ubuntu也有ufw这样的防火墙软件封装了iptables。这种情况下要么关闭防火墙，自己改iptables，要么按照防火墙命令来配置，比如红帽系的firewalld的配置命令示例如下：

```bash
# 允许/拒绝 443 端口的外部访问
firewall-cmd --zone=public --add-port=443/tcp --permanent
firewall-cmd --zone=public --remove-port=443/tcp --permanent
# 立即生效
firewall-cmd --reload

# 或者关掉firewalld自己撸iptables
# 个人认为比这些iptables套层壳的防火墙软件更好用也更灵活
systemctl stop firewalld
systemctl disable firewalld
```

还有一种情况，在Kubernetes集群中，如果**kube-proxy**是用iptables模式而非ipvs模式运行的话，iptables也是不能乱改的，这个时候就需要其他故障注入工具来替代了。

## 使用tc命令注入网卡数据错误或异常
tc 即Traffic Control，用于在Linux内核级别的流量控制，是在输出接口排列时进行处理和实现的，流量控制有这几种形式：SHAPING(限制)，SCHEDULING(调度)，POLICING(策略)，DROPPING(丢弃)，大致原理如下：
- 针对网络物理设备（如以太网卡eth0）绑定一个队列QDisc
- 在该队列上建立分类class
- 为每一分类建立一个基于路由的过滤器filter
- 最后与过滤器相配合，建立特定的路由表    

具体原理可以参考[这篇文章](https://www.cnblogs.com/yxwkf/p/5424383.html)，内核流量控制不仅原理比较复杂，tc 命令的用法和参数也非常多，这里我们只关注用来注入netem模块来模拟网卡异常或故障的命令参数。这有点类似于前端经常使用的Chrome开发者工具的Network面板的网速控制。

> Netem（Netemulator） 是 Linux 2.6 及以上内核版本提供的一个网络模拟功能模块。该功能模块可以用来在性能良好的局域网中，模拟出复杂的互联网传输性能，诸如低带宽、传输延迟、丢包等等情况  

下面的wlp5s0是本机的无线网卡名称，需要替换成执行机器上真实的网卡(ifconfig 或 ip addr 可以查看网卡信息)。

```bash
# 首先安装相应工具： apt/yum install iproute iperf
# 查看当前网卡设备的流量排队规则（qdisc）
tc qdisc ls dev wlp5s0
 
# 在wlp5s0网卡设备上添加一个模拟100±50ms的延迟，最后一个25%是波动相关性系数
tc qdisc add dev wlp5s0 root netem delay 100ms 50ms 25%
# 删除上面添加的流量控制规则
tc qdisc delete dev wlp5s0 root netem delay 100ms 50ms 25%
 
# 模拟包 延迟 + 乱序
tc qdisc add dev wlp5s0 root netem delay 100ms reorder 25% 50%
tc qdisc delete dev wlp5s0 root netem delay 100ms reorder 25% 50%
 
# 模拟1%的丢包，30%也是波动相关性系数，或者替换成"distribution normal"实现真正的正态分布，更接近真实情况下，延迟丢包等问题往往集中出现在某个时间点
tc qdisc add dev wlp5s0 root netem loss 1% 30%
tc qdisc delete dev wlp5s0 root netem loss 1% 30%
 
# 模拟1%的包错误
tc qdisc add dev wlp5s0 root netem corrupt 1%
tc qdisc delete dev wlp5s0 root netem corrupt 1%

# 模拟1%的包重复
tc qdisc add dev wlp5s0 root netem duplicate 1%
tc qdisc delete dev wlp5s0 root netem duplicate 1%
```

## 模拟系统过载
除了直接故障注入，还有一个间接注入的办法，就是压垮操作系统。 [Stress/Stress-NG](https://www.tecmint.com/linux-cpu-load-stress-test-with-stress-ng-tool/)是Linux下两个常用的系统级压力测试工具，**stress**命令简单易用，**stress-ng**是stress的升级版，支持**数百个参数定制各种压CPU、内存、IO、网络**的姿势。在系统过载的场景下，应用服务可能会出现意想不到的错误或异常，在测试**负载均衡和熔断降级**时非常有用。这里只列举了几个常用的命令，详细使用参考"stress-ng --help"或"man stress-ng"。另外，这些“烤机”命令来测试服务器性能也是不错的。

```bash
# 一般默认源就有这两个工具，直接安装
sudo apt/yum install stress stress-ng

# 在两个CPU核心上跑开方运算，并且启动一个不断分配释放1G内存的线程，运行10秒后停止
stress --cpu 2 --vm 1 --vm-bytes 1G  -v --timeout 10

# 启动一个线程不断执行sync系统调用回写磁盘缓存，并且启动一个线程不停地写入删除512MB数据，运行10秒停止
stress --io 1 --hdd 1 --hdd-bytes 512M -v --timeout 10

# stress-ng 基本用法与stress完全兼容，但有更多的参数可选，并且可以查看统计信息
# --sock 可以模拟大量的socket连接断开以及数据的发送接收等等
stress-ng --sock 2 -v --timeout 10 --metrics-brief
```