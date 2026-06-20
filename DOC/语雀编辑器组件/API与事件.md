# API与事件

- [API](#api)
  * [getDocument 方法](#getdocument-%E6%96%B9%E6%B3%95)
    + [参数列表](#%E5%8F%82%E6%95%B0%E5%88%97%E8%A1%A8)
    + [返回类型](#%E8%BF%94%E5%9B%9E%E7%B1%BB%E5%9E%8B)
    + [demo](#demo)
  * [setDocument](#setdocument)
    + [参数列表](#%E5%8F%82%E6%95%B0%E5%88%97%E8%A1%A8-1)
    + [demo](#demo-1)
  * [destory](#destory)
    + [demo](#demo-2)
- [事件](#%E4%BA%8B%E4%BB%B6)
    + [contentchange](#contentchange)
    + [selectionchange](#selectionchange)
    + [focusstatuschange](#focusstatuschange)
    + [focus](#focus)
    + [blur](#blur)
    + [beforedestroy](#beforedestroy)

---

# API

## getDocument 方法

获取指定的api内容

### 参数列表

1. type 可选参数， 内容类型,
   1. text/lake 语雀的格式
   2. text/html html格式
   3. text/plain 文本格式
   4. text/markdown markdown 格式
   5. json（**默认值）** 返回json格式的内容，

### 返回类型

返回对应<code>**type**</code>的字符串，如果`type`是`json`则返回`json`格式的内容

### demo

```javascript
editor.getDocument('text/lake');
editor.getDocument('text/html');
editor.getDocument('text/plain');
```

***

## setDocument

设置编辑器内容

### 参数列表

1. type 内容类型
   1. text/lake
   2. text/html
   3. text/plain
   4. text/markdown
   5. json
2. content 内容，根据type不同要符合对应格式要求

### demo

```javascript
editor.setDocument('text/plain', '123\n123');
```

***

## destory

销毁当前文档

### demo

```javascript
editor.destroy();
```

# 事件

编辑器会在使用过程中触发不同的事件

### contentchange

文档内容变化后会触发该事件

```javascript
editor.on('contentchange', () => {
  engine.getDocument('text/lake'); // 获取文档的最新内容
});
```

### selectionchange

内容变化的选区变化事件不包含在内，文档选区变化事件

```javascript
editor.on('selectionchange', () => {
  console.info(document.getSelection()); // 获取最新选区
});
```

### focusstatuschange

焦点变化事件

```javascript
editor.on('focusstatuschange', ({ focused }) => {
  console.info('文档焦点状态', focused);
});
```

### focus

聚焦事件

### blur

失焦事件

### beforedestroy

文档卸载前执行的事件

```javascript
editor.on('beforedestroy', () => {
	console.info('文档卸载');
});
```
