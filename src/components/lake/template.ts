/**
 * iframe 的内容（srcDoc）。
 * 从 ../note-yuque/src/components/lake-rich/template.ts 移植，采用 Lake 原生「容器固定高度 + 内部滚动」：
 * iframe 内从阿里 CDN 加载闭源的 Lake(语雀) UMD 内核（依赖 React18 运行时）。
 * createOpenEditor 的容器 (#root) 必须有固定高度，Lake 的 scrollNode (.ne-editor-wrap) 在内部滚动。
 * 这是流程图/白板块悬浮工具栏（.ne-ui-toolbar.lake-diagram-prevent-mouse-select）正确定位的前提：
 * 它相对固定高度的滚动容器定位，容器若按内容自然撑开则无法吸附。
 */
export const templateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title></title>
  <link rel="stylesheet" type="text/css" href="https://gw.alipayobjects.com/render/p/yuyan_npm/@alipay_lakex-doc/1.71.0/umd/doc.css"/>
  <link rel="stylesheet" type="text/css" href="https://gw.alipayobjects.com/os/lib/antd/4.24.13/dist/antd.css"/>
  <style>
    html, body {
      margin: 0;
      height: 100%; /* 固定高度：容器填满 iframe，滚动交给内部 .ne-editor-wrap */
    }
    body {
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .toolbar-container {
      display: none;
    }
    #toolbar {
      flex: 1;
    }
    /* createOpenEditor 的容器：固定高度，Lake 在内部滚动（流程图工具栏吸附的前提） */
    #root {
      height: 100%;
    }
    #child {
      display: flex;
      align-items: center;
      padding: 0 16px;
    }
    .ne-layout-mode-fixed .ne-engine, .ne-layout-mode-adapt .ne-engine {
      padding-top: 16px;
    }
    .ne-layout-mode-fixed .ne-editor-body, .ne-layout-mode-adapt .ne-editor-body {
      height: 100%;
    }
    .ne-ui-overlay-button {
      width: 28px !important;
      height: 28px !important;
      padding: 0 !important;;
      border: none !important;;
    }
    ::selection {
      color: #fff !important;
      background: #1677ff !important;
    }
    .continue-button:hover, .continue-button:focus {
      color: #00B96B;
      border-color: #00B96B;
    }
    .ne-layout-mode-fixed .ne-editor-wrap {
      padding: 16px 16px 0;
      height: 100%;
    }
    .ne-layout-mode-fixed .ne-engine, .ne-layout-mode-adapt .ne-engine {
      padding: 20px 24px 200px;
      /* 固定 min-height：不要用 100vh，否则会与「按内容高度同步 iframe」相互喂值形成尺寸抖动 */
      min-height: 360px;
    }
    .ne-layout-mode-fixed .ne-editor-wrap-content {
      min-width: 317px;
    }
    .ne-layout-mode-fixed .ne-editor-outer-wrap-box {
      min-width: 317px;
    }
    .ne-layout-mode-fixed .ne-editor-outer-wrap-box, .ne-layout-mode-adapt .ne-editor-outer-wrap-box,
    .ne-layout-mode-fixed .ne-editor-wrap-content, .ne-layout-mode-adapt .ne-editor-wrap-content {
      min-width: 317px;
    }
    .ne-editor-wrap {
      overscroll-behavior: contain;
      height: 100%; /* Lake 原生滚动容器：固定高度，内部滚动 */
      overflow-y: auto;
    }
    /* 代码块工具栏不再随长代码隐藏：改用「块内滚动」而非 sticky 吸顶。
       背景：本应用编辑器跑在 iframe + WebKitGTK 内核里，position:sticky 被夹在 ne-card 自定义元素链
       内时定位不可靠 —— 长代码一旦滚过，工具栏（语言/复制/折叠）仍会被卷走。曾尝试 sticky+解除
       .ne-card-container 的 overflow:hidden，治标不治本，且解除 overflow 还会丢掉卡片圆角裁剪。
       现方案：给代码区（CodeMirror 滚动体，本就 overflow:scroll）设视口相对的高度上限，超长代码在
       代码块「内部」滚动，工具栏永远留在代码块顶部、不被卷走。这正是 Lake 自带 .ne-codeblock-height-limit
       的机制（其 .CodeMirror-scroll{max-height} 仅在用户手动开启「限高」时生效，且上限高达 11808px），
       这里把它常态化到一个合理高度。CM5(.CodeMirror-scroll)/CM6(.cm-scroller) 两种内核都覆盖。 */
    .ne-editor .ne-codeblock .CodeMirror-scroll,
    .ne-editor .ne-codeblock .cm-scroller {
      max-height: 60vh;
    }
    /* 暗色模式：跟随宿主 <html data-theme>（由 LakeEditor.tsx 同步注入）。
       闭源内核仅对「书写主表面」做适配：背景调暗 + 正文转亮；
       悬浮工具栏 / 弹层等瞬时元素仍沿用内核默认浅色。 */
    html[data-theme="dark"] body,
    html[data-theme="dark"] #root,
    html[data-theme="dark"] .ne-editor-wrap,
    html[data-theme="dark"] .ne-editor-body,
    html[data-theme="dark"] .ne-engine {
      background: #0a0a0a;
    }
    html[data-theme="dark"] .ne-engine,
    html[data-theme="dark"] .ne-engine p,
    html[data-theme="dark"] .ne-engine li,
    html[data-theme="dark"] .ne-engine h1,
    html[data-theme="dark"] .ne-engine h2,
    html[data-theme="dark"] .ne-engine h3,
    html[data-theme="dark"] .ne-engine h4,
    html[data-theme="dark"] .ne-engine blockquote {
      color: #ededed;
    }
    html[data-theme="dark"] ::selection {
      color: #000 !important;
      background: #ededed !important;
    }
  </style>
</head>
<body>
  <div class="toolbar-container">
    <div id="toolbar"></div>
    <div id="child"></div>
  </div>
  <div id="root"></div>
<script crossorigin src="https://unpkg.com/react@18.2.0/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18.2.0/umd/react-dom.production.min.js"></script>
<script src="https://gw.alipayobjects.com/render/p/yuyan_v/180020010000005484/7.1.4/CodeMirror.js"></script>
<script src="https://ur.alipay.com/tracert_a385.js"></script>
<script src="https://mdn.alipayobjects.com/design_kitchencore/afts/file/ANSZQ7GHQPMAAAAAAAAAAAAADhulAQBr"></script>
<script src="https://gw.alipayobjects.com/render/p/yuyan_npm/@alipay_lakex-doc/1.71.0/umd/doc.umd.js"></script>
</body>
</html>
`;
