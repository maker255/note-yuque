#!/usr/bin/env python3
"""
notebook_cli.py — SQLite CRUD for the yuque-rich-text notebook.
Database: notebook.db (same directory as this script)

Usage:
  python notebook_cli.py list
  python notebook_cli.py create "标题" ["lake格式内容"]
  python notebook_cli.py read <id>
  python notebook_cli.py update <id> ["新标题"] ["新内容"]
  python notebook_cli.py delete <id>
  python notebook_cli.py search <keyword>
"""

import sqlite3
import sys
import os
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "notebook.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    return conn


def cmd_list():
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC"
        ).fetchall()
    if not rows:
        print("暂无笔记。")
        return
    print(f"{'ID':<6} {'标题':<30} 更新时间")
    print("-" * 60)
    for r in rows:
        title = (r["title"] or "无标题笔记")[:28]
        print(f"{r['id']:<6} {title:<30} {r['updated_at']}")


def cmd_create(title: str, content: str = ""):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO notes (title, content) VALUES (?, ?)",
            (title or "无标题笔记", content),
        )
        conn.commit()
        nid = cur.lastrowid
    print(f"已创建笔记，ID={nid}")


def cmd_read(nid: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (nid,)).fetchone()
    if not row:
        print(f"未找到 ID={nid} 的笔记。")
        return
    print(f"ID       : {row['id']}")
    print(f"标题     : {row['title']}")
    print(f"更新时间 : {row['updated_at']}")
    print(f"内容     :\n{row['content']}")


def cmd_update(nid: int, title: Optional[str] = None, content: Optional[str] = None):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (nid,)).fetchone()
        if not row:
            print(f"未找到 ID={nid} 的笔记。")
            return
        new_title = title if title is not None else row["title"]
        new_content = content if content is not None else row["content"]
        conn.execute(
            "UPDATE notes SET title=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
            (new_title, new_content, nid),
        )
        conn.commit()
    print(f"已更新笔记 ID={nid}")


def cmd_delete(nid: int):
    with get_conn() as conn:
        row = conn.execute("SELECT id FROM notes WHERE id = ?", (nid,)).fetchone()
        if not row:
            print(f"未找到 ID={nid} 的笔记。")
            return
        ans = input(f"确认删除 ID={nid}？[y/N] ")
        if ans.lower() != "y":
            print("已取消。")
            return
        conn.execute("DELETE FROM notes WHERE id = ?", (nid,))
        conn.commit()
    print(f"已删除笔记 ID={nid}")


def cmd_search(keyword: str):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, title, updated_at FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC",
            (f"%{keyword}%", f"%{keyword}%"),
        ).fetchall()
    if not rows:
        print(f"未找到包含「{keyword}」的笔记。")
        return
    print(f"{'ID':<6} {'标题':<30} 更新时间")
    print("-" * 60)
    for r in rows:
        title = (r["title"] or "无标题笔记")[:28]
        print(f"{r['id']:<6} {title:<30} {r['updated_at']}")


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(0)

    cmd = args[0].lower()

    if cmd == "list":
        cmd_list()
    elif cmd == "create":
        title = args[1] if len(args) > 1 else "无标题笔记"
        content = args[2] if len(args) > 2 else ""
        cmd_create(title, content)
    elif cmd == "read":
        if len(args) < 2:
            print("用法: read <id>")
            sys.exit(1)
        cmd_read(int(args[1]))
    elif cmd == "update":
        if len(args) < 2:
            print("用法: update <id> [标题] [内容]")
            sys.exit(1)
        title = args[2] if len(args) > 2 else None
        content = args[3] if len(args) > 3 else None
        cmd_update(int(args[1]), title, content)
    elif cmd == "delete":
        if len(args) < 2:
            print("用法: delete <id>")
            sys.exit(1)
        cmd_delete(int(args[1]))
    elif cmd == "search":
        if len(args) < 2:
            print("用法: search <关键词>")
            sys.exit(1)
        cmd_search(args[1])
    else:
        print(f"未知命令: {cmd}")
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
