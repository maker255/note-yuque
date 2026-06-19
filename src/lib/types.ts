// 领域模型：知识库（KnowledgeBase）与其下的「无限级知识树」。
// UI 设计阶段先在前端内存中维护，后续再对接 Tauri/Prisma（详见 lib/tree.ts 注释）。

/**
 * 节点类型。注意：type 只决定「图标 / 语义」，**不决定**能否挂子节点。
 * 与语雀保持一致 —— 文档(doc) 与 目录(folder) 地位完全平等，
 * 任何节点都允许拥有 children，从而构成真正的无限级知识树。
 */
export type NodeType = "doc" | "folder";

/** 知识树节点：每个节点（无论 doc / folder）都携带 children 数组。 */
export interface TreeNode {
  id: string;
  type: NodeType;
  title: string;
  /** 可选 emoji 图标；缺省时按 type 渲染线性图标 */
  emoji?: string;
  /** 更新时间，ISO 字符串（展示时本地化） */
  updatedAt: string;
  /** 文档字数，用于知识库概览统计（folder 通常为 0） */
  words?: number;
  /** 子节点 —— 任意节点皆可拥有，空数组表示暂无子节点 */
  children: TreeNode[];
}

export interface KnowledgeBase {
  id: string;
  /** 单个 emoji 作为图标，符合 Vercel 克制的视觉语言（不引入彩色插画） */
  emoji: string;
  name: string;
  /** 是否私有（展示一个锁标记） */
  locked: boolean;
  /** 是否收藏 */
  fav: boolean;
  /** 归属：个人 or 协作 */
  scope: "mine" | "shared";
  /** 知识库内容 —— 无限级知识树（根级森林） */
  tree: TreeNode[];
}

/** 主导航视图 */
export type ViewId = "home" | "recent" | "favorites" | "notes";

/** 内容区顶部分组标签 */
export type Scope = "mine" | "shared";

/** 拖拽落点：成为前/后兄弟，或成为子节点（inside → 无限级嵌套的关键） */
export type DropPos = "before" | "after" | "inside";
