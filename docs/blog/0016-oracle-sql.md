---
title:      "Oracle常用SQL及性能优化汇总"
date:       2018-02-11
tags:
    - Database
---

>本文记录一些作为DBA或数据库开发角色所要了解的Sql语句和关于Oracle的知识技巧

[这个地方](//blog.csdn.net/yangshangwei/article/details/52449489)有非常专业详细的Oracle调优可能用到的Sql  

## 实用SQL合集

#### 查看一些基础参数
```sql
-- 查看最大允许的连接数
show parameter processes;

-- 查看当前连接数(加上ACTIVE是当前并发的连接)
select count(*) from v$session where status='ACTIVE';

-- 查看数据库用户
select * from all_users;

-- 查看数据库版本
select banner from sys.v_$version;
```

#### 查询表空间
```sql
-- oracle中表空间相当于物理存储的位置, 每个用户都会指定一个表空间
-- 当表空间不足时会带来很多问题, 配置足够的表空间非常重要
select a.tablespace_name,
       a.bytes / 1024 / 1024 "sum MB",
       (a.bytes - b.bytes) / 1024 / 1024 "used MB",
       b.bytes / 1024 / 1024 "free MB",
       round(((a.bytes - b.bytes) / a.bytes) * 100, 2) "used%"
  from (select tablespace_name, sum(bytes) bytes
          from dba_data_files
         group by tablespace_name) a,
       (select tablespace_name, sum(bytes) bytes, max(bytes) largest
          from dba_free_space
         group by tablespace_name) b
 where a.tablespace_name = b.tablespace_name
 order by ((a.bytes - b.bytes) / a.bytes) desc;
```

#### 挂载新的表空间
```sql
-- 将该dbf文件挂载到当前数据库,以200M为步长自动扩展最大8G
alter database datafile 'D:\NEW_TABLE_SPACE.dbf' autoextend on next 200m maxsize 8192m
```

#### 查询当前执行的事务或SQL
```sql
-- 在排查事务执行慢的原因时非常有用, 可以看到当前执行的sql处于何种等待事件
SELECT s.sid, s.serial#, s.event,
       a.sql_text, a.sql_fulltext,
       s.username, s.status, s.machine,
       s.terminal, s.program, a.executions,
       s.sql_id, p.spid, a.direct_writes
  FROM (SELECT * FROM v$session WHERE status = 'ACTIVE') s
  LEFT JOIN v$sqlarea a
    ON s.sql_id = a.sql_id
 INNER JOIN v$process p
    ON s.paddr = p.addr

-- 正在执行的SQL
SELECT b.sid oracleID,
       b.username 登录Oracle用户名,
       b.serial#,
       spid 操作系统ID,
       paddr,
       sql_text 正在执行的SQL,
       b.machine 计算机名
FROM v$process a, v$session b, v$sqlarea c
WHERE a.addr = b.paddr
   AND b.sql_hash_value = c.hash_value
```

#### 干掉一个死锁的SQL会话
```sql
-- alter ssytem kill session 'sid,serial#';
-- 这个比较常用, 解决掉某个被锁住的会话, 下面这句话可以查询死锁会话
SELECT 'alter system kill session ''' || sid || ',' || serial# || ''';' "Deadlock"
  FROM v$session
 WHERE sid IN (SELECT sid FROM v$lock WHERE block = 1);
```

#### 侦查一下有哪些人在删数据
```sql
-- 使用Hist视图查询最近三天执行过哪些删除语句
-- dba_hist_sqltext的command_type字段有以下常见的几种类型
-- 2 insert; 3 select; 6 update; 7 delete;
-- 42 alter session; 44 commit; 47 begin...end; 48 SET TRANSACTION;
-- 49 alter system; 85 truncate table;
SELECT c.username,
         a.program,
         b.sql_text,
         b.command_type,
         a.sample_time
    FROM dba_hist_active_sess_history a
         JOIN dba_hist_sqltext b
            ON a.sql_id = b.sql_id
         JOIN dba_users c
            ON a.user_id = c.user_id
   WHERE     a.sample_time BETWEEN SYSDATE - 3 AND SYSDATE
         AND b.command_type IN (7, 85)
ORDER BY a.sample_time DESC;
```

#### 如何删库跑路
Oracle中并没有提供类似Mysql中的**drop database**语句, 删起库来很不方便, 只能自己动手拼接字符串来删库跑路了
```sql
-- 这些语句分别从user_tables ... user_triggers 等表中
-- 选择出数据库的表,序列,存储过程,触发器等, 拼接drop实现获取删除语句
select 'drop table ' || table_name ||' cascade constraints PURGE;'
       ||chr(13)||chr(10) 
from user_tables;

select 'drop sequence ' || sequence_name||';'||chr(13)||chr(10) 
from user_sequences;

select 'drop procedure ' || object_name||';'||chr(13)||chr(10) 
from user_objects where object_type='PROCEDURE';

select 'drop TRIGGER "' ||sys_context('USERENV','CURRENT_USER')||'"."'
       || trigger_name ||'";' ||CHR(13) ||CHR(10) 
from user_triggers;
```

## 性能调优
Oracle数据库的调优是一门很深的学问, 此处先记录一些非常**简单有效**的优化方法, 高端的调优方法还是得找专业DBA人员. 
在定位问题时, 除了查询v$xxx表获得信息外, 生成分析AWR性能报告也是个好办法, [这里](//blog.itpub.net/26954807/viewspace-1300697/)有一个关于AWR报告如何分析的文章

#### 进程数、最大连接数配置
上面记录了查看最大连接数的办法**show parameter processes**, 修改的办法自然是用**alter system**语句了
```sql
-- 最大并发连接设置为300
alter system set processes = 300 scope = spfile;
```

#### SGA/PGA配置
SGA/PGA是oracle内存结构的重要部分, 配置的参数直接影响了oracle可用的内存大小, 相关的各种内存池的大小, [这里](//blog.itpub.net/25264937/viewspace-694917/)有一个关于oracle内存结构的文章.

- **SGA大小**: 对于一个纯数据库系统, 应该分配**80%的总内存**, 剩下的给操作系统即可, 数据库+应用的系统适当减少SGA大小
- **PGA大小**: 一般的OLTP应用, 分配**SGA的20%**即可, 如果有很多大查询, 适当增加PGA的大小, 但不要超过SGA的50%  

```sql
-- 进入sqlplus命令行
sqlplus sys/password as sysdba

-- 查看数据库参数
show parameter sga;
show parameter pga;
show parameter workarea;

-- 修改SGA(System Global Area)
alter system set sga_max_size=4096M scope=spfile;
alter system set sga_target=4096M scope=spfile;

shutdown immediate;
startup;

-- 修改PGA(Program Global Area)
alter system set workarea_size_policy=auto scope=both; 
alter system set pga_aggregate_target=512m scope=both; 

-- 10g后db_cache_size自动管理, 非专业人士不要乱改
alter system set db_cache_size=1024M  scope=spfile sid='数据库SID';

-- 查看字典缓冲区的使用率, 低于90%的增加shared_pool_size
select (sum(gets-getmisses-usage-fixed))/sum(gets) 
"Data dictionary cache" from v$rowcache;
alter system set SHARED_POOL_SIZE = 64M;  
```

#### SQL和表结构优化
除了数据库本身的配置, 表的设计和SQL本身也是影响执行效率的决定性因素. 大部分情况下, 数据库的瓶颈都是人为造成的, 但大多也都归咎于硬件太差/数据量过大/网络不好等因素, 但在甩锅的时候, 也应该考虑一下这些可能提升性能的地方是否都已经做到了. 
- **[索引](//blog.itpub.net/7450001/viewspace-911115/)**
  - 成也索引, 败也索引, 以牺牲少量的写入性能换取读取性能的极大提高, SQL优化利器
  - 索引的类型有B-Tree索引, 位图索引, 函数索引等等. 选择索引的类型/字段要视业务而定, 这里有一些[通用的原则](https://www.cnblogs.com/downey/p/5302088.html)
- **并行**
  - 开启并行: **alter session enable parallel dml;**
  - 并行查询(table可选, n为并行度): select /*+PARALLEL([table], n)*/ * from table 
- **避免低效的写法**
  - 大部分情况下, insert时大量values批量插入比执行n条insert语句快好几个数量级
  - merge into比 insert into ... select快, 比 update 快一个数量级
  - select的字段中嵌套select非常危险
  - in不一定比exists更快, in只支持1000个以下
  - union/union all可以代替两次select, union有时候还能代替去重
  - 存储过程一般比较快, 但不到万不得已不要用, 调试和维护的成本太高
  - truncate比delete更快
  - 越底层的库/框架越快, Mybatis没有JDBC快, Dapper没有ADO.NET快, ADO.NET没有ODP.NET快, 至于EntityFramework只能呵呵了
  - ...
- **[物理存储上分库分区分表](https://www.cnblogs.com/adolfmc/p/5381737.html)**
  - 范围分区/Hash分区/复合分区
  - 读写分离
- **表设计**
  - CHAR比VARCHAR更快, VARCHAR比*LOB更快, 视实际情况选择合适的字段
  - 只增不删或很少删的表可以使用nologing, 配合**/*+append*/高水位线插入**提升效率, 可以使用在table或insert语句上, [这里有详述](https://www.cnblogs.com/softidea/p/5336741.html)
  - 表结构尽量符合第三范式减少不必要的冗余
  - ...

SQL的优化又是可以写一整本书的事情了, 这里列举的几个有的是Oracle特有的, 有的是所有RDBMS通用的, 此文不再深入讨论.


