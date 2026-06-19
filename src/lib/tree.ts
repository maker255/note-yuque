// 无限级知识树的纯函数工具集。
//
// 所有「写」操作都是不可变的（返回新数组 / 新节点），契合 React 状态更新；
// 所有「读」操作都是递归遍历。这一层刻意与 UI 解耦：
// 后续接入 Prisma/SQLite 时，节点表只需 (id, parentId, sort, type, title…)，
// 即可用同样的 before/after/inside 语义映射到 REST API 的 PATCH /nodes/:id/move。

import type { DropPos, NodeType, TreeNode } from "./types";

/** 深度优先遍历整棵森林，对每个节点执行 fn。 */
export function walk(nodes: TreeNode[], fn: (node: TreeNode) => void): void {
  for (const n of nodes) {
    fn(n);
    walk(n.children, fn);
  }
}

/** 按 id 查找节点（递归）。 */
export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = findNode(n.children, id);
    if (hit) return hit;
  }
  return null;
}

/** node 的子树中是否包含 id（用于阻止把节点拖入自身后代）。 */
export function isDescendant(node: TreeNode, id: string): boolean {
  return node.children.some((c) => c.id === id || isDescendant(c, id));
}

/** 统计 doc 类型节点数量（folder 不计入「文档数」）。 */
export function countDocs(nodes: TreeNode[]): number {
  let n = 0;
  walk(nodes, (node) => {
    if (node.type === "doc") n += 1;
  });
  return n;
}

/** 汇总字数。 */
export function countWords(nodes: TreeNode[]): number {
  let n = 0;
  walk(nodes, (node) => {
    n += node.words ?? 0;
  });
  return n;
}

/** 节点总数（含 folder）。 */
export function countNodes(nodes: TreeNode[]): number {
  let n = 0;
  walk(nodes, () => {
    n += 1;
  });
  return n;
}

/** 整棵树最近一次更新时间（毫秒时间戳），用于「最近」视图排序。 */
export function latestUpdated(nodes: TreeNode[]): number {
  let max = 0;
  walk(nodes, (node) => {
    const t = new Date(node.updatedAt).getTime();
    if (t > max) max = t;
  });
  return max;
}

/** 扁平化为节点数组（前序）。用于搜索与概览列表。 */
export function flatten(nodes: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  walk(nodes, (node) => out.push(node));
  return out;
}

/** 在 parentId 下追加子节点；parentId 为 null 时追加到根级。 */
export function addChild(
  nodes: TreeNode[],
  parentId: string | null,
  node: TreeNode,
): TreeNode[] {
  if (parentId === null) return [...nodes, node];
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, children: [...n.children, node] }
      : { ...n, children: addChild(n.children, parentId, node) },
  );
}

/** 删除节点（连同子树），返回新森林与被删除的节点。 */
export function removeNode(
  nodes: TreeNode[],
  id: string,
): { tree: TreeNode[]; removed: TreeNode | null } {
  let removed: TreeNode | null = null;
  const rec = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = [];
    for (const n of list) {
      if (n.id === id) {
        removed = n;
        continue;
      }
      out.push({ ...n, children: rec(n.children) });
    }
    return out;
  };
  return { tree: rec(nodes), removed };
}

/** 重命名 / 更新单个节点的字段（不可变）。 */
export function updateNode(
  nodes: TreeNode[],
  id: string,
  patch: Partial<Omit<TreeNode, "id" | "children">>,
): TreeNode[] {
  return nodes.map((n) =>
    n.id === id
      ? { ...n, ...patch }
      : { ...n, children: updateNode(n.children, id, patch) },
  );
}

/**
 * 拖拽移动：把 dragId 节点移动到 targetId 的 before / after / inside。
 * - inside：成为 target 的最后一个子节点 → 这是「无限级嵌套」的核心。
 * - 自动阻止把节点拖入自身或自身的后代，避免成环。
 */
export function moveNode(
  nodes: TreeNode[],
  dragId: string,
  targetId: string,
  pos: DropPos,
): TreeNode[] {
  if (dragId === targetId) return nodes;
  const dragNode = findNode(nodes, dragId);
  if (!dragNode) return nodes;
  if (isDescendant(dragNode, targetId)) return nodes; // 不能拖入自身后代

  const { tree: without, removed } = removeNode(nodes, dragId);
  if (!removed) return nodes;
  const moved = removed; // 收窄类型，便于闭包内使用

  const insert = (list: TreeNode[]): TreeNode[] => {
    const out: TreeNode[] = [];
    for (const n of list) {
      if (n.id === targetId) {
        if (pos === "before") {
          out.push(moved, { ...n, children: insert(n.children) });
        } else if (pos === "after") {
          out.push({ ...n, children: insert(n.children) }, moved);
        } else {
          out.push({ ...n, children: [...n.children, moved] });
        }
      } else {
        out.push({ ...n, children: insert(n.children) });
      }
    }
    return out;
  };

  return insert(without);
}

/** 创建一个新节点（带稳定 id 由调用方传入）。 */
export function makeNode(
  id: string,
  type: NodeType,
  title: string,
  updatedAt: string,
): TreeNode {
  return { id, type, title, updatedAt, words: 0, children: [] };
}
