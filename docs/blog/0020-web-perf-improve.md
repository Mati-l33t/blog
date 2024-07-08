---
title:      "[Web前端] 前端性能优化总结"
date:       2018-03-31
tags:
    - Web前端
    - JavaScript
---

上周在某公司面试, 问了一个看似不难的问题: 如何做前端的性能优化? 当时随便列了七八条简单常用的, 回来细细想想真的是too naive了. 而网络上相关的文章大多是零碎的知识点, 没有分类归纳. 本文分3个部分, 分别介绍**基础通用的Web前端优化**、**前端框架中的优化**、以及对前端性能优化的**总结**. 

## 基础篇

这一部分总结原生HTML/JS/CSS以及HTTP的优化方法, 基础的前端性能优化是否到位可以使用[lighthouse](https://github.com/googlechrome/lighthouse)这个工具来生成网站性能报告
>npm install -g lighthouse
lighthouse //xxx.xx    
    
#### HTML标签
- link标签写在&lt;head&gt;中, script标签写在&lt;body&gt;的最后
- link标签可以让浏览器[预加载资源](https://segmentfault.com/a/1190000011065339), rel中写"dns-prefetch/preconnect/prefetch/prerender"
- 不影响页面渲染的script标签添加defer或async属性延迟加载, 实际上[defer更好一点](https://segmentfault.com/q/1010000000640869)
- 减少不必要的DOM嵌套层数
- img标签尽量写上width/height属性, 选用合适的图片压缩格式
- 减少需要请求网络资源的标签, 比如合并CSS/JS
- svg和canvas能实现的, 甚至普通CSS就能实现的效果, 就别用img徒增一次网络请求

#### 更高效的CSS
- 不要使用CSS import
- 合理使用CSS选择器, 不同选择器性能差别较大, 少用后代选择器
- 不要滥用浮动
- 关键性的CSS可以写入单独的文件放在HTML头部优先渲染
- 使用CSS Sprites合并图片, CSS中利用background-position定位图片位置
- Flexbox布局比传统的CSS布局要更快
- CSS3动画是个不错的选择, 但@keyframes的灵活性不如[JS动画](https://www.cnblogs.com/langzi1989/p/5965818.html)(js+dom/js+canvas), 顺便Mark[一个非常6的JS动画库](https://popmotion.io/)

关于CSS选择器的性能这里有一张表:
- ID, e.g. #header
- Class, e.g. .promo
- Type, e.g. div
- Adjacent sibling, e.g. h2 + p
- Child, e.g. li > ul
- Descendant, e.g. ul a
- Universal, i.e. *
- Attribute, e.g. [type="text"]
- Pseudo-classes/-elements, e.g. a:hover

#### JavaScript的写法很大程度上决定了性能
- 现在MVVM框架已经通过**虚拟DOM**尽量减少了DOM操作, 如果写原生的DOM操作也需要注意**减少DOM操作**
- 不要在JavaScript中频繁修改样式, 尤其是会导致**重排**的样式修改
- 不要在JavaScript主线程中执行耗时的复杂计算, 让**Web Worker**去做复杂的计算
- 在JavaScript中使用缓存时及时释放, 尽量**不要在闭包中引用到DOM元素**
- 尽量使用浏览器原生的对象和接口实现功能, 如Proxy, Promise等
- 尽量不要使用with/eval等改变执行上下文的关键字
- if短路, 循环尽量提前退出, 递归函数写成尾递归...这些基础编程常识就不多说了
- 删除DOM节点时, 同时删掉注册在上面的事件
- 使用[BigPipe](//www.kokojia.com/article/20726.html)的思路, 流水线式加载页面, 优先渲染主要部分再到次要部分, 减少用户感受到的延迟
- [函数柯里化](https://www.jianshu.com/p/f5033cec605e)实现懒求值, 减少不必要的逻辑计算
- **减少事件监听**, 采用**节流和去抖**等方式防止同一个事件被过于频繁的触发
- **requestAnimationFrame**比setTimeout(f, 0)更好, 也可以用来编写高性能的动画, js+canvas实现动画理论上比改变css实现动画更快, 前提是**不要触发reflow和GC**

#### 使用[缓存](https://www.cnblogs.com/chenqf/p/6386163.html)
- HTTP1.0使用Expires请求头标识资源失效时间
- HTTP1.1使用Cache-Control请求头标识资源缓存策略
- 根据修改时间的Last-Modified/If-Modified-Since
- 根据资源唯一标识的Etag/If-None-Match

#### 网络与HTTP
- 不会变化的静态文件**使用CDN**, 一举多得
- 单页应用中不要在初次访问时加载所有的文件, **懒加载**当前路由的js/css
- Cookie中不要保存太多数据, 及时清除无用的Cookie, 这样可以减小HTTP头的大小
- 对响应内容**使用gzip**压缩增加了服务器的CPU计算量, 但能减少网络的压力, 大部分情况下更合适
- CSS/JS等资源确保已经是**Minify + Uglify**的
- HTTPS比HTTP慢, 但更安全. 可以的话, **使用HTTP2**, 并启用**HPACK**压缩HTTP头
- HTTPS也有很多配置,**TLS1.2是2-RTT的,TLS1.3就有1-RTT和0-RTT两种模式**, 不同的认证/密钥协商/对称加密算法对性能也有决定性的影响
- 服务器操作系统级别的**TCP底层配置**优化
- 尽量减少每个数据帧在网络拓扑中的路径, 如选择合适的数据中心地理位置, **减少代理的次数**等
- **重定向非常耗时**, 减少重定向的次数
- 据说IPv6比IPv4更快10%~15%

#### 使用新的H5 API
- [ServiceWorker](https://www.jianshu.com/p/62338c038c42)是独立于当前页面的一段运行在浏览器后台进程里的脚本
  - ServiceWorker缓存资源文件, 在网页已经关闭的情况下还可以运行, 用来实现页面的缓存和离线
  - PWA(Progressive Web Apps)应用可以提升用户体验, 让用户在浏览器中获得APP的体验
- 尽量使用[Canvas](//www.w3school.com.cn/html5/html5_ref_canvas.asp)实现2D图形绘制
- 尽量使用[WebGL](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGL_API)实现3D效果, 但貌似也没别的办法实现3D了
  
## 前端框架篇
#### jQuery性能优化
jQuery虽然已经随着技术的变更逐渐被人遗忘, 但作为笔者进入前端界的启蒙框架, 还是来回忆一下jQuery代码的正确编写姿势吧. 部分内容摘自[此处]((//www.jb51.net/article/47639.htm))
- jQuery很多API是针对DOM的操作, 但仍需减少DOM操作, 如append, before, after等函数不要每拼接一个DOM元素字符串调一次, 放在一起调
- 可以适当使用原生JS实现的不要用jQuery, 比如$(this).attr("id")可以优化成this.id
- jQuery选择器的优化也很重要, 不要写过于复杂的选择器, 与CSS选择器可以类比
- 缓存某个jQuery对象, 使用find获取DOM后代元素, 比每次都写一个$("XX XXX")要好
- jQuery对象集合是一个类数组, 用for循环数字索引遍历比each更快, 但为了代码可读性更好一般还是用each
- 由于jQuery1.3之后用Sizzle引擎查询DOM, 选择器应该写成从宽泛到具体, 如: $("a.link[target='_blank']")
- 不要频繁调用$(xx).css('xx', 'xx'), 尽量把要改变的css放到一句话, 使用对象作为参数调用, 如: $(xx).css({'color': 'red', 'font-size': '1.5em'})
- $(window).ready(function(){})比$(function (){})长, 推荐使用后者;

#### AngularJS 1.x 性能与可维护性的优化
AngularJS 1.x版本现在用的也不多了, 当年也是前端工程化发展过程中一个如日中天的MVVM框架, 也用它做了几个不小的项目. 如今Angular2也发布快一年了, 但JS文件过大, 以及过于先进的Typescript + 注解的语法, 可能并不适合初学者. 这里顺便翻出了我以前做的一些AngularJS笔记, 大部分是对性能有提升的, 或是对代码可维护性有益的, 很切题.
- 不要在html里直接用script标签写controller
- 在使用双括号绑定时小心加载延迟, 尽量使用ng-bind指令代替, ng-cloak指令可防止双括号语法的绑定可能带来的闪烁
- 不要使用$.ajax, 使用$http对应的方法代替, $http的方法会返回Promise对象, 注意用success和error两个方法指定处理函数
- 不要使用jQuery或$符号进行dom操作, 如必须操作dom, 使用angular.element()代替
- 如果controller比较复杂, 建议将复杂的业务逻辑整合到独立的service中并在controller注入依赖, 否则controller将难以维护
- 不要在ng指令的表达式中进行复杂的函数调用, 使用filter代替或在controller中事先设置正确的值, 否则容易造成逻辑分散, 性能上对V8引擎也很不友好
- 从数据出发, 而非视图出发. 设法进行View与ViewModel的双向绑定而非用DOM操作取值设置ViewModel
- 公共的方法应该封装到公共的service中供其他模块注入
- 公共的DOM组件应该封装到directive供其他模块注入
- 不要注入不必要的服务
- 首次加载不要加载所有js文件, 使用ui-router的延迟加载
- 使用Angular内置的服务代替常见的操作, 比如$timeout, $log等
- 尽量不要在$rootScope设置过复杂的对象
- $scope.$apply慎用, 这会重新遍历整个DOM来校验双向绑定, $digest大部分情况可以代替$apply
- 前端校验尽量使用ng-model内置的服务, 比如$dirty, $invalid
- Angular内置的一些不太常用的指令却可以解决很多常见的问题, 避免复杂逻辑, 比如 ng-checked, ng-readonly, ng-style等等, 能使用指令解决的问题不要写代码.
- 所有input标签需要数据绑定的用ng-model指令, 不要在value属性设置值, 而是在$scope内定义ViewModel
- $scope内不要平行的定义大量的ViewModel, 存在关联属性的用对象或类封装起来
- 最后插播一条Angular2的性能优化黑科技: AoT编译以及基于rollup.js的Tree-Shaking.

#### Vue.js性能优化
Vue.js的势头早已超过了它的鼻祖AngularJs, 生态逐渐繁荣, 关于Vue.js的性能优化方法, 与AngularJs有很多相通之处, 笔者对Vue.js的理解并不够深入, 此处暂时列这几条吧, 欢迎补充.
- 避免template中过于复杂的表达式, 封装到methods中更好
- 慎用watch: { deep: true}, watch太多数据或者一个比较大的对象, JS引擎的压力会很大
- vue-router的懒加载非常方便, 当一个子页面逻辑复杂时, 没有理由不使用[懒加载](https://router.vuejs.org/zh-cn/advanced/lazy-loading.html)
- 除了Vue组件, 尽量少的import/require, 只在需要的时候来加载依赖, 这样可以提升首次渲染的性能, [webpack-bundle-analyzer](https://www.npmjs.com/package/webpack-bundle-analyzer)可以用来查看webpack打包后模块的依赖情况
- 可以在webpack中配置externals, 可以忽略不需要打包的库, 并在index.html中使用cdn地址的script标签加载第三方库
- 尽量使用v-show代替v-if, 避免不必要的DOM元素创建和删除, 当然v-if做前端权限控制时不能用v-show代替

## 总结
万变不离其宗, 前端性能优化方法不计其数, 但其思路和原理不外乎下面几种:
- 减少请求的次数和大小
- 减少重排(Reflow)和重绘(Repaint)
- 尽量减少事件, 优化JavaScript代码的执行效率
- 尽量使用浏览器原生提供的特性以及更现代化的技术来实现功能
- 预加载或懒加载, 通过更高效的用户体验变相提升性能
- 网络、HTTP、服务端性能的优化