# 布局（layout）

- [配置项](#%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [layout](#layout)
  * [demo](#demo)

---

编辑模式和阅读模式配置项相同。

:::success
编辑器的容器需要带有样式

* 阅读器 `ne-doc-major-viewer`
* 编辑器 `ne-doc-major-editor`

:::

# 配置项

## layout

<code><font style="color:#7E45E8;">'fixed' | 'adapt'</font></code>

布局模式，默认为`adapt`

* fixed：标宽模式，编辑器最大宽度`750px`
* adapt：超宽模式，编辑器自适应容器宽度。

## demo

```typescript
window.onload = function () {
  const { createOpenEditor } = window.Doc;
  // 创建编辑器
  const dom = document.getElementById('root');
  // 需要确保容器包含ne-doc-major-editor
  dom.classList.add('ne-doc-major-editor');
  const editor = createOpenEditor(dom, {
    layout: 'fixed',
  });
}
```
