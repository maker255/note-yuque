import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('notebook.db');

// 初始化数据库表
db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    parent_id INTEGER DEFAULT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// 迁移：为旧表补加 parent_id 列（已有列则忽略）
try {
  db.prepare('ALTER TABLE notes ADD COLUMN parent_id INTEGER DEFAULT NULL').run();
} catch (_) { /* column already exists */ }

const app = express();
app.use(cors());
app.use(express.json());

// 获取所有笔记
app.get('/api/notes', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY id ASC').all();
  res.json(notes);
});

// 获取单个笔记
app.get('/api/notes/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(note);
});

// 新增笔记
app.post('/api/notes', (req, res) => {
  const { title, content, parent_id } = req.body;
  const info = db.prepare('INSERT INTO notes (title, content, parent_id) VALUES (?, ?, ?)')
    .run(title || '无标题笔记', content || '', parent_id ?? null);
  res.json({ id: info.lastInsertRowid });
});

// 批量写入种子笔记（幂等：仅在表为空时执行）
app.post('/api/notes/seed', (req, res) => {
  const count = db.prepare('SELECT COUNT(*) as c FROM notes').get().c;
  if (count > 0) return res.json({ skipped: true, count });

  const insert = db.prepare('INSERT INTO notes (title, content, parent_id) VALUES (?, ?, ?)');
  const insertMany = db.transaction((items) => {
    const ids = {};
    for (const item of items) {
      const info = insert.run(item.title, '', null);
      ids[item.key] = info.lastInsertRowid;
    }
    // 写入子项
    for (const item of items) {
      if (item.parentKey) {
        db.prepare('UPDATE notes SET parent_id = ? WHERE id = ?')
          .run(ids[item.parentKey], ids[item.key]);
      }
    }
    return ids;
  });

  const items = req.body; // array of { key, title, parentKey? }
  const ids = insertMany(items);
  res.json({ inserted: Object.keys(ids).length, ids });
});

// 更新笔记
app.put('/api/notes/:id', (req, res) => {
  const { title, content } = req.body;
  db.prepare('UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title, content, req.params.id);
  res.json({ success: true });
});

// 删除笔记
app.delete('/api/notes/:id', (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
