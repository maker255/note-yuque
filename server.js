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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

const app = express();
app.use(cors());
app.use(express.json());

// 获取所有笔记
app.get('/api/notes', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all();
  res.json(notes);
});

// 获取单个笔记
app.get('/api/notes/:id', (req, res) => {
  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  res.json(note);
});

// 新增笔记
app.post('/api/notes', (req, res) => {
  const { title, content } = req.body;
  const info = db.prepare('INSERT INTO notes (title, content) VALUES (?, ?)').run(title || '无标题笔记', content || '');
  res.json({ id: info.lastInsertRowid });
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
