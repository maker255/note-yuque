import { useCallback, useRef, useState } from "react";
import type { TreeNode } from "../lib/types";
import { Icon } from "./Icon";
import LakeEditor, { type IEditorRef } from "./lake/LakeEditor";

interface DocEditorProps {
  /** 当前编辑的节点（其 content 为 Lake 文档字符串） */
  node: TreeNode;
  /** 保存：写穿正文与字数到知识库树 */
  onSave: (content: string, words: number) => void;
  /** 返回知识库概览 */
  onBack: () => void;
  /** 头部最左侧的可选插槽（如文章列表隐藏时的“显示”入口） */
  leading?: React.ReactNode;
}

// 单篇文档的编辑面板：标题栏（保存状态 + 保存按钮）+ 语雀 Lake 编辑器。
// 手动保存：点击「保存」按钮或在编辑器内按 Ctrl/⌘+S。
export function DocEditor({ node, onSave, onBack, leading }: DocEditorProps) {
  const editorRef = useRef<IEditorRef>(null);
  // 最新内容：onChange 持续写入，保存时取用（避免每次按键触发 React 重渲染）。
  const pendingRef = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = useCallback((value: string) => {
    pendingRef.current = value;
    setDirty(true);
    setSaving(false);
  }, []);

  const handleSave = useCallback(() => {
    if (!dirty) return;
    const content = pendingRef.current ?? node.content ?? "";
    const words = editorRef.current?.wordCount() ?? node.words ?? 0;
    setSaving(true);
    onSave(content, words);
    pendingRef.current = null;
    setDirty(false);
  }, [dirty, node.content, node.words, onSave]);

  // 编辑器内 Ctrl/⌘+S 拦截在 LakeEditor 的 onSave；这里也兜底捕获面板范围内的快捷键。
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave],
  );

  const status = saving ? "已保存" : dirty ? "未保存" : "";

  return (
    <div className="doc-editor" onKeyDown={onKeyDown}>
      <div className="doc-editor-header">
        {leading}
        <button className="kbd-back" onClick={onBack} title="返回知识库概览">
          <Icon name="back" size={16} />
        </button>
        <span className="doc-editor-ico">
          {node.emoji ?? (node.type === "folder" ? "📁" : "📄")}
        </span>
        <span className="doc-editor-title" title={node.title}>
          {node.title || "无标题文档"}
        </span>
        <span className={`doc-editor-status${dirty ? " unsaved" : ""}`}>{status}</span>
        <button className="btn primary" disabled={!dirty} onClick={handleSave}>
          <Icon name="plus" size={14} />
          保存
        </button>
      </div>
      <div className="doc-editor-body">
        <LakeEditor
          ref={editorRef}
          value={node.content ?? ""}
          onChange={handleChange}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
