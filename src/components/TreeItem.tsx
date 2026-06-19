import type { DragEvent } from "react";
import type { DropPos, TreeNode } from "../lib/types";
import { Icon } from "./Icon";

/** 悬停落点提示：哪个节点、落在它的前/后/内部。 */
export interface DropHint {
  id: string;
  pos: DropPos;
}

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  expanded: Set<string>;
  dragId: string | null;
  dropHint: DropHint | null;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDrop: (e: DragEvent, id: string) => void;
}

/**
 * 递归知识树节点。doc 与 folder 共用同一渲染逻辑 —— 二者都可展开、
 * 都可作为拖拽落点的 inside 目标，从而都能拥有子节点（无限级）。
 */
export function TreeItem(props: TreeItemProps) {
  const {
    node,
    depth,
    selectedId,
    expanded,
    dragId,
    dropHint,
    onToggle,
    onSelect,
    onAddChild,
    onRename,
    onDelete,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
  } = props;

  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const hint = dropHint && dropHint.id === node.id ? dropHint.pos : null;

  const cls = [
    "tree-row",
    selectedId === node.id ? "selected" : "",
    dragId === node.id ? "dragging" : "",
    hint ? `drop-${hint}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="tree-branch">
      <div
        className={cls}
        style={{ paddingLeft: 6 + depth * 16 }}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, node.id)}
        onDrop={(e) => onDrop(e, node.id)}
        onClick={() => onSelect(node.id)}
      >
        <button
          className={`tree-twist${hasChildren ? "" : " leaf"}${isOpen ? " open" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          aria-label={isOpen ? "折叠" : "展开"}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren && <Icon name="chevron" size={12} />}
        </button>

        <span className="tree-icon">
          {node.emoji ? (
            <span className="tree-emoji">{node.emoji}</span>
          ) : (
            <Icon name={node.type === "folder" ? "folder" : "file"} size={14} />
          )}
        </span>

        <span className="tree-name" title={node.title}>
          {node.title}
        </span>

        <span className="tree-actions">
          <button
            className="tree-act"
            title="在此节点下新建"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node.id);
            }}
          >
            <Icon name="plus" size={14} />
          </button>
          <button
            className="tree-act"
            title="重命名"
            onClick={(e) => {
              e.stopPropagation();
              onRename(node.id);
            }}
          >
            <Icon name="edit" size={14} />
          </button>
          <button
            className="tree-act"
            title="删除"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
          >
            <Icon name="trash" size={14} />
          </button>
        </span>
      </div>

      {isOpen &&
        node.children.map((child) => (
          <TreeItem key={child.id} {...props} node={child} depth={depth + 1} />
        ))}
    </div>
  );
}
