---
title:      "[Node.js进阶] 使用Node.js V8 API编写C++扩展"
date:       2018-04-17
tags:
    - JS/TS
---

# [Node.js进阶] 使用Node.js V8 API编写C++扩展

> 2020年更新：这篇是传统的NodeJS Addon开发方式，现在Node.js还提供了N-API的能力，屏蔽了V8这一层，对Addon开发更加友好了，新项目建议直接上N-API。

## 引言
Node.js本身已经提供了非常多跨平台的能力, 但对于一些特殊的场景仍不能满足需求. 比如: 
- 需要调用特定平台上的API
- 集成某些已有的C/C++编写的动态/静态库
- 有高性能需求或需要使用多线程特性的功能等.

对于这些场景, Node.js也提供了基于V8引擎的扩展能力. 但这种能力的扩展过于依赖V8引擎, 现在Node.js已经开始试验性的提供**[N-API](https://nodejs.org/dist/latest-v8.x/docs/api/n-api.html)**的方式来进行C++扩展, 以此来**屏蔽不同版本的Node.js、不同Js引擎的差异**. 关于原生C++扩展的开发方式的变化, [这里](//weixin.niurenqushi.com/article/2017-06-26/4925408.html)有一篇很不错的文章.  

本文主要介绍更常用和稳定的[V8引擎C++扩展](https://nodejs.org/dist/latest-v8.x/docs/api/addons.html), 内容很多摘自官方文档. 利用C++扩展在Github已经有一些有意思的项目, 比如播放声音[node-speaker](https://github.com/TooTallNate/node-speaker), 封装Qt组件库[node-qt](https://github.com/arturadib/node-qt)等等. 本文以获取windows下的盘符和容量为例来说明.

## 基础概念
- **V8:** V8是Node.js默认的JavaScript引擎, 通过**JIT编译**实现高性能的Js解析执行. Node.js源代码中的deps/v8/include/v8.h, 以及[Node使用的V8引擎文档](https://v8docs.nodesource.com/)都可以查阅.  
- **libuv:** 一个**跨平台**的异步线程调用库, 实现了 Node.js 的事件循环、工作线程、以及平台所有的的异步操作的C库. 提供了一个类似 POSIX 多线程的线程抽象，可被用于强化更复杂的需要超越标准事件循环的异步插件. 文档传送门: [这里](//docs.libuv.org/en/v1.x/api.html), [这里还有一个中文教程](//filecdn.code2life.top/uv-book-cn.pdf)
- **node-gyp:** Node.js C++模块的编译工具, **npm install -g node-gyp** 后可使用命令行进行Node C++扩展的管理和编译等操作. node-gyp是nodejs的一个子项目, 项目地址在[这里](https://github.com/nodejs/node-gyp), 其中也有详细的文档链接.
    - node-gyp configure: 生成一个Node C++项目, 需要事先在目录中放入一个binding.gyp文件
    - node-gyp build/rebuild/clean: 编译/重新编译/清理项目, 在windows中调用Visual Studio, linux中调用gcc等工具实现编译
- **nan**: 全称是 Native Abstractions for Node.js, 是一个用于C++扩展开发的npm模块. V8引擎在不断更新迭代, Node.js本身也在更新迭代, 按照当前V8提供的API编写的模块也许过一段时间就无法编译运行了. 于是nan出现了, 它可以屏蔽各个Node以及V8版本的差异, 提供统一的API和宏来进行C++扩展开发. 在**实际应用中应该尽量使用nan进行C++扩展开发, 不要使用底层的V8/libuv API**

#### 如何编写Binding.gyp
binding.gyp详细的用法见[文档](https://gyp.gsrc.io/docs/UserDocumentation.md), 这里是一个最简单的用法:
```
{ 
  "targets": [ 
    { 
      "target_name": "hello", 
      "sources": [ "src/hello.cc" ]
    }
  ]
}
```

#### 如何使用V8引擎
另外, 这是一个使用V8 API创建JS执行上下文并编译运行HelloWorld的例子.
```cpp
#include <v8.h>  

using namespace v8;  
int main(int argc, char* argv[]) {  
  
  // 声明HandleScope用于存放Handle, 执行完毕后释放掉其中的Handle
  // 声明变量之后, 所有的Local Handle都会在此HandleScope下管理
  // main函数运行完毕栈推出, handle_scope生命周期结束, Handle被释放
  HandleScope handle_scope;
  
  // JavaScript执行上下文, Persistent声明的对象
  // 不受Handle/HandleScope管理, 需要单独调用Dispose
  Persistent<Context> context = Context::New();  
  
  // 可以认为是JavaScript的作用域
  Context::Scope context_scope(context);  
  
  // Handle是V8引擎对Heap中对象的引用
  // V8编程中必须使用Handle去引用一个堆中的对象, 否则无法被V8管理和GC
  Handle<String> source = String::New("'Hello' + ', World!'");  
  
  // 编译JS代码
  Handle<Script> script = Script::Compile(source);  
  
  // 在当前context_scope下运行JS脚本
  Handle<Value> result = script->Run();  
  
  //释放JavaScript执行上下文
  context.Dispose();  
  
  // 打印V8中的运行结果
  String::AsciiValue ascii(result);  
  printf("%s\n", *ascii);  
  return 0;  
}  
```

## 代码实现
编写C++扩展, 首先需要在目录中建立一个**binding.gyp**文件, 再执行**node-gyp configure**创建对应平台下的项目, C++文件中使用**NODE_SET_METHOD, NODE_MODULE**等导出CommonJs模块. 

#### 从HelloWorld开始
这是一个官网文档中的示例:
```cpp
#include <node.h>

namespace demo {

    using v8::FunctionCallbackInfo;
    using v8::Isolate;
    using v8::Local;
    using v8::Object;
    using v8::String;
    using v8::Value;

    void SayHello(const FunctionCallbackInfo<Value>& args) {
        Isolate* isolate = args.GetIsolate();
        args.GetReturnValue().Set(String::NewFromUtf8(isolate, "Hello World"));
    }

    void init(Local<Object> exports) {
        NODE_SET_METHOD(exports, "hello", SayHello);
    }

    NODE_MODULE(NODE_GYP_MODULE_NAME, init)

}
```

#### 数据类型转换
V8编程中大部分变量都是通过Local模板管理的, 这些变量由V8的GC控制, V8的数据类型很多, 基本与JavaScript的数据类型都有对应, 这里是一张V8引擎数据类型的汇总图
![v8](//filecdn.code2life.top/v8-data-type.png)
在编写C++扩展时, C++标准库的数据类型转换成V8数据类型的方法如下:
```cpp
//namespace v8

Isolate* isolate = args.GetIsolate();

// Number 类型的声明
Local<Number> retval = v8::Number::New(isolate, 1000);

// String 类型的声明
Local<String> str = v8::String::NewFromUtf8(isolate, "Hello World!");

// Object 类型的声明
Local<Object> obj = v8::Object::New(isolate);
// 对象的赋值
obj->Set(v8::String::NewFromUtf8(isolate, "arg1"), str);
obj->Set(v8::String::NewFromUtf8(isolate, "arg2"), retval);

// Function 类型的声明并赋值
Local<FunctionTemplate> tpl = v8::FunctionTemplate::New(isolate, MyFunction);
Local<Function> fn = tpl->GetFunction();
// 函数名字
fn->SetName(String::NewFromUtf8(isolate, "theFunction"));
obj->Set(v8::String::NewFromUtf8(isolate, "arg3"), fn);

// Boolean 类型的声明
Local<Boolean> flag = Boolean::New(isolate, true);
obj->Set(String::NewFromUtf8(isolate, "arg4"), flag);

// Array 类型的声明
Local<Array> arr = Array::New(isolate);
// Array 赋值
arr->Set(0, Number::New(isolate, 1));
arr->Set(1, Number::New(isolate, 10));
arr->Set(2, Number::New(isolate, 100));
obj->Set(String::NewFromUtf8(isolate, "arg5"), arr);

// Undefined 类型的声明
Local<Value> und = Undefined(isolate);
obj->Set(String::NewFromUtf8(isolate, "arg6"), und);

// null 类型的声明
Local<Value> null = Null(isolate);
obj->Set(String::NewFromUtf8(isolate, "arg7"), null);

// 返回给 JavaScript 调用时的返回值
args.GetReturnValue().Set(obj);
```

#### 实现获取盘符和磁盘容量
实现获取盘符以及容量, 涉及到一些Windows API, 具体代码如下, 参考了**[diskusage](https://github.com/jduncanator/node-diskusage)模块**的部分代码, 项目的代码已经上传到我的Github([node-disk](https://github.com/Code2Life/node-disk))中. 这里贴一些关键的代码片段, 包括libuv的异步调用以及windows API调用等.   

首先需要定义模块的入口函数, 处理输入参数, 并将调用逻辑封装到libuv中. 关键代码如下:
```cpp
void GetDiskInfo(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  //自定义的结构体, 用于在libuv的异步调用中传递输入输出
  async_req* req = new async_req;
  req->req.data = req;

  //判断参数的正确性
  if (args.Length() != 2 || !args[0]->IsString() || !args[1]->IsFunction()) {
    node::ErrnoException(isolate, NULL, "Parameter error", NULL);
    return;
  }

  String::Utf8Value param(args[0]->ToString());
  req->input = std::string(*param);
  req->isolate = isolate;

  Local<Function> callback = Local<Function>::Cast(args[1]);
  req->callback.Reset(isolate, callback);

  //放到libuv队列中等待被调用
  uv_queue_work(uv_default_loop(),
    &req->req,
    DoAsync,
    (uv_after_work_cb)AfterAsync);
  //返回给js调用端的值
  args.GetReturnValue().Set(Boolean::New(isolate, true));
}

//NODE_SET_METHOD相当于js文件中的exports.xxx
void init(Local<Object> exports) {
  NODE_SET_METHOD(exports, "getDiskInfo", GetDiskInfo);
}
//声明module
NODE_MODULE(NODE_GYP_MODULE_NAME, init)
```

上面的代码中**DoAsync**是关键的实现入口, 其中可能包括一些复杂的计算或IO操作, 但由于在异步线程中进行, 不会影响node.js的事件循环. 此处要注意的是: **切忌在DoAsync中封装V8引擎的数据, 因为DoAsync中的变量会随着调用栈的推出销毁局部变量, 无法利用回调带回给JS**.  

DoAsync执行完毕后libuv会触发回调, 也就是代码中的**AfterAsync**函数, 在这里需要**将回调给V8引擎的数据**封装好, 并**销毁**掉不再使用的堆中的变量防止内存泄露. AfterAsync函数的关键代码如下:
```cpp
//封装回调给V8引擎的函数实参
result->Set(String::NewFromUtf8(req->isolate, "total"), 
  String::NewFromUtf8(req->isolate, info->totalSize.c_str()));
result->Set(String::NewFromUtf8(req->isolate, "free"), 
  String::NewFromUtf8(req->isolate, info->freeSize.c_str()));
result->Set(String::NewFromUtf8(req->isolate, "volumes"), volumes);

//JS回调函数 function(arg1, arg2){} 即可取到这里声明的两个Local变量
Local<Value> argv[2] = { Null(isolate), result };

TryCatch try_catch(isolate);

Local<Object> global = isolate->GetCurrentContext()->Global();
Local<Function> callback = Local<Function>::New(isolate, req->callback);

//V8引擎中执行回调函数, 然后清理callback和req的堆内存
callback->Call(global, 2, argv);
req->callback.Reset();
//如果还有其他new出来的对象也要再此及时清理防止内存泄露
delete req;

//如果在libuv线程池的执行过程出错, 反馈给node进程
//如果js代码不去捕捉错误, 可以全局的使用process.on('uncaughtException')捕捉, 否则进程会退出
if (try_catch.HasCaught()) {
  node::FatalException(isolate, try_catch);
}
```

V8引擎和libuv的调用核心代码大概就是这些, 具体的获取磁盘容量的实现不再赘述, 传送至[Github](https://github.com/Code2Life/node-disk). 调用Windows API中的**GetLogicalDrives**, **GetDiskFreeSpaceEx**等函数代码在[node_disk_win.cc](https://github.com/Code2Life/node-disk/blob/master/src/node_disk_win.cc)文件中.   

另外, 这些代码已经发布到了npm上, 可以通过**npm install node-disk**下载使用, 目前只支持windows平台, 后续打算支持linux和macOS, 以及实现获取更详尽的磁盘信息的API. 如果有人对此有兴趣, **非常欢迎加入node-disk模块的迭代和维护.**   

贴个图纪念一下1.0.0版本:
![node-disk](//filecdn.code2life.top/node-disk.jpg)

## 总结
本文简单讲解了V8, libuv的一些基础, 并以windows下获取磁盘信息为例阐述了Node.js C++扩展的编写方式. 在实际应用中, 使用**nan模块提供的抽象接口**开发C++扩展具有更好的兼容性, 此处更多的是学习**V8及libuv底层的调用**, 因此未使用nan的方式开发. 案例比较简单涉及到C++的部分不深, 以后有机会再去学习一些更深入的C++编程吧.   
   
不同的语言之间没有好坏之分, 适合需求的才是最好的. 很多时候, 为了达到特定的质量属性或实现某些复杂的功能, 需要的是多语言的配合. Node.js能有这么多的应用场景, 其中有一些是离不开C/C++, 甚至是python的. **根据需求扬长避短来进行技术选型才是正道.**