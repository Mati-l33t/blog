---
title:      "Mybatis Generator的配置和使用"
date:       2018-01-06
tags:
    - Java
    - Database
---

## Mybatis Generator的配置
Mybatis Generator是一个很强大的代码生成工具, 能够根据配置生成数据库对应的ORM对象, Mybatis映射SQL语句, 数据接口等
配置方式见下面的xml代码
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE generatorConfiguration
    PUBLIC "-//mybatis.org//DTD MyBatis Generator Configuration 1.0//EN"
    "//mybatis.org/dtd/mybatis-generator-config_1_0.dtd">
<generatorConfiguration>
    <!--导入属性配置 -->
    <properties resource="jdbc.properties"/>
    <!--指定特定数据库的jdbc驱动jar包的classpath -->
    <classPathEntry location="${driverLocation}"/>
    <context id="default" targetRuntime="MyBatis3">
        <!-- optional，旨在创建class时，对注释进行控制 -->
        <commentGenerator>
            <property name="suppressDate" value="true"/><!-- 是否取消日期 -->
            <property name="suppressAllComments" value="true"/><!-- 是否取消注释 -->
        </commentGenerator>
        <!--jdbc的数据库连接 -->
        <jdbcConnection driverClass="${driver}" connectionURL="${url}" userId="${username}"
                        password="${password}">
        </jdbcConnection>
        <!-- 非必需，类型处理器，在数据库类型和java类型之间的转换控制 -->
        <javaTypeResolver>
            <property name="forceBigDecimals" value="false"/>
        </javaTypeResolver>
        <!-- 下面是重点! javaModelGenerator配置生成的ORM对象, targetProject填写目标项目的相对路径 -->
        <javaModelGenerator targetPackage="model" targetProject="src/main/java">
            <!-- 是否允许子包，即targetPackage.schemaName.tableName -->
            <property name="enableSubPackages" value="false"/>
            <!-- 是否对类CHAR类型的列的数据进行trim操作 -->
            <property name="trimStrings" value="true"/>
        </javaModelGenerator>
        <!--Mapper映射文件生成所在的目录 为每一个数据库的表生成对应的SqlMap文件 -->
        <sqlMapGenerator targetPackage="mapping" targetProject="src/main/java">
            <property name="enableSubPackages" value="false"/>
        </sqlMapGenerator>
        <javaClientGenerator targetPackage="dao" targetProject="src/main/java" type="XMLMAPPER">
            <property name="enableSubPackages" value="false"/>
        </javaClientGenerator>
        <!-- 具体每张表的ORM配置, 选择性的配置需要的数据接口 -->
        <table tableName="user" domainObjectName="User" enableInsert="true"  enableCountByExample="false"
               enableUpdateByExample="false" enableDeleteByExample="false" enableSelectByExample="false" selectByExampleQueryId="false" >
        </table>
    </context>
</generatorConfiguration>
```
详细配置说明见<a target="_blank" href="//www.cnblogs.com/liuconglin/p/5641146.html">这里</a>
## Maven + Idea下使用MybatisGenerator
IntelliJ IDEA下没有MybatisGenerator的插件, 可以使用<span style="color:red">Maven插件</span>解决这个问题
首先, 在pom文件的build节点下添加如下插件
```xml
<build>
	<plugins>
		<plugin>
			<groupId>org.mybatis.generator</groupId>
			<artifactId>mybatis-generator-maven-plugin</artifactId>
			<version>1.3.2</version>
			<configuration>
				<verbose>true</verbose>
				<overwrite>true</overwrite>
			</configuration>
		</plugin>
	</plugins>
</build>
```
其次, 添加Maven的 Run configuration, 启动命令如下
然后在classpath中添加generatorConfig.xml文件, 配置内容见示例  
![run](//filecdn.code2life.top/idea-run-config.png)  
最后运行配置的Run Configuration即可  
**注: iBatis/Mybatis mini plugin这个插件能够自动提示sql,非常爽**

## Eclipse + 插件 使用MybatisGenerator
Eclipse中下载这个插件, 能够直接在new file中找到Mybatis Generator Configuration  
![plugin](//filecdn.code2life.top/mybatis-plugin.png)  
配置好后, 右击generatorConfig.xml, 选择下面的Run as启动即可  
![run](//filecdn.code2life.top/eclipse-mybatis-generator.png)  
**注: 插件运行的classpath与Maven下的不同, 这里可能还要添加一层项目文件夹目录作为相对路径**

## 小结
经过数个项目的实践, MybatisGenerator的确是一个能搞大幅度提高开发效率的工具, 但要注意避免过度依赖, 如果开启过多**Example**生成, 会造成相关sqlMapper文件很大, 难以维护, 并且自动生成的按字段进行通用的增删改查接口性能方面肯定差于直接按照业务编写sqlMapper. 除了基本的模型类和sqlMapper外, 哪些额外的接口需要自动生成需要视业务而定, 这样才能在开发效率, 可维护性, 安全, 性能等方面得到权衡. 