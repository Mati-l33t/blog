---
title:      "[Web前端] 伪元素实现自定义滚动条"
date:       2017-11-29
tags:
    - 前端
    - JavaScript
    - Pseudo
---

## 从伪类和伪元素说起
>CSS3中规定:伪类(Pseodu-classes)用<span style="color: #ff0000;">一个冒号</span>来表示，而伪元素(Pseodu-elements)则用<span style="color: #ff0000;">两个冒号</span>来表示.(低版本IE不支持单冒号)
**区别 :** 伪类的效果可以通过添加一个实际的<span style="color: #ff0000;">类</span>来达到，而伪元素的效果则需要通过添加一个实际的<span style="color: #ff0000;">元素</span>才能达到, 伪元素无法使用DOM操作控制, 而伪元素能实现的功能基本可以使用实元素实现, 一般情况下尽量不要使用, 增加了维护的难度.

#### 常用的伪类
```
:active      //向被激活的元素添加样式
:focus       //向拥有键盘输入焦点的元素添加样式
:hover       //当鼠标悬浮在元素上方时，向元素添加样式
:link        //向未被访问的链接添加样式
:visited     //向已被访问的链接添加样式
:first-child //向元素的第一个子元素添加样式
:lang        //向带有指定 lang 属性的元素添加样式
```

#### 常用的伪元素
```
::first-letter //向文本的第一个字母添加特殊样式
::first-line   //向文本的首行添加特殊样式
::before       //在元素之前添加内容
::after        //在元素之后添加内容
::selection    //在被选取的部分添加样式
```

before,after详细用法 [Mark:<a href="//blog.dimpurr.com/css-before-after/" target="_blank">//blog.dimpurr.com/css-before-after/</a>]

## Chrome下滚动条相关伪元素和伪类
伪元素
<ul><li><span style="color: #ff0000;">::-webkit-scrollbar</span> 滚动条整体部分</li><li><span style="color: #ff0000;">::-webkit-scrollbar-thumb</span> 滚动条里面的小方块</li><li><span style="color: #ff0000;">::-webkit-scrollbar-track</span> 滚动条的外轨道,包含内轨道</li><li><span style="color: #ff0000;">::-webkit-scrollbar-button</span> 滚动条的轨道的两端按钮，允许通过点击微调小方块的位置。</li><li><span style="color: #ff0000;">::-webkit-scrollbar-track-piece</span> 内层轨道，滚动条中间部分,包含滑块</li><li><span style="color: #ff0000;">::-webkit-scrollbar-corner</span> 边角 即两个滚动条的交汇处</li><li><span style="color: #ff0000;">::-webkit-resizer </span>两个滚动条的交汇处上用于通过拖动调整元素大小的小控件</li>
</ul>
伪类
<ul><li><span style="color: #ff0000;">:horizontal</span> 水平滚动条</li><li><span style="color: #ff0000;">:vertical</span> 竖直滚动条</li><li><span style="color: #ff0000;">:decrement</span> 微调(向上或向左)按钮(小箭头,自定义)</li><li><span style="color: #ff0000;">:increment</span> 微调(向下或向右)按钮</li></ul>

一个自定义滚动条的CSS示例
```css
/*定义滚动条宽度(竖直)和高度(水平)*/
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}
/*定义滚动条轨道 内阴影+圆角*/
::-webkit-scrollbar-track {
    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
    border-radius: 5px;
    background-color: #FFF;
}

/*定义竖向的滑块 内阴影+圆角*/
::-webkit-scrollbar-thumb:vertical {
    border-radius: 10px;
    -webkit-box-shadow: inset 0 0 6px rgba(0,0,0,.3);
    background-color: #CCC;
}
```

#### jQuery大法实现多浏览器兼容的酷炫滚动条
有很多提供浏览器兼容的scrollbar插件,比如:<a target="_blank" href="https://github.com/noraesae/perfect-scrollbar.git" target="_blank">perfect-scrollbar插件</a>, 其使用方式如下
```js
//#container必须是position:relative;height有固定值的块级元素
//初始化
$('#container').perfectScrollbar();
$('#container').perfectScrollbar({
    wheelSpeed: 2,
    wheelPropagation: true,
    minScrollbarLength: 20
});
//更新滚动条
$('#container').perfectScrollbar('update');
//删除滚动条
$('#container').perfectScrollbar('destroy'); // Destroy
//事件
$('#container').on("ps-scroll-[x|y|up|down|left|right]",function(){});
$('#container').on("ps-[x|y]-reach-[start|end]",function(){});
```