---
title:      "[朝花夕拾] 游戏开发之粒子系统"
date:       2019-06-16
tags:
    - Others
---

# {{ $frontmatter.title }}


笔者大学时出于兴趣，组团做过一些简单的游戏开发，有参加比赛的，也有课程作业的。时过境迁，毕业之后再也没有碰过游戏开发，如今整理旧电脑想起一些往事，算是朝花夕拾吧。

## 讲讲故事

大二一次课程作业是组队开发PC版的对战协作消消乐，因为团队成员都熟悉的语言是Java，而Swing又不合适做游戏，最终就用JavaFx做了。  

其实JavaFx或者Java本身也不太适合做游戏，粒子系统也没有现成的轮子可以用。当时想自己造个用在爆炸特效、背景特效上面，但是时间太紧张，就用图片帧切换实现了一些简单的效果，不过也打开了探索游戏开发的大门。（PS：回头看5年前的代码，竟然是MVVM模型，小伙伴们太给力了）

![](//filecdn.code2life.top/star_light.gif)

经过项目实战，JavaFx玩的挺熟了，2014年七夕给女朋友（**现在是笔者的妻子以及孩子的母亲**）做了个七夕表白程序，中间有个撒花特效，自己写了个**非常简单的粒子特效。粒子发射器随机生成玫瑰花，每个粒子（花）有一个下落的行为，一个粒子管理器控制生命周期**，这部分只有几百行代码，效果如下图。

![](//filecdn.code2life.top/tanabata.gif)

现在想想还是挺惭愧的，曾经有不少次给家人和自己做点软件的想法，但业余时间总是在做各种各样其他的事情，即使写代码也大多是学习或是开发与业务相关的东西。

遍身罗绮者，不是养蚕人，或许就是这个道理吧。

## 浅入浅出粒子系统

笔者不是专业的游戏开发，所以只能讲一些浅显的概念和原理，以及基本的使用方法。

#### 粒子系统简介

通过上面的故事，可以总结一下，粒子系统的核心是**粒子发射器生成的一个个行为独立**的粒子，共同构建出动画。粒子系统使用大量很小的的模型/图片或图形，通常来**模拟不精确的效果，或是混乱的系统**。使用场景不限于：
- 游戏开发，模拟现实世界中诸如火焰，雨雪雾尘等等
- 网站背景特效或者前端动画，相对简单和抽象
- 复杂逼真的3D粒子动画渲染甚至可以用在电影特效中

那么怎么实现一个粒子系统呢？其实粒子系统的**每一帧**动画，或者延伸到游戏开发的本质，就是把每一帧分为**模拟计算阶段、画面渲染阶段**，在粒子系统中：  
- **模拟阶段**：根据参数设置，计算粒子的生成与销毁，处理单个粒子行为。比如发射器需要在哪里发射多少个粒子？哪些粒子已经过期或超出总数了？对于单个粒子是要下落，还是旋转跳跃？单个粒子的下一个颜色和透明度是什么？
- **渲染阶段**：上面的模拟阶段已经全部计算好了下一帧怎么展现，那么**渲染阶段就是拿起画笔在2D或者3D画布上，把虚拟的状态数据临摹出来**。

由于粒子的可能数量会非常巨大，如果粒子纹理是比较复杂的图像模型，一般还会事先通过**纹理贴图（Texture Mapping）**，把**复杂的形状包裹在简单的基础图形中**，来提高渲染性能。

#### 游戏引擎中的粒子系统使用

大多数游戏引擎可以**可视化编辑**或**配置代码**来生成粒子特效，这里以两个非常有代表性的游戏引擎举例，**Cocos2d-x和Unity3D**是在游戏引擎市场份额非常高的两家了，下面分别试验一下。

#### Cocos2d-x 引擎
14年那个时候还没有Cocos Creator，基于Canvas WebGL等技术的H5游戏还没有兴起，Cocos2d-x只支持C++和Lua两个语言。

所以以前用C++做，需要先用Particle Designer生成一个XML格式的plist文件，然后调用C++的API读取属性，加入Scene中。**Particle Designer**这个软件挺酷炫的（Mac版本，Windows有个简易版的同名软件），下面是链接：  
[https://www.71squared.com/particledesigner](https://www.71squared.com/particledesigner)


时隔几年，现在有了Cocos Creator，C++似乎失宠了。现在**JavaScript/Typescript可以轻松开发Cocos2d-x游戏**，在编译过程中看到了不少带"JSB"的文件，看来吸收了React Native的精髓啊，JavaScript与Native桥接，利用Web技术**一桶浆糊**的能力实现跨平台。  

在Cocos Creator中制作粒子特效非常简单，编辑器点点就可以了生成资源文件了（.fire后缀的JSON文件）

![](//filecdn.code2life.top/cocos_particle.jpg)


![](//filecdn.code2life.top/cocos-particle2.jpg)

至于事件和控制，通过UI配置加上JS/TS调用一下API即可。下面这个代码是不是很有Angular/Vue/React的既视感？其实**MVVM模式和组件化开发**在客户端开发/游戏开发领域早已约定俗成，只是近些年Web前端越来越复杂，大前端的触角伸向越来越多的领域，催生了这些优秀的前端技术和框架。
```js
cc.Class({
    extends: cc.Component,

    properties: {
        particle: cc.Node,
    },

    resetParticle: function() {
        var myParticle = this.particle.getComponent(cc.ParticleSystem);
        myParticle.resetSystem();
    }
});
```

#### Unity3D 引擎
Unity 3D 更为复杂，需要更多的专业领域知识才能玩的转，笔者并不熟悉，只是简单试验了一下。Unity提供的Particle Editor非常强大，速度，旋转，色彩，3D图形等等每一项都有非常完善的配置，能够自定义调整变化曲线，通过C#脚本可对事件编程。下图只是一个最简单的粒子系统配置的冰山一角。

![](//filecdn.code2life.top/unity3d_particle.gif)



## JavaScript库以及Web端的使用

**做前端页面**比游戏开发相对简单，整粒子系统就上Canvas，要3D的就上WebGL，基于**现成的轮子做一些简单的五毛特效**比较轻松。在Github上找到一个Star比较多质量很不错的轮子：
- Proton https://github.com/a-jie/Proton

下面我们来分析一下Proton的源码：

- **index.js** 导出所有对外提供的API，Proton类，以及Proton对象下挂了：**粒子初始化属性，粒子行为，发射器，边界区域，渲染方式等等**
- **Proton.js** 有一些**全局方法**，比如获取所有的粒子，更新函数，发射器和渲染方式的管理等等
- **/emitter** 是发射器的实现，两个比较常用的，一个是默认的静态发射器，还有一个继承Emitter的FollowEmitter，跟踪鼠标移动的发射器，Emitter可以**管理粒子初始化参数，以及预设行为**
- **/initialize** 包括了发射器以及单个粒子的初始化参数类：**质量 Mass，生存周期 Life，半径 Radius，速度 Velocity，位置 Position，粒子的图片 Body，发射速率 Rate**
- **/behaviour** 主要是单个粒子生命周期内的行为，**碰撞，吸引，排斥，旋转，缩放，抖动，重力场，触及边界，外力等等**继承Behaviour类的实现，可以叠加，可以自定义行为
- **/render** 是各种渲染方式的实现，比如DOM，Canvas，WebGL，EaselJS等等，其中常用的，性能不错的是**Canvas和WebGL**
- **/core** 定义了3个核心类，一个是刚提到的**Proton**，另一个是**Particle**抽象出单个粒子的属性和行为，还有一个**Pool**作为Particle对象的缓存池，管理对象的生成和销毁

**源码非常清晰，代码质量很不错**，还有很多酷炫的Example让人嗔目咋舌。拿Example中的烟花举例，用Proton写一个粒子效果大概是这样的（截取了部分代码）：

```js
var canvas;
var context;
var proton;
var renderer;
var emitter;

function createProton(image) {
  proton = new Proton;
  emitter = new Proton.Emitter();
  emitter.rate = new Proton.Rate(new Proton.Span(1, 3), 1);
  emitter.addInitialize(new Proton.Mass(1));
  emitter.addInitialize(new Proton.Radius(2, 4));

  // P = Particle
  emitter.addInitialize(new Proton.P(new Proton.LineZone(10, canvas.height, canvas.width - 10, canvas.height)));
  emitter.addInitialize(new Proton.Life(1, 1.5));
  // V = Velocity 
  emitter.addInitialize(new Proton.V(new Proton.Span(4, 6), new Proton.Span(0, 0, true), 'polar'));
  emitter.addBehaviour(new Proton.Gravity(1));
  emitter.addBehaviour(new Proton.Color('#ff0000', 'random'));

  // 发射烟花，第一级升空
  emitter.emit();
  proton.addEmitter(emitter);

  renderer = new Proton.CanvasRenderer(canvas);
  renderer.onProtonUpdate = function() {
    context.fillStyle = "rgba(0, 0, 0, 0.1)";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };
  proton.addRenderer(renderer);
  proton.addEventListener(Proton.PARTICLE_DEAD, function(particle) {
    createSubEmitter(particle);
}

// 第二级发射器，烟花升空之后爆炸的特效
function createSubEmitter(particle) {
  var subemitter = new Proton.Emitter();
  subemitter.rate = new Proton.Rate(new Proton.Span(250, 300), 1);
  subemitter.addInitialize(new Proton.Mass(1));
  subemitter.addInitialize(new Proton.Radius(1, 2));
  subemitter.addInitialize(new Proton.Life(1, 3));
  subemitter.addInitialize(new Proton.V(new Proton.Span(2, 4), new Proton.Span(0, 360), 'polar'));
  
  subemitter.addBehaviour(new Proton.RandomDrift(10, 10, .05));
  subemitter.addBehaviour(new Proton.Alpha(1, 0));
  subemitter.addBehaviour(new Proton.Gravity(3));
  var color = Math.random() > .3 ? Proton.MathUtils.randomColor() : 'random';
  subemitter.addBehaviour(new Proton.Color(color));
  
  subemitter.p.x = particle.p.x;
  subemitter.p.y = particle.p.y;
  subemitter.emit('once', true);
  proton.addEmitter(subemitter);
}

// RAF递归跑起来，每帧刷新
(function tick() {
  requestAnimationFrame(tick);
  proton.update();
})();
```

![](//filecdn.code2life.top/firework_particle.gif)

## 彩蛋：给博客添加五毛钱的粒子特效

#### 彩蛋#1 Proton 3D
**Proton.js** 除了2D的实现，作者还有一个基于**three.js** (https://github.com/mrdoob/three.js/) 的3D粒子系统框架实现：**Proton 3D**：[https://github.com/a-jie/three.proton](https://github.com/a-jie/three.proton)，设计思路与Proton几乎完全一致，只是Render层使用Three.js和WebGL实现，很多参数从二维变成三维，使用的时候需要先用Three.js"布置"**场景、光源、相机**，相对复杂一些。  

感谢这位大佬的开源项目，笔者用这个库装饰了一下个人主页，链接如下，不过大量3D粒子的CPU/GPU消耗不容小觑，可能某些机器或浏览器会稍有卡顿。  

[//code2life.top/about.html](//code2life.top/about.html)

#### 彩蛋#2 Gravity Points

另外，之前在CodePen上偶然看到了一个非常有趣的粒子特效 GravityPoints，于是稍微改了一下放到笔者自己的博客背景上了，为了避免影响窄屏的阅读体验，目前**只在在宽屏浏览器上显示粒子特效**。如下图：

![](//filecdn.code2life.top/gravity.gif)

非常感谢和佩服那位作者的创意，这个效果是直接调用Canvas的API画出来的，加在一起只有几百行代码。其实粒子系统并不复杂，每一种粒子行为都很简单，但叠加在一起就能迸发神奇的魔力，这也是**软件工程最重要的思想之一 ———— 分而治之的完美体现**。