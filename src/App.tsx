import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { CommandPalette } from "./components/CommandPalette";
import { KnowledgeView } from "./components/KnowledgeView";
import { KnowledgeBaseDetail } from "./components/KnowledgeBaseDetail";
import { CreateMenu } from "./components/CreateMenu";
import { NewKbModal } from "./components/NewKbModal";
import { PickKbModal } from "./components/PickKbModal";
import { Icon } from "./components/Icon";
import { useTheme } from "./hooks/useTheme";
import { SEED_KBS } from "./lib/data";
import { createKb, deleteKb, listKbs, saveKb, updateKb } from "./lib/api";
import {
  addChild,
  latestUpdated,
  makeNode,
  moveNode,
  removeNode,
  updateNode,
} from "./lib/tree";
import type { DropPos, KnowledgeBase, NodeType, Scope, TreeNode, ViewId } from "./lib/types";

// 生成稳定且不易碰撞的节点 id（同一毫秒内多次新建也不冲突）。
const uid = () => `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// 知识库数据持久化在 SQLite（src-tauri）。前端在内存中维护一份镜像用于即时渲染，
// 每次变更都「写穿」到后端（lib/api.ts）。纯浏览器 dev（无 Tauri）时回退到演示数据。
function App() {
  const { theme, toggle } = useTheme();

  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewId>("home");
  const [scope, setScope] = useState<Scope>("mine");
  const [activeKbId, setActiveKbId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [newKbOpen, setNewKbOpen] = useState(false);
  const [pickKbOpen, setPickKbOpen] = useState(false); // 「新建文档到…」选择知识库弹窗
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null); // 新建后待在编辑器中打开的文档
  const [sidebarOpen, setSidebarOpen] = useState(false); // 移动端抽屉
  const [toast, setToast] = useState("");

  // 标记：本次新建知识库后应顺带新建一篇文档（来自「新建文档但尚无知识库」的流程）。
  const createDocAfterKbRef = useRef(false);

  // 持有最新 kbs 引用，供回调内读取并计算写穿目标（避免闭包过期）。
  const kbsRef = useRef(kbs);
  useEffect(() => {
    kbsRef.current = kbs;
  }, [kbs]);

  // 轻量 toast：2 秒后自动消失。
  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 1900);
  }, []);

  // 写穿后端：失败仅告警（浏览器 dev 无 Tauri 时静默忽略）。
  const persist = useCallback((run: () => Promise<unknown>) => {
    run().catch((e) => console.warn("持久化失败", e));
  }, []);

  // 启动：从数据库加载；空库则用演示数据播种并持久化；非 Tauri 环境回退到内存数据。
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return; // 防止 StrictMode 下重复播种
    didInit.current = true;
    (async () => {
      try {
        let list = await listKbs();
        if (list.length === 0) {
          // 首次运行：逐个一次性创建（含整棵树/收藏/私有），避免两步写入丢数据。
          for (let i = 0; i < SEED_KBS.length; i++) {
            const s = SEED_KBS[i];
            await createKb({
              emoji: s.emoji,
              name: s.name,
              intro: s.intro,
              scope: s.scope,
              sort: i,
              tree: s.tree,
              fav: s.fav,
              locked: s.locked,
            });
          }
          list = await listKbs();
        }
        setKbs(list);
      } catch (e) {
        console.warn("加载知识库失败，回退到演示数据（非 Tauri 环境？）", e);
        setKbs(SEED_KBS);
      } finally {
        setLoading(false);
      }
    })();
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
      const kb = kbsRef.current.find((k) => k.id === id);
      if (!kb) return;
      const fav = !kb.fav;
      setKbs((prev) => prev.map((k) => (k.id === id ? { ...k, fav } : k)));
      persist(() => updateKb(id, { fav }));
      notify(fav ? `已收藏：${kb.name}` : `已取消收藏：${kb.name}`);
    },
    [notify, persist],
  );

  // 拖拽排序：把 fromId 移动到 toId 之前/之后（侧边栏知识库列表），并持久化每行 sort。
  const reorder = useCallback(
    (fromId: string, toId: string, after: boolean) => {
      const cur = [...kbsRef.current];
      const from = cur.findIndex((k) => k.id === fromId);
      if (from < 0) return;
      const [moved] = cur.splice(from, 1);
      let to = cur.findIndex((k) => k.id === toId);
      if (to < 0) return;
      if (after) to += 1;
      cur.splice(to, 0, moved);
      setKbs(cur);
      cur.forEach((k, i) => persist(() => updateKb(k.id, { sort: i })));
      notify("已重新排序");
    },
    [notify, persist],
  );

  // 打开新建知识库弹窗。
  const openNewKb = useCallback(() => setNewKbOpen(true), []);

  // 删除整个知识库。
  const removeKb = useCallback(
    async (id: string) => {
      const kb = kbsRef.current.find((k) => k.id === id);
      if (!kb) return;
      if (!window.confirm(`删除知识库「${kb.name}」及其全部内容？此操作不可撤销。`)) return;
      setKbs((prev) => prev.filter((k) => k.id !== id));
      if (activeKbId === id) setActiveKbId(null);
      try {
        await deleteKb(id);
        notify(`已删除知识库：${kb.name}`);
      } catch (e) {
        console.warn("删除知识库失败", e);
        notify("删除失败");
      }
    },
    [activeKbId, notify],
  );

  // 占位菜单项（表格/画板/导入…）：仅提示，暂未实现。
  const stub = useCallback((label: string) => notify(`${label}（示例，暂未实现）`), [notify]);

  // 点击知识库 → 进入详情页（无限级知识树）。
  const selectKb = useCallback((id: string) => {
    setActiveKbId(id);
    setSidebarOpen(false);
  }, []);

  // —— 知识树增删改查 —— 在指定知识库的 tree 上做不可变更新并写穿后端。
  // 同步更新 kbsRef，使「新建知识库后立即新建文档」等链式操作读到最新镜像。
  const updateKbTree = useCallback(
    (kbId: string, fn: (tree: TreeNode[]) => TreeNode[]) => {
      const next = kbsRef.current.map((k) =>
        k.id === kbId ? { ...k, tree: fn(k.tree) } : k,
      );
      kbsRef.current = next;
      setKbs(next);
      const target = next.find((k) => k.id === kbId);
      if (target) persist(() => saveKb(target));
    },
    [persist],
  );

  const updateActiveTree = useCallback(
    (fn: (tree: TreeNode[]) => TreeNode[]) => {
      if (!activeKbId) return;
      updateKbTree(activeKbId, fn);
    },
    [activeKbId, updateKbTree],
  );

  // 在指定知识库新建一篇空文档，进入该知识库并在编辑器中打开它（即「新建文字」的效果）。
  const createDocInKb = useCallback(
    (kbId: string) => {
      const node = makeNode(uid(), "doc", "无标题文档", new Date().toISOString());
      updateKbTree(kbId, (tree) => addChild(tree, null, node));
      setActiveKbId(kbId);
      setSidebarOpen(false);
      setPendingOpenId(node.id);
      notify("已新建文档：无标题文档");
    },
    [updateKbTree, notify],
  );

  // 弹窗提交：创建并持久化知识库。若来自「新建文档」流程，建好后自动在其中新建文档。
  const handleCreateKb = useCallback(
    async (input: { emoji: string; name: string; intro: string; scope: Scope }) => {
      setNewKbOpen(false);
      const wantDoc = createDocAfterKbRef.current;
      createDocAfterKbRef.current = false;
      try {
        const created = await createKb({ ...input, sort: kbsRef.current.length });
        const nextList = [...kbsRef.current, created];
        kbsRef.current = nextList; // 同步镜像，便于随后 createDocInKb 读到新库
        setKbs(nextList);
        notify(`已创建：${input.name}`);
        if (wantDoc) createDocInKb(created.id);
      } catch (e) {
        console.warn("创建知识库失败", e);
        notify("创建失败");
      }
    },
    [notify, createDocInKb],
  );

  // 「新建文档」总入口：在知识库路由下直接新建；否则提示先选择 / 创建知识库。
  const startCreateDoc = useCallback(() => {
    if (activeKbId) {
      createDocInKb(activeKbId);
      return;
    }
    if (kbsRef.current.length === 0) {
      // 还没有任何知识库：提示并打开「新建知识库」，建好后自动新建文档。
      createDocAfterKbRef.current = true;
      notify("请先创建一个知识库");
      setNewKbOpen(true);
      return;
    }
    setPickKbOpen(true);
  }, [activeKbId, createDocInKb, notify]);

  // ⌘/Ctrl+N：新建文档（走与「+ 新建 → 文档」一致的入口）。
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        startCreateDoc();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startCreateDoc]);

  const createNode = useCallback(
    (parentId: string | null) => {
      const kind = window.prompt("新建节点类型：输入 f = 目录，其它 = 文档", "doc");
      if (kind === null) return;
      const type: NodeType = kind.trim().toLowerCase() === "f" ? "folder" : "doc";
      const title = window.prompt("节点标题：", type === "folder" ? "新目录" : "无标题文档");
      if (!title) return;
      const node = makeNode(uid(), type, title, new Date().toISOString());
      updateActiveTree((tree) => addChild(tree, parentId, node));
      // 新建的是文档则顺手在编辑器中打开（与「新建文字」一致的效果）。
      if (type === "doc") setPendingOpenId(node.id);
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

  // 保存文档正文：写穿节点的 content / words / 更新时间（随整棵 tree 持久化）。
  const saveDocContent = useCallback(
    (nodeId: string, content: string, words: number) => {
      updateActiveTree((tree) =>
        updateNode(tree, nodeId, {
          content,
          words,
          updatedAt: new Date().toISOString(),
        }),
      );
      notify("已保存");
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
        onNewKb={openNewKb}
        onCreateDoc={startCreateDoc}
        onStub={stub}
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
            <CreateMenu
              align="right"
              canCreateDoc
              triggerClassName="btn primary"
              title="新建"
              onNewKb={openNewKb}
              onCreateDoc={startCreateDoc}
              onStub={stub}
            >
              <Icon name="plus" size={15} />
              新建
            </CreateMenu>
          </div>
        </header>

        {activeKb ? (
          <KnowledgeBaseDetail
            kb={activeKb}
            autoOpenId={pendingOpenId}
            onAutoOpenConsumed={() => setPendingOpenId(null)}
            onBack={backToList}
            onToggleFav={toggleFav}
            onDeleteKb={removeKb}
            onCreateNode={createNode}
            onCreateDoc={() => createDocInKb(activeKb.id)}
            onRenameNode={renameNode}
            onDeleteNode={deleteNode}
            onMoveNode={moveTreeNode}
            onMoveToRoot={moveToRoot}
            onSaveDoc={saveDocContent}
          />
        ) : (
          <div className="scrollarea">
            {loading ? (
              <div className="loading-state">加载中…</div>
            ) : (
              <KnowledgeView
                view={view}
                scope={scope}
                kbs={visibleKbs}
                onScope={setScope}
                onToggleFav={toggleFav}
                onSelectKb={selectKb}
              />
            )}
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
        onCreateKb={openNewKb}
        onToggleTheme={toggle}
      />

      <PickKbModal
        open={pickKbOpen}
        kbs={kbs}
        onClose={() => setPickKbOpen(false)}
        onPick={(id) => {
          setPickKbOpen(false);
          createDocInKb(id);
        }}
        onNewKb={() => {
          setPickKbOpen(false);
          createDocAfterKbRef.current = true;
          setNewKbOpen(true);
        }}
      />

      <NewKbModal
        open={newKbOpen}
        defaultScope={view === "home" || view === "recent" ? scope : "mine"}
        onClose={() => {
          setNewKbOpen(false);
          createDocAfterKbRef.current = false; // 用户取消则放弃顺带新建文档
        }}
        onCreate={handleCreateKb}
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
