import { useEffect, useState } from "react";
import type { DragEvent } from "react";
import type { KnowledgeBase, ViewId } from "../lib/types";
import { Icon, type IconName } from "./Icon";
import { CreateMenu } from "./CreateMenu";
import type { Theme } from "../hooks/useTheme";

interface NavDef {
  id: ViewId;
  label: string;
  icon: IconName;
}

const NAV: NavDef[] = [
  { id: "home", label: "开始", icon: "home" },
  { id: "recent", label: "最近", icon: "clock" },
  { id: "favorites", label: "收藏", icon: "star" },
  { id: "notes", label: "小记", icon: "note" },
];

interface SidebarProps {
  kbs: KnowledgeBase[];
  view: ViewId;
  activeKbId: string | null;
  favCount: number;
  open: boolean;
  theme: Theme;
  onView: (v: ViewId) => void;
  onOpenSearch: () => void;
  onToggleFav: (id: string) => void;
  onSelectKb: (id: string) => void;
  onNewKb: () => void;
  onStub: (label: string) => void;
  onReorder: (fromId: string, toId: string, after: boolean) => void;
  onToggleTheme: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  kbs,
  view,
  activeKbId,
  favCount,
  open,
  theme,
  onView,
  onOpenSearch,
  onToggleFav,
  onSelectKb,
  onNewKb,
  onStub,
  onReorder,
  onToggleTheme,
  onCloseMobile,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  // 侧边栏导轨折叠：仅隐藏文字、保留图标，宽度收窄至 64px（始终可见，不完全隐藏）。
  const [rail, setRail] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebar-rail") === "1";
    } catch {
      return false;
    }
  });
  const [dragId, setDragId] = useState<string | null>(null);
  // 当前拖拽悬停目标及落点（前/后），用于绘制插入指示线。
  const [dropHint, setDropHint] = useState<{ id: string; after: boolean } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-rail", rail ? "1" : "0");
    } catch {
      /* 忽略隐私模式下的写入失败 */
    }
  }, [rail]);

  function handleDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (!dragId || id === dragId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setDropHint({ id, after });
  }

  function handleDrop(e: DragEvent, id: string) {
    e.preventDefault();
    if (dragId && id !== dragId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      onReorder(dragId, id, after);
    }
    setDragId(null);
    setDropHint(null);
  }

  return (
    <aside className={`sidebar${open ? " open" : ""}${rail ? " rail" : ""}`}>
      <div className="sidebar-top">
        <div className="brand" title={rail ? "我的知识库" : undefined}>
          <div className="brand-logo">N</div>
          <span className="brand-name">我的知识库</span>
          <Icon name="chevron" size={13} className="brand-caret" />
        </div>

        <button className="search-trigger" onClick={onOpenSearch} title="搜索 (⌘K)">
          <Icon name="search" size={15} />
          <span>搜索…</span>
          <span className="kbd">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </span>
        </button>
      </div>

      <div className="sidebar-scroll">
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-row${view === n.id ? " active" : ""}`}
              title={n.label}
              onClick={() => {
                onView(n.id);
                onCloseMobile();
              }}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
              {n.id === "favorites" && favCount > 0 && <span className="count">{favCount}</span>}
            </button>
          ))}
        </nav>

        <div className="nav-section">
          <div className={`section-hd${collapsed ? " collapsed" : ""}`}>
            <button className="twist" onClick={() => setCollapsed((c) => !c)} aria-label="折叠">
              <Icon name="chevron" size={12} />
            </button>
            <span className="section-label">知识库</span>
            <CreateMenu
              align="left"
              triggerClassName="section-add"
              title="新建"
              onNewKb={onNewKb}
              onStub={onStub}
            >
              <Icon name="plus" size={14} />
            </CreateMenu>
          </div>

          {!collapsed && (
            <div className="kb-list">
              {kbs.map((kb) => {
                const hint = dropHint?.id === kb.id ? dropHint : null;
                return (
                  <div
                    key={kb.id}
                    className={[
                      "kb-item",
                      activeKbId === kb.id ? "active" : "",
                      dragId === kb.id ? "dragging" : "",
                      hint ? (hint.after ? "drop-after" : "drop-before") : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    title={rail ? kb.name : undefined}
                    draggable
                    onDragStart={() => setDragId(kb.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropHint(null);
                    }}
                    onDragOver={(e) => handleDragOver(e, kb.id)}
                    onDrop={(e) => handleDrop(e, kb.id)}
                    onClick={() => onSelectKb(kb.id)}
                  >
                    <span className="grip" title="拖拽排序">
                      <Icon name="grip" size={14} />
                    </span>
                    <span className="kb-emoji">{kb.emoji}</span>
                    <span className="kb-label">{kb.name}</span>
                    {kb.locked && (
                      <span className="kb-lock" title="私有">
                        <Icon name="lock" size={12} />
                      </span>
                    )}
                    <button
                      className={`kb-star${kb.fav ? " on" : ""}`}
                      title={kb.fav ? "取消收藏" : "收藏"}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFav(kb.id);
                      }}
                    >
                      <Icon name="star" size={13} />
                    </button>
                  </div>
                );
              })}
              {kbs.length === 0 && <div className="kb-empty">暂无知识库</div>}
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="user" title={rail ? "本地用户" : undefined}>
          <div className="avatar" />
          <span className="uname">本地用户</span>
        </div>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "切换到浅色" : "切换到深色"}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
        </button>
        <button
          className="icon-btn rail-toggle"
          onClick={() => setRail((r) => !r)}
          title={rail ? "展开侧边栏" : "收起侧边栏"}
          aria-label={rail ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!rail}
        >
          <Icon name="panel" size={16} />
        </button>
      </div>
    </aside>
  );
}
