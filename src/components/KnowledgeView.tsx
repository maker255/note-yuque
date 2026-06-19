import type { KnowledgeBase, Scope, ViewId } from "../lib/types";
import { formatDate } from "../lib/format";
import { countDocs, flatten } from "../lib/tree";
import { Icon } from "./Icon";

interface KnowledgeViewProps {
  view: ViewId;
  scope: Scope;
  kbs: KnowledgeBase[];
  onScope: (s: Scope) => void;
  onToggleFav: (id: string) => void;
  onSelectKb: (id: string) => void;
}

const VIEW_META: Record<ViewId, { title: string; desc: string; label: string }> = {
  home: { title: "知识库", desc: "集中管理你的所有知识库与文档。", label: "全部知识库" },
  recent: { title: "最近", desc: "按最近编辑时间排序。", label: "最近访问" },
  favorites: { title: "收藏", desc: "你标星收藏的知识库。", label: "收藏的知识库" },
  notes: { title: "小记", desc: "轻量、随手记录的零散笔记。", label: "全部小记" },
};

export function KnowledgeView({
  view,
  scope,
  kbs,
  onScope,
  onToggleFav,
  onSelectKb,
}: KnowledgeViewProps) {
  const meta = VIEW_META[view];

  return (
    <div className="container">
      <h1 className="page-title">{meta.title}</h1>
      <p className="page-desc">{meta.desc}</p>

      {/* 收藏/小记视图聚合所有归属，无需分组切换 */}
      {(view === "home" || view === "recent") && (
        <div className="tabs">
          <button
            className={`tab${scope === "mine" ? " active" : ""}`}
            onClick={() => onScope("mine")}
          >
            我的
          </button>
          <button
            className={`tab${scope === "shared" ? " active" : ""}`}
            onClick={() => onScope("shared")}
          >
            协作的
          </button>
        </div>
      )}

      <div className="section-row">
        <h2>{meta.label}</h2>
        <span className="line" />
        <span className="section-count">{kbs.length} 个</span>
      </div>

      {kbs.length === 0 ? (
        <div className="empty">这里还没有内容</div>
      ) : (
        <div className="grid">
          {kbs.map((kb) => {
            const docs = flatten(kb.tree).slice(0, 3);
            const total = countDocs(kb.tree);
            return (
            <article key={kb.id} className="card" onClick={() => onSelectKb(kb.id)}>
              <div className="card-hd">
                <div className="card-emoji">{kb.emoji}</div>
                <div className="card-title">
                  {kb.name}
                  {kb.locked && (
                    <span className="card-lock">
                      <Icon name="lock" size={11} />
                    </span>
                  )}
                </div>
                <button
                  className={`card-star${kb.fav ? " on" : ""}`}
                  title={kb.fav ? "取消收藏" : "收藏"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFav(kb.id);
                  }}
                >
                  <Icon name="star" size={15} />
                </button>
              </div>

              <ul className="card-list">
                {docs.map((d) => (
                  <li key={d.id} className="card-li">
                    <span className="card-dot" />
                    <span className="card-doc-title">{d.title}</span>
                    <span className="card-doc-date">{formatDate(d.updatedAt)}</span>
                  </li>
                ))}
                {docs.length === 0 && <li className="card-li card-li-empty">暂无文档</li>}
              </ul>

              <div className="card-meta">{total} 篇文档</div>
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
