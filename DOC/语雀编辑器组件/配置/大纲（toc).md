# 大纲（toc)

- [编辑模式配置项](#%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [enable](#enable)
  * [normalView](#normalview)
  * [allowModifyHash](#allowmodifyhash)
- [阅读模式配置项](#%E9%98%85%E8%AF%BB%E6%A8%A1%E5%BC%8F%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [enable](#enable-1)
  * [allowModifyHash](#allowmodifyhash-1)
  * [getContainer](#getcontainer)
- [常见问题](#%E5%B8%B8%E8%A7%81%E9%97%AE%E9%A2%98)
  * [编辑模式下大纲没有展示出来](#%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F%E4%B8%8B%E5%A4%A7%E7%BA%B2%E6%B2%A1%E6%9C%89%E5%B1%95%E7%A4%BA%E5%87%BA%E6%9D%A5)

---

大纲会出现在编辑器/阅读器右侧，默认不开启。

# 编辑模式配置项

## enable

<code><font style="color:#7E45E8;">boolean</font></code>

是否开启，默认为false。

## normalView

<code><font style="color:#7E45E8;">boolean</font></code>

是否为展开状态，默认为true。不过需要注意的是，大纲在用户手动执行过展开或收起的操作后，会将当前状态保存在localstorage里，这种情况下会优先采用用户的上次行为而不是该配置项。

## allowModifyHash

<code><font style="color:#7E45E8;">boolean</font></code>

大纲被点击后是否允许改变 hash，默认为true。

# 阅读模式配置项

## enable

<code><font style="color:#7E45E8;">boolean</font></code>

是否开启，默认为false。

## allowModifyHash

<code><font style="color:#7E45E8;">boolean</font></code>

大纲被点击后是否允许改变 hash，默认为true。

## getContainer

<code><font style="color:#7E45E8;">(() => HTMLElement) | null</font></code>

指定挂载的TOC节点。

# 常见问题

## 编辑模式下大纲没有展示出来

执行`editor.setDocument`的时候要异步一下，可以包在`setTimeout`回调内。
