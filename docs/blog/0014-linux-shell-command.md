---
title:      "[Linux入门] 常用命令和Vim操作汇总"
date:       2018-01-30
tags:
    - Linux
    - vim
---

> 本文收录一些常用的linux运维命令和基础知识, 持续更新, 不常用的命令和参数自行用man命令查阅或在此[网址://man.linuxde.net/](//man.linuxde.net/)下查询

## 常用文件位置

#### 打开终端预执行的脚本位置
```bash
# shell登录
/etc/profile
/etc/profile.d/*.sh 
/root/.bash_profile
/root/.bashrc
/etc/bashrc

# 非shell登录时只会执行这几个
/root/.bashrc
/etc/bashrc
/etc/profile.d/a
```
常见的做法是编辑/username/.bashrc文件, 写入自定义的命令之后, 再使用
**source /username/.bashrc**命令使之生效, 其中source命令是用来在非shell环境中执行脚本的.

#### 常用软件的配置位置
- nginx: /etc/nginx/nginx.conf
- docker: /etc/docker/daemon.json
- network: 
  - [debian系]/etc/network/interfaces
  - [red-hat系]/etc/sysconfig/network-script/ifcfg-xxx
- vsftp: /etc/vsftpd/vsftpd.conf
  - [VsFtp配置好的例子](//filecdn.code2life.top/vsftpd.conf)
- pam: /etc/pam.d/*
  - [Linux认证模块: PAM介绍和配置](//v.colinlee.fish/posts/pam-tutorial-1-intro.html)

#### 内核与系统组件相关文件位置
- 用户密码: /etc/shadow /etc/passwd
  - /etc/passwd列格式 用户名:口令:用户标识号:组标识号:注释性描述:主目录:登录Shell
  - /etc/shadow列格式 登录名:加密口令:最后一次修改时间:最小时间间隔:最大时间间隔:警告时间:不活动时间:失效时间:标志 
- host: /etc/hosts /etc/hostname
- cron: /etc/crontab /etc/cron.d/*
- 进程信息: /proc/pid
- 负载信息: cat /proc/loadavg
- 默认PATH:  
  - /usr/local/sbin
  - /usr/local/bin
  - /usr/sbin
  - /usr/bin
  - /sbin /bin
- DNS: /etc/resolv.conf
- DHCP: /etc/dhclient.conf
- 文件系统: /etc/fstab [可配合fdisk命令查看分区信息]
  - 软驱装配点 /floppy /mnt/floppy /media/floppy
  - 光驱装配点 /cdrom /mnt/cdrom /media/cdrom
- 内核信息: /proc/version
- 红帽系selinux: /etc/selinux/config 

## 日常运维命令

#### 文件/进程/网络管理
- last/lastb 查看登录/登录失败的历史
- top 查看实时进程资源占用
- tload 显示系统的负载情况
- w 显示当前登录的用户信息
- ps -aux 查看进程列表
- free -m 查看内存使用情况
- setenforce 0 临时关闭selinux
- du -sh 查看当前目录占用大小
- df -lh 查看本地磁盘使用情况
- du -h --max-depth=3 /dir 递归查询/dir中3层以内的目录所有文件的大小
- du -cks * | sort -rn | head -n 10 查找前10个最大 的文件或目录
- rm /var/cache/apt/archives/lock && rm /var/lib/dpkg/lock Ubuntu下解除dpkg的锁
- fdisk -l 查看磁盘分区情况
- uname -a / lsb_release -a 查看内核/发行版信息
- lsof -i:80 查看占用80端口的进程
- netstat -anp 配合grep查看占用端口的进程
- ss -aA tcp / ss -lnt / ss -ltp /ss -s 查看socket端口详情和统计
- iptables -L -n 查看iptables配置
- date -s "20180101 15:30:30" 设置时间,date命令查看时间
- ntpdate -u ntp.api.bz 与授时服务器同步时间
- 一波Combo直接杀掉名称匹配字符串的进程
```bash
ps -aux|grep nginx'.*master'|awk -F ' ' '{print $2}'|sed '2d'|xargs -r -t kill -9
```
- 一波Combo直接杀掉占用端口的进程 
```bash
lsof -i :80 | awk -F ' ' '{print $2}' | sed '1d' | xargs -r -t kill -9
```

## grep | sed | awk 专题

#### 待更新

## vim的正确打开方式

#### 6种模式及其状态转换

1. 普通模式
  - 打开vim默认的模式
  - 能够进行光标移动删除等各种命令
2. 插入模式
  - 按a/i进入(append/insert)
  - esc退出
3. 末行模式
  - 按冒号进入
  - 执行命令后进入普通模式
4. 可视模式
5. 选择模式
6. Ex模式
后面3种模式不常用, 前3个模式熟练运用即可. 

#### 最常用的指令集合
1. [数字] + hjkl/方向键, 跳转光标,前置数字跳转指定的行
2. [数字] + dd 删除一行或指定行数, dG删到末尾, d1G删到开头, dnG删到光标在n行处; n + x/X按字符删除, x往后删, X往前删
3. [数字] + yy 复制当前行, yG/ynG与dd相似, 批量复制行, 与p/P 往前/往后粘贴搭配使用  
4. u撤销, Ctrl+r重做
5. 末行模式下: wq保存退出, q!放弃保存退出, ZZ命令相当于执行了:wq
6. / + xxx, 搜索xxx字符, 也可以跟正则表达式, n下一个,N上一个, 前面可以加数字跳转多个
7. :%s/regex/replacement/gc 文本替换, %全文替换, 不加%单行替换, 加g替换所有, 不加g替换单个, c表示每次替换需要确认
8. v/V进入文本选择, 配合+y/y +p/p可以批量选择,复制粘贴(带加号复制粘贴系统剪切板不一定支持, 不带加号是寄存器复制粘贴)
9. :set nu 设置行号 :set nonu 取消行号
10. ctrl+f: 下翻一屏 ctrl+b: 上翻一屏

#### Vim操作脑图(盗来的图)
![vim](//filecdn.code2life.top/vim-01.png)

#### Vim键盘
![vim](//filecdn.code2life.top/vim-02.png)

#### 结语
任何一个领域稍微深入一些探索都远比在远处旁观复杂的多, 对技术保持敬畏.

