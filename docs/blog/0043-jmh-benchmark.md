---
title:      "使用JMH编写Java基准测试"
date:       2019-05-11
tags:
    - Java
---

# 使用JMH编写Java基准测试

最近因为项目需要重拾Java，项目涉及到很多日期时间相关的计算和存储，所以打算用极其便捷且线程安全的LocalDateTime类型代替古老的Date类型，那么问题来了：**Date类型和LocalDateTime类型的JSON解析的性能如何呢**？

## OpenJDK JMH
在准备开始做性能基准测试之前，突然想到Golang开箱即用的精确到纳秒级别的Benchmark功能，Java有没有类似的工具或者类库呢？于是搜索一下，找到了JMH。

> 　JMH，即Java Microbenchmark Harness，是专门用于代码微基准测试的工具套件。何谓Micro Benchmark呢？简单的来说就是基于方法层面的基准测试，精度可以达到微秒级。当你定位到热点方法，希望进一步优化方法性能的时候，就可以使用JMH对优化的结果进行量化的分析。

JMH是OpenJDK开发的，然而OpenJDK并没有自带该类库，Oracle的也没有，需要额外引入依赖并配置IDE。详细文档和示例参考文档：  [//openjdk.java.net/projects/code-tools/jmh/](//openjdk.java.net/projects/code-tools/jmh/)


#### IDEA下Gradle项目的配置

Maven与Gradle配置JMH类似，都是添加测试Scope的依赖即可，以Gradle为例：
```groovy
testCompile("org.openjdk.jmh:jmh-core:1.21")
testCompile("org.openjdk.jmh:jmh-generator-annprocess:1.21")
```

然后IDEA安装JMH插件方便生成和运行JMH测试用例，在IDEA里面直接搜索安装即可（下图不小心暴露了一些其他非常好用的IDEA插件）
![](//filecdn.code2life.top/idea-plugins.png)


插件装好并重启IDEA后，开启IDEA的Annotation Processing功能，就可以在项目的test目录下新建一些Benchmark测试代码了
![](//filecdn.code2life.top/annotation-processor.png)

注：笔者还遇到了这个报错，mvn/gradle clean一下，再刷新一下依赖，重启IDEA解决

> Can not found /META-INF/BenchmarkList (JMH Unable to find the resource: /META-INF/BenchmarkList)

## Benchmark测试用例的编写和执行

#### 编写方法和常用注解

在开始编码之前，我们需要了解一下JMH的常用注解的含义，使用这些注解和在main函数中创建org.openjdk.jmh.runner.options.OptionsBuilder，通过链式调用构建Options等价，也和直接通过java -jar benchmark.jar 添加参数等价，但这里只讲解**通过注解来配置测试参数**，不因为别的，就因为注解更酷炫。

- **@Benchmark**：每个带Benchmark注解的都是一个微基准测试用例
- **@BenchmarkMode**：吞吐量或者平均时间等等，配合@OutputTimeUnit作为**计量指标**
- **@Fork**：每个测试Fork进程执行，指定Fork的数量，这是为了防止JVM **PGO**（Profile-Guided Optimization）影响测试结果
- **@Threads**：每个基准测试启动的**并发**线程数量
- **@State**：State有3个Scope，分别是Benchmark，Group，Thread
  - **Thread**表示变量只在同一个线程同步，一般用Thread，用到的成员变量相当于是ThreadLocal的
  - **Benchmark**表示变量整个测试的进程同步，比如方法A用到了变量B，线程C和线程D访问B是同一个变量需要加锁，而不是ThreadLocal的
  - **Group**则是同一组的测试使用同样的变量，配合@Group @GroupThreads 给关联的测试分组和同步使用
- **@Warmup @Measurement**：预热和正式开始的轮数，每次迭代时间和循环次数都在这里配置
- **@Setup @TearDown**：这俩相当与JUnit4的@Before @After，做一些初始化和资源回收的事情，有3个Level
  - **Trial** 是默认值相当于 @BeforeClass @AfterClass
  - **Iteration** 表示每一轮预热或者正式测试都执行一次
  - **Invocation** 相当于 @Before @After,每次调用@Benchmark的函数都会执行一次，这个一般不要用，会干扰测试结果
- **@Param**：轮换指定不同的调用参数测试

除了这些还有一些不常用的注解此处不展开解释，除了注解以外，还有一个非常重要的JMH的类：**Blackhole**，在编写基准测试的时候，很容易上**编译器或者JIT**的当，造成不准确的结果
- 某些数值计算在**编译阶段就被算成常数**了
- **循环展开机制**，编译器可能把循环300次自动优化成循环100次，每次循环递增调用3次等等
- 一些**没有副作用，返回值又没有赋值**的函数，编译器或者JIT可能直接会整个函数调用都给直接省掉

因此，在用JMH写Java基准测试的时候，尽量**不要自己写for循环**，通过**注解或者构建参数告诉Runner循环迭代的配置**即可，@Benchmark函数**调用的结果，最好是return掉，或者用Blackhole消费掉**，Blackhole的consume方法就是接收函数返回值，防止调用被JIT优化掉的。

#### 代码实例

了解了JMH的概念和使用之后，开始撸代码，这里写了两个@Benchmark，分别是反序列化同一个常量JSON字符串，到两个不同的Class，一个用**LocalDateTime**接收时间戳，另一个用**Date**接收，用的是业界最成熟的JSON库**Jackson**。

```java
package code2life.benchmark;

import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import lombok.Data;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;
import org.openjdk.jmh.runner.Runner;
import org.openjdk.jmh.runner.RunnerException;
import org.openjdk.jmh.runner.options.Options;
import org.openjdk.jmh.runner.options.OptionsBuilder;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;

@BenchmarkMode({Mode.Throughput})
@OutputTimeUnit(TimeUnit.SECONDS)
@Warmup(iterations = 1)
@Measurement(iterations = 2)
@Threads(1)
@Fork(1)
@State(Scope.Thread)
public class Jackson2UtilBenchmark {

    private static String raw = "[{\"id\":1,\"name\":\"name1\",\"data\":[\"a\",\"b\",\"c\"]," +
            "\"createTime\":\"2019-05-09T01:53:13.396Z\",\"modifyTime\":\"2019-05-10T01:53:13.396Z\"}," +
            "{\"id\":2,\"name\":\"name2\",\"data\":[\"d\",\"e\",\"f\"],\"createTime\":\"2019-05-01T01:53:13.396Z\"," +
            "\"modifyTime\":\"2019-05-02T01:53:13.396Z\"}]";

    private ObjectMapper objectMapper = new ObjectMapper();

    private JavaType javaType = objectMapper.getTypeFactory().constructParametricType(ArrayList.class, SimplePojo.class);

    private JavaType javaTypeDate = objectMapper.getTypeFactory().constructParametricType(ArrayList.class, SimplePojoDate.class);

    @Setup(Level.Trial)
    public void setup() {
        objectMapper.findAndRegisterModules();
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    @Benchmark
    public void parseLocalDateTime(Blackhole bh) throws IOException {
        bh.consume(objectMapper.readValue(raw, javaType));
    }

    @Benchmark
    public void parseDate(Blackhole bh) throws IOException {
        bh.consume(objectMapper.readValue(raw, javaTypeDate));
    }

    public static void main(String[] args) throws RunnerException {
        Options options = new OptionsBuilder()
                .include(Jackson2UtilBenchmark.class.getSimpleName())
                .build();
        new Runner(options).run();
    }
}

@Data
class SimplePojo {
    private Integer id;
    private String name;
    private List<String> data;
    private LocalDateTime createTime;
    private LocalDateTime modifyTime;
}

@Data
class SimplePojoDate {
    private Integer id;
    private String name;
    private List<String> data;
    private Date createTime;
    private Date modifyTime;
}
```

#### 运行结果

下面是笔者本机**单线程反序列化常量JSON数据**的基准性能测试结果

- 运行环境： Intel i7-8550U CPU @ 1.80GHz
- 操作系统： Ubuntu 18.04 64 Bit
- JRE： HotSpot 64-Bit JVM (1.8.0 191-b12)


示例代码运行结果：

| Benchmark          | Mode  | Cnt | Score      | Error | Units |
| ------------------ | :---- | :-- | :--------- | :---- | :---- |
| parseDate          | thrpt | 2   | 351196.715 |       | ops/s |
| parseLocalDateTime | thrpt | 2   | 208930.702 |       | ops/s |


只有单个Date/LocalDateTime属性的JSON：

| Benchmark         | Mode  | Cnt | Score       | Error | Units |
| ----------------- | :---- | :-- | :---------- | :---- | :---- |
| onlyDateField     | thrpt | 2   | 1514370.638 |       | ops/s |
| onlyLocalDateTime | thrpt | 2   | 925243.048  |       | ops/s |
  

只接收String和Integer类型，不做Date的转换

| Benchmark         | Mode  | Cnt | Score       | Error | Units |
| ----------------- | :---- | :-- | :---------- | :---- | :---- |
| parseStringOnly   | thrpt | 2   | 1014225.819 |       | ops/s |
  
结果不出意料，LocalDateTime的数据结构更复杂，而Date只有一个毫秒数的时间戳（对应更简单的java.time.Instant类），因此用它接收反序列化的JSON数据效率更低，性能大约**损失了三四成**的样子。对于只有一个时间属性的JSON数据差距更大，但相对于更**耗时的业务来说，性能瓶颈不可能在这里**，这一点性能差异可以忽略不计，因此笔者还是决定继续使用LocalDateTime，摒弃Date。

**另外，在Windows 10 i7 7700 3.6GHz上单线程测试结果类似**：
- 对于单个Date/LocalDateTime属性的吞吐量分别是每秒 170万，102万次
- 包含Integer String List Date等复杂一点的数据，分别是每秒37万，25万次
- Thread调成2或4，多线程并行解析会有很大的提高，但低于100%，线程越多上下文切换也越多，收益也越少，物理核数的线程数性能达到最大值

## 其他语言的横向对比

#### JavaScript的JSON反序列化性能
说完了Java，笔者脑袋一拍，对于**JSON的祖宗JS**，反序列化性能会不会更好呢？我们来比比看。继续上面的例子，**把LocalDateTime改成String，这样数据中只有Integer和String两种类型，在JS中直接调用JSON.parse**。NPM中找到了Benchmark.js这个库，但是为了能与Deno横向对比，没有使用该库，直接用循环计算：

```js
const json = "[{\"id\":1,\"name\":\"name1\",\"data\":[\"a\",\"b\",\"c\"]," +
"\"createTime\":\"2019-05-09T01:53:13.396Z\",\"modifyTime\":\"2019-05-10T01:53:13.396Z\"}," +
"{\"id\":2,\"name\":\"name2\",\"data\":[\"d\",\"e\",\"f\"],\"createTime\":\"2019-05-01T01:53:13.396Z\"," +
"\"modifyTime\":\"2019-05-02T01:53:13.396Z\"}]";

// warmup
for (let i = 0; i < 1000000;i++) {
  JSON.parse(json);
}

// parse
const start = new Date().valueOf()
for (let i = 0; i < 5000000;i++) {
  JSON.parse(json);
}
for (let i = 0; i < 5000000;i++) {
  JSON.parse(json);
}
console.log(10000000 / (new Date().valueOf() - start) * 1000);
```

```bash
node json-benchmark.js
deno json-benchmark.ts
```

执行结果有些令人吃惊:  
- **NodeJS**执行两次： 531985 ops/s, 542387 ops/s
- **Deno**执行两次：514959 ops/s, 488472 ops/s

而Java在同样数据的情况下，两次执行分别是： **987421 ops/s, 1011526 ops/s**。足足比Java差了一倍！

但细细一想确实是符合逻辑的，NodeJS和Deno的JSON.parse函数虽然都是基于V8引擎的Native代码，代码在这里：[https://github.com/v8/v8/blob/master/src/json/json-parser.cc](https://github.com/v8/v8/blob/master/src/json/json-parser.cc).
可见**JSON.parse转换成的是V8的数据类型**，给JS解释器使用的，相对于静态类型的Java直接定义POJO必然需要多做一层处理。NodeJS的Native Code基于C++，而Deno是Rust，源代码或者编译器可能并没有C++成熟，也可以解释**Deno的性能比NodeJS稍差**，但二者同样**基于V8没有本质区别**。


#### C#的JSON反序列化性能
比完了ECMAScript，一不做二不休，继续来和笔者最喜欢的C#比一比JSON反序列化。测试环境是Ubuntu **Dotnet Core 2.2.204**，Benchmark和JMH异曲同工，只不过Annotation在C#中叫Attribute。
```
dotnet add package Newtonsoft.json
dotnet add package BenchmarkDotNet
```

```csharp
using System;
using System.Collections.Generic;
using System.Linq;
using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Running;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace benchmark
{
  public class Program
  {
    public static void Main(string[] args)
    {
      var summary = BenchmarkRunner.Run<JsonBenchmark>();
    }
  }

  [CoreJob(baseline: true)]
  [RPlotExporter, RankColumn]
  public class JsonBenchmark
  {

    private string raw = "... json data ...";

    [Benchmark]
    public void JsonParseStatic()
    {
      JsonConvert.DeserializeObject<List<SimpleData>>(raw);
    }
  }

  class SimpleData
  {
    private int id { get; set; }
    private string name { get; set; }
    private List<string> data { get; set; }
    private string createTime { get; set; }
    private string modifyTime { get; set; }
  }
}
```

> dotnet run -c release

测试结果如下，平均 **4.118 s/op**，吞吐量大约 **242836 ops/s**


|          Method |     Mean |     Error |    StdDev | Ratio | Rank |
|---------------- |---------:|----------:|----------:|------:|-----:|
| JsonParseStatic | 4.118 us | 0.0165 us | 0.0147 us |  1.00 |    1 |

![](//filecdn.code2life.top/r_result_benchmark.png
)

## 彩蛋
出于好奇，笔者本机上使用**Golang的encoding/json**又做了一次测试： 
- 小写（Private）struct成员变量 **310007 ops/s**
- 大写（Public）struct成员变量 **163345 ops/s** 
- 使用Tag指定对应关系（如下面的代码）：**165207 ops/s**

```go
package main

import (
	"encoding/json"
	"testing"
)

var raw = []byte(".... json data...")

type SimpleData struct {
	ID         int      `json:"id"`
	Name       string   `json:"name"`
	Data       []string `json:"data"`
	CreateTime string   `json:"createTime"`
	ModifyTime string   `json:"modifyTime"`
}

func BenchmarkJSONParse(b *testing.B) {
	for i := 0; i < b.N; i++ {
		var data []SimpleData
		json.Unmarshal(raw, &data)
	}
}
```

> go test -bench=. --benchtime=20s

Golang在**成员变量名与JSON属性不一样的情况下**，性能测试结果比Java（Jackson） .Net Core（Newtonsoft.Json），Node/Deno（V8 JSON.parse）**都要差**，和Python的测试结果竟然几乎一样。使用**同样的属性名时快一倍**，略高于.Net Core，但实际上由于Golang通过变量大小写代替public/private的机制，**造成了实际场景中，JSON解析往往需要指定Tag，多出来的这一层映射关系直接造成了损失一半性能**。

JSON解析的性能很大程度上受所使用的库的影响，比如Golang有号称比encoding/json库快10倍的JSON-parser，Java也有号称最快JSON解析的阿里fastjson，JVM的**字符串常量池**机制也是**单一数据**情况下解析飞快的原因之一，因此这些数字并不代表什么，仅从这一点也并不能说明编程语言的优势劣势，毕竟**PHP才是最好的编程语言**。