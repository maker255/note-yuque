/* eslint-disable @typescript-eslint/no-explicit-any */
// 语雀 Lake 富文本编辑器的 React 封装。
// 从 ../note-yuque/src/components/lake-rich/lake-rich.ts（Vue defineComponent）移植为 React forwardRef 组件。
//
// 核心做法：渲染一个 <iframe srcDoc>，在 iframe 内从阿里 CDN 加载闭源的 Lake UMD 内核，
// 轮询 contentWindow.Doc 就绪后注入自定义插件并实例化编辑器，通过 contentchange 事件回传内容。
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { templateHtml } from "./template";
import loadLakeEditor from "./load";
import { InjectEditorPlugin } from "./editorPlugin";

const blockquoteID = "yqextensionblockquoteid";

export interface LakeEditorProps {
  /** 初始内容（Lake 文档格式字符串）。切换文档请配合外层 key={id} 重建组件。 */
  value?: string;
  /** 只读预览模式 */
  isview?: boolean;
  /** 内容变更回调，参数为最新的 Lake 文档字符串 */
  onChange?: (value: string) => void;
  /** 编辑器就绪并灌入初值后触发 */
  onLoad?: () => void;
  /** Ctrl/⌘ + Enter 触发的保存 */
  onSave?: () => void;
  /** CDN 加载失败/超时回调 */
  onError?: (err: unknown) => void;
}

export interface IEditorRef {
  /** 追加 html 到文档；breakLine 为 true 时先插入换行 */
  appendContent: (html: string, breakLine?: boolean) => void;
  /** 设置文档内容（清空旧内容） */
  setContent: (content: string, type?: "text/lake" | "text/html") => void;
  /** 获取文档内容 */
  getContent: (type: "lake" | "text/html" | "description") => string;
  /** 当前是否为空文档 */
  isEmpty: () => boolean;
  /** 获取摘要 */
  getSummaryContent: () => string;
  /** 统计字数 */
  wordCount: () => number;
  /** 聚焦到文档开头（offset 可落到开头第 offset 个段落） */
  focusToStart: (offset?: number) => void;
  /** 插入换行符 */
  insertBreakLine: () => void;
}

type LoadStatus = "loading" | "ready" | "error";

const LakeEditor = forwardRef<IEditorRef, LakeEditorProps>(function LakeEditor(
  props,
  ref,
) {
  const isBrowser = typeof window !== "undefined";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const editorRef = useRef<any>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");

  // 把易变的 props 存进 ref，供 iframe load 的异步回调读取最新值，
  // 同时避免它们进入挂载 effect 的依赖导致 iframe 重建。
  const propsRef = useRef(props);
  propsRef.current = props;

  // 挂载：注册 iframe load 监听，加载 Lake 内核并实例化编辑器。
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    let disposed = false;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (isBrowser ? e.ctrlKey : e.metaKey)) {
        propsRef.current.onSave?.();
      }
    };

    // 把宿主页面的 <html data-theme> 同步进 iframe 文档，让编辑器主表面跟随明暗主题。
    const applyTheme = () => {
      const root = iframe.contentDocument?.documentElement;
      if (!root) return;
      const t = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      root.setAttribute("data-theme", t);
    };
    // 监听宿主主题切换（useTheme 改写 <html data-theme>），实时同步到 iframe。
    const themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    const handleLoad = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow as (Window & { Doc: any; editor?: any }) | null;
      if (!doc || !win) return;

      applyTheme(); // 尽早着色，减少暗色下的白闪

      // 注入自定义插件（必须在创建编辑器之前）
      InjectEditorPlugin(win.Doc, doc);

      loadLakeEditor(win)
        .then(() => {
          if (disposed) return;
          const { createOpenEditor, createOpenViewer } = win.Doc;
          const create = propsRef.current.isview ? createOpenViewer : createOpenEditor;
          const newEditor = create(doc.getElementById("root"), {
            scrollNode: () => doc.querySelector(".ne-editor-wrap"),
            image: {
              uploadFileURL: "/api/upload/image",
              crawlURL: "/api/upload/image",
            },
            video: {
              uploadFileURL: "/api/upload/video",
            },
            placeholder: "输入内容...",
            defaultFontsize: 14,
          });

          newEditor.on("visitLink", (url: string) => {
            window.open(url, "__blank");
          });
          // 监听内容变动 → 回传 Lake 文档字符串
          newEditor.on("contentchange", () => {
            propsRef.current.onChange?.(newEditor.getDocument("lake"));
          });
          win.editor = newEditor;
          editorRef.current = newEditor;

          // 灌入初值（只此一次；切换文档由外层 key 重建组件完成）。
          // 严禁在 onChange 中回写 value，否则会再次触发 setDocument 形成无限递归。
          newEditor.setDocument("lake", propsRef.current.value ?? "");
          newEditor.execCommand("paragraphSpacing", "relax");

          doc.addEventListener("keydown", onKeyDown, true);

          // iframe 高度固定（CSS height:100% 填满 .lake-editor-wrap），
          // 滚动由内部 Lake scrollNode (.ne-editor-wrap) 处理，无需 JS 同步内容高度。

          setStatus("ready");
          propsRef.current.onLoad?.();
        })
        .catch((err) => {
          if (disposed) return;
          setStatus("error");
          propsRef.current.onError?.(err);
        });
    };

    iframe.addEventListener("load", handleLoad);
    return () => {
      disposed = true;
      themeObserver.disconnect();
      iframe.removeEventListener("load", handleLoad);
      iframe.contentDocument?.removeEventListener("keydown", onKeyDown, true);
    };
    // 仅挂载时运行一次；props 通过 propsRef 读取最新值。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(
    ref,
    (): IEditorRef => ({
      appendContent: (html: string, breakLine = false) => {
        const editor = editorRef.current;
        if (!editor) return;
        if (breakLine) editor.execCommand("breakLine");
        editor.kernel.execCommand("insertHTML", html);
        iframeRef.current?.focus();
        editor.execCommand("focus");
        editor.renderer.scrollToCurrentSelection();
      },
      setContent: (content: string, type: "text/lake" | "text/html" = "text/html") => {
        const editor = editorRef.current;
        if (!editor) return;
        iframeRef.current?.focus();
        editor.setDocument(type, content);
        editor.execCommand("focus", "end");
        // 寻找定位的 block，插入到 block 上方
        const node = editor.kernel.model.document.getNodeById(blockquoteID);
        if (node) {
          const rootNode = editor.kernel.model.document.rootNode;
          if (rootNode.firstNode === node) return;
          editor.kernel.execCommand("selection", {
            ranges: [
              {
                start: {
                  node: rootNode.children[node.offset - 1],
                  offset: rootNode.children[node.offset - 1].childCount,
                },
              },
            ],
          });
          editor.execCommand("focus");
        }
      },
      getContent: (type: "lake" | "text/html" | "description") => {
        const editor = editorRef.current;
        if (!editor) return "";
        if (type === "lake") {
          return editor.getDocument("text/lake", { includeMeta: true });
        } else if (type === "text/html") {
          return editor.getDocument("text/html");
        }
        return editor.getDocument("description");
      },
      isEmpty: () => {
        const editor = editorRef.current;
        if (!editor) return true;
        return editor.queryCommandValue("isEmpty");
      },
      getSummaryContent: () => {
        const editor = editorRef.current;
        if (!editor) return "";
        return editor.queryCommandValue("getSummary", "lake");
      },
      wordCount: () => {
        const editor = editorRef.current;
        if (!editor) return 0;
        return editor.queryCommandValue("wordCount");
      },
      focusToStart: (offset = 0) => {
        const editor = editorRef.current;
        if (!editor) return;
        iframeRef.current?.focus();
        if (offset) {
          editor.kernel.execCommand("selection", {
            ranges: [
              {
                start: {
                  node: editor.kernel.model.document.rootNode.children[offset],
                  offset: 0,
                },
              },
            ],
          });
          editor.execCommand("focus");
        } else {
          editor.execCommand("focus", "start");
        }
      },
      insertBreakLine: () => {
        const editor = editorRef.current;
        if (!editor) return;
        editor.execCommand("breakLine");
      },
    }),
    [],
  );

  return (
    <div className="lake-editor-wrap">
      <iframe
        ref={iframeRef}
        className="lake-editor"
        srcDoc={templateHtml}
        allow="*"
        style={{ background: "transparent", border: "none" }}
      />
      {status !== "ready" && (
        <div className="lake-editor-overlay">
          {status === "loading"
            ? "正在加载语雀编辑器内核…"
            : "编辑器加载失败：需联网加载语雀内核（CDN）。请检查网络后重试。"}
        </div>
      )}
    </div>
  );
});

export default LakeEditor;
