# 音频（audio）

- [配置项](#%E9%85%8D%E7%BD%AE%E9%A1%B9)
  * [createUploadPromise](#createuploadpromise)
  * [queryAudioUrl](#queryaudiourl)
  * [allowAudioPlayer](#allowaudioplayer)
  * [playerComponent](#playercomponent)
  * [errorComponent](#errorcomponent)
  * [getDocReadURL](#getdocreadurl)

---

<font style="background:#F8CED3;color:#70000D">1.23.0支持</font>

由于一些历史原因，audio的lake格式数据目前没有持久化播放url，每一次渲染前都会根据audio现有信息去查询最新的播放地址。所以相比于图片、视频等其他多媒体插件额外需要配置查询播放链接的配置项。

编辑和阅读模式配置项相同，注意两者都要配置。

# 配置项

## createUploadPromise

<code><font style="color:#7E45E8;">(data: File, progress: (value: number) => void) => Promise<AudioUploadResponse></font></code>

可以在上传过程中调用`progress`， <code><font style="color:#7E45E8;">value</font></code>需要在 `0-1` 范围内

音频上传，需要返回下面的对象

```typescript
/** 上传响应值 */
export interface AudioUploadResponse {
  audioId: string;
  audioUrl: string;
  downloadUrl: string;
  filesize: number;
  filename: string;
}

```

## queryAudioUrl

<code><font style="color:#7E45E8;">(cardData: AudioCardData) => Promise<{ audioUrl: string; downloadUrl: string; }></font></code>

获取音频的播放地址，建议有配套服务端能够根据`audioId`查询到播放地址和下载地址，如果没有服务能力，可以尝试通过将`audioId`配置成播放地址，这里就可以依靠纯前端拿到播放地址。

## allowAudioPlayer

<code><font style="color:#7E45E8;">boolean</font></code>

是否允许音频播放。默认阅读页不允许。

## playerComponent

<code><font style="color:#7E45E8;">React.FC<AudioPlayerComponentProps></font></code>

自定义音频播放组件。默认提供原生audio标签的视图（props接口可自行console查看）

## errorComponent

<code><font style="color:#7E45E8;">React.FC<AudioErrorComponentProps></font></code>

自定义音频异常组件。在上传失败时会展示该组件（props接口可自行console查看）

## getDocReadURL

<code><font style="color:#7E45E8;">(currentURL: string, cardId: string) => string</font></code>

输出html时候使用的跳转地址。
