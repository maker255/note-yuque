// Tauri 数据访问层：封装 invoke 调用后端知识库 CRUD 命令（src-tauri/src/lib.rs），
// 并在「数据库行」与前端 KnowledgeBase 之间互转 —— DB 把文档树存为 JSON 字符串(tree)，
// 前端使用结构化的 TreeNode[]。
import { invoke } from "@tauri-apps/api/core";
import type { KnowledgeBase, Scope, TreeNode } from "./types";

/** 后端 knowledge_base::Data 的形状（tree 为 JSON 字符串）。 */
interface KbRow {
  id: string;
  emoji: string;
  name: string;
  intro: string;
  locked: boolean;
  fav: boolean;
  scope: string;
  tree: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

/** DB 行 → 前端模型：解析 tree JSON，容错为单纯数组。 */
function fromRow(row: KbRow): KnowledgeBase {
  let tree: TreeNode[] = [];
  try {
    const parsed = JSON.parse(row.tree);
    if (Array.isArray(parsed)) tree = parsed as TreeNode[];
  } catch {
    /* tree 解析失败时回退为空树，避免整库加载崩溃 */
  }
  return {
    id: row.id,
    emoji: row.emoji,
    name: row.name,
    intro: row.intro,
    locked: row.locked,
    fav: row.fav,
    scope: (row.scope === "shared" ? "shared" : "mine") as Scope,
    tree,
  };
}

/** 查：列出全部知识库（后端已按 sort 升序）。 */
export async function listKbs(): Promise<KnowledgeBase[]> {
  const rows = await invoke<KbRow[]>("list_kbs");
  return rows.map(fromRow);
}

export interface CreateKbInput {
  emoji: string;
  name: string;
  intro?: string;
  scope?: Scope;
  sort?: number;
  /** 可选：一次性带上整棵文档树（播种演示数据时使用） */
  tree?: TreeNode[];
  fav?: boolean;
  locked?: boolean;
}

/** 增：创建知识库，返回带 id 的完整模型。 */
export async function createKb(input: CreateKbInput): Promise<KnowledgeBase> {
  const row = await invoke<KbRow>("create_kb", {
    emoji: input.emoji,
    name: input.name,
    intro: input.intro ?? "",
    scope: input.scope ?? "mine",
    sort: input.sort ?? 0,
    tree: input.tree !== undefined ? JSON.stringify(input.tree) : null,
    fav: input.fav ?? null,
    locked: input.locked ?? null,
  });
  return fromRow(row);
}

/** 可部分更新的字段；tree 传 TreeNode[]，此处负责序列化。 */
export interface KbPatch {
  name?: string;
  emoji?: string;
  intro?: string;
  locked?: boolean;
  fav?: boolean;
  scope?: Scope;
  tree?: TreeNode[];
  sort?: number;
}

/** 改：部分更新；仅传入的字段会下发到后端。 */
export async function updateKb(id: string, patch: KbPatch): Promise<void> {
  await invoke("update_kb", {
    id,
    name: patch.name ?? null,
    emoji: patch.emoji ?? null,
    intro: patch.intro ?? null,
    locked: patch.locked ?? null,
    fav: patch.fav ?? null,
    scope: patch.scope ?? null,
    tree: patch.tree !== undefined ? JSON.stringify(patch.tree) : null,
    sort: patch.sort ?? null,
  });
}

/** 便捷整行写回：树节点编辑后调用，持久化该知识库的全部字段。 */
export async function saveKb(kb: KnowledgeBase): Promise<void> {
  await updateKb(kb.id, {
    name: kb.name,
    emoji: kb.emoji,
    intro: kb.intro ?? "",
    locked: kb.locked,
    fav: kb.fav,
    scope: kb.scope,
    tree: kb.tree,
  });
}

/** 删：按 id 删除知识库。 */
export async function deleteKb(id: string): Promise<void> {
  await invoke("delete_kb", { id });
}
