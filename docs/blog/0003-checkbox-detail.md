---
title:      "前端Checkbox中的细节"
date:       2017-08-03
tags:
    - JS/TS
---

# {{ $frontmatter.title }}


### 选择器
```js
// checkbox不同的选择方式   
$(":checkbox");
$("[type=checkbox]");
$("[type=checkbox]:checked");
$(":checkbox:not(:checked)");
```
### 判断选中
```js
// 判断checkbox是否被选择   
$(":checkbox").is(":checked");
$(":checkbox").prop("checked");
```
### 改变状态
```js
// jQuery操作checkbox

$(":checkbox").prop("checked",true);
$(":checkbox").click();
$(":checkbox").trigger('click');
$(":checkbox:checked").removeAttr('checked');
```
### 小知识

> jquery1.6版本便对attr()做出了修改,并增加了prop()

**attr在某些情况下无效的原因**
- attr表示<span style="color: #ff0000;">Html</span>的attribute, 而prop表示<span style="color: #ff0000;">DOM</span>中的对象属性,即property;
- attr的数据类型是<span style="color: #ff0000;">string</span>, 而prop可以表示boolean和object等<span style="color: #ff0000;">任何类型</span>;
- prop的更新<span style="color: #ff0000;">一定</span>导致attr更新, attr更新<span style="color: #ff0000;">不一定</span>导致prop更新,如checked和value;
- 而attr在remove原型对象时会出错, 而prop会忽略这个错误

关于attr和prop的详细对比[在这里有](//stackoverflow.com/questions/5874652/prop-vs-attr)
<span style="font-size: 18px;">所以</span>, 以下两种写法并<span style="color: #ff0000;">不一定</span>会获取或设置选中状态
```js
$(":checkbox").attr("checked");
$(":checkbox").attr("checked","checked");
```