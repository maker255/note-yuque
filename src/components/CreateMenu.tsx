import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// 「+ 新建」悬浮菜单 —— 移植自 1.html 的 create-menu。
// 悬浮触发器即显形（CSS :hover），同时支持点击切换、Esc / 点击外部关闭（移动端与可访问性）。
// 仅「知识库」始终可用；「文档」在进入某知识库时可用；其余项为占位（toast 提示）。

interface MenuItem {
  /** 行为标识：kb=新建知识库，doc=新建文档，其余为占位 */
  action: "kb" | "doc" | "stub";
  icon: string;
  /** 图标配色类（沿用 1.html 语义色） */
  tone: string;
  label: string;
  kbd?: string;
  /** AI 项的小蓝点 */
  dot?: boolean;
}

// 分组渲染，组间以分隔线隔开。
const GROUPS: MenuItem[][] = [
  [
    { action: "doc", icon: "📄", tone: "doc", label: "文档", kbd: "⌘ N" },
    { action: "stub", icon: "📊", tone: "sheet", label: "表格" },
    { action: "stub", icon: "🖼️", tone: "board", label: "画板" },
    { action: "stub", icon: "🧩", tone: "db", label: "数据表" },
  ],
  [{ action: "kb", icon: "📘", tone: "doc", label: "知识库" }],
  [
    { action: "stub", icon: "🧭", tone: "tpl", label: "从模板新建…" },
    { action: "stub", icon: "⬅️", tone: "imp", label: "导入…" },
    { action: "stub", icon: "AI", tone: "ai", label: "AI 帮你写", dot: true },
  ],
  [
    { action: "stub", icon: "📦", tone: "grp", label: "新建分组" },
    { action: "stub", icon: "🔗", tone: "link", label: "添加链接" },
  ],
];

interface CreateMenuProps {
  /** 菜单相对触发器的水平对齐 */
  align?: "left" | "right";
  /** 进入某知识库时为 true，「文档」项才可用 */
  canCreateDoc?: boolean;
  /** 触发器按钮的 className（顶栏主按钮 / 侧边栏小图标按钮） */
  triggerClassName?: string;
  /** 触发器标题（无障碍） */
  title?: string;
  /** 触发器内容（文字 / 图标） */
  children: ReactNode;
  onNewKb: () => void;
  onCreateDoc?: () => void;
  onStub: (label: string) => void;
}

export function CreateMenu({
  align = "right",
  canCreateDoc = false,
  triggerClassName,
  title,
  children,
  onNewKb,
  onCreateDoc,
  onStub,
}: CreateMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 点击外部 / Esc 关闭。
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function run(item: MenuItem) {
    setOpen(false);
    if (item.action === "kb") {
      onNewKb();
    } else if (item.action === "doc") {
      if (canCreateDoc && onCreateDoc) onCreateDoc();
      else onStub("文档");
    } else {
      onStub(item.label);
    }
  }

  return (
    <div className="create-wrap" ref={wrapRef}>
      <button
        type="button"
        className={triggerClassName}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {children}
      </button>

      <div
        className={`create-menu${open ? " open" : ""} ${align}`}
        role="menu"
        aria-label="新建菜单"
      >
        {GROUPS.map((group, gi) => (
          <div key={gi}>
            {gi > 0 && <div className="cm-sep" />}
            {group.map((item) => {
              const disabled = item.action === "doc" && !canCreateDoc;
              return (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  className={`cm-item${disabled ? " disabled" : ""}`}
                  onClick={() => run(item)}
                >
                  <span className={`cm-ico ${item.tone}`}>{item.icon}</span>
                  <span className="cm-text">{item.label}</span>
                  {item.kbd && <span className="cm-kbd">{item.kbd}</span>}
                  {item.dot && <span className="cm-dot" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
