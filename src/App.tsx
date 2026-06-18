import { useEffect, useMemo, useState, FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "./App.css";

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// 同步渲染 Markdown → 经 DOMPurify 清洗的安全 HTML
function renderMarkdown(src: string): string {
  const raw = marked.parse(src, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  // 正在编辑的笔记 id（null 表示新建模式）
  const [editingId, setEditingId] = useState<string | null>(null);

  async function refresh() {
    try {
      setNotes(await invoke<Note[]>("list_notes"));
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  // 按标题/内容大小写不敏感过滤（笔记已全量在内存中，前端过滤即时响应）
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }, [notes, query]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setContent("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("标题不能为空");
      return;
    }
    try {
      if (editingId) {
        await invoke("update_note", { id: editingId, title, content });
      } else {
        await invoke("create_note", { title, content });
      }
      resetForm();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
  }

  async function remove(id: string) {
    try {
      await invoke("delete_note", { id });
      if (editingId === id) resetForm();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <main className="container">
      <h1>📝 笔记</h1>
      <p className="subtitle">Tauri · Prisma · SQLite · Markdown</p>

      <form className="editor" onSubmit={onSubmit}>
        <input
          placeholder="标题"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <textarea
          placeholder="内容…（支持 Markdown：**粗体**、# 标题、- 列表、`代码`）"
          rows={5}
          value={content}
          onChange={(e) => setContent(e.currentTarget.value)}
        />
        <div className="actions">
          <button type="submit">{editingId ? "保存修改" : "新建笔记"}</button>
          {editingId && (
            <button type="button" className="ghost" onClick={resetForm}>
              取消
            </button>
          )}
        </div>
      </form>

      <input
        className="search"
        placeholder="🔍 搜索标题或内容…"
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
      />

      {error && <p className="error">{error}</p>}

      <ul className="notes">
        {notes.length === 0 && (
          <li className="empty">还没有笔记，新建一条吧。</li>
        )}
        {notes.length > 0 && filtered.length === 0 && (
          <li className="empty">没有匹配「{query}」的笔记。</li>
        )}
        {filtered.map((note) => (
          <li key={note.id} className="note">
            <div className="note-body">
              <h3>{note.title}</h3>
              {note.content && (
                <div
                  className="markdown"
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdown(note.content),
                  }}
                />
              )}
              <small>更新于 {new Date(note.updatedAt).toLocaleString()}</small>
            </div>
            <div className="note-actions">
              <button className="ghost" onClick={() => startEdit(note)}>
                编辑
              </button>
              <button className="danger" onClick={() => remove(note.id)}>
                删除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;
