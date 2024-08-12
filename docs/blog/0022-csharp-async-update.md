---
title:      "C# 异步更新UI线程的方法"
date:       2018-04-05
tags:
    - C#
---

# C# 异步更新UI线程的方法

在做Winform或WPF客户端开发时, 最基本的原则就是**不要在UI线程中执行业务逻辑**. 而现在客户端开发大多使用nw.js/CEF/Electron, 性能有要求的用QT这样的C++框架比较多, C#客户端开发逐渐没落了, 这里汇总了几种C#中异步更新UI的方法, 这些方法中都存在**观察者模式**的思想在里面, 是有一定学习价值的. 另外, **谨以此文纪念那些曾经开发过的C#客户端程序.** 

## 通过Delegate切换到UI线程调用
上篇介绍了Delegate家族的详细情况. Delegate也是实现异步界面更新的基础. 在UI对象上调用**Invoke(同步)/BeginInvoke(异步)**方法, 并传入一个能够改变UI的**Delegate**, 这是最基础也是最常用的异步更新UI的方法, 其他的方法大多可以认为都是对这种方法的封装.    
>Talk is cheap, show me the code.  

```csharp
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace TestUI
{
    //其他类代码省略
    public partial class Form1 : Form
    {
        //定义一个更新UI的委托类
        public delegate void UpdateProgress(int val);
        //定义一个委托实例
        private UpdateProgress updator;

        public Form1()
        {
            InitializeComponent();
            //以更新UI的方法作为实例化委托
            this.updator = new UpdateProgress(UIUpdateProgress);
            ThreadPool.QueueUserWorkItem(new WaitCallback(DoInBackgroundThread));
        }

        private void UIUpdateProgress(int val)
        {
            this.ProgressBar.Value = val;
        }

        private void DoInBackgroundThread(object state) {
            int i = 0;
            //如果直接在这个后台线程中调用UIUpdateProgress
            //可能会出现: System.InvalidOperationException
            //线程间操作无效: 从不是创建控件"XXX"的线程访问它。
            while (++i <= 100)
            {
                Thread.Sleep(50);
                //调用Form对象的Invoke或BeginInvoke方法
                //传入的委托, 将会在UI线程中执行
                this.BeginInvoke(updator, i);
            }
        }
    }
}
```

## SynchronizationContext实现线程间消息传递
**UI线程**中会有一个SynchronizationContext对象, 允许一个线程和另外一个线程进行通讯, SynchronizationContext在通讯中充当传输者的角色. **SynchronizationContext.Current**能得到当前被主UI线程接管过的SynchronizationContext对象. 在Form1 form = new Form1()之前, SynchronizationContext对象是为空, 而当实例化Form1窗体后, SynchronizationContext对象就被附加到这个线程上了. 这个对象中有一个**Send方法和Post方法**, 都可以用来作为界面更新委托的调用者, Send和Post的区别就像Invoke与BeginInvoke的区别:
- Send() 是简单的在当前线程上去调用委托来实现（同步调用）. 也就是在子线程上**直接调用UI线程**执行, 等UI线程执行完成后子线程才继续执行.
- Post() 是在线程池上去调用委托来实现（异步调用）. 这是子线程会**从线程池中找一个线程**去调UI线程, 子线程**不等待UI线程的完成**而直接执行自己下面的代码.

```csharp
public partial class Form1 : Form
{
    SynchronizationContext m_SyncContext = null;

    public Form1()
    {
        InitializeComponent();
        m_SyncContext = SynchronizationContext.Current;
        ThreadPool.QueueUserWorkItem(new WaitCallback(DoInBackgroundThread));
    }

    private void UIUpdateProgress(object val)
    {
        this.ProgressBar.Value = (int)val;
    }

    private void DoInBackgroundThread(object state) {
        int i = 0;
        while (++i <= 100)
        {
            Thread.Sleep(50);
            //调用Post/Send方法
            m_SyncContext.Post(UIUpdateProgress, i);
        }
    }
}
```

## 使用基于事件机制的BackgroundWorker
BackgroundWorker是微软封装好的一个类, 可以通过它来作为一个简单的事件注册中心, **注册发布者(DoWorkEventHandler)**和**订阅者(ProgressChangedEventHandler)**, 在DoWorkEventHandler中调用**ReportProgress**时, 触发ProgressChanged事件通知到订阅者, 对于线程切换和异步回调都是透明的, 是一个比较好的封装. API文档见[这里](https://docs.microsoft.com/zh-cn/dotnet/api/system.componentmodel.backgroundworker?view=netframework-4.7.1)
```csharp
public partial class Form1 : Form
{
    private BackgroundWorker backgroundWorker = null;

    public Form1()
    {
        InitializeComponent();
        backgroundWorker = new BackgroundWorker();
        backgroundWorker.WorkerReportsProgress = true;
        backgroundWorker.DoWork +=
            new DoWorkEventHandler(DoInBackgroundThread);
        backgroundWorker.ProgressChanged += 
            new ProgressChangedEventHandler(UIUpdateProgress);
        backgroundWorker.RunWorkerAsync();
    }

    private void UIUpdateProgress(object sender, ProgressChangedEventArgs e)
    {
        this.ProgressBar.Value = (int)e.ProgressPercentage;
    }

    private void DoInBackgroundThread(object sender, DoWorkEventArgs e)
    {
        int i = 0;
        while (++i <= 100)
        {
            Thread.Sleep(50);
            backgroundWorker.ReportProgress(i);
        }
    }
}
```

## 总结
常见的异步更新界面的方法主要就是这些, 这也是Windows客户端编程的基础. 至于如何在.Net Framework下用WinForm/WPF/UWP写出**非常酷炫的客户端程序**, 请类比这幅《怎样画马》
![drawHorse](//filecdn.code2life.top/draw-horse.jpg)
