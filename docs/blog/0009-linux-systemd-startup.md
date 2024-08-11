---
title:      "[Linux入门] Systemd与开机自启动"
date:       2017-12-16
tags:
    - DevOps
---

# {{ $frontmatter.title }}

## systemd简介
>systemd即为system daemon,是linux下的一种init软件, 目标是提供更优秀的框架以表示系统服务间的依赖关系, 并依此实现系统初始化时服务的并行启动, 同时达到降低Shell的系统开销的效果, 最终代替现在常用的System V与BSD风格init程序. 由于systemd使用了cgroup与fanotify等组件以实现其特性, 所以只适用于Linux. 

systemd是一组用于管理守护进程的Linux工具, 它取代了initd, 成为系统第一个启动的进程, 其他进程都是它的子进程. 主流的发行版Debian 8, CentOS 7, 都已经使用了systemd.然鹅, 由于其带来的巨大变化是颠覆性的, 而且其主要命令systemctl长度竟然有9个字母, 在开源社区一直饱受争议. systemd统一了Linux中多样化的自启动方式, 用更加先进的架构和实现管理进程启动(一定程度上提高了启动速度), 将系统启动相关的守护进程几乎全部纳入控制范围, 这些特点都有正反两面, 不能一概而论.

#### systemd的特性
- 支持并行化任务
- 同时采用socket式与D-Bus总线式激活服务
- 按需启动守护进程（daemon）
- 利用 Linux 的 cgroups 监视进程
- 支持快照和系统恢复
- 维护挂载点和自动挂载点
- 各服务间基于依赖关系进行精密控制

## systemd出现之前的启动流程
在systemd出现之前Linux发行版进程自启动主要有两种风格, System V与BSD([科普传送门](//blog.csdn.net/qq_29344757/article/details/78657874)), 下面以我们经常使用的红帽系CentOs和Debian系Ubuntu为例, 归纳不同版本自启动进程的实现方式.

#### SysVinit启动流程与开机自启服务的实现
System V启动的完整流程在这里: [传送门](https://www.cnblogs.com/sysk/p/4778976.html)

这里涉及到运行级别的概念, System V风格的linux有7种运行级别: 
- 0：系统停机状态，系统默认运行级别不能设为0，否则不能正常启动运行级别
- 1：单用户工作状态，root权限，用于系统维护，禁止远程登陆运行级别
- 2：多用户状态(没有NFS)运行级别
- 3：完全的多用户状态(有NFS)，登陆后进入控制台命令行模式运行级别
- 4：系统未使用，保留运行级别
- 5：X11控制台，登陆后进入图形GUI模式运行级别
- 6：系统正常关闭并重启，默认运行级别不能设为6，否则不能正常启动

在CentOS 7之前, /etc/inittab文件可以配置运行级别, 但从CentOS 7开始, 打开此文件可以看到这个文件已经失效了, 提示需要从systemd配置中修改运行级别. 当然telinit命令也可以用于修改默认的运行级别, 下图是CentOS 7中inittab文件的内容
![inittab](//filecdn.code2life.top/inittab.jpg)

在/etc/rc.d下有7个名为rcN.d的目录，对应系统的7个运行级别, 系统会根据指定的运行级别进入对应的rcN.d目录, 并按照文件名顺序检索目录下的链接文件
- 对于以K开头的文件，系统将终止对应的服务 
- 对于以S开头的文件，系统将启动对应的服务

其中rc.sysinit是系统初始化脚本, rc.local是给用户自定义启动时需要执行的文件, rc.local是所有级别的脚本运行完之后才会运行的, 也是SysV启动的最后一步.在rc.local中添加自定义的命令或运行指定脚本, 是实现自启动进程或服务的最简单的方式, 但由于难以维护管理, 并且没有守护进程的优势, 对于错误和异常没有任何处理流程, 一般不建议使用

#### Upstart启动流程
> Upstart是一个基于事件的/sbin/init守护进程的替代品, 它在启动过程中处理启动任务和服务，在关闭期间停止它们并在系统运行时监督它们. 它最初是为Ubuntu 发行版开发的，但它的目的是适合在所有Linux发行版中部署, 作为历史悠久的System-V init的替代品, 它具有以下特点

- 任务和服务按事件启动和停止
- 事件是在任务和服务启动和停止时生成的
- 事件可以从系统上的任何其他进程接收
- 如果服务意外死亡，服务可能会重新生成
- 守护进程的监督和重建，与父进程分离
- 通过D-Bus与init守护进程通信
- 用户服务，用户可以自行启动和停止

Upstart是兼容SysV启动方式的, 但由于采用的更先进的事件模型, 启动速度更快. 大部分较新的发行版如Ubuntu, CentOS, Fedora在转型systemd之前, 都是使用Upstart方式启动的.

#### CentOS 7之前实现开机自启
使用 chkconfig + service 实现自启动脚本和服务  
>chkconfig命令主要用来更新（启动或停止）和查询系统服务的运行级信息。谨记chkconfig不是立即自动禁止或激活一个服务，它只是简单的改变了符号连接

首先在/etc/init.d目录下编写一个服务脚本, 其中前两行是必须的, 第一行表示运行程序, 第二行表示运行级, 启动优先级, 停止优先级, 而description是服务的描述, 起到注释作用
```bash
#!/bin/bash
# chkconfig: 2345 10 90 
# description: http .... \
# http service demo

start() {
  echo "HTTP is enabled now"
}
stop() {
  echo "HTTP is disable now"
}
case "$1" in
start)
  start
  ;;
stop)
  stop
  ;;
restart)
  stop
  start
  ;;
*)
  echo "USAGE $0 {start|stop|restart}"
  exit
esac
```

服务脚本编写好之后, 可以使用chkconfig命令改变rcN.d中的K/S入口文件软连接, 具体用法如下
```bash
# 显示所有运行级系统服务的运行状态信息（on或off）
# 如果指定了name，那么只显示指定的服务在不同运行级的状态
chkconfig --list [name]

# 增加一项新的服务
# chkconfig确保每个运行级有一项启动(S)或者杀死(K)入口
# 如有缺少，则会从缺省的init脚本自动建立
chkconfig --add name

# 删除服务，并把相关符号连接从/etc/rc[0-6].d删除
chkconfig --del name

# 设置某一服务在指定的运行级是被启动，停止还是重置
chkconfig [--level levels] name

# eg: 
# chkconfig --level 35 http on
# chkconfig mysqld off
```

chkconfig配置好, 开机将自动运行自定义的服务, 同时service命令可以手工控制服务的运行, 查看运行状态等
```bash
service http start
service http restart
service http stop
service network status
```

#### Ubuntu 16.04之前实现开机自启
使用 update-rc.d + service 实现自启动脚本和服务, update-rc.d命令与红帽系中的chkconfig命令作用几乎一样, 能够修改rcN.d中的软连接, 从而实现自启动服务

```bash
# 95代表启动的优先级
update-rc.d http defaults 95

# Ubuntu中也可以使用service命令
service http restart

# 移除一个自启动服务
update-rc.d -f http remove
```

## Systemd时代的自启动服务实现(CentOS 7/Ubuntu 16.04/Debian 8)
Ubuntu 从15.04开始, 逐步使用 systemd 替代了upstart, systemd包括一系列的工具和管理单元(Unit),以CentOS 7为例, 默认的Unit存放位置在/usr/lib/systemd/system,/usr/lib/systemd/user目录中, 以及/etc/systemd/system中. 如果需要自定义一个开机自启的服务, 一般在/etc/systemd/system中建立一个serivce文件, 使用systemctl加载即可, 一个典型的service文件写法如下
```bash
[Unit]
Description=nginx
Documentation=//nginx.org/en/docs/
After=network.target  remote-fs.target nss-lookup.target

[Service]
Type=forking
PIDFile=/run/nginx.pid
ExecStartPre=/usr/sbin/nginx -t -c /etc/nginx/nginx.conf
ExecStart=/usr/sbin/nginx -c /etc/nginx/nginx.conf
ExecReload=/bin/kill -s HUP $MAINPID
ExecStop=/kill -s QUIT $MAINPID
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```
具体每个区块的含义和完整解释这里有详细的描述: [Mark](//www.ruanyifeng.com/blog/2016/03/systemd-tutorial-commands.html)  
在编写完成Unit文件后, 再来两行就可以了现在启动守护进程了
```bash
# enable 相当于在对应的target.wants文件夹下建立软连接
systemctl enable xxxservice
systemctl disable xxxservice

systemctl daemon-reload
systemctl restart xxxservice
```
## systemd其他用途
Systemd可以做的事情远不止实现开机自启服务, systemd提供了一系列强(fu)大(za)的工具链, 最常用的比如journalctl用于查看各种日志信息
> journalctl -xe

- louginctl查看当前登录的用户
- timedatectl查看当前时区和时间日期设置
- hostnamectl命令用于查看当前主机的信息
- systemd-analyze用于查看启动耗时
- 等等

最主要的systemctl命令, 玩法也有很多, 常用的比如
```bash
systemctl enable xxxservice
systemctl daemon-reload
systemctl restart xxxservice
systemctl reboot
systemctl poweroff
```
完整的参数清单多的可怕, 呈上**终极Shell zsh**自动补全的截图
![args](//filecdn.code2life.top/systemctl-args.jpg)  
![params](//filecdn.code2life.top/systemctl-params.jpg)

查看日志的命令参数也有这些
![params](//filecdn.code2life.top/journalctl-params.jpg)

总之, systemd作为一种更先进的技术, 虽有争议, 但既然主流的发行版以及采用了这种方式, 我们应该以开放的心态, 去学习和实践, 今夕对比, 互相借鉴其中好的地方.

> Keep It Simple and Short

