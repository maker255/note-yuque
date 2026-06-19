import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { KnowledgeBase } from "../lib/types";
import { countDocs, flatten } from "../lib/tree";
import { Icon } from "./Icon";

export interface Command {
  id: string;
  group: string;
  emoji: string;
  label: string;
  hint: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  kbs: KnowledgeBase[];
  onClose: () => void;
  onOpenKb: (id: string) => void;
  onOpenDoc: (kbId: string, docId: string) => void;
  onCreateKb: () => void;
  onToggleTheme: () => void;
}

export function CommandPalette({
  open,
  kbs,
  onClose,
  onOpenKb,
  onOpenDoc,
  onCreateKb,
  onToggleTheme,
}: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开时重置查询与焦点。
  useEffect(() => {
    if (open) {
      setQ("");
      setSel(0);
      // 等待渲染后再聚焦
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // 依据查询构建命令列表：知识库 → 文档 → 操作。
  const commands = useMemo<Command[]>(() => {
    const query = q.trim().toLowerCase();
    const list: Command[] = [];

    kbs
      .filter((k) => !query || k.name.toLowerCase().includes(query))
      .forEach((k) =>
        list.push({
          id: `kb-${k.id}`,
          group: "知识库",
          emoji: k.emoji,
          label: k.name,
          hint: `${countDocs(k.tree)} 篇`,
          run: () => onOpenKb(k.id),
        }),
      );

    if (query) {
      const docs: Command[] = [];
      kbs.forEach((k) =>
        flatten(k.tree).forEach((d) => {
          if (d.title.toLowerCase().includes(query)) {
            docs.push({
              id: `doc-${d.id}`,
              group: "文档",
              emoji: d.emoji ?? (d.type === "folder" ? "📁" : "📄"),
              label: d.title,
              hint: k.name,
              run: () => onOpenDoc(k.id, d.id),
            });
          }
        }),
      );
      list.push(...docs.slice(0, 8));
    }

    const actions: Command[] = [
      {
        id: "act-new-kb",
        group: "操作",
        emoji: "＋",
        label: "新建知识库",
        hint: "操作",
        run: onCreateKb,
      },
      {
        id: "act-theme",
        group: "操作",
        emoji: "🌓",
        label: "切换主题",
        hint: "操作",
        run: onToggleTheme,
      },
    ];
    list.push(...actions.filter((a) => !query || a.label.toLowerCase().includes(query)));

    return list;
  }, [q, kbs, onOpenKb, onOpenDoc, onCreateKb, onToggleTheme]);

  // 查询变化时把选中项夹在范围内。
  useEffect(() => {
    setSel((s) => Math.min(s, Math.max(0, commands.length - 1)));
  }, [commands.length]);

  if (!open) return null;

  function runAt(i: number) {
    const cmd = commands[i];
    if (cmd) {
      cmd.run();
      onClose();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, commands.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(sel);
    }
  }

  // 按 group 渲染，但保持 commands 的扁平索引用于键盘高亮。
  let flatIndex = -1;
  const groups: { name: string; items: { cmd: Command; index: number }[] }[] = [];
  commands.forEach((cmd) => {
    flatIndex += 1;
    const last = groups[groups.length - 1];
    if (last && last.name === cmd.group) {
      last.items.push({ cmd, index: flatIndex });
    } else {
      groups.push({ name: cmd.group, items: [{ cmd, index: flatIndex }] });
    }
  });

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="palette-input">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            placeholder="搜索知识库、文档或执行操作…"
            autoComplete="off"
          />
        </div>

        <div className="palette-results">
          {commands.length === 0 && <div className="palette-empty">无匹配结果</div>}
          {groups.map((g) => (
            <div key={g.name}>
              <div className="pal-group">{g.name}</div>
              {g.items.map(({ cmd, index }) => (
                <button
                  key={cmd.id}
                  className={`pal-item${index === sel ? " sel" : ""}`}
                  onMouseEnter={() => setSel(index)}
                  onClick={() => runAt(index)}
                >
                  <span className="pal-emoji">{cmd.emoji}</span>
                  <span className="pal-label">{cmd.label}</span>
                  <span className="pal-hint">{cmd.hint}</span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="palette-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> 选择
          </span>
          <span>
            <kbd>↵</kbd> 打开
          </span>
          <span>
            <kbd>esc</kbd> 关闭
          </span>
        </div>
      </div>
    </div>
  );
}
