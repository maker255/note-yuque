# 附件（file）

- [编辑模式配置项](#%E7%BC%96%E8%BE%91%E6%A8%A1%E5%BC%8F%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [getFileDownloadURL](#getfiledownloadurl)
  * [getPreviewUrl](#getpreviewurl)
  * [uploadFileURL](#uploadfileurl)
  * [createUploadPromise新](#createuploadpromise%E6%96%B0)
  * [canDownload](#candownload)
  * [canPreview](#canpreview)
- [阅读模式配置项](#%E9%98%85%E8%AF%BB%E6%A8%A1%E5%BC%8F%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [viewerTooltip](#viewertooltip)
  * [canDownload](#candownload-1)
  * [canPreview](#canpreview-1)
  * [onViewerInlineFileClick1.5.0](#onviewerinlinefileclick150)

---

# 编辑模式配置项

## getFileDownloadURL

<code><font style="color:#7E45E8;">Nullable<(src: string) => string></font></code>

获取文件下载的链接，入参为文件远程保存的地址，返回值为文件下载链接地址

## getPreviewUrl

<code><font style="color:#7E45E8;">Nullable<(src: string) => string></font></code>

获取文件预览地址，入参为文件远程保存的地址，返回值为文件预览地址

## uploadFileURL

<code><font style="color:#7E45E8;">string</font></code>

文件上传地址，接口要求如下

| **请求方式** | `POST` |
| :---: | --- |
| **请求值** | `FormData`，具有字段`file`，类型为`File` |
| **响应值** | `json {   "data": {     "url": "附件远程地址",     "size": "附件体积",     "filename": "附件名",     "extname": "附件扩展", 	} } `  |

## createUploadPromise<font style="background:#F8CED3;color:#70000D">新</font>

<code><font style="color:#7E45E8;">Nullable<(file: File) => Promise<{url:string; size:number; filename:string}>></font></code>

自定义上传任务方法。

## canDownload

<code><font style="color:#7E45E8;">(cardData: FileCardData) => boolean</font></code>

是否允许下载

## canPreview

<code><font style="color:#7E45E8;">(cardData: FileCardData) => boolean</font></code>

是否允许预览

# 阅读模式配置项

## viewerTooltip

<code><font style="color:#7E45E8;">(ui: IViewerCardUI<VLocalDocCardNode> | IViewerCardUI<VFileCardNode>)=>React.ReactNode</font></code>

阅读态的卡片tooltip，鼠标hover到卡片节点能展示自定义react组件。

## canDownload

<code><font style="color:#7E45E8;">(cardData: FileCardData) => boolean</font></code>

是否允许下载

## canPreview

<code><font style="color:#7E45E8;">(cardData: FileCardData) => boolean</font></code>

是否允许预览

## onViewerInlineFileClick<font style="background:#F8CED3;color:#70000D">1.5.0</font>

<code><font style="color:#7E45E8;">(e: MouseEvent, ui: IViewerCardUI<VFileCardNode>) => void</font></code>

行内附件节点的点击会调用该方法，可以在这个方法里实现下载逻辑。
