import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

// 解析 .env 文件（支持中文冒号分隔格式）
function loadEnv(envPath) {
  const cfg = {};
  if (!fs.existsSync(envPath)) return cfg;
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // support both '=' and '：' separators
    const eqIdx = trimmed.indexOf('=');
    const cnIdx = trimmed.indexOf('：');
    const sep = eqIdx === -1 ? cnIdx : cnIdx === -1 ? eqIdx : Math.min(eqIdx, cnIdx);
    if (sep === -1) continue;
    const key = trimmed.slice(0, sep).trim();
    const val = trimmed.slice(sep + 1).trim();
    cfg[key] = val;
  }
  return cfg;
}
const envCfg = loadEnv(path.join(path.dirname(fileURLToPath(import.meta.url)), '.env'));

const require = createRequire(import.meta.url);
const multer = require('multer');

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

// ── Image upload config (persisted in DB as key/value) ───────────────────────
db.prepare(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )
`).run();

function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
}

// 从 .env 读取 forkimgbed 配置
const forkimgbedUrl    = envCfg['remoteAddress'] || '';
const forkimgbedAuth   = envCfg['authCode']        || '';
const forkimgbedComp   = envCfg['serverCompress']  || 'false';
const forkimgbedChan   = envCfg['uploadChannel']   || '';
const forkimgbedUser   = envCfg['Username']        || '';
const forkimgbedPass   = envCfg['Password']        || '';

// defaults
if (!getSetting('imageMode'))    setSetting('imageMode', 'remote_fallback');   // 'local' | 'remote' | 'remote_fallback'
if (!getSetting('imageLocalDir')) setSetting('imageLocalDir', path.join(__dirname, 'uploads'));
if (!getSetting('imageRemoteUrl')) setSetting('imageRemoteUrl', '');

// if .env has remoteAddress, auto-upgrade mode to remote_fallback
if (forkimgbedUrl && getSetting('imageMode') === 'local') {
  setSetting('imageMode', 'remote_fallback');
}

// ensure default upload dir exists
const defaultUploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(defaultUploadDir)) fs.mkdirSync(defaultUploadDir, { recursive: true });

function getUploadDir() {
  const dir = getSetting('imageLocalDir', defaultUploadDir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, getUploadDir()),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({ storage });

const app = express();
app.use(cors());
app.use(express.json());

// serve local uploads
app.use('/uploads', (req, res, next) => {
  const dir = getUploadDir();
  express.static(dir)(req, res, next);
});

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

// ── Image upload settings ─────────────────────────────────────────────────────

app.get('/api/upload/config', (_req, res) => {
  res.json({
    imageMode: getSetting('imageMode'),
    imageLocalDir: getSetting('imageLocalDir'),
    imageRemoteUrl: getSetting('imageRemoteUrl'),
  });
});

app.put('/api/upload/config', (req, res) => {
  const { imageMode, imageLocalDir, imageRemoteUrl } = req.body;
  if (imageMode) setSetting('imageMode', imageMode);
  if (imageLocalDir !== undefined) setSetting('imageLocalDir', imageLocalDir);
  if (imageRemoteUrl !== undefined) setSetting('imageRemoteUrl', imageRemoteUrl);
  res.json({ success: true });
});

// upload a file to local dir, optionally try remote first
app.post('/api/upload/image', upload.single('file'), async (req, res) => {
  const mode = getSetting('imageMode', 'local');
  console.log('[upload] mode=%s url=%s file=%s', mode, forkimgbedUrl, req.file?.originalname);

  const localResult = () => {
    if (!req.file) return null;
    return { data: { url: `http://localhost:3001/uploads/${req.file.filename}`, size: req.file.size, filename: req.file.filename } };
  };

  const tryRemote = async () => {
    if (!forkimgbedUrl || !req.file) return null;
    try {
      const params = new URLSearchParams();
      if (forkimgbedAuth) params.set('authCode', forkimgbedAuth);
      if (forkimgbedComp) params.set('serverCompress', forkimgbedComp);
      if (forkimgbedChan) params.set('uploadChannel', forkimgbedChan);
      const uploadUrl = `${forkimgbedUrl}?${params}`;

      const basicToken = Buffer.from(`${forkimgbedUser}:${forkimgbedPass}`).toString('base64');
      const form = new FormData();
      const blob = new Blob([fs.readFileSync(req.file.path)], { type: req.file.mimetype });
      form.append('file', blob, req.file.originalname);

      const r = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${basicToken}` },
        body: form,
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        console.error('[upload] remote responded', r.status, await r.text().catch(() => ''));
        return null;
      }
      const json = await r.json();
      // forkimgbed 返回 [{"src":"/file/xxx.jpg"}]，转为统一格式
      if (Array.isArray(json) && json[0]?.src) {
        const base = forkimgbedUrl.replace(/\/upload$/, '');
        const url = json[0].src.startsWith('http') ? json[0].src : `${base}${json[0].src}`;
        return { data: { url, size: req.file.size, filename: req.file.originalname } };
      }
      return json?.data?.url ? json : null;
    } catch (e) {
      console.error('[upload] tryRemote error:', e);
      return null;
    }
  };

  try {
    if (mode === 'local') {
      const result = localResult();
      return result ? res.json(result) : res.status(400).json({ error: 'no file' });
    }
    if (mode === 'remote') {
      if (!req.file) return res.status(400).json({ error: 'no file' });
      const result = await tryRemote();
      return result ? res.json(result) : res.status(502).json({ error: 'remote upload failed' });
    }
    // remote_fallback
    if (!req.file) return res.status(400).json({ error: 'no file' });
    const remote = await tryRemote();
    if (remote) return res.json(remote);
    const local = localResult();
    return local ? res.json(local) : res.status(500).json({ error: 'upload failed' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// crawl: 先下载到本地再上传到 forkimgbed，或直接本地存储
app.post('/api/upload/crawl', async (req, res) => {
  const { url: imageUrl } = req.body;
  if (!imageUrl) return res.status(400).json({ error: 'missing url' });

  const mode = getSetting('imageMode', 'local');

  // 先把远程图片下载到本地临时文件，再推送到 forkimgbed
  const tryRemoteCrawl = async () => {
    if (!forkimgbedUrl) return null;
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!imgRes.ok) return null;
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const ext = (contentType.split('/')[1] || 'jpg').split(';')[0];
      const filename = `crawl-${Date.now()}.${ext}`;
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      const params = new URLSearchParams();
      if (forkimgbedAuth) params.set('authCode', forkimgbedAuth);
      if (forkimgbedComp) params.set('serverCompress', forkimgbedComp);
      if (forkimgbedChan) params.set('uploadChannel', forkimgbedChan);
      const uploadUrl = `${forkimgbedUrl}?${params}`;
      const basicToken = Buffer.from(`${forkimgbedUser}:${forkimgbedPass}`).toString('base64');

      const form = new FormData();
      form.append('file', new Blob([buffer], { type: contentType }), filename);
      const r = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${basicToken}` },
        body: form,
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return null;
      const json = await r.json();
      if (Array.isArray(json) && json[0]?.src) {
        const base = forkimgbedUrl.replace(/\/upload$/, '');
        const url = json[0].src.startsWith('http') ? json[0].src : `${base}${json[0].src}`;
        return { data: { url, size: buffer.length, filename } };
      }
      return json?.data?.url ? json : null;
    } catch { return null; }
  };

  const localCrawl = async () => {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
    if (!imgRes.ok) return null;
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const ext = (contentType.split('/')[1] || 'jpg').split(';')[0];
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const dest = path.join(getUploadDir(), filename);
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    return { data: { url: `http://localhost:3001/uploads/${filename}`, size: buffer.length, filename } };
  };

  try {
    if (mode === 'remote') {
      const r = await tryRemoteCrawl();
      return r ? res.json(r) : res.status(502).json({ error: 'remote crawl failed' });
    }
    if (mode === 'remote_fallback') {
      const r = await tryRemoteCrawl();
      if (r) return res.json(r);
    }
    const r = await localCrawl();
    return r ? res.json(r) : res.status(500).json({ error: 'crawl failed' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Backup / Restore ─────────────────────────────────────────────────────────

const BACKUP_KEY = 'YuqueNoteBackupKey@NOTEBOOK-APP';

function xorObfuscate(input) {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ BACKUP_KEY.charCodeAt(i % BACKUP_KEY.length));
  }
  return out;
}

function encryptBackup(jsonStr) {
  return 'ENC:' + Buffer.from(xorObfuscate(jsonStr), 'binary').toString('base64');
}

function decryptBackup(data) {
  if (data.startsWith('ENC:')) {
    const obfuscated = Buffer.from(data.slice(4), 'base64').toString('binary');
    return xorObfuscate(obfuscated);
  }
  return data; // plaintext fallback for unencrypted files
}

// 导出：所有笔记序列化后加密，作为纯文本返回
app.get('/api/backup/export', (req, res) => {
  const notes = db.prepare('SELECT * FROM notes ORDER BY id ASC').all();
  const payload = JSON.stringify({ notes, exportedAt: new Date().toISOString() });
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(encryptBackup(payload));
});

// 导入：解密后两步插入，保留父子层级关系
app.post('/api/backup/import', (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'missing data' });

  let parsed;
  try {
    parsed = JSON.parse(decryptBackup(data));
  } catch {
    return res.status(400).json({ error: 'invalid backup file' });
  }

  const notes = parsed.notes ?? [];
  const insert = db.prepare('INSERT INTO notes (title, content, parent_id) VALUES (?, ?, ?)');
  const updateParent = db.prepare('UPDATE notes SET parent_id = ? WHERE id = ?');

  const imported = db.transaction((rows) => {
    const idMap = {};
    // 第一步：全部以 parent_id=null 插入，记录旧→新 ID 映射
    for (const n of rows) {
      const info = insert.run(n.title ?? '', n.content ?? '', null);
      idMap[n.id] = info.lastInsertRowid;
    }
    // 第二步：修正 parent_id
    for (const n of rows) {
      if (n.parent_id !== null && n.parent_id !== undefined) {
        updateParent.run(idMap[n.parent_id] ?? null, idMap[n.id]);
      }
    }
    return rows.length;
  })(notes);

  res.json({ success: true, imported });
});

// ─────────────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
