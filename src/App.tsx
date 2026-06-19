import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { KnowledgeView } from "./components/KnowledgeView";
import { KnowledgeBaseDetail } from "./components/KnowledgeBaseDetail";
import { Icon } from "./components/Icon";
import { useTheme } from "./hooks/useTheme";
import { EMOJI_POOL, SEED_KBS } from "./lib/data";
import {
  addChild,
  latestUpdated,
  makeNode,
  moveNode,
  removeNode,
  updateNode,
} from "./lib/tree";
import type { DropPos, KnowledgeBase, NodeType, Scope, TreeNode, ViewId } from "./lib/types";

// ⚠️ UI 设计阶段：知识库数据先在前端内存中维护并支持增删/排序/收藏，
// 后续阶段再替换为 Tauri invoke + Prisma/SQLite 持久化 + REST API。
function App() {
  const { theme, toggle } = useTheme();

  const [kbs, setKbs] = useState<KnowledgeBase[]>(SEED_KBS);
  const [view, setView] = useState<ViewId>("home");
  const [scope, setScope] = useState<Scope>("mine");
  const [activeKbId, setActiveKbId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端抽屉
  const [toast, setToast] = useState("");

  // 轻量 toast：2 秒后自动消失。
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1900);
  }, []);

  // 全局快捷键：⌘/Ctrl+K 唤起搜索，⌘/Ctrl+B 切换主题。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const favCount = useMemo(() => kbs.filter((k) => k.fav).length, [kbs]);
  const activeKb = useMemo(
    () => kbs.find((k) => k.id === activeKbId) ?? null,
    [kbs, activeKbId],
  );

  // 当前视图下应展示的知识库集合。
  const visibleKbs = useMemo(() => {
    let list = kbs;
    if (view === "favorites") {
      list = list.filter((k) => k.fav);
    } else if (view === "notes") {
      // 小记示例：聚合所有归属，这里直接展示全部
      list = [...list];
    } else {
      list = list.filter((k) => k.scope === scope);
    }
    if (view === "recent") {
      list = [...list].sort((a, b) => latestUpdated(b.tree) - latestUpdated(a.tree));
    }
    return list;
  }, [kbs, view, scope]);

  const toggleFav = useCallback(
    (id: string) => {
      setKbs((prev) => prev.map((k) => (k.id === id ? { ...k, fav: !k.fav } : k)));
      const kb = kbs.find((k) => k.id === id);
      if (kb) notify(kb.fav ? `已取消收藏：${kb.name}` : `已收藏：${kb.name}`);
    },
    [kbs, notify],
  );

  // 拖拽排序：把 fromId 移动到 toId 之前/之后（侧边栏知识库列表）。
  const reorder = useCallback(
    (fromId: string, toId: string, after: boolean) => {
      setKbs((prev) => {
        const next = [...prev];
        const from = next.findIndex((k) => k.id === fromId);
        if (from < 0) return prev;
        const [moved] = next.splice(from, 1);
        let to = next.findIndex((k) => k.id === toId);
        if (to < 0) return prev;
        if (after) to += 1;
        next.splice(to, 0, moved);
        return next;
      });
      notify("已重新排序");
    },
    [notify],
  );

  const createKb = useCallback(() => {
    const name = window.prompt("新建知识库名称：", "未命名知识库");
    if (!name) return;
    setKbs((prev) => [
      ...prev,
      {
        id: `kb-${Date.now()}`,
        emoji: EMOJI_POOL[prev.length % EMOJI_POOL.length],
        name,
        locked: false,
        fav: false,
        scope: view === "home" || view === "recent" ? scope : "mine",
        tree: [],
      },
    ]);
    notify(`已创建：${name}`);
  }, [view, scope, notify]);

  // 点击知识库 → 进入详情页（无限级知识树）。
  const selectKb = useCallback(
    (id: string) => {
      setActiveKbId(id);
      setSidebarOpen(false);
    },
    [],
  );

  // —— 详情页内的知识树增删改查 —— 统一在 activeKb 的 tree 上做不可变更新。
  const updateActiveTree = useCallback(
    (fn: (tree: TreeNode[]) => TreeNode[]) => {
      if (!activeKbId) return;
      setKbs((prev) =>
        prev.map((k) => (k.id === activeKbId ? { ...k, tree: fn(k.tree) } : k)),
      );
    },
    [activeKbId],
  );

  const createNode = useCallback(
    (parentId: string | null) => {
      const kind = window.prompt("新建节点类型：输入 f = 目录，其它 = 文档", "doc");
      if (kind === null) return;
      const type: NodeType = kind.trim().toLowerCase() === "f" ? "folder" : "doc";
      const title = window.prompt("节点标题：", type === "folder" ? "新目录" : "无标题文档");
      if (!title) return;
      const node = makeNode(`n-${Date.now()}`, type, title, new Date().toISOString());
      updateActiveTree((tree) => addChild(tree, parentId, node));
      notify(`已新建${type === "folder" ? "目录" : "文档"}：${title}`);
    },
    [updateActiveTree, notify],
  );

  const renameNode = useCallback(
    (id: string) => {
      const cur = activeKb ? findTitle(activeKb.tree, id) : "";
      const title = window.prompt("重命名为：", cur);
      if (!title) return;
      updateActiveTree((tree) =>
        updateNode(tree, id, { title, updatedAt: new Date().toISOString() }),
      );
      notify("已重命名");
    },
    [activeKb, updateActiveTree, notify],
  );

  const deleteNode = useCallback(
    (id: string) => {
      if (!window.confirm("删除该节点及其全部子节点？")) return;
      updateActiveTree((tree) => removeNode(tree, id).tree);
      notify("已删除");
    },
    [updateActiveTree, notify],
  );

  const moveTreeNode = useCallback(
    (dragId: string, targetId: string, pos: DropPos) => {
      updateActiveTree((tree) => moveNode(tree, dragId, targetId, pos));
    },
    [updateActiveTree],
  );

  const moveToRoot = useCallback(
    (dragId: string) => {
      updateActiveTree((tree) => {
        const { tree: without, removed } = removeNode(tree, dragId);
        return removed ? [...without, removed] : tree;
      });
      notify("已移至顶层");
    },
    [updateActiveTree, notify],
  );

  const backToList = useCallback(() => setActiveKbId(null), []);

  return (
    <div className="app">
      <Sidebar
        kbs={kbs}
        view={view}
        activeKbId={activeKbId}
        favCount={favCount}
        open={sidebarOpen}
        theme={theme}
        onView={(v) => {
          setView(v);
          setActiveKbId(null);
        }}
        onOpenSearch={() => setPaletteOpen(true)}
        onToggleFav={toggleFav}
        onSelectKb={selectKb}
        onCreateKb={createKb}
        onReorder={reorder}
        onToggleTheme={toggle}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      <div
        className={`backdrop${sidebarOpen ? " show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <main className="main">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="菜单">
            <Icon name="menu" size={18} />
          </button>
          <nav className="crumbs">
            <button className="crumb-link" onClick={backToList}>
              工作区
            </button>
            <span className="sep">/</span>
            {activeKb ? (
              <>
                <button className="crumb-link" onClick={backToList}>
                  {titleOf(view)}
                </button>
                <span className="sep">/</span>
                <span className="cur">{activeKb.name}</span>
              </>
            ) : (
              <span className="cur">{titleOf(view)}</span>
            )}
          </nav>
          <div className="topbar-actions">
            {activeKb ? (
              <button className="btn primary" onClick={() => createNode(null)}>
                <Icon name="plus" size={15} />
                新建文档
              </button>
            ) : (
              <>
                <button className="btn" onClick={() => notify("新建文档（示例）")}>
                  新建文档
                </button>
                <button className="btn primary" onClick={createKb}>
                  <Icon name="plus" size={15} />
                  新建知识库
                </button>
              </>
            )}
          </div>
        </header>

        {activeKb ? (
          <KnowledgeBaseDetail
            kb={activeKb}
            onBack={backToList}
            onToggleFav={toggleFav}
            onCreateNode={createNode}
            onRenameNode={renameNode}
            onDeleteNode={deleteNode}
            onMoveNode={moveTreeNode}
            onMoveToRoot={moveToRoot}
            onOpenDoc={(nodeId) => {
              const t = findTitle(activeKb.tree, nodeId);
              if (t) notify(`打开：${t}`);
            }}
          />
        ) : (
          <div className="scrollarea">
            <KnowledgeView
              view={view}
              scope={scope}
              kbs={visibleKbs}
              onScope={setScope}
              onToggleFav={toggleFav}
              onSelectKb={selectKb}
            />
          </div>
        )}
      </main>

      <CommandPalette
        open={paletteOpen}
        kbs={kbs}
        onClose={() => setPaletteOpen(false)}
        onOpenKb={selectKb}
        onOpenDoc={(kbId, docId) => {
          setActiveKbId(kbId);
          const kb = kbs.find((k) => k.id === kbId);
          const t = kb ? findTitle(kb.tree, docId) : null;
          if (t) notify(`打开文档：${t}`);
        }}
        onCreateKb={createKb}
        onToggleTheme={toggle}
      />

      <div className={`toast${toast ? " show" : ""}`}>{toast}</div>
    </div>
  );
}

// 在树中按 id 找标题（仅用于提示文案）。
function findTitle(tree: TreeNode[], id: string): string {
  for (const n of tree) {
    if (n.id === id) return n.title;
    const hit = findTitle(n.children, id);
    if (hit) return hit;
  }
  return "";
}

function titleOf(view: ViewId): string {
  return { home: "知识库", recent: "最近", favorites: "收藏", notes: "小记" }[view];
}

export default App;
