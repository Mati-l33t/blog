---
title:      "[Javascript笔记] Lodash常用函数汇总"
date:       2017-12-13
tags:
    - JavaScript
    - lodash
---
> lodash是npm上最热门的一个模块, 提供了非常多的实用函数, nodejs服务端函数式编程必备, 由于文档非常多, 这里列举了大部分常用函数的简略信息, 供查询温习使用, 文档正门在这里: [lodash文档](https://lodash.com/docs/)

> 格式 : [函数名 - 简述 - 参数 - 返回值 - 备注信息]
<h4>数组扩展函数</h4>
- chrunk - 分割数组 - (数组, 块长度) - 新数组
- compact - 过滤假值元素 - 数组 - 新数组
- difference - 差集 - (src数组,...减去的数组) - 新数组
- drop - shift多个元素 - (数组, 去除数量) - 新数组
- dropRight - pop多个元素 - (数组, 去除数量) - 新数组
- dropWhile - shift直到不满足while条件 - (数组, [函数,对象|字符串]) - 新数组
- dropRightWhile - pop直到不满足while条件 - (数组, [函数|对象|字符串]) - 新数组
- fill - 填充元素 - (数组,填充值,[起始,结束]) - 数组引用 - 有副作用
- findIndex - 找索引 - (数组, [函数|对象|字符串]) - 索引
- findLastIndex - 找索引 - (数组, [函数|对象|字符串]) - 索引
- first - array[0] - 数组 - 元素
- flatten - 展开内部数组 - (数组,[是否递归]) - 新数组
- flattenDeep - 递归展开 - 数组 - 新数组
- indexOf - 找索引 - (数组, 数组元素, [何处开始|是否二分]) - 索引
- initial - 除末尾元素 - 数组 - 新数组
- intersection - 交集 - ...数组 - 新数组
- last - array[length-1] - 数组 - 末尾元素
- lastIndexOf - 找索引 - (数组, 数组元素, [何处开始|是否二分]) - 索引
- object/zipObject - 转对象 - (嵌套数组|Key数组+Value数组) - 对象
- pull - 推出元素 - (数组, ...数组元素) - 移除元素数组 - 有副作用
- pullAt - 推出索引处元素 - (数组, ...索引) - 移除元素数组 - 有副作用
- remove - 按条件移除元素 - (数组, [函数|对象|字符串]) - 移除元素数组 - 有副作用
- rest/tail - 除开头元素 - 数组 - 新数组
- slice - 截取数组 - (数组, [起始=0, 结束=length]) - 新数组
- sortedIndex - 寻找插入排序的插入位置 - (数组, 待排序元素, [函数|对象|字符串])
- sortedLastIndex - 自右寻找插入排序的插入位置 - (数组, 待排序元素, [函数|对象|字符串])
- take - 自左取n个元素 - (数组, [待取数目=1]) - 新数组
- takeRight - 自右取n个元素 - (数组, [待取数目=1]) - 新数组
- takeWhile - 按条件取元素 - (数组, [函数|对象|字符串]) - 新数组
- takeRightWhile - 按条件自右取元素 - (数组, [函数|对象|字符串]) - 新数组
- union - 并集 - (...数组) - 新数组
- uniq/unique - 去重 - (数组, [是否排序], [迭代器]) - 新数组
- unzip & zip & unzipWith 数组合并拆分 - //lodashjs.com/docs/#_unziparray
- without - 除去元素 - (数组, 元素) - 新数组
- xor - 并集减交集,交之补,补之并 - (...数组) - 新数组

<h4>集合扩展函数</h4>
- all/every - 集合每一个元素是否满足条件 - (集合, [函数|对象|字符串]) - 布尔 | 集合: 对象,数组或字符串
- any/some - 集合是否含有满足条件的元素 - (集合, [函数|对象|字符串]) - 布尔
- at - 按索引或键选择集合元素 - (集合, [索引|属性]) - 值数组
- map/collect - 映射 - (集合, [函数|属性]) - 映射后数组
- reduce/foldl/inject - 归并 - (集合, 归并函数) - 归并值 - 归并函数参数: 累加对象, 当前value, 当前key
- reduceRight/foldr - 从右归并 - (集合, 归并函数) - 归并值
- contains/includes - 是否包含值 - (集合, 目标元素或集合, [起始位置]) - 布尔
- countBy - count(*) group by - (集合, [函数|对象|字符串]) - 对象 | { 返回值 : 数目 }
- find/detect - 寻找元素 - (集合, [函数|对象|字符串]) - 集合中一个元素或undefined
- findLast - 从右寻找元素 - (集合, [函数|对象|字符串]) - 集合中一个元素或undefined
- each/forEach - 扩展Array.prototype.forEach - (集合, 迭代器函数) - 集合本身
- eachRight/forEachRight - 同上,从右往左迭代 - (集合, 迭代器函数) - 集合本身
- filter - 过滤元素,takeWhile - (数组集合, 过滤函数) - 符合过滤条件的集合
- reject - 过滤元素,dropWhile - (数组集合, 过滤函数) - 不符合条件的集合
- where - 过滤元素 - (数组集合, match对象) - 符合条件的集合
- invoke - 对集合每个元素调用函数 - (集合, 函数名|函数, ...参数) - 结果集
- indexBy - 创建索引 - (集合, 索引key) - 索引对象
- partition - 分割集合 - (集合, 分割函数) - 结果集合
- groupBy - 分组 - (集合, 分组函数) - 结果对象, key为分组函数返回值, value为组内集合
- pluck - 摘出集合中对象的value集 - (集合, 元素的key) - 元素value集合
- sample - 取样本 - (集合, 样本容量) - 样本集合
- shuffle - 打乱集合 - (集合) - 打乱后的集合 - Fisher-Yates洗牌算法
- size - 集合大小 - (集合) - 集合的容量
- sortBy - 单键排序 - (集合, [函数|对象|字符串]) - 排序结果集
- sortAll - 多键排序 - (集合, [[函数|对象|字符串]]) - 排序结果集 - 排序迭代器为数组
- sortByOrder - 多键排序 - (集合, [[函数|对象|字符串]], ['asc'|'desc']) - 排序结果集

<h4>对象</h4>
- assign - 赋值到目标对象 - (对象, ...源对象) - 目标对象
- at - 取对象属性的值 - (对象, [字符串/字符串数组]) - 取到的值数组
- default - 不覆盖赋值 - (对象, ...源对象) - 目标对象 - 如果目标对象已存在的属性不会覆盖赋值
- get - 取对象的属性值 - (对象, 字符串, [默认值]) - 取到的值
- set - 设置对象属性值 - (对象, 路径字符串, 值) - 设置的值
- has - 是否存在属性 - (对象, 字符串) - 布尔
- invert - 键值反转 - (对象) - 反转后对象
- invertBy -指定key生成条件的键值反转 - (对象, [函数]) - 反转后对象
- merge - 递归合并对象 - (对象, ...其他对象) - 合并后的对象 - 同一个键合并为数组, 数组内多个对象合并同一个对象
- omit - 排除键值 - (对象, ...路径字符串) - 排除键值后的对象
- pick - 选择键值- (对象, ...路径字符串) - 选择特定键值后的对象
- omitBy - 根据条件排除键值 - (对象, 过滤函数) - 排除后的对象
- pickBy - 根据条件选择键值 - (对象, 过滤函数) - 选择后的对象
- unset - 删除属性 - (对象, 路径字符串) - 删除属性后的对象
- transform - 对象的reduce - (对象, reduce函数) - 转换后的对象
- update - 更新值 - (对象, 路径字符串, 映射函数) - 更新后的对象

<h4>工具类</h4>
- now - 当前时间戳 - () - 1970到当前毫秒数
- add - 累加 - (被加数, 加数) - 和
- sum - 集合累加 - (集合, [函数|对象|字符串]) - 总和
- ceil - 向上截取小数 - (带截取数, 精度=0) - 截取值 - 精度默认0取整,负数则向整数位取约数
- floor - 向下截取小数 - (带截取数, 精度=0) - 截取值
- round - 四舍五入 - (带结区属, 精度=0) - 截取值
- min - 取最小值 - (集合, [函数|对象|字符串]) - 最小值
- max - 取最大值 - (集合, [函数|对象|字符串]) - 最大值
- inRange - 是否在范围内 - (数字, [>的数], <的数) - 布尔
- random - 取随机值 - (最小数, 最大数, 是否允许小数) - 随机值
- clone - 复制 - (复制值, [是否深复制=false], [值包装器]) - 复制后的值
- cloneDeep - 深拷贝 - (复制值, [值包装器]) - 复制后的值
- gt/gte/lt/lte - 值比较 - (value1, value2) - 布尔 - 对于字符串调用的普通compare而非local的
- is+Array/Boolean/Date/Empty/Error/Object/Number/Function/NaN/Null/Native/PlanObject/String/RegExp/TypedArray/Undefined/Element/Arguments/Finite - 判断是否满足特定条件 - (值) - 布尔
- isMatch/isEqual - 判断是否匹配或相等 - (源, 目标, [定制化比较器]) - 布尔 - isMatch用于判断对象是否Match某些特定键值对
- to+Array/PlainObject - 转换为标准数组/展开原型链转换为Pojo对象 - (对象) - 转换后的对象

<h4>函数扩展</h4>
- before - 在n次之前调用才生效 - (次数, 函数) - 包装后函数
- after - 在n次之后调用才生效 - (次数, 函数) - 包装后函数
- ary - 舍去第n个后的参数 - (函数, 最大参数数) - 包装后函数
- flow - 依次调用函数 - (函数数组) - 包装后函数
- flowRight/backFlow/compose - 倒序调用函数 - (函数数组) - 包装后函数
- bind - 同Function.prototype.bind - (函数, 绑定this对象, 默认调用实参) - 包装后函数 - 默认实参以rest args形式传入
- bindAll - 对象成员方法全部bind到对象本身 - (对象, [特定函数名数组]) - 包装后对象
- bindKey - key对应的method bind到对象 - (对象, method key, 默认调用实参数组) - 包装后函数
- curry - 柯里化 - (函数, [参数数]) - 包装后函数 - 返回的函数非常灵活, 可以传入<=arguments.length以内的任意实参, 也可以使用'_'作为placeholder,后续填充实参
- curryRight - 逆向传实参柯里化 - (函数, [实参数]) - 包装后函数
- debounce - 函数去抖,详见<a href="//ywbdxx.win/?p=198">这里</a> - (函数, [延时=0], [选项]) - 去抖后函数 - 选项有leading,trailing,maxWait属性可选
- throttle - 函数节流,详见<a href="//ywbdxx.win/?p=198">这里</a> - (函数, [延时=0], [选项]) - 节流后函数 - 选项有leading,trailing属性可选
- defer - setTimeout(func,0)简写版 - (函数, [实参rest arg]) - setTimeout id
- delay - setTimeout高级版 - (函数, 延时毫秒数, [实参rest arg]) - setTimeout id
- memoize - 缓存 - (函数, [缓存键处理函数]) - 带cache属性的函数 - 1.慎用
- wrap - 包装器 - (函数, 包装函数) - 包装后函数 - 包装函数的参数为原函数和原函数的参数
- modArgs - 实参转换器 - (函数, [...转换函数]) - 带参数转换的函数 - 每个转换函数对应一个实参
- negate - 返回值取反器 - (函数) - 返回值去反后的函数
- once - 只执行一次包装器(相当于_.before(1)) - (函数) - 包装后函数
- partical - 偏函数包装器 - (函数, [...实参列表或placeholder]) - 偏函数 - 科普: 偏函数是已经对原函数设置特定实参的函数
- particalRight - 偏函数包装器(实参从右开始赋值) - (函数, [...实参列表或placeholder]) - 偏函数
- rearg - 参数顺序调整器 - (函数, [...形参的实际顺序索引]) - 包装后函数
- spread - 数组实参转列表 - (函数) - 包装后函数 - 传入的数组将会被转换为...arguments形式

<h4>惰性求值包装器</h4>
- _ - 包装对象或集合 - (对象|数组) - lodash对象 | 注: 使用value()求值, 如果结果为单个自动求值
- chain - 包装对象或集合 - (对象|数组) - lodash对象 | 注: 用于惰性求值等函数式特性, 显式调用value()求值
- tap - 拦截器 - 函数 - 函数实参 - 有副作用
- thru - 拦截器 - 函数 - 函数返回值 - 无副作用
- prototype.chain - 同chain,可在包装后调用 - () - lodash对象
- prototype.commit - 提交求值 - () - lodash对象
- prototype.concat - 包装器中加入新的集合 - (...集合) - lodash对象
- prototype.plant - 移植包装器到其他集合 - (集合) - lodash对象
- prototype.reverse - 倒转包装器中的集合 - () - lodash对象
- prototype.value/run/toJson/valueOf - 显式求值 - () - 集合
- prototype.toString - 显式求值后转换为字符串,数组默认join(',') - () - 字符串