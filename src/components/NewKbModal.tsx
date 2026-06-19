import { useEffect, useRef, useState } from "react";
import type { Scope } from "../lib/types";
import { EMOJI_POOL } from "../lib/data";
import { Icon } from "./Icon";

// 「新建知识库」对话框 —— 移植自 1.html 的 kb-modal，改写为 Vercel 风格。
// 含：emoji 选择、名称、简介、「新建至」（我的 / 协作的）。

interface NewKbModalProps {
  open: boolean;
  /** 默认归属，跟随当前视图（我的 / 协作的） */
  defaultScope: Scope;
  onClose: () => void;
  onCreate: (input: { emoji: string; name: string; intro: string; scope: Scope }) => void;
}

export function NewKbModal({ open, defaultScope, onClose, onCreate }: NewKbModalProps) {
  const [emoji, setEmoji] = useState(EMOJI_POOL[0]);
  const [name, setName] = useState("");
  const [intro, setIntro] = useState("");
  const [scope, setScope] = useState<Scope>(defaultScope);
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开时重置表单并聚焦名称输入。
  useEffect(() => {
    if (open) {
      setEmoji(EMOJI_POOL[0]);
      setName("");
      setIntro("");
      setScope(defaultScope);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open, defaultScope]);

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

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    onCreate({ emoji, name: trimmed, intro: intro.trim(), scope });
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="newkb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <span id="newkb-title" className="modal-title">
            新建知识库
          </span>
          <button className="modal-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section-title">基本信息</div>

          <div className="modal-field modal-namerow">
            <div className="modal-emoji" aria-hidden="true">
              {emoji}
            </div>
            <input
              ref={inputRef}
              className="modal-input"
              type="text"
              value={name}
              placeholder="知识库名称"
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>

          <div className="modal-field">
            <div className="modal-emoji-pick">
              {EMOJI_POOL.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={`emoji-chip${e === emoji ? " active" : ""}`}
                  onClick={() => setEmoji(e)}
                  aria-label={`选择图标 ${e}`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-field">
            <textarea
              className="modal-textarea"
              value={intro}
              placeholder="知识库简介（选填）"
              onChange={(e) => setIntro(e.currentTarget.value)}
            />
          </div>

          <div className="modal-section-title">新建至</div>
          <div className="modal-field modal-selectrow">
            <div className="modal-avatar" aria-hidden="true" />
            <div className="modal-select-wrap">
              <select
                className="modal-select"
                value={scope}
                onChange={(e) => setScope(e.currentTarget.value as Scope)}
              >
                <option value="mine">我的</option>
                <option value="shared">协作的</option>
              </select>
              <span className="modal-select-caret">
                <Icon name="chevron" size={14} />
              </span>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            取消
          </button>
          <button className="btn primary" onClick={submit} disabled={!name.trim()}>
            新建
          </button>
        </div>
      </div>
    </div>
  );
}
