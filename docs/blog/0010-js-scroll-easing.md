---
title:      "自己动手实现平滑滚动条"
date:       2017-12-20
tags:
    - JS/TS
---

# 自己动手实现平滑滚动条

## 前期调研
当前浏览器的标准也越来越明确, 用户体验越来越重要. 相比于FireFox, Chrome没有自带平滑滚动, 鼠标滚轮滚动时直接滚动到指定位置, 没有实现缓动, 这应该是出于性能的考虑. 那么, 如何手工去实现平滑滚动, 或者说是带动画的滚动呢?
**首先, Mark几个不错的开源项目, 打开传送门**
- No1. <a href="https://github.com/inuyaksa/jquery.nicescroll" target="_blank">nicescroll</a> : 平滑滚动的jQuery插件, 兼容性非常不错
- No2. <a href="https://github.com/alvarotrigo/fullPage.js" target="_blank">fullPage</a> : 整页滚动jQuery插件, 适合极简风格的介绍型页面
- No3. <a href="https://github.com/flesler/jquery.scrollTo" target="_blank">scrollTo</a> : 平滑滚动的jQuery插件+1, 非常常用且轻量

其实, 手动实现一个这样的效果并不困难, 只要做以下两件事即可
1. 截获mousewheel事件,<span style="color: #ff0000;"> 阻止浏览器默认行为</span>
2. 按照事件参数<span style="color: #ff0000;">处理滚轮事件</span>, 并通过动画的形式实现

## 踩坑和踩坑
#### 浏览器兼容性   
不同浏览器对滚轮事件的绑定都是不一样的, 比如
- IE下是这样的:
```js
if(document.attachEvent){
  document.attachEvent('onmousewheel',smoothBar);
}
```
- FF下是这样的(FF自带了平滑滚动, 实际情况下无需绑定FF的滚轮事件)
```js
if(document.addEventListener){
  document.addEventListener('DOMMouseScroll',smoothBar,false);
}
```
- Chrome/Safari下是这样的
```js
window.onmousewheel=document.onmousewheel=smoothBar;
```
#### 还是浏览器的兼容性问题  
稍低版本的IE浏览器事件<span style="color: #ff0000;">没有target属性, 也没有preventDefault函数</span>  
这里是一个简单的fix方法  
```js
function(eventToFix) {
  if (eventToFix && eventToFix.target) return eventToFix;
  eventToFix=eventToFix|| window.event;
  eventToFix.preventDefault = function() { this.returnValue = false; };
  return eventToFix;
}
```
#### 仍然是浏览器的兼容性  
设置或获取当前滚动位置在不同浏览器也是不同的, 下面这句话能够兼容的获取滚动位置   
```js
var scrollTop = document.documentElement.scrollTop || 
                window.pageYOffset || 
                document.body.scrollTop;
```
其中, document.pageYOffset是Safari专用的.   
其他的坑比如IE9以下还没有requestAnimationFrame函数等等, 浏览器兼容性是个超大的坑, 在IE下没能正常跑出来, 最后其实做的是一个Chrome下的原生JS平滑滚动, <span style="color: #ff0000;">不支持IE和FF</span>.  

#### 如何判断元素是否可滚动

这是关键性的问题, 当截流了所有的mousewheel事件后, 一个页面可能有很多scrollbar, 如何根据截取的事件判断应该让哪个元素滚起来呢?  
大概逻辑是这样的:  
- 如果<span style="color: #ff0000;">event.target是body元素</span>, 直接滚body
- 如果event.target是其他元素, 判断这个元素能不能滚, 如果不能, 判断父节点能不能滚<span style="color: #ff0000;">直到找到滚的起来的或body元素</span>
<strong>参考了一些资料, 发现有两种判断方式:</strong>  
1. 只要element.scrollHeight > element.clientHeight, 说明是个能滚的元素
2. 见下图
![stackoverflow](//filecdn.code2life.top/isScrollable.png)

这两种都是不准确的, scrollHeight > clientHeight不一定是有滚动条, 可能有其他原因, 具体原因尚待验证,  
其次overflow:visible的元素也可能是有滚动条的  
```js
/* 原生JS代码 */
function isScrollable(element) {
  var overflowY = window.getComputedStyle(element)['overflow-y']; //需要根据计算后的style判断而不能根据元素的css属性
  return (overflowY === 'scroll' || overflowY === 'auto') && node.scrollHeight > node.clientHeight;
}
/* jQuery写法 */
$(element).height() > element.clientHeight && 
( 
  $(element).css('overflow-Y') === 'scroll' || 
  $(element).css('overflow-Y') === 'auto'
);
```
## 实践与结果
实现思路已经很明确, 截取滚轮事件和判断元素是否可滚动已经理解, 只欠把对应的元素用动画滚起来了.
前端实现动画有几种方法:
1. css3 transition动画或animation+keyframes实现, css并<span style="color: #ff0000;">不支持</span>scrollTop属性的动画, 支持动画的css属性有<a href="//oli.jp/2010/css-animatable-properties/">这些</a>
2. jQuery插件实现, 不用自己造轮子  
3. 使用<span style="color: #ff0000;">requestAnimationFrame</span>函数自己写一个高性能的平滑滚动, 享受造轮子的乐趣  

  
**代码如下~**
```js
window.onmousewheel=document.onmousewheel=smoothBar;
function smoothBar(e){ 
  //fix事件属性的差异. 曾经美好的浏览器兼容的愿望↓
  var event = (function(eventToFix) {
    if (eventToFix && eventToFix.target) return eventToFix;
      eventToFix=eventToFix|| window.event;
      eventToFix.preventDefault =function() { this.returnValue = false; };
      return eventToFix;
  })(e);
  event.preventDefault();

  var counter = 0;  //记录当前帧数
  var maxCount = 90; //90个帧的动画
  var progress = 0;  //当前百分比
  var scrollCache = {}; //元素是否可滚动缓存
  var proCache = null;
  if(window.WeakMap) {
    //有weakmap使用它当缓存更合适
    proCache = new WeakMap();
  }
  var delta = -event.wheelDelta; //滚动量
  if(typeof requestAnimationFrame === "undefined") {
    var requestAnimationFrame = setTimeout; //为了兼容~
  }
  function generateDelta() {
    counter++;
    /* 用sin函数做了个简单的ease,略带惯性效果 */
    var tempProgress = Math.sin(counter/maxCount * Math.PI/2);
    var tempResult = delta * (tempProgress - progress);
    progress = tempProgress;
    /* 计算出的当前帧应滚数值 */
    return tempResult;
  }

  function srollAbleEle(node) {
    var overflowY = window.getComputedStyle(node)['overflow-y'];
    return (overflowY === 'scroll' || overflowY === 'auto') && node.scrollHeight > node.clientHeight;
  }

  /* 判断元素是否可滚动 */
  function isScrollable(node) {
    if(proCache) {
      if(!proCache.has(node)) {
        proCache.set(node, srollAbleEle(node));
      }
      return proCache.get(node);
    } else {
      if(typeof scrollCache[node.innerHTML] === 'undefined') {
        scrollCache[node.innerHTML] = srollAbleEle(node);
      }
      return scrollCache[node.innerHTML]; //缓存后就不用每次计算了(在元素不会动态改变属性的前提下)
    }
  }
  function getScrollElement(element){
    if(isScrollable(element) || element.tagName === "BODY"){
      return element;
    }
    //如果不能滚动, 找到第一个能滚的祖先
    return getScrollElement(element.parentNode);
  }

  //如果页面只有一个可竖向滚动的元素, 直接指定比实时计算快很多
  //var scrollEle = $("#scrollDiv")[0];
  (function update() {
    /* 在浏览器渲染的下一帧执行滚动 */
    requestAnimationFrame(function(){
      var deltaVal = generateDelta();
      if(!!event.target) {
        var scrollEle = getScrollElement(event.target);
        scrollEle.scrollTop += deltaVal;
      } else {
        document.body.scrollTop += deltaVal;
      }
      if(counter === maxCount) return;
      update();
    });
  })();
}
```