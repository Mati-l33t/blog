---
title:      "[分布式专题] Docker命令合集"
date:       2018-03-10
tags:
    - docker
---

## Docker 命令行接口
Docker提供了丰富的CLI用于容器的管理及相关配置, 这里记录一些**常用的命令和参数**

#### 运行容器常用参数
**docker run:** 启动一个容器, 如果没有镜像会自动下载镜像, 这是最常用的命令之一, 参数也是最多的
- **-v** 挂载卷 宿主目录:容器目录
- **-m** 挂载一个文件系统 与-v类似, 实际上大多使用-v参数
- **-p** 绑定端口 宿主端口:容器端口
- **--name** 指定容器名称
- **--rm** 退出后自动删除, 不能与-d同时使用
- **-d** 后台守护进程模式启动
- **-it** 分配一个伪终端并开启标准输入实现交互式访问容器(-i interactive, -t tty)
- **--link** 链接到另一个容器, 在当前容器中写入hosts能够直接访问另一个容器
- **-m** 限制内存字节数
- **-c** 限制cpu的使用率
- **-e** 从外部导入容器的环境变量
- **-a** 与主机关联标准输入输出
- **--network** 指定网络堆栈, 除默认docker0网桥外, 可以通过docker network create自定义网络

#### 运行容器示例
**在交互式伪终端命令行中启动一个busybox, busybox是一个精简的微型linux系统, 包括了几百个命令行工具, 非常小.**
>docker run --name busybox -it --rm busybox

**启动mongodb容器示例, 挂载/data/db用于存储BSON数据, 同时暴露27017端口, --bind_ip_all是mongod的启动参数, 让mongodb对外部可见**
>docker run --name mongodb -d -p 27017:27017 -v /home/mongo_data:/data/db  mongo mongod --bind_ip_all

**使用/bin/bash作为入口命令交互式的启动一个node.js容器**
>docker run -it --name node_cmd --rm node /bin/bash

**一般启动应用的命令**
>docker run --name application1 -d -p 80:80 -v --link mysql /home/docker_application1:/data

#### 容器管理
- **docker ps**: 查询容器
    - -a 查询所有容器, 包括非运行状态的
    - -q 只查询ID
- **docker rm**: 删除某个或某些容器(-f 参数强制删除)
- **docker rmi**: 删除某个或某些镜像(-f 参数强制删除)
- **docker images**: 查询本地镜像列表
- **docker logs**: 查询某个容器的日志
- **docker start/stop/restart**: 不言而喻
- **docker attch**: 与run命令-a参数一样, 重定向容器的标准输入输出
- **docker search**: 在仓库中搜索一个镜像
- **docker info**: 查询Docker运行状态
- **docker network/volume/image/container** 管理网络/卷/镜像/容器.这些用的不多, --help自行查询了
- **docker inspect** 检查一个容器的详细情况, 定位问题时常用
- **docker stats** 检查容器对cpu和内存的使用情况

- 停止所有的容器
    >docker stop -f $(docker ps -a -q)

- 删除所有的容器
    >docker rm -f $(docker ps -a -q)

## Dockerfile与镜像构建

#### 镜像定制
在实际使用过程中, 或者CI/CD的流程中, 需要制作包含应用程序的镜像. Docker提供了很多用于修改制作镜像的命令, 以及基于Dockerfile的镜像构建机制
```bash
# Dockerfile 编写好之后, 就可以执行build命令构建了
# 也可以指定一个名称, 标签, 指定一个包含Dockerfile的目录执行构建镜像
# --rm用于构建完之后删除临时中间镜像
docker build --rm -t name:tag dir4Dockerfile 
#再附加 -m --cpu-xxx 参数还可以设置内存CPU配额

# 在容器中执行一条命令
docker exec -it container mkdir /data

# 查看当前镜像发生了哪些变化
docker diff container

# 本地提交镜像的更改, 与Git非常类似
# 提交修改, 提交后docker images能看到新的镜像, 可以运行使用
docker commit --author "xx" --message "xxx" container namespace/image:tag 

# 将本地提交的镜像推送到注册中心对应的镜像仓库中
# 上传修改, 默认上传到了docker.io, 在cloud.docker.com中登录后可以看到,
# 经过几分钟后DockerHub也可以搜索到, 可通过docker login 不同账号上传到私有仓库中
docker push namespace/image:tag
```

#### Dockerfile示例
Dockerfile是构建镜像的基础, 它的语法比较简单, 主流的编辑器都能找到对应的插件, 这里Mark几个链接
- [Dockerfile语法](//www.docker.org.cn/dockerppt/114.html)
- [Dockerfile编写的最佳实践](//www.jb51.net/article/115327.htm)
- [Dockerfile编写及ENTRYPOINT和CMD的区别](https://www.cnblogs.com/lienhua34/p/5170335.html)

这是一个常见的Dockerfile的格式
```bash
FROM image:tag
LABEL maintainer "xx@xx.com"

WORKDIR 可以有多个, RUN之间可以切换

ENV VARIABLE XXX
...
ARG ARGUMENT=XXXX

VOLUME /dir /dir2  声明挂载点

COPY Dockerfile外部的文件 /dir3
ADD  自解压,普通外部文件,URL都可以 /dir4

RUN Command
RUN Command
...
RUN Command

EXPOSE port

HEALTHCHECK CMD curl --fail //localhost:$APP_PORT || exit 1

ENTRYPOINT ["XXX.sh"]

# 用户启动容器时指定的命令会覆盖此命令, 只能写一条作为默认执行的命令
# 也可以不指定命令, 指定数据作为ENTRYPOINT的参数
CMD ["XXX", "XXX"] 
```

#### Dockerfile编写建议
我把[这篇编写Dockerfile最佳实践](//www.jb51.net/article/115327.htm)里面的一些重点摘录了下来, 理解了容器的运行原理和镜像构建原理之后, 也就很容易理解为什么这样做更好了
- 编写.dockerignore文件
- 容器只运行单个应用
- 将多个RUN指令合并为一个
- 基础镜像的标签不要用latest
- 每个RUN指令后删除多余文件
- 选择合适的基础镜像(alpine版本最好)
- 设置WORKDIR和CMD
- 使用ENTRYPOINT (可选)
- 在entrypoint脚本中使用exec
- COPY与ADD优先使用前者
- 合理调整COPY与RUN的顺序
- 设置默认的环境变量，映射端口和数据卷
- 使用LABEL设置镜像元数据
- 添加HEALTHCHECK

## 附录
#### 安装Docker命令
```
yum install -y yum-utils device-mapper-persistent-data lvm2
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
yum install docker-ce

systemctl enable docker
systemctl start docker
```

#### CentOS7 /etc/docker/daemon.json 修改国内镜像地址
```
{
"registry-mirrors": ["https://kuamavit.mirror.aliyuncs.com", "https://registry.docker-cn.com", "https://docker.mirrors.ustc.edu.cn"], 
"max-concurrent-downloads": 10,
"log-driver": "json-file",
"log-level": "warn",
"log-opts": {
    "max-size": "10m",
    "max-file": "3"
    }
}
```

## 结语
当前比较前沿的**微服务架构**以及**DevOps**需要一系列高效率的生产工具和更现代化的技术路线来支撑, **容器化**无疑是当前最被广泛认可的优秀的基础技术之一. 这篇和上篇把Docker一些基础的知识梳理了一遍, 更深层次的东西等以后在实践中慢慢领悟了.