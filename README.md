# Yuque Rich Text（语雀富文本编辑器）

### 编辑使用案例
> 注意不可在onChange事件中修改value的值，否则会进入无限递归。

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>yuque编辑器</title>
  <link rel="stylesheet" type="text/css" href="https://gw.alipayobjects.com/render/p/yuyan_npm/@alipay_lakex-doc/1.24.0/umd/doc.css"/>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/antd@4.24.13/dist/antd.css"/>
  <style>
	#root {
 	 height: 100vh;
	}	
  </style>
</head>
<body>
  <div id="root" class="ne-doc-major-editor"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://gw.alipayobjects.com/render/p/yuyan_npm/@alipay_lakex-doc/1.24.0/umd/doc.umd.js"></script>

<script>
window.onload = function () {
  const { createOpenEditor } = window.Doc;
  // 创建编辑器
  const editor = createOpenEditor(document.getElementById('root'), {
    darkMode: true,
    input: {
      autoSpacing: true,
    },
    image: {
      isCaptureImageURL() {
        return false;
      },
    },
    envAdapter: {
      openLink: (url, isExternal) => {
        console.info(url, isExternal);
      }
    },
  });
  // 设置内容
  editor.setDocument('text/lake', '<p><span style="color: rgb(255, 111, 4),rgb(243, 48, 171)">欢迎来到 yuque 编辑器</span></p>');
  // 监听内容变动
  editor.on('contentchange', () => {
    console.info(editor.getDocument('text/lake'));
  });
}
</script>
</body>
</html>
```





⏺ 找到问题了。关键差异在 template.ts 中的 CSS：

  根本原因： #root 容器设置了 overflow: hidden（第31行），当代码块内容超出视图高度时，Lake 编辑器的内部工具栏 ne-ui-inner-toolbar 被裁剪掉了。而 w.html 中 #root
  只有 height: 100vh，没有 overflow: hidden，所以工具栏不会被裁剪。

  ne-ui-inner-toolbar 是代码块的浮动工具栏，它相对于 #root 容器定位。当 #root 设置了 overflow: hidden，工具栏超出容器边界时会被隐藏。

  修复方案：将 #root 的 overflow: hidden 改为 overflow: visible，同时确保滚动由内部的 .ne-editor-wrap 处理（它已经有 overflow-y: auto）。

⏺ Update(src/components/lake-rich/template.ts)
  ⎿  Added 3 lines, removed 2 lines
      29      /* 固定高度容器：让 Lake 编辑器的工具栏基于容器定位，而非 viewport */
      30      #root {
      31        flex: 1;
      32 -      overflow: hidden;                                                                                                                           
      33 -      height: 0; /* 配合 flex:1 强制容器有明确高度 */                                                                                             
      32 +      overflow: visible;                                                                                                                          
      33 +      height: 0;                                                                                                                                  
      34 +      position: relative;                                                                                                                         
      35      }
      36      #child {
      37        display: flex;



⏺ Update(src/components/lake-rich/template.ts)                                                                                                                     
  ⎿  Added 4 lines, removed 2 lines                                 
      29      /* 固定高度容器：让 Lake 编辑器的工具栏基于容器定位，而非 viewport */                                                                                
      30      #root {                                                                                                                                              
      31        flex: 1;                                                                                                                                           
      32 -      overflow: visible;                                                                                                                                 
      32 +      overflow: hidden;                                                                                                                                  
      33        height: 0;                                                                                                                                         
      34 -      position: relative;                                                                                                                                
      34      }                                                                                                                                                    
      35 +    .ne-ui.lakex-default-theme {                                                                                                                         
      36 +      position: fixed;                                                                                                                                   
      37 +    }                                                                                                                                                    
      38      #child {                                                                                                                                             
      39        display: flex;                                                                                                                                     
      40        align-items: center;                                                                                                                               
                                                                                                                                                                   
⏺ 已修复。.ne-ui.lakex-default-theme 是 Lake 编辑器工具栏的浮层容器，它原本依赖于父容器的定位上下文，但 #root 的 overflow: hidden 把它裁剪了。设置 position: fixed 
  让它脱离文档流，直接相对于 viewport 定位，不再受容器裁剪影响。                                                                                                   
                                                                                                                                                                   
  刷新 http://localhost:5173 试试代码块粘贴长代码的场景。                                                                                                          
⏺ 语雀编辑器从 1.12.0 起原生支持暗黑模式（你当前用的 @alipay_lakex-doc/1.71.0 已涵盖），见 DOC/语雀编辑器组件/配置/通用配置.md:75：                                
                                                                                                                                                                   
  darkMode: boolean                                                                                                                                                
                                                                                                                                                                   
  也就是工具栏（ne-ui-inner-toolbar）和编辑器都会跟随这个开关切换。落到当前组件里，要做两件事。                                                                    
   
  1. 把 darkMode 透传给 Lake                                                                                                                                       
                  
  在 src/components/lake-rich/lake-rich.ts:168 创建编辑器的 options 里加一行：                                                                                     
                  
  const newEditor = editInstance(doc.getElementById("root"), {                                                                                                     
    darkMode: props.darkMode,         // 新增                                                                                                                      
    scrollNode: () => doc.querySelector(".ne-editor-wrap"),                                                                                                        
    // ...其余配置                                                                                                                                                 
  });                                                                                                                                                              
                                                                                                                                                                   
  并在 EditorProps 与 defineComponent.props 中各加一项 darkMode: boolean。                                                                                         
   
  切换时不要重建 iframe，直接 watch：                                                                                                                              
                  
  watch(() => props.darkMode, (v) => {                                                                                                                             
    editor.value?.execCommand?.("setDarkMode", v); // Lake 暴露的命令                                                                                              
    // 兜底：给 iframe 文档根节点打类，配合自定义样式                                                                                                              
    const d = iframeRef.value?.contentDocument;                                                                                                                    
    d?.documentElement.classList.toggle("lakex-dark", !!v);                                                                                                        
  });                                                                                                                                                              
                                                                                                                                                                   
  ▎ setDarkMode 是 Lake 内部命令，1.71 仍可用；若某些版本去掉了，就只靠下面 ②的类名 + CSS 兜底。                                                                   
                  
  2. 在 iframe 内补暗色样式                                                                                                                                        
                  
  template.ts 里的样式是写死浅色的（选区蓝、背景白），不会被 darkMode 自动覆盖。建议把硬编码颜色改成 CSS 变量 + :root.lakex-dark 覆盖，关键改动                    
  src/components/lake-rich/template.ts:12：
                                                                                                                                                                   
  :root { color-scheme: light; --bg:#fff; --fg:#1f1f1f; --sel:#1677ff; }
  :root.lakex-dark {                                                                                                                                               
    color-scheme: dark;                                                                                                                                            
    --bg:#1f1f1f; --fg:#e6e6e6; --sel:#3b82f6;                                                                                                                     
  }                                                                                                                                                                
  html, body { background: var(--bg); color: var(--fg); }                                                                                                          
  ::selection { color:#fff !important; background: var(--sel) !important; }                                                                                        
                                                                                                                                                                   
  /* 工具栏：lakex 自身会处理大部分，但这两个常需兜底 */                                                                                                           
  .lakex-dark .ne-ui-inner-toolbar,                                                                                                                                
  .lakex-dark .ne-ui.lakex-default-theme {                                                                                                                         
    background: #2a2a2a;                                                                                                                                           
    border-color: #3a3a3a;
  }                                                                                                                                                                
  .lakex-dark .ne-ui-overlay-button { color:#e6e6e6 !important; }
                                                                                                                                                                   
  另外把 iframe 自身从 background: transparent（lake-rich.ts:345）保留即可——背景由 iframe 内 body 决定，跟随上面变量。                                             
                                                                                                                                                                   
  3. 触发方式                                                                                                                                                      
                  
  宿主只要：                                                                                                                                                       
                  
  <YuqueRichText :value="html" :dark-mode="isDark" />                                                                                                              
                                                                                                                                                                   
  isDark 可来自系统 matchMedia('(prefers-color-scheme: dark)')，或 demo 里的开关。                                                                                 
                                                                                                                                                                   
  注意点                                                                                                                                                           
                  
  - 别把 darkMode 拼到 props.value 上 watch，会触发 setDocument 死循环（CLAUDE.md 里有这条约束）。                                                                 
  - antd.css 是亮色版，工具栏弹层若用了 antd 控件，深色态可能颜色不对；要么换 antd.dark.css，要么靠 .lakex-dark 选择器局部覆盖。
  - 第三方卡片（codemirror、附件预览等）有些不跟随 darkMode，需要单独 CSS 兜底。                                                                                   
                                                                          
