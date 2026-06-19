import { useMemo, useState } from "react";
import type { DragEvent } from "react";
import type { DropPos, KnowledgeBase, TreeNode } from "../lib/types";
import { countDocs, countWords } from "../lib/tree";
import { formatDate } from "../lib/format";
import { Icon } from "./Icon";
import { TreeItem, type DropHint } from "./TreeItem";

interface KnowledgeBaseDetailProps {
  kb: KnowledgeBase;
  onBack: () => void;
  onToggleFav: (id: string) => void;
  onDeleteKb: (id: string) => void;
  onCreateNode: (parentId: string | null) => void;
  onRenameNode: (id: string) => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (dragId: string, targetId: string, pos: DropPos) => void;
  onMoveToRoot: (dragId: string) => void;
  onOpenDoc: (id: string) => void;
}

// 初始展开：根级中带子节点的节点默认展开一层，避免首屏全展开太吵。
function initialExpanded(tree: TreeNode[]): Set<string> {
  const s = new Set<string>();
  for (const n of tree) if (n.children.length) s.add(n.id);
  return s;
}

export function KnowledgeBaseDetail({
  kb,
  onBack,
  onToggleFav,
  onDeleteKb,
  onCreateNode,
  onRenameNode,
  onDeleteNode,
  onMoveNode,
  onMoveToRoot,
  onOpenDoc,
}: KnowledgeBaseDetailProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => initialExpanded(kb.tree));
  const [treeHidden, setTreeHidden] = useState(false); // 文章列表侧边栏隐藏/显示
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<DropHint | null>(null);
  const [rootHot, setRootHot] = useState(false);

  const docCount = useMemo(() => countDocs(kb.tree), [kb.tree]);
  const wordCount = useMemo(() => countWords(kb.tree), [kb.tree]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function select(id: string) {
    setSelectedId(id);
    onOpenDoc(id);
  }

  // —— 拖拽：三分区判定 before / inside / after ——
  function handleDragOver(e: DragEvent, id: string) {
    e.preventDefault();
    if (!dragId || id === dragId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const pos: DropPos = y < rect.height * 0.3 ? "before" : y > rect.height * 0.7 ? "after" : "inside";
    setDropHint({ id, pos });
  }

  function handleDrop(e: DragEvent, id: string) {
    e.preventDefault();
    if (dragId && id !== dragId && dropHint) {
      onMoveNode(dragId, id, dropHint.pos);
      if (dropHint.pos === "inside") setExpanded((prev) => new Set(prev).add(id));
    }
    setDragId(null);
    setDropHint(null);
  }

  function resetDrag() {
    setDragId(null);
    setDropHint(null);
    setRootHot(false);
  }

  return (
    <div className={`kb-detail${treeHidden ? " tree-hidden" : ""}`}>
      {/* ───── 左：无限级知识树（文章列表，可隐藏/显示） ───── */}
      <aside className="kbd-tree">
        <div className="kbd-tree-hd">
          <button className="kbd-back" onClick={onBack} title="返回知识库列表">
            <Icon name="back" size={16} />
          </button>
          <span className="kbd-tree-emoji">{kb.emoji}</span>
          <span className="kbd-tree-title" title={kb.name}>
            {kb.name}
          </span>
          <button className="kbd-tree-add" onClick={() => onCreateNode(null)} title="新建根节点">
            <Icon name="plus" size={15} />
          </button>
          <button
            className="kbd-tree-add"
            onClick={() => setTreeHidden(true)}
            title="隐藏文章列表"
            aria-label="隐藏文章列表"
          >
            <Icon name="panel" size={15} />
          </button>
        </div>

        <div className="kbd-tree-body">
          {kb.tree.length === 0 ? (
            <div className="kbd-tree-empty">
              还没有内容
              <button className="kbd-tree-empty-add" onClick={() => onCreateNode(null)}>
                新建第一个节点
              </button>
            </div>
          ) : (
            kb.tree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                expanded={expanded}
                dragId={dragId}
                dropHint={dropHint}
                onToggle={toggle}
                onSelect={select}
                onAddChild={onCreateNode}
                onRename={onRenameNode}
                onDelete={onDeleteNode}
                onDragStart={setDragId}
                onDragEnd={resetDrag}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))
          )}

          {/* 根级落区：拖到这里把节点提升为顶层（取消嵌套） */}
          <div
            className={`kbd-root-drop${rootHot ? " hot" : ""}${dragId ? " armed" : ""}`}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              setRootHot(true);
            }}
            onDragLeave={() => setRootHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) onMoveToRoot(dragId);
              resetDrag();
            }}
          >
            拖到此处可移至顶层
          </div>
        </div>
      </aside>

      {/* ───── 右：知识库概览 ───── */}
      <div className="kbd-main">
        {treeHidden && (
          <button
            className="kbd-tree-reveal"
            onClick={() => setTreeHidden(false)}
            title="显示文章列表"
            aria-label="显示文章列表"
          >
            <Icon name="panel" size={16} />
            文章列表
          </button>
        )}
        <div className="kbd-scroll">
          <header className="kbd-hero">
            <div className="kbd-hero-icon">{kb.emoji}</div>
            <div className="kbd-hero-info">
              <div className="kbd-hero-titlerow">
                <h1 className="kbd-hero-title">{kb.name}</h1>
                {kb.locked && (
                  <span className="kbd-hero-lock" title="私有">
                    <Icon name="lock" size={14} />
                  </span>
                )}
              </div>
              <div className="kbd-stats">
                <span className="kbd-stat">
                  <b>{docCount}</b> 文档
                </span>
                <span className="kbd-stat">
                  <b>{wordCount.toLocaleString()}</b> 字
                </span>
              </div>
            </div>
            <div className="kbd-hero-actions">
              <button
                className={`btn${kb.fav ? " active-fav" : ""}`}
                onClick={() => onToggleFav(kb.id)}
              >
                <Icon name="star" size={15} />
                {kb.fav ? "已收藏" : "收藏"}
              </button>
              <button className="btn" onClick={() => onCreateNode(null)}>
                <Icon name="plus" size={15} />
                新建文档
              </button>
              <button
                className="btn btn-danger"
                onClick={() => onDeleteKb(kb.id)}
                title="删除知识库"
              >
                <Icon name="trash" size={15} />
                删除
              </button>
            </div>
          </header>

          <section className="kbd-welcome">
            <h3>👋 欢迎来到知识库</h3>
            <p>知识库就像书一样，让多篇文档结构化，方便知识的创作与沉淀。文档与目录地位平等，任意节点都能继续向下挂载。</p>
          </section>

          <div className="kbd-doclist">
            <OverviewRows
              nodes={kb.tree}
              depth={0}
              expanded={expanded}
              selectedId={selectedId}
              onToggle={toggle}
              onSelect={select}
            />
            {kb.tree.length === 0 && <div className="kbd-doclist-empty">暂无文档</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── 概览区：语雀风格的递归文档列表（虚线引导 + 日期） ─────
interface OverviewRowsProps {
  nodes: TreeNode[];
  depth: number;
  expanded: Set<string>;
  selectedId: string | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
}

function OverviewRows({ nodes, depth, expanded, selectedId, onToggle, onSelect }: OverviewRowsProps) {
  return (
    <>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const isOpen = expanded.has(node.id);
        return (
          <div className="kbd-doc-branch" key={node.id}>
            <div
              className={`kbd-doc-row${selectedId === node.id ? " selected" : ""}`}
              style={{ paddingLeft: depth * 24 }}
              onClick={() => onSelect(node.id)}
            >
              <button
                className={`kbd-doc-caret${hasChildren ? "" : " leaf"}${isOpen ? " open" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (hasChildren) onToggle(node.id);
                }}
                aria-label={isOpen ? "折叠" : "展开"}
                tabIndex={hasChildren ? 0 : -1}
              >
                {hasChildren && <Icon name="chevron" size={13} />}
              </button>
              <span className="kbd-doc-ico">
                {node.emoji ?? (node.type === "folder" ? "📁" : "📄")}
              </span>
              <span className="kbd-doc-name">{node.title}</span>
              <span className="kbd-doc-leader" />
              <span className="kbd-doc-date">{formatDate(node.updatedAt)}</span>
            </div>
            {isOpen && hasChildren && (
              <OverviewRows
                nodes={node.children}
                depth={depth + 1}
                expanded={expanded}
                selectedId={selectedId}
                onToggle={onToggle}
                onSelect={onSelect}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
