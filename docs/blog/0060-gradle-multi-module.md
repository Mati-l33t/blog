---
title:      "如何使用Gradle管理多模块Java项目"
date:       2021-04-29
tags:
    - Java
---

# 如何使用Gradle管理多模块Java项目

由于项目需要，我最近学习了一点关于Gradle的**入门知识**，本篇以一个**含有多个子项目的Java SpringBoot工程**为例，总结分享一下**Gradle的基本原理和正确使用方式**。

写这篇文章，主要因为网上查阅到的Gradle相关博客和中文文档**几乎都已经过时**了，Gradle官方文档很靠谱但是是英文的，我读了一些文档，结合自己的理解尽量写的深入浅出一些，适合Java开发看。但是要系统学习Gradle还得看[官方文档](https://docs.gradle.org/current/userguide/getting_started.html)。

## Gradle从陌生到入门七问

#### Gradle是什么？

Gradle是一个以Groovy/Kotlin作为DSL的**灵活的**，**可扩展的**，高性能**构建工具**。广泛应用于多种语言和框架的项目构建，比如Android项目、Java类库和后端项目、多编程语言的项目等等

#### Gradle与Maven最本质的区别？

Maven的目的是用XML描述项目的**项目管理工具**，而Gradle是用DSL描述Build Task的**自动化构建工具**。虽然功能有重合的部分，但根本上它俩的思想和机制是完全不一样的。

#### 为什么Java项目推荐用Gradle替换Maven？

- Gradle比Maven**快**；
- Gradle默认使用的DSL是定制的Groovy，比XML**简洁**；
- Gradle的插件机制比Maven更**方便灵活**；
- Gradle的生态比Maven更加**广泛**，支持的编程语言和技术平台非常多样。

#### Gradle Wrapper是什么？

由于Gradle的版本迭代很快，为了能更方便管理Gradle自身的版本，并且让不同项目之间的Gradle版本**隔离开**不会互相影响，Gradle项目最好使用Wrapper模式。

使用Wrapper模式时，项目根目录有一个CMD/Shell**脚本（gradlew）**用来启动Gradle Wrapper，根据**gradle-wrapper.properties**的定义，wrapper从CDN下载对应的Gradle版本并执行构建，免去了开发人员自己去下载和配置Gradle环境变量的负担。

如果在当前项目中**升级Gradle的版本**，执行下面这行命令即可：

```bash
gradlew wrapper --gradle-version 7.0
```

使用Wrapper之后，本地也**不需要事先安装和配置gradle命令，直接用项目文件中的gradlew命令**即可。

#### Gradle的基本概念有哪些？

- 三级数据模型：Build，Project，Task。**一个Build可以包括1到N个Project，一个Project包括1-N个Task**；
- Task之间的关系是**有向无环图**（DAG），构建过程就是按照DAG依次执行其中的Task，Gradle可以看成**指挥官**，是**Task的调度器**；
- Plugin是底下真正**干活的**，不同的Plugin**实现不同功能的Task**，添加Plugin就会在Build中预定义Task和Configuration。

下图即是一个常规的Java项目Build过程经历的Task，像jar/classes等等这些Task的实现就是**Java Plugin**提供的。

![](//filecdn.code2life.top/gradle-dag.png)

#### Gradle的命令怎么用？

```bash
# 执行名为build的Task
gradle build

# 执行build Task时，跳过 test Task
gradle build -x test

# 执行时开启build cache和并行模式，减少构建时间
gradle build -x test --parallel --build-cache 

# 执行完把构建数据上传到Gradle云服务，在浏览器中直接分析，如下图所示
# --scan需要手动同意，首次激活链接后就可以看到构建报告了，功能非常强大
gradle build -x test --parallel --build-cache --scan

# 注： wrapper模式下，执行的是gradlew而非gradle
```

在线的Scan Report，可以看到每个Task的耗时、依赖树、单元测试失败的栈轨迹等等，花钱买Gradle Enterprise可解锁更强的功能哦。

![](//filecdn.code2life.top/scan-report.png)


#### Gradle的原理和核心流程是什么？

这个问题我们用**示例**来说明，我们创建一个简单的SpringBoot Web工程，包含3个子项目：
- application-api：是导出给其他服务用于RPC调用的模块；
- application-core：是这个Web工程的核心实现模块，包括controller/service/model等等MVC结构的常用包；
- application-boot：是SpringBoot的启动模块，包括启动类和Spring的JavaConfig配置类等等。

其**目录结构**如下（build.gradle里面具体内容在最后一节贴出详细代码来分析）：

```
├─build.gradle            # 描述根项目的依赖和构建的核心文件
├─settings.gradle         # 描述根目录和子项目的关键信息
├─gradlew                 # Wrapper的shell script
├─gradle.bat              # Wrapper的cmd script
├─application-api
│  ├─build.gradle         # 描述子项目的依赖和构建等信息
│  └─src
│      └─main
│         └─java
│            └─com.example.x
├─application-boot
│  ├─build.gradle         # 描述子项目的依赖和构建等信息
│  └─src
│      ├─main
│      │  ├─java
│      │  │  └─com.example.x
│      │  └─resources
│      └─test
│          └─java
│             └─com.example.x
├─application-core
│  ├─build.gradle         # 描述子项目的依赖和构建等信息
│  └─src
│      └─main
│         └─java
│            └─com.example.x
└─gradle
    └─wrapper
	     ├─gradle-wrapper.jar         # 一个很轻量的可执行jar，用于下载Gradle
	     └─gradle-wrapper.properties  # 描述gradle版本和下载相关配置
```

项目我们建好了，当我们执行**gradlew clean build -x test**就可以构建出来一个可执行的SpringBoot工程的jar包了。**那么执行这行命令时，到底发生了什么**？

1. **gradlew**用Java命令启动**gradle-wrapper.jar**，gradle尝试复用或创建一个指定版本的gradle，下载解压后，启动**gradle daemon**后台服务；
2. gradle扫描当前目录下的**gradle.properties**，用户目录（~/.gradle）下的**gradle.properties**等配置参数；
3. 寻找当前目录下的**settings.gradle**，build.gradle等文件，分析并魔改Groovy/Kotlin文件的**抽象语法树**，构建Task执行的步骤；
4. 如果settings.gradle文件**include**了其他子项目，继续找到对应的目录里的**build.gradle**等文件并分析内容，在这里就是application-boot/application-core/application-api三个子项目；
5. 如果依赖的特定版本的插件或库缺失，会到gradle/maven中心仓库或自定义仓库，**下载**缺少的**Plugin**和**Dependency**；
6. 开始按照流程图执行 'clean' Task，成功后再执行 'build' Task，由于参数-x指定了跳过'test' Task，DAG中的 'test' Task的子节点全部被排除无需执行，下面即是我们这个示例中的Task顺序图。

```
:build                                                         
+--- :assemble                                             
|    +--- :bootJar 
|    |    +--- :classes                                        
|    |    |    +--- :compileJava                               
|    |    |    |    `--- :application-boot:compileJava         
|    |    |    |         +--- :application-api:compileJava     
|    |    |    |         `--- :application-core:compileJava    
|    |    |    |              `--- :application-api:compileJava
|    |    |    `--- :processResources                          
|    |    +--- :application-api:jar
|    |    +--- :application-boot:jar
|    |    `--- :application-core:jar
|    `--- :jar                                                 
|         `--- :classes                                        
|              +--- :compileJava                       
|              `--- :processResources
|              .......  # 省略了一些输出                     
`--- :check                                                    
     `--- :test  # 未被其他Task使用的子节点已经被排除
```

注：上面的执行流程也是**org.barfuin.gradle.taskinfo**这个Gradle Plugin提供的 'tiTree' Task生成的，另外，由于我们使用了SpringBoot Plugin，assemble Task中执行的是 'bootJar' Task，而不是一节图中的 'jar' Task。

## Java + Gradle项目实战指南

#### 加依赖的正确方式

对于开发人员来说，不管是Maven还是Gradle，最常用的功能就是**二方/三方库的依赖管理**，我们从最简单的场景开始。大多数情况下，Gradle定义依赖只需要在**dependencies闭包**里写一行，比如这样的：

```groovy
implementation 'org.springframework.boot:spring-boot-starter:2.4.5'

// 不要再使用 compile 'xxx' 了
```

注意：**compile指令早在Gradle 3.x版本就已经弃用**，在Java项目中使用compile会导致**依赖传递（Transitive Dependency）**，也就是在A中定义的compile依赖，会传递到依赖了A的B项目**编译期间**的Classpath，污染了B项目。

我们再考虑一些复杂的情况：有时候，我们又想要依赖传递出去；有时候，我们想某个库对于依赖方不是必须的；有时候只想一些依赖在单元测试的时候编译进去...

- **api指令**: 声明一个**传递依赖**，等价于之前的compile，也等价于Maven的**compile scope**，慎用；
- **runtimeOnly指令**: 相当于Maven的**runtime scope**，仅运行时需要的jar,比如MySQL Connector, Logback/Log4j等；
- **compileOnly指令**: 仅添加到编译时的classpath中，类似于Maven的**provided scope**，不会打包到最终产物中, 比如**lombok**适合用compileOnly；
- **annotationProcessor指令**: JSR-269引入了编译期注解处理器, 在Java 1.6之后提供了这个修改源码AST的机会，我们熟悉的lombok用的就是这个原理，需要搭配compileOnly使用；
- **testXXX指令**: 仅Test Task执行的指令，类似Maven的**test scope**, Gradle对test依赖的定义更加细致，包括**testImplementation, testCompileOnly**等细分指令。

注：有一些Java相关的添加依赖指令，比如api、annotationProcessor等，是**Java Plugin**实现的，因此需要**事先在build.gradle声明**：

```groovy
// 在build.gradle的开头声明
plugins {
    id 'java-library'
}
// 注意：
// 1. apply plugin是过时的写法，尽量不要这样用了: apply plugin: 'java-library' 
// 2. java plugin功能比较基础，使用 'java-library' 代替 'java'，功能更健全

```

#### 指定仓库

指定仓库也是常见操作，比如添加企业内部Maven仓库。在单项目工程中，可以直接在**build.gradle**以及**buildscript**里声明中心仓库。

```groovy
repositories {
    mavenCentral()
    // 参考文档：https://docs.gradle.org/current/userguide/declaring_repositories.html
    maven {
        url "//awesome.com/maven"
    }
}
```

对于多项目工程/Monorepo，可以在**allprojects/subprojects**闭包中声明repositories，也可以把这段脚本抽到单独的文件，使用**apply from**的方式引入到**所有需要的地方**：

```groovy
apply from: "path/to/repositories.gradle"
```

#### 解决依赖冲突

依赖冲突问题想必大家都遇到过，解决这类问题，首先需要分析依赖树，Gradle提供了相应的Task:

```bash
# 如果没用wrapper模式，直接使用gradle命令
gradlew dependencies
```

结果中可以看到整个项目的依赖树，如果需要**定点查看某个库**的依赖情况，执行**dependencyInsight**命令，需要注意--configuration参数的区别。

```bash
# 编译期classpath中，依赖库的版本分析
gradlew dependencyInsight --configuration compileClasspath --dependency org.slf4j:slf4j-api

# 最终打包到runtime的classpath中，依赖库的版本分析
# 大部分情况下我们想分析最终打到jar/war中的三方库版本，configuration是runtimeClasspath
gradlew dependencyInsight --configuration runtimeClasspath --dependency spring-boot-starter-actuator
```

下面是我们对slf4j-api的依赖分析的截取结果，第一行的含义就是即使logback-classic库依赖的是**1.7.25**版本的slft4j-api，由于其他库依赖了**1.7.30**这个更高版本的slf4j-api，最终使用的是**1.7.30**。

```
org.slf4j:slf4j-api:1.7.25 -> 1.7.30
+--- ch.qos.logback:logback-classic:1.2.3
|    +--- org.springframework.boot:spring-boot-dependencies:2.4.5
|    |    +--- runtimeClasspath
|    |    +--- project :application-boot
|    |    |    \--- runtimeClasspath
|    |    +--- project :application-core
|    |    |    \--- project :application-boot (*)
```

用dependency/dependencyInsight找到根因后，解决依赖问题通常的做法，是**排除某些有问题的依赖，或者强制指定某个库的版本**。

- **全局强制排除依赖**，在build.gradle中直接写全局的以来排除configuration，如果是多项目工程可以在对应的**build.gradle**或者**allprojects/subprojects**闭包下写这段

```groovy
// 全局排除tomcat，比如换jetty/undertow就可以用这种方式避免tomcat打包进去
configurations.all {
  exclude module: 'spring-boot-starter-tomcat'
}

// 也可以使用单个指令configuration的exclude，只在implementation指令生效
configurations {
  implementation {
    compile.exclude group: 'org.bad' module 'bad-module'
  }
}
```

- **单点排除依赖**

```groovy
// 排除某个依赖中，它依赖的其他有问题库
implementation('org.springframework.boot:spring-boot-starter') {
  exclude module: 'bad-module'
}
```

- **强制某个依赖使用某版本**

```groovy
configurations.all {
  resolutionStrategy {
    // 检测到依赖冲突，直接失败，而不是自动选择一个版本
    // 一般Java Web项目不需要开启这个强制检查
    // failOnVersionConflict()

    // 强制指定某依赖库的版本
    force('net.bytebuddy:byte-buddy:1.10.22')
    force('org.slf4j:slf4j-api:1.7.30')

  }
}
```

最后，验证问题是否已经解决，可以从下面几个方面入手：

1. 再次执行依赖分析的命令；
2. 从最终构建产物直接分析，对于SpringBoot工程，把最终构建的jar解压，在BOOT-INF/lib下找到三方库，确定某个库打包版本是否正确；
3. 在部署运行后，使用arthas等诊断工具寻找运行期间加载的类。

#### 可选依赖

**Gradle没有Maven中的Optional Dependency**, 因为Maven的Optional是一个有问题的设计，比如A声明需要Optional的库C，这时C不会传递给依赖A的项目B，B项目就很容易出现各种找不到类、找不到方法的报错，写Java的同学一定经历过这类依赖问题导致的报错。

这个场景中，问题的本质在于：难道要让B去了解三方库A里，有哪些依赖是需要手动加到自己项目的，哪些是不需要手动加的？强迫依赖方B去了解三方库A的**实现细节**，学过软件工程的人都知道这不是一个正确的设计。

Gradle设计了一个**语义化**更强的Feature+Compability方案，参考文档：https://blog.gradle.org/optional-dependencies。大概流程是这样的：

1. 类库A的gradle文件中声明提供Feature C： java \{ registerFeature('featureC') \{}
2. A的dependencies闭包这样写：dependencies \{ featureCImplementation('some-lib-required-for-feature-c') }
3. 依赖方B项目在依赖时声明是否需要该Feature：implementation('some-group:lib-A:1.0.0') \{  capabilities \{ requireCapability('featureC') } }

#### 发布到Maven仓库

Maven-Publish Plugin可以实现发布jar到Maven仓库，具体参考文档：https://docs.gradle.org/current/userguide/publishing_maven.html。

#### 全套组件的统一依赖管理

在Maven中有**MavenBOM**（Bill of Materials），pom.xml的dependencyManagement声明整套组件的BOM，**所有相关组件都无需写特定的版本号**，对于Spring全家桶，SpringBoot全家桶，SpringCloud全家桶这类生态型技术平台的依赖管理非常有用。Gradle有没有类似的功能呢？网上搜索的资料大多是这样的：

```groovy
dependencyManagement {
  imports {
      mavenBom "org.springframework.boot:spring-boot-dependencies:2.4.5"
  }
}
```
这是**已经过时**的用法，**新项目就别再用这种方式了**！Gradle 5.0之后支持的原生的**platform**指令更加简洁。

```groovy
// 技术平台的*使用方*，仅需添加一行 platform() 即可管理一组依赖约束
dependencies {
  api platform("com.ecosystem:some-platform:1.0.0")
}
```

如果是在中大型企业中，架构组可能会自己做技术中台，比如开发一套内部生态组件，对于生态系统的**开发方**，如何确保多个组件之间的**依赖约束**呢？

答案是使用**Java-Platform Plugin**，具体使用方式这里不再展开，参考文档：https://docs.gradle.org/current/userguide/java_platform_plugin.html


#### SpringBoot/SpringCloud组件的依赖约束

上面已经提到，对于全家桶式的一套组件，应该使用Gradle的**Platform**特性，具体代码如下：

```groovy
// 如果用到SpringCloud，是对SpringBoot的版本有要求的，版本映射关系在SpringCloud官网有说明
buildscript {
    ext {
        springBootVersion = '2.4.5'
        // SpringCloud 2020.0.2 全家桶，只能使用SpringBoot 2.4.x
        springCloudVersion = '2020.0.2'
    }
}

// 注意字符串用到 ${var} 的时候，一定要用双引号，这是groovy的语法决定的
dependencies {
  api platform("org.springframework.boot:spring-boot-dependencies:${springBootVersion}")
  api platform("org.springframework.cloud:spring-cloud-dependencies:${springCloudVersion}")
}
```

#### SpringBoot Plugin的原理

SpringBoot Plugin会给Gradle加一个**bootJar Task**, 在打jar包时把设置的mainClass、SpringBoot JarLauncher等信息到**META-INF/MANIFEST.MF**中。

```groovy
// SpringBoot Plugin生效的非常关键的设置
bootJar {
  mainClass.set('us.zoom.application.MyApplication')
}
```

最终构建结果中的META-INF/MANIFEST.MF

```
Manifest-Version: 1.0
Spring-Boot-Classpath-Index: BOOT-INF/classpath.idx
Spring-Boot-Layers-Index: BOOT-INF/layers.idx
Start-Class: us.zoom.application.ApplicationFullApplication
Spring-Boot-Classes: BOOT-INF/classes/
Spring-Boot-Lib: BOOT-INF/lib/
Spring-Boot-Version: 2.4.5
Main-Class: org.springframework.boot.loader.JarLauncher
```

## 示例：多模块SpringBoot项目

#### 项目结构

![](//filecdn.code2life.top/gradle-structure.jpg)

#### 完整的Gradle代码

**./settings.gradle**
```groovy
rootProject.name = 'application'

include ':application-api',
        ':application-boot',
        ':application-core'
```

**./build.gradle**
```groovy
buildscript {
    ext {
        springBootVersion = '2.4.5'
    }
}
plugins {
    id 'java-library'
    id 'org.springframework.boot' version "${springBootVersion}"
}

// java plugin内置的可设变量
group = 'com.awesome'
version = '1.0.0-SNAPSHOT'
sourceCompatibility = JavaVersion.VERSION_15
targetCompatibility = JavaVersion.VERSION_15

bootJar {
    mainClass.set('us.zoom.application.MyApplication')
}

allprojects {
    // 目前Gradle版本不支持在allprojects下声明plugins，使用的是旧的写法
    apply plugin: 'java-library'

    repositories {
        mavenCentral()
    }

    configurations.all {
        exclude module: 'spring-boot-devtools'
        exclude module: 'spring-boot-starter-tomcat'

        resolutionStrategy {
            cacheChangingModulesFor(0, 'seconds')
        }
    }

    test {
        // 要用junit可以换成：useJUnitPlatform()
        useTestNG()
    }

    dependencies {
        api platform("org.springframework.boot:spring-boot-dependencies:${springBootVersion}")

        // 相当于provided scope，不打到构建产物中
        compileOnly 'org.projectlombok:lombok:1.18.20'
        annotationProcessor 'org.projectlombok:lombok:1.18.20'
        testCompileOnly 'org.projectlombok:lombok:1.18.20'
        testAnnotationProcessor 'org.projectlombok:lombok:1.18.20'

        // 相当于test scope，仅在单元测试使用
        testImplementation 'org.testng:testng:7.4.0'
        testImplementation 'org.springframework.boot:spring-boot-starter-test'

        // 在allprojects下只要声明lombok，junit/testng这类通用依赖
        // 不应该再添加任何属于某个子项目的依赖
    }
}

// 根项目依赖 :application-boot 子项目
// 三个子项目的依赖关系是 boot -> core -> api
// 因此root project只要依赖boot项目
dependencies {
    implementation project(':application-boot')
}
```

**./release.gradle**
```groovy
// maven_user / maven_password / GROUP_ID / VERSION / snapshots / releases 等变量需要写到gradle.properties和系统变量中
publishing {
    repositories {
        maven {
            url VERSION.endsWith('-SNAPSHOT') ? System.getProperty("snapshots") : System.getProperty("releases")
            credentials {
                username System.getProperty("maven_user") == null ? "" : System.getProperty("maven_user")
                password System.getProperty("maven_password") == null ? "" : System.getProperty("maven_password")
            }
        }
    }
    publications {
        maven(MavenPublication) {
            groupId = GROUP_ID
            artifactId = "$project.name"
            version = VERSION
            from components.java
        }
    }
}
```

**./application-api/build.gradle**
```groovy
plugins {
    id 'maven-publish'
}
apply from: "../release.gradle"

// api项目定义微服务之间调用的RPC/HTTP接口
// 这里留空，实际上要根据使用的RPC框架决定dependency
dependencies {
}
```

**./application-core/build.gradle**
```groovy
dependencies {
    api project(":application-api")

    // 传递给boot项目
    api 'org.springframework.boot:spring-boot-starter'
    api 'org.springframework.boot:spring-boot-starter-web'
    api 'org.springframework.boot:spring-boot-starter-aop'

    // 仅在core项目中使用，不传递
    implementation 'org.springframework.boot:spring-boot-starter-undertow'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'io.micrometer:micrometer-registry-prometheus:1.6.6'
    implementation 'commons-configuration:commons-configuration:1.10'
}
```

**./application-boot/build.gradle**
```groovy
dependencies {
    implementation project(":application-core")
}
```

## 参考

- https://spring.io/blog/2021/03/18/spring-cloud-2020-0-2-aka-ilford-is-available
- https://docs.gradle.org/current/userguide/userguide.html
- https://blog.gradle.org/optional-dependencies
- https://cloud.tencent.com/developer/article/1742859