---
title:    "[Golang学习笔记] 代码片段记录-入门级开发"
date:     2018-08-01
tags:
  - Golang
---

# [Golang学习笔记] 代码片段记录-入门级开发

## 引言  
最近迷上了Go语言, 看完《The Go Programming Language》后收益颇丰。作为一个**极其懒惰**的程序猿, 我比较认同Golang提倡的"Less is more"的哲学, 而且Golang确实是一门非常有意思的语言, 集众家之长而又标新立异. 本系列记录一下在学习实践Go语言过程中使用到的一些代码片段，边学边记， **不仅限于标准库, 还包括真正开发过程中常用的各类组件的用法**。

#### Go 语言特性
作为一个更熟悉其他编程语言的猿, 初入Golang发现有很多跟我之前用的一些主流编程语言差异很大的特性, 在开始编写Golang程序之前, 首先需要**铭记**这些特性:  
- 没有继承
- 没有重载
- 没有泛型
- 没有枚举
- 没有class / private / protected / public / static
- 没有getter / setter
- 没有函数参数默认值
- 没有三元判断操作符
- 没有lambda表达式
- 没有try / catch / finally
- 没有线程
- 没有while循环
- 不存在引用传递, 传指针也是复制指针值
- switch / case 不需要写break
- if / for 不需要加括号


另外, **牢记**这些Go中常用关键字, 内置函数, 类型等
- make() / len() / cap() / append() / copy() delete() / close()
- const / iota / rune / interface / struct / map
- range / select / chan / close / go 
- defer / panic  

注意：关于值传递和引用传递，有一个非常简单的解释：**能否有两个变量指向同一个内存地址**，比如在C++是存在引用传递的，而Java是不存在引用传递的的。  

**Golang同样不存在引用传递**。比如下面两种形式的值传递，第二个func传递的值是对象的地址，两种方式都可以用点号访问，地址传过去也不需要C++的 "->" 符号访问成员变量和方法。星号(指针)和取址操作符（&）与C/C++类似。

```go
type Example struct {
  property string 
}

type Param struct{}

func (example Example) passCopyOfCaller (passCopyOfParam Param) {
  // 这里修改调用对象和参数调用结束后是没有效果的
}
func (example *Example) passAddressCaller (passAddressOfParam *Param) {
  // 这里可以直接修改调用对象，以及参数
}
```

#### 参考链接
此处顺便记录一下学习Go语言过程中比较有用的一些资源链接, 包括部分代码片段的参考链接
- [《Go语言标准库》](https://books.studygolang.com/The-Golang-Standard-Library-by-Example/)
- [Github关于Go所有开源项目](https://github.com/topics/go?o=desc&s=stars)
- [Go依赖包管理工具对比](https://studygolang.com/articles/10523)
- [Go开源项目搜索Go-search](https://go-search.org/)
- [开启本地文档服务器: godoc -http :8000](//localhost:8000)

## 概述
本篇要记录一些入门级的基本操作和Golang中常用代码逻辑写法, 如数据结构定义, 对象操作, 日期时间, 枚举, 异常处理, 类型转换等等. 以及一些未归类的杂项, 比如Slice的用法, Unsafe指针操作, 反射等等。

## 日常编程实用片段

#### 错误处理
先从Golang代码中出现频率最高的语句开始 :)
```go 
if err != nil {
}
```

#### 枚举定义
Golang没有枚举，一般使用常量定义"枚举"
```go
package main

import (
  "fmt"
)

// StateEnum : define a enum type alias
type StateEnum uint

// use iota to auto increase,
// use bit operation to make flag options
const (
  A StateEnum = 1 << iota
  B
  C
)

// 一般情况下从iota + 1开始即可, 防止默认0值带来的问题
const (
  X, Y = iota, iota + 1 // 0, 1
  J, K                  // 1, 2
  M, N = 10, 20         // 10,20 (iota also +1)
  R    = iota << 4      // 3 << 4 = 3 * 2^4 = 48
  S                     // 4 * 2^4 = 64
  P                     // 5 * 2^4 = 80
)

func main() {
  state := StateEnum(1)
  fmt.Println(state == A)                      //true
  fmt.Printf("%b %b %b \n", A, B, C)           //1 10 100
  fmt.Printf("%03b %b %b \n", A|B, B|C, A|B|C) //011 110 111
  fmt.Println(X, Y, M, N, R, S, P)             //0 1 10 20 48 64 80
}
```

#### 日期时间
标准库time包的使用，包括定时器，日期时间以及时区的转换处理
```go
package main

import (
  "fmt"
  "time"
)

func main() {
  // 获取当前时间
  t := time.Now()
  fmt.Printf("current time: %v \n", t)

  // 生成一个不会停止的定时器, chan Time类型
  // 如需手动停止, 使用time.NewTicker()函数
  tick := time.Tick(1 * time.Second)
  // Sleep 1s
  time.Sleep(1 * time.Second)
  go func() {
    for range tick {
      fmt.Println("tick")
    }
  }()

  time.Sleep(1000 * time.Millisecond)

  // Format 与 Parse
  // Go 中以固定参考时间作为时间格式化和转换的layout, 非常奇怪的设定
  // 固定的参考时间是: 2006年1月2日下午3点4分5秒(时区Mountain Standard Time)
  // https://stackoverflow.com/questions/20234104mmss-format
  layout := "2006-01-02 15:04:05"
  fmt.Printf("%s \n", t.Format("2006-01-02 15:04:05PM MST"))

  // 注意时区的差别, 尽量使用ParseInLocation
  t2, _ := time.Parse(layout, "2018-01-01 20:05:30")
  t3, _ := time.ParseInLocation(layout, "2018-01-01 20:05:30", time.Local)
  // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  pacific, _ := time.LoadLocation("America/Los_Angeles")
  t4, _ := time.ParseInLocation(layout, "2018-01-01 20:05:30", pacific)

  // output:
  // 2018-01-01T20:05:30Z 
  // 2018-01-01T20:05:30+08:00 
  // 2018-01-01T20:05:30-08:00
  fmt.Printf("%s %s %s \n", t2.Format(time.RFC3339),
    t3.Format(time.RFC3339),
    t4.Format(time.RFC3339))

  // 时间间隔计算
  // Duration 是一个int64的别名, 单位是纳秒
  var span time.Duration
  span, _ = time.ParseDuration("+10ms")
  tn := t2.Add(span)
  span2 := tn.Sub(t2)
  span2 += 10 * time.Millisecond
  // output: 10ms 20ms
  fmt.Printf("%v, %v \n", span, span2)

  // 下面的Since函数相当于 time.Now().Sub(t2)
  time.Since(t2)

  // 另外, 诸如 Truncate() 之类可能常用的函数自行查阅godoc
  // https://godoc.org/time#Duration.Truncate

  // wait 10s and then exit
  <-time.NewTimer(10 * time.Second).C
}
```

常用的开源库之一，定时任务[Cron Job](https://github.com/robfig/cron)
```go
package main

import (
  "fmt"
  "time"

  "github.com/robfig/cron"
)

type MyScheduleJob struct{}

func (MyScheduleJob) Next(time.Time) time.Time {
  fmt.Println("calc next")
  return time.Now().Add(10 * time.Second)
}

func (MyScheduleJob) Run() {
  fmt.Println("run job")
}

func main() {
  tz, _ := time.LoadLocation("Asia/Chongqing")
  // cron.New()亦可, 但是用默认的Local时区
  c := cron.NewWithLocation(tz)

  // cron 表达式语法: 秒 分 时 天 月 周几
  // https://blog.csdn.net/weixin_40426638/article/details/78959972
  // Field name   | Mandatory? | Allowed values  | Allowed special characters
  // Seconds      | Yes        | 0-59            | * / , -
  // Minutes      | Yes        | 0-59            | * / , -
  // Hours        | Yes        | 0-23            | * / , -
  // Day of month | Yes        | 1-31            | * / , - ?
  // Month        | Yes        | 1-12 or JAN-DEC | * / , -
  // Day of week  | Yes        | 0-6 or SUN-SAT  | * / , - ?
  c.AddFunc("0 30 * * * *", func() { fmt.Println("Every hour on the half hour") })

  // @yearly (or @annually) = 0 0 0 1 1 *
  // @monthly = 0 0 0 1 * *
  // @weekly = 0 0 0 * * 0
  // @daily (or @midnight) = 0 0 0 * * *
  // @hourly = 0 0 * * * *
  c.AddFunc("@hourly", func() { fmt.Println("Every hour") })

  // @every Duration, 相当于time.NewTicker(time.ParseDuration("1h30m"))
  c.AddFunc("@every 1h30m", func() { fmt.Println("Every hour thirty") })
  c.Start()

  c.AddFunc("@daily", func() { fmt.Println("Every day") })

  // 获取当前CronTable的详情
  entries := c.Entries()
  fmt.Printf("%v \n", entries[0].Next) // CST
  fmt.Printf("%v \n", c.Location())

  // 自定义ScheduleJob
  j := MyScheduleJob{}
  c.Schedule(j, j)

  fmt.Scanln()
}
```

#### 集合排序
标准库sort包排序以及自定义排序规则
```go
package main

import (
  "bytes"
  "fmt"
  "io/ioutil"
  "sort"

  "golang.org/x/text/encoding/simplifiedchinese"
  "golang.org/x/text/transform"
)

type ByPinyin []string

func (s ByPinyin) Len() int      { return len(s) }
func (s ByPinyin) Swap(i, j int) { s[i], s[j] = s[j], s[i] }
func (s ByPinyin) Less(i, j int) bool {
  a, _ := UTF82GBK(s[i])
  b, _ := UTF82GBK(s[j])
  bLen := len(b)
  for idx, chr := range a {
    if idx > bLen-1 {
      return false
    }
    if chr != b[idx] {
      return chr < b[idx]
    }
  }
  return true
}

//UTF82GBK : transform UTF8 rune/string into GBK byte array
func UTF82GBK(src string) ([]byte, error) {
  GB18030 := simplifiedchinese.All[0]
  return ioutil.ReadAll(transform.NewReader(bytes.NewReader([]byte(src)), 
    GB18030.NewEncoder()))
}

//GBK2UTF8 : transform  GBK byte array into UTF8 string
func GBK2UTF8(src []byte) (string, error) {
  GB18030 := simplifiedchinese.All[0]
  bytes, err := ioutil.ReadAll(transform.NewReader(bytes.NewReader(src), 
    GB18030.NewDecoder()))
  return string(bytes), err
}

func main() {
  a := []int{4, 3, 2, 1, 5, 9, 8, 7, 6}
  b := []string{"哈", "呼", "嚯", "ha", ","}

  // 基本类型的排序
  sort.Ints(a)
  fmt.Println("After sorted: ", a)

  // sort.Slice 自定义排序函数
  sort.Slice(a, func(i, j int) bool {
    return a[i] > a[j]
  })
  fmt.Println("DESC: ", a)

  sort.Strings(b)
  fmt.Println("Default: ", b) // [, ha 呼 哈 嚯]

  // 自定义排序规则
  sort.Sort(ByPinyin(b))
  fmt.Println("By PinYin: ", b) // [, ha 哈 呼 嚯]

  // 倒序排
  sort.Sort(sort.Reverse(ByPinyin(b)))
  fmt.Println("Reverse: ", b) // [嚯 呼 哈 ha ,]

  // 二分查找第一个满足条件的索引
  idx := sort.Search(len(b), func(i int) bool {
    return b[i] == "哈"
  })
  fmt.Println(idx)
}
```

#### 集合的创建和修改

Golang中大部分场景使用**切片数据类型（Slice）**进行集合操作, 只有**初始化指定了长度的数组才是数组类型**  
数组或切片都不能越界访问, 否在会报错: index out of range / slice bounds out of range  
**内置函数或切片语法（make cap len copy append delete s[m:n] ... ）**能够支持简单的集合操作, 但复杂的操作一般自己封装遍历方法，或借助第三方库实现，比如：
- Go-Linq，用法与C#的杀手锏Linq非常像，但是Golang没有泛型，所以库提供的函数参数是interface{}, 使用起来需要大量类型断言不如C#优雅，带T的函数如"WhereT"等会损失更多性能，其文档在这里：[https://github.com/ahmetb/go-linq](https://github.com/ahmetb/go-linq)
- Gen自动生成某个具体类型的集合操作的代码是个性能更高的方案（与泛型的原理很像）：[https://github.com/clipperhouse/gen](https://github.com/clipperhouse/gen)。

```go
package main

import (
  "fmt"
)

// 注：相关内置函数的参数和返回值
// func make(Slice, n)       slice      slice of type T with length n and capacity n
// func make(Slice, n, m)    slice      slice of type T with length n and capacity m
// func make(Map)    创建一个没有键值对的空map
// func make(Map, n) 创建初始大小N的map
// func make(channel)    创建一个没有缓冲的 channel
// func make(channel, n) 创建一个缓冲N个数据的 channel

// func new() *Type 一般不需要用new函数初始化, new([]string) 亦可初始化slice
// func len(Slice / Array / Map) int 返回map / slice / array的长度
// func cap(Slice) int 返回map或slice的容量
// func append(Slice, Element...) int 向Slice追加值, 不定参数
// func copy(Slice, Slice)  第二个Slice的值复制到第一个Slice, 但以第一个Slice的长度为准

// func delete(Map[KeyType]ValueType, *KeyType) 删除字典元素
// func close(channel) 关闭channel, 关闭后 "<-" 操作符第二个返回值 isClosed 为true
func main() {
  var arr []string 
  fmt.Printf("%p length: %d  capacity: %d \n", arr, len(arr), cap(arr))
  //output: 0x0, len: 0 cap: 0

  arr = make([]string, 100, 200)
  fmt.Printf("%p length: %d  capacity: %d \n", arr, len(arr), cap(arr))
  //output: 0x-xxx len: 100, cap: 200

  // 切片尾部追加元素append, 如果capacity不够, 在一定范围内, 自动扩大一倍
  // 内置函数对Slice的操作是没有副作用的，返回的新的Slice
  arr = append(arr, fmt.Sprintf("element-1"))

  // 利用append不定参，以及类似Python语法的切片类型切片操作可以实现相对复杂的操作

  index := 50
  // 使用append删除中间第50个元素
  arr = append(arr[:index], arr[index+1:]...)

  //使用append在某处插入一个元素
  rear := append([]string{}, arr[index+1:]...)
  arr = append(arr[:index], "test")
  arr = append(arr[:index], rear...)

  // Copy有点C++的影子
  str := []byte("hello world")
  copy(str, "haha ")
  fmt.Println(string(str)) // haha  world
}
```

#### 结构体/对象的复制

对象的浅拷贝(Shadow Copy)
```go
type PlainObj struct {
  str string
  sub SubObj
}
type SubObj struct {
  substr string
}

func main() {
  src := &PlainObj{"str", SubObj{"substr"}}
  target := &PlainObj{}
  //shadow copy
  *target = *src
  target.sub.substr = "newstr"
  fmt.Println(src)
  fmt.Println(target)
  //output: &{str {substr}}
  //output: &{str {newstr}} 
}
```

对象的深拷贝
```go
// 通过gob序列化反序列化实现简单的深拷贝
func deepCopy(dst, src interface{}) error {
  var buf bytes.Buffer
  if err := gob.NewEncoder(&buf).Encode(src); err != nil {
    return err
  }
  return gob.NewDecoder(bytes.NewBuffer(buf.Bytes())).Decode(dst)
}
```

#### 类型转换及类型断言

在字符串的转换中，rune类型是Golang比较有特色的地方，字符串强转成[]byte就是**字节**数组，UTF-8中文字符大部分会变成3个Byte；而强转成[]rune类型则是**字符**数组，每个值表示一个Unicode，而UTF-8是最常见的实现方式，因此rune数组输出出来**等于Unicode码点**，而真实存储的是变长的UTF8表示的byte数组，如下所示

```go
str := "字符串 string"
//类型强制转换
sliceByte := []byte(str)
sliceRune := []rune(str)

fmt.Println(sliceByte)
// 底层字节数组 output: [229 173 151 231 172 166 228 184 178 32 115 116 114 105 110 103]

fmt.Println(sliceRune[:1])
// output: 23383, 表示"字"的Unicode码点（U+5B57 / &#23383;），16进制为：[E5 AD 97] = [229 173 151]
// 码点和进制转换工具：https://unicode-table.com/

fmt.Println(string(sliceRune[2:10]))
// Rune代表一个字符，output: 串 string

//相同底层结构的基本类型或结构体直接可以互转
var num1 int32 = 1
var _ int64 = int64(num1)

func(arg interface{}) {
  //switch方式的类型断言
  switch arg.(type) {
  case string:
    fmt.Printf("ref str: %v %T \r\n", arg, arg)
  case int:
    fmt.Printf("ref int: %v %T \r\n", arg, arg)
  default:
    fmt.Printf("unknown type: %T", arg)
  }

  //if方式的类型断言, 最好判断ok返回值增强鲁棒性
  if str, ok := arg.(string); ok {
    fmt.Printf("%v ", str)
  } else if num, ok := arg.(int); ok {
    fmt.Printf("%v ", num)
  }
}("any value") //传入参数的隐式转换为interface{}类型
```

#### panic的处理和恢复
一般的异常可以返回值判断error，但fatal error，一般用panic + recover的方式处理，defer来确保所有退出条件都会执行，defer其实是在return之后执行的，比较违反常识，细节参考: [https://blog.csdn.net/qq_22063697/article/details/74892728](https://blog.csdn.net/qq_22063697/article/details/74892728)    

**注：因为Runtime遇到defer的函数是压栈的，所以return之后当前栈弹出，再依次后进先出执行defer的函数列表，这就解释了为什么是在return之后执行，与很多语言的try-catch-finally在同一个调用栈是不一样的**  

Golang错误和异常处理的规范和原则: [https://www.jianshu.com/p/f30da01eea97](https://www.jianshu.com/p/f30da01eea97)
```go
// 注意： defer 直接跟recover()是不行的
defer func() {
  //recover 能够捕获到当前goroutine产生的所有panic异常
  if err := recover(); err != nil {
    fmt.Printf("\r\nPanic recover! p: %v %s \r\n", err, debug.Stack())
  // Using "log.Fatalf" is better (will call os.Exit(1))
  }
}()
```

## 杂项  

#### 指针操作

不安全的指针操作与直接运算 (非常危险, 尽量不要用)

```go
obj1 := &PlainObj{str: "2"}
// unsafe.Pointer 任意类型指针, 可转换任意类型但不能直接进行指针运算
// 强转之后的指针操作有风险, 很容易像C/C++一样飞掉
obj2 := (*PlainObj2)(unsafe.Pointer(obj1))
// uintptr 任意指针并且可以直接参与指针运算
ptr := uintptr(unsafe.Pointer(obj1))
// 此时ptr指向4个byte后的地址, 可能是struct的第二个属性
ptr += unsafe.Sizeof(int32(0))
```

#### interface与反射操作

因为Golang是Duck Type多态，比Java/C#这种通过层层接口继承的方式要灵活很多。**多态是OOP中常用的概念，即同一个函数/方法，在不同对象时表现出来不同的行为**，Golang有两种方式实现：
- 第一种方式：定义一个interface，不同的对象只要有这个interface定义的方法就可以调用，这种多态与Java/C#这种传统OOP语言思路完全不一样
- 第二种方式：直接传递interface{}参数（类似C#的dynamic类型），通过类型断言，反射来处理。这可能带来interface{} 满天飞，到处是类型转换和类型断言的问题，所以能用第一种方式做就用第一种方式，**不要滥用interface{}**

第一种方式的例子，来自 [https://gobyexample.com/interfaces](https://gobyexample.com/interfaces)
```go
package main

import "fmt"
import "math"

type geometry interface {
    area() float64
}

type rect struct {
    width, height float64
}
type circle struct {
    radius float64
}

func (r rect) area() float64 {
    return r.width * r.height
}

func (c circle) area() float64 {
    return math.Pi * c.radius * c.radius
}

// measure 函数的参数是一个interface
// 实现了这个interface的struct都能作为入参
func measure(g geometry) {
    fmt.Println(g.area())
}

func main() {
    r := rect{width: 3, height: 4}
    c := circle{radius: 5}
    measure(r)
    measure(c)
}
```

第二种方式，func measure(g interface{}) interface{}的类型断言[ x.(Type) ]在前几节有示例了，
这里再尝试一下标准库reflect包的使用
```go
package main

import (
  "fmt"
  "reflect"
)

type Ref struct {
  Expose int
}

func (*Ref) DoSth() {
  fmt.Println("reflect !")
}

func main() {
  refMap := make(map[string]interface{})

  refMap["a"] = Ref{1}
  refMap["b"] = &Ref{2}
  //delete(m, "b")

  fmt.Printf("1. Finish init map %d %v\r\n", len(refMap), refMap)

  // reflect 包提供的Type和Value类型是反射的关键
  typeOfA := reflect.TypeOf(refMap["a"])
  valueOfB := reflect.ValueOf(refMap["b"])

  fmt.Println("\n2. Print Name() Kine() String()")
  fmt.Println("refMap['a'] type is: ", typeOfA, typeOfA.Name())
  fmt.Println("refMap['b'] kind is: ", reflect.TypeOf(refMap["b"]).Kind())
  fmt.Println("refMap['b'] value: ", valueOfB)

  //1. Finish init map 2 map[a:{1} b:0xc042068088]
  //refMap['a'] type is:  main.Ref Ref
  //refMap['b'] kind is:  ptr
  //refMap['b'] value:  <*main.Ref Value>

  fmt.Println("\n3. MethodByName() and Call()")
  method := valueOfB.MethodByName("DoSth")
  method.Call([]reflect.Value{})
  //reflect !

  //只有struct可以调用NumField
  fmt.Println("\n4. NumField() and Field() / FieldByName()")
  for i := 0; i < typeOfA.NumField(); i++ {
    field := typeOfA.Field(i)
    //field.Tag .PkgPath .Index .Offset etc.
    fmt.Printf("field '%s' type is :%s\n", field.Name, field.Type)
    //field 'Expose' type is :int
  }

  // Interface() 可以转回interface类型
  var _ = valueOfB.Interface()

  // 指针类型的reflect.ValueOf()之后, 必须调用Elem()才能拿到指针对应的值
  fmt.Println("\n5. NumField() and Field() for struct pointer")
  for i := 0; i < valueOfB.Elem().NumField(); i++ {
    value := valueOfB.Elem().Field(i)
    value.SetInt(33)
    fmt.Printf("canset: %t value: %s \n", value.CanSet(), value.String())
    //canset: true value: <int Value>
  }

  fmt.Println("\n6. Invoke Function by Call()")
  for i := 0; i < valueOfB.NumMethod(); i++ {
    method := valueOfB.Method(i)
    //could use reflect.ValueOf(1) to add parameters
    method.Call([]reflect.Value{})
    //reflect !
  }
}
```

#### 标准库container包的数据结构

标准库container包的有一些常用的数据结构的实现比如链表, 环形队列, 堆等，示例来自Golang自带的Godoc
```go
package main

import (
  "container/list"
  "container/ring"
  "fmt"
)

func main() {
  // 创建并初始化双向链表
  l := list.New()
  e4 := l.PushBack(4)
  e1 := l.PushFront(1)
  e3 := l.InsertBefore(3, e4)
  l.InsertAfter(2, e1)

  // 遍历链表, 有点像C艹
  for e := l.Front(); e != nil; e = e.Next() {
    fmt.Println(e.Value)
  }

  // 移动或删除链表元素
  // 还有其他各种操作比如:
  // MoveBefore MoveToFront MoveToBack
  l.MoveAfter(e3, e1)
  if l.Len() != 0 {
    l.Remove(l.Back())
  }

  // 环形链表, 数据结构与双向链表有相似之处
  // 除了算法课上的经典约瑟夫环问题, 实际应用暂时还不知道哪里能用到
  // https://blog.csdn.net/u010781856/article/details/46611029
  r := ring.New(5)
  // 初始化环形链表的内容
  for i := 0; i < r.Len(); i++ {
    r.Value = i
    r = r.Next()
  }

  // 正数或负数, 移动链表的当前指针
  r = r.Move(1)

  // NOTE: 我阅读Golang源码发现list调用Len()复杂度为O(1)
  // 但ring调用Len()时间复杂度为O(N), 这是因为ring的指针本身就是一个Ring,
  // 而list的数据结构是一个保护Element root以及一个int类型的length组成
  // 所以ring的Move()实现的是直接for循环传入的n而不是循环n % Len()个值
  r.Do(func(val interface{}) {
    if v, ok := val.(int); ok {
      // 1 2 3 4 0
      fmt.Printf("value: %d \n", v)
    }
  })

  // 没完全搞明白, 大概就是去删掉或添加元素
  r2 := r.Unlink(2) // r2: 2 3  r: 1 4 0
  r = r.Link(r2) // r: 4 0 1 2 3
}
```

container包的heap是一个抽象的堆,可以实现部分接口创建一个自定义的堆结构, 对于最大/最小堆有一些知识点顺便记录一下
- 二叉堆可以实现优先级队列, 堆结构是一种完全二叉树(N-1层全满, N层数据全在左侧)
- 堆的主要操作有上浮和下沉, 初始化堆即从第一个非叶子节点(n/2 - 1)开始下沉, 直至根节点
- 插入堆只需插入最后一个位置然后上浮即可
- 堆取顶或Pop操作, 只需调换首尾, 取尾并使根节点下沉
- 堆排序算法的思想就是对一个最大/最小堆不断取顶得出排序后的序列  

也顺便复习一下几种树相关的概念以及差别:
- 最大/最小堆只要求父节点比子节点大或者小, 子节点之间没有顺序, 但二叉搜索/排序树(BST)是有顺序的
- 平衡的二叉搜索树有多种实现如AVL, 红黑树等, 应用如C++ STL中的set/map,
- B树, B+树, B*树则是平衡多叉树, 应用如数据库索引  


```go
// 本例是Golang自带的Example代码, 演示了heap的Init Push Pop Fix操作, 除此之外还有Remove等
package main

import (
  "container/heap"
  "fmt"
)

type Item struct {
  value    string
  priority int
  index    int
}

// PriorityQueue 利用数组模拟二叉堆, 并实现heap.Interface所有方法即可
// heap.Interface是Push(), Pop(), 组合sort.Interface三个接口: Len() Less() Swap()
// NOTE: 这种Interface的组合也是Golang OOP的核心, 与Java/C#中的继承-多态体系完全不同,
// 更像ECMAScript/Typescript的鸭子类型和mixin的思想, 只要符合接口的Shape即可
type PriorityQueue []*Item

func (pq PriorityQueue) Len() int { return len(pq) }

func (pq PriorityQueue) Less(i, j int) bool {
  return pq[i].priority > pq[j].priority
}

func (pq PriorityQueue) Swap(i, j int) {
  pq[i], pq[j] = pq[j], pq[i]
  pq[i].index = i
  pq[j].index = j
}

func (pq *PriorityQueue) Push(x interface{}) {
  n := len(*pq)
  item := x.(*Item)
  item.index = n
  *pq = append(*pq, item)
}

func (pq *PriorityQueue) Pop() interface{} {
  old := *pq
  n := len(old)
  item := old[n-1]
  item.index = -1 // for safety
  *pq = old[0 : n-1]
  return item
}

// update modifies the priority and value of an Item in the queue.
func (pq *PriorityQueue) update(item *Item, value string, priority int) {
  item.value = value
  item.priority = priority
  heap.Fix(pq, item.index)
}

func main() {
  // Some items and their priorities.
  items := map[string]int{
    "banana": 3, "apple": 2, "pear": 4,
  }

  pq := make(PriorityQueue, len(items))
  i := 0
  for value, priority := range items {
    pq[i] = &Item{
      value:    value,
      priority: priority,
      index:    i,
    }
    i++
  }
  heap.Init(&pq)
  item := &Item{
    value:    "orange",
    priority: 1,
  }
  heap.Push(&pq, item)
  pq.update(item, item.value, 5)
  for pq.Len() > 0 {
    item := heap.Pop(&pq).(*Item)
    fmt.Printf("%.2d:%s ", item.priority, item.value)
  }
  // Output: 05:orange 04:pear 03:banana 02:apple
}
```