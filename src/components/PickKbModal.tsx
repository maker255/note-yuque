import { useEffect } from "react";
import type { KnowledgeBase } from "../lib/types";
import { Icon } from "./Icon";

// 「选择知识库」对话框 —— 当不在具体知识库路由下点击「新建文档」时弹出。
// 用户可选择一个已有知识库（在其中新建文档），或转去「新建知识库」。
interface PickKbModalProps {
  open: boolean;
  kbs: KnowledgeBase[];
  onClose: () => void;
  /** 选中某知识库：在其中新建并打开一篇文档 */
  onPick: (kbId: string) => void;
  /** 转去新建知识库（随后再在其中新建文档） */
  onNewKb: () => void;
}

export function PickKbModal({ open, kbs, onClose, onPick, onNewKb }: PickKbModalProps) {
  // Esc 关闭。
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickkb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span id="pickkb-title" className="modal-title">
            新建文档到…
          </span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section-title">选择一个知识库</div>
          <div className="pickkb-list">
            {kbs.map((kb) => (
              <button key={kb.id} className="pickkb-item" onClick={() => onPick(kb.id)}>
                <span className="pickkb-emoji">{kb.emoji}</span>
                <span className="pickkb-name">{kb.name}</span>
                {kb.locked && (
                  <span className="pickkb-lock" title="私有">
                    <Icon name="lock" size={12} />
                  </span>
                )}
                <span className="pickkb-scope">{kb.scope === "mine" ? "我的" : "协作的"}</span>
                <Icon name="chevron" size={14} className="pickkb-go" />
              </button>
            ))}
            {kbs.length === 0 && <div className="pickkb-empty">还没有知识库</div>}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={onNewKb}>
            <Icon name="plus" size={14} />
            新建知识库
          </button>
        </div>
      </div>
    </div>
  );
}
