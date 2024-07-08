---
title:      "[JavaScript 笔记] 函数节流和去抖"
date:       2018-01-12
tags:
    - JavaScript
    - 前端
---

## 概念
#### 函数节流 throttle
>如果将水龙头拧紧直到水是以水滴的形式流出,那你会发现每隔一段时间,就会有一滴水流出.也就是会说预先<span style="color: #ff0000;">设定一个执行周期</span>,当<span style="color: #ff0000;">调用动作的时刻大于等于执行周期则执行该动作</span>,然后进入下一个新周期

#### 函数去抖 debounce
> 滚动条不停的拖动, 只有停下的时候再去执行事件响应, 而不是每次触发onscroll都去执行它.也就是说当<span style="color: #ff0000;">调用动作n毫秒后</span>，才会执行该动作，若在<span style="color: #ff0000;">这n毫秒内又调用此动作则将重新计算执行时间</span>

## JavaScript实现
#### 民用级别实现方式
简洁明了
```js
var debounce = function(idle, action){
  var last;
  return function(){
    var ctx = this, args = arguments;
    clearTimeout(last);    //如果在timeout内调用, 则清除timeout重新计时
    last = setTimeout(function(){
        action.apply(ctx, args);
    }, idle);
  }
}

var throttle = function(delay, action){
  var last;
  return function(){
    var curr = +new Date();    // '+' 转换为Number类型
    if (curr - last &gt; delay){  // 超过间隔执行并重新设置上次执行时间
      action.apply(this, arguments); 
      last = curr;
    }
  }
}
```

#### 军用级别实现方式[underscore1.8.3版本源码]
实现原理与民用级实现相同, 增加了<span style="color: #ff0000;">trailing edge</span>模式, 使用场景更多, 逻辑更加严密
```js
_.debounce = function(func, wait, immediate) {
  var timeout, result;
  var later = function(context, args) {
    timeout = null;    
    if (args) result = func.apply(context, args);  //传参数时才调用(即immediate为true的首次调用时, 只把timeout清除而不调用)
  };

  var debounced = restArgs(function(args) {  //restArgs将数组参数, 转换为不定参数的形式
    if (timeout) clearTimeout(timeout); //先清除timeout
    if (immediate) {           //如果是leading edge[第一次调用时直接执行]
      var callNow = !timeout;  //timeout为假值时是未调用过的状态, callNow设为true
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(this, args);  //直接调用
    } else {                   //trailing edge, 第一次调用设置timeout
      timeout = _.delay(later, wait, this, args);
    }
    return result;
  });

  debounced.cancel = function() 
    clearTimeout(timeout);  //清除timeout待执行函数
    timeout = null;         //清除timeout句柄
  };

  return debounced;
};

_.throttle = function(func, wait, options) {
  var timeout, context, args, result;
  var previous = 0;
  if (!options) options = {};
  var later = function() {
    previous = options.leading === false ? 0 : _.now(); //leading edge设置上次调用时间为1970年
    timeout = null;
    result = func.apply(context, args);
    if (!timeout) context = args = null;
  };

  var throttled = function() {
    var now = _.now();
    if (!previous &amp;&amp; options.leading === false) previous = now; //trailing edge模式,调用时计时,remaining始终=wait
    var remaining = wait - (now - previous);
    context = this;
    args = arguments;
    if (remaining &lt;= 0 || remaining &gt; wait) { //remaining &gt; wait是指系统时间被修改到过去, 也会执行
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = func.apply(context, args);    //leading edge直接调用
      if (!timeout) context = args = null;
    } else if (!timeout &amp;&amp; options.trailing !== false) {  //如果有计时器进行中, 不执行
      timeout = setTimeout(later, remaining); //trailing edge调用时, 计算出距离下次可调用的时间间隔并设置定时
    }
    return result;
  };
  throttled.cancel = function() {
    clearTimeout(timeout);
    previous = 0;
    timeout = context = args = null;
  };
  return throttled;
};
```

#### 骨灰级别实现方式[lodash4.14.2源码]
此种实现方式的<span style="color: #ff0000;">debounce兼具throttle的功能</span>, 封装合理,较之于lodash3.10.*的代码, 更加容易阅读.
```js
function debounce(func, wait, options) {
  var lastArgs,
	  lastThis,
	  maxWait,
	  result,
	  timerId,
	  lastCallTime,
	  lastInvokeTime = 0,
	  leading = false,
	  maxing = false,
	  trailing = true;

  if (typeof func != 'function') {
	throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
	leading = !!options.leading;
	maxing = 'maxWait' in options;
	maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
	trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
	var args = lastArgs,
		thisArg = lastThis;

	lastArgs = lastThis = undefined;
	lastInvokeTime = time;
	result = func.apply(thisArg, args);
	return result;
  }

  function leadingEdge(time) {
	// Reset any `maxWait` timer.
	lastInvokeTime = time;
	// Start the timer for the trailing edge.
	timerId = setTimeout(timerExpired, wait);
	// Invoke the leading edge.
	return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
	var timeSinceLastCall = time - lastCallTime,
		timeSinceLastInvoke = time - lastInvokeTime,
		result = wait - timeSinceLastCall;

	return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
	var timeSinceLastCall = time - lastCallTime,
		timeSinceLastInvoke = time - lastInvokeTime;

	// Either this is the first call, activity has stopped and we're at the
	// trailing edge, the system time has gone backwards and we're treating
	// it as the trailing edge, or we've hit the `maxWait` limit.
	return (lastCallTime === undefined || (timeSinceLastCall &gt;= wait) ||
	  (timeSinceLastCall &lt; 0) || (maxing &amp;&amp; timeSinceLastInvoke &gt;= maxWait));
  }

  function timerExpired() {
	var time = now();
	if (shouldInvoke(time)) {
	  return trailingEdge(time);
	}
	// Restart the timer.
	timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
	timerId = undefined;

	// Only invoke if we have `lastArgs` which means `func` has been
	// debounced at least once.
	if (trailing &amp;&amp; lastArgs) {
	  return invokeFunc(time);
	}
	lastArgs = lastThis = undefined;
	return result;
  }

  function cancel() {
	if (timerId !== undefined) {
	  clearTimeout(timerId);
	}
	lastInvokeTime = 0;
	lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
	return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
	var time = now(),
		isInvoking = shouldInvoke(time);

	lastArgs = arguments;
	lastThis = this;
	lastCallTime = time;

	if (isInvoking) {
	  if (timerId === undefined) {
		return leadingEdge(lastCallTime);
	  }
	  if (maxing) {
		// Handle invocations in a tight loop.
		timerId = setTimeout(timerExpired, wait);
		return invokeFunc(lastCallTime);
	  }
	}
	if (timerId === undefined) {
	  timerId = setTimeout(timerExpired, wait);
	}
	return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

function throttle(func, wait, options) {
  var leading = true,
	  trailing = true;

  if (typeof func != 'function') {
	throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
	leading = 'leading' in options ? !!options.leading : leading;
	trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
	'leading': leading,
	'maxWait': wait,
	'trailing': trailing
  });
}
```

## 应用
- 在Web前端 resize, sroll, mousemove, mousedrag等事件触发时的频率很高, 如果注册的事件中有耗时的DOM操作, 或ajax等, 往往需要去抖或去抖来提升性能, 减少不必要的调用.

- 比如点击按钮时向后台发送ajax请求, 在<span style="color: #ff0000;">一定时间内重复点击不应该再次发送</span>, 这可以用<span style="color: #ff0000;">节流</span>实现

- 还有页面滚动触发的业务逻辑操作, 应当在<span style="color: #ff0000;">滚动停下时再去执行,</span> 这可以用<span style="color: #ff0000;">去抖</span>实现. 而是否延迟响应可以通过配置<span style="color: #ff0000;">leading edge</span>或<span style="color: #ff0000;">trailing edge</span>实现.