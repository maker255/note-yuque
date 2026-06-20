# 图片（image）

- [编辑模式配置项](#%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [上传相关](#%E4%B8%8A%E4%BC%A0%E7%9B%B8%E5%85%B3)
    + [crawlURL](#crawlurl)
    + [uploadFileURL](#uploadfileurl)
    + [createUploadPromise](#createuploadpromise)
    + [accept](#accept)
    + [isCaptureImageURL](#iscaptureimageurl)
    + [capturePatterns](#capturepatterns)
    + [excludeCapturePatterns](#excludecapturepatterns)

---

# 编辑模式配置项

## 上传相关

插件内置了上传任务的处理，仅配置`crawURL`和`uploadFileURL`即可基本满足上传需求，但对于接口格式有一定要求。

### crawlURL

<code><font style="color:#7E45E8;">string | (() => string) | null;</font></code>

服务端抓取图片转存接口。主要用在复制粘贴其它文档、html等场景下，数据源为图片链接。接口入参为图片链接地址字符串。要求服务端能从图片url中抓取图片进行转存，并返回图片预览地址`{data:{url:string}}`、

| **请求方式** | `POST` |
| :---: | --- |
| **请求值** | `json {   "url": "图片原始链接" } `   |
| **响应值** | `json {   "data": {     "url":"转存后的图片预览地址", 	} } `  |

### uploadFileURL

<code><font style="color:#7E45E8;">string | (() => string) | null;</font></code>

上传图片文件接口。主要用在从系统文件选择上传的场景下，数据源为图片文件。接口入参为`FormData`，并且具有`file`字段，值为`Blob`类型。要求服务端返回图片预览地址`{data:{url:string}}`。

| **请求方式** | `POST` |
| :---: | --- |
| **请求值** | `FormData` |
| **响应值** | `json {   "data": {     "url":"转存后的图片预览地址", 	} } `  |

### createUploadPromise

<code><font style="color:#7E45E8;">Nullable<(request: {type: 'url' | 'file' | 'base64', file: File | string}) => Promise<{url:string; size:number; filename:string}>></font></code>

自定义上传任务方法, 需要配合 **isCaptureImageURL ，判断哪些图片需要转存。**

```javascript
const option = {
  image: {
    // 配置上传接口,要返回一个promise对象
    createUploadPromise: (request) => {
      const { type, data } = request;
      if(type === 'url') {
        // data 是一个url，表示需要转存
      } else if(type === 'file') {
        // data是一个File
      }

      return Promise.resolve({
        url: '上传成功后的图片url地址',
        size: 100, // 文件大小
        filename: '图片名称，例如image.png'
      });
    },
  },
};
```

### accept

<code><font style="color:#7E45E8;">string | string[] | null;</font></code>

可以被识别为图片类型的文件后缀。没有命中的将会处理为文件类型，将由`File`插件处理其编辑、展示行为。如果没有配置，则斜杠面板中的按钮也将会“置灰”。使用`createOpenEditor`创建编辑器，默认的配置中已经包含了下面这些后缀。

```typescript
image: [
    '.svg',
    '.png',
    '.bmp',
    '.jpg',
    '.jpeg',
    '.gif',
    '.tif',
    '.tiff',
    '.emf',
    '.webp',
    '.heic',
    '.heif',
  ],
```

### isCaptureImageURL

<code><font style="color:#7E45E8;">(url: string, patterns: RegExp[], excludePatterns: RegExp[]) => boolean</font></code>

默认所有图片链接都会被抓取，进入`crawURL`的处理逻辑。该方法接收待抓取的图片链接、命中匹配、排除匹配对于不需要转存的链接可以返回`false`。

:::color3
**⚠️\*\*\*\*注意：** 此配置会影响图片是否在阅读页可以展示出来。

:::

### capturePatterns

<code><font style="color:#7E45E8;">RegExp[]</font></code>

将作为`isCaptureImageURL`的第一个参数

### excludeCapturePatterns

<code><font style="color:#7E45E8;">RegExp[]</font></code>

将作为`isCaptureImageURL`的第二个参数
