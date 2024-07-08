---
title:      "[C# 杂货] Delegate详解"
date:       2018-04-04
tags:
    - C#
    - .Net
---

## Delegate的定义及作用
#### Delegate是什么
委托(Delegate)是一个类, 可以将方法当作另一个方法的参数来进行传递. 在C#中, Event, Action, Func, Predicate都是特殊的委托.
>MSDN官方定义 : C#中的委托类似于C或C++中的函数指针。使用委托使程序员可以将方法引用封装在委托对象内。然后可以将该委托对象传递给可调用所引用方法的代码，而不必在编译时知道将调用哪个方法。与C或C++中的函数指针不同，委托是<span style="color: #ff0000;">面向对象、类型安全的，并且是安全</span>的.   

#### Delegate的特性
<ol>
 	<li>delegate声明都是System.Delegate或System.MulticastDelegate的子类, 相当于把<span style="color: #ff0000;">函数声明成一个类</span>, 这个函数类<span style="color: #ff0000;">的实例就是函数指针地址的封装</span></li><li>delegate类可以通过<span style="color: #ff0000;">new</span>或者<span style="color: #ff0000;">CreateDelegate</span>生成函数实例, 已存在的<span style="color: #ff0000;">相同参数和返回值的函数</span>也是delegate的实例</li><li>delegate类重载了<span style="color: #ff0000;">+= -= !=</span> 操作符, 可以在delegate实例上添加或删除函数</li><li>delegate实例可以直接用<span style="color: #ff0000;">括号调用或用Invoke方法调用</span>, 效果一毛一样.</li><li>delegate实例可以使用<span style="color: #ff0000;">BeginInvoke</span>开始异步调用, <span style="color: #ff0000;">EndInvoke</span>阻塞当前线程至调用结束</li><li>delegate实例可以使用<span style="color: #ff0000;">GetInvocationList</span>方法得到调用队列, <span style="color: #ff0000;">Method</span>属性得到当前调用的函数, <span style="color: #ff0000;">Target</span>属性得到当前调用函数的上下文对象</li>
</ol>

这是一个例子:
```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CSharp杂技
{
    public delegate int DelegateDeclare(T t);
    public class Example
    {
        public DelegateDeclare DelegateTest;
        public void TestExample()
        {
            DelegateTest.Invoke("");
        }
        public static int FuncInstance1(string test)
        {
            Console.WriteLine("static example");
            return 1;
        }
        static void Main(string[] args)
        {
            var example = new Example();
            var nonStatic = new NoneStaticExample();
            Console.WriteLine(example.DelegateTest);
            example.DelegateTest += new DelegateDeclare(FuncInstance1);
            example.DelegateTest += new DelegateDeclare(nonStatic.FuncInstance2);
            example.DelegateTest += (x) => { 
                Console.WriteLine("Lambda Expression Example");
                return 1; 
            };
            example.TestExample();
        }
    }

    public class NoneStaticExample
    {
        private string Test = " None-Static";
        public int FuncInstance2(string test)
        {
            Console.WriteLine("none static example" + this.Test);
            return 2;
        }
    }
}
```

#### 啥时候用Delegate
<ol><li>当我们在C#中需要类似<span style="color: #ff0000;">函数指针</span>这样东西时</li><li>当我们需要使用<span style="color: #ff0000;">回调函数</span>的时候</li><li>需要<span style="color: #ff0000;">异步调用</span>的时候</li><li>实现<span style="color: #ff0000;">观察者模式</span>的时候</li><li>处理<span style="color: #ff0000;">事件响应</span>的时候</li></ol>

## Event与观察者模式
Event是一个阉割版Delegate, 不能在<span style="color: #ff0000;">类外部</span>使用<span style="color: #ff0000;">除了重载的 += -=方法以外的任何成员和方法</span>, 其他与Delegate一毛一样.
<span style="text-decoration: underline;">为什么不能在声明event的类外部使用原来delegate有的方法和成员变量呢?</span>
因为 : event是典型的发布-订阅模式, 声明event的类, 即发布者,也只有发布者,有权利知道有现在哪些订阅者(GetInvocationList), 啥时候触发事件(Invoke); 而<span style="color: #ff0000;">作为订阅者, 应该只能把自己的事件处理方法加上去</span>(+= EventHandler)<span style="color: #ff0000;">或取消订阅事件</span>(-= EventHandler), 其他操作本来就不应该有的, 而Delegate内部这些操作都是public的, 在发布-订阅模式中不符合面向对象原则.故微软搞出了event关键字, 把不该给订阅者的这些方法和成员置为<span style="color: #ff0000;">private</span>, 更符合<span style="color: #ff0000;">语义</span>和<span style="color: #ff0000;">封装</span>原则. 严格意义上, 发布-订阅模式的发布者也是不需要知道有哪些订阅者的, 一个中心化的事件注册可以把发布者和订阅者完全解耦, 发布者只需触发自己的事件即可, 若不深究设计模式的定义, 其实观察者模式与发布订阅模式是类似的, 或者说是相通的.

观察者模式/发布-订阅模式的例子:
```cs
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;

namespace Csharp杂技
{
    public class Publisher
    {
        public static event EventHandler PostArticle;
        private static int count = 0;
        public void EmitEvent()
        {
            while (true)
            {
                PostArticle.Invoke(this, ++count);
                Thread.Sleep(1000);
            }
        }
        static void Main(string[] args)
        {
            new SubScriber("Joey").SubScribe();
            new SubScriber("Code2Life").SubScribe();
            new Publisher().EmitEvent();
        }
    }

    public class SubScriber
    {
        private string Name { get; set; }
        public SubScriber(string name)
        {
            Name = name;
        }
        public void SubScribe()
        {
            Publisher.PostArticle += (sender, value) => { 
                Console.WriteLine(string.Format("{0} Get Article : {1}", Name, value )); 
            }; //此处只能调用+=和-=, 这就是和Delegate唯一的区别
        }
    }
}
```
## Delegate的变种: Func, Action, Predicate
Action是<span style="color: #ff0000;">无返回值</span>的泛型委托, 参数在0-16个的Delegate
Func是<span style="color: #ff0000;">有返回值</span>, 参数在0-16个的Delegate
Predicate是<span style="color: #ff0000;">返回值为bool</span>, 参数为一个的Delegate   

3行代码解释区别
```cs
//Action<T1,T2,...,T16>也是可以的, 无返回值是关键
Action actionExample = () => { Console.WriteLine("actionExample"); };

Func<string, int> funcExample = (a) => { return Int32.Parse(a); };

Predicate predicateExample = (a) => { return string.IsNullOrWhiteSpace(a);};
```

## 总结
笔者已经用了两年C#了, 由于即将换一份工作, 以后用到它的机会可能不多了. 慢慢的发现多学会一门编程语言或者多学会某一个技术框架其实并没有那么重要, 重要的是学到其中的编程范式、设计思路等更抽象层面上普适的知识. 对于编程语言、技术框架, 存在即合理, 适合的就是最好的. C#的语法的确很优雅, 写起来比Java更舒心, 可惜生态不够繁荣, 开源的太晚了, 如今.Net Core也快速成长, 持续关注吧. 