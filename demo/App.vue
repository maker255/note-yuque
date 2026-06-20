<template>
  <div class="notebook">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="topbar">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 18l-6-6 6-6"/></svg>
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h10l6 6v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>
        <div class="topbar-title">笔记本</div>
        <div class="icon-btn quick-add" title="新建笔记 (⌘N)" @click="createNote()">＋</div>
        <div class="create-wrap">
          <div class="create-btn" title="新建">＋ 新建</div>
          <div class="create-menu" role="menu">
            <div class="cm-item" @click="createNote()">
              <span class="cm-ico">📄</span>
              <span class="cm-text">新建笔记</span>
              <span class="cm-kbd">⌘ N</span>
            </div>
            <div class="cm-divider"></div>
            <div class="cm-item" @click="exportBackup">
              <span class="cm-ico">⬆</span>
              <span class="cm-text">导出备份</span>
            </div>
            <div class="cm-item" @click="importFileInput?.click()">
              <span class="cm-ico">⬇</span>
              <span class="cm-text">导入备份</span>
            </div>
          </div>
        </div>
        <div class="icon-btn settings-btn" title="图片存储设置" @click="openSettings">⚙</div>
        <input ref="importFileInput" type="file" accept=".nbk" style="display:none" @change="importBackup" />
      </div>

      <div class="nav">
        <div class="home-pill">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 10.5l9-7 9 7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"/></svg>
          <span>首页</span>
        </div>

        <div class="section-title">
          <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z"/></svg>
          <span>目录</span>
        </div>

        <div class="note-list">
          <template v-for="note in topLevel" :key="note.id">
            <div
              class="group"
              :class="{ active: currentNote?.id === note.id }"
              @click="selectNote(note)"
            >
              <svg
                v-if="childrenOf(note.id).length"
                class="chev"
                :class="{ expanded: expandedIds.has(note.id) }"
                viewBox="0 0 24 24"
                aria-hidden="true"
                @click.stop="toggleExpand(note.id)"
              ><path fill="currentColor" d="M9 18l6-6-6-6"/></svg>
              <span v-else class="chev-placeholder"></span>
              <div class="group-name">{{ note.title || '无标题笔记' }}</div>
              <div class="act">
                <div class="icon-btn add-sub" title="新建子笔记" @click.stop="createNote(note.id)">＋</div>
                <div class="icon-btn" title="删除" @click.stop="deleteNote(note.id)">✕</div>
              </div>
            </div>
            <div v-if="childrenOf(note.id).length && expandedIds.has(note.id)" class="subnav">
              <div
                v-for="child in childrenOf(note.id)"
                :key="child.id"
                class="sub-item"
                :class="{ active: currentNote?.id === child.id }"
                @click="selectNote(child)"
              >
                <span class="bullet"></span>
                <span class="sub-name">{{ child.title || '无标题笔记' }}</span>
                <div class="act">
                  <div class="icon-btn sub-del" title="删除" @click.stop="deleteNote(child.id)">✕</div>
                </div>
              </div>
            </div>
          </template>
          <div v-if="topLevel.length === 0" class="empty-tip">暂无笔记，点击 ＋ 新建</div>
        </div>
      </div>
    </aside>

    <!-- Settings modal -->
    <div v-if="showSettings" class="modal-backdrop" @click.self="showSettings = false">
      <div class="modal" role="dialog" aria-label="图片存储设置">
        <div class="modal-header">
          <span class="modal-title">图片存储设置</span>
          <button class="modal-close" @click="showSettings = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">存储模式</label>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" v-model="imgConfig.imageMode" value="local" />
                <span>本地存储</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="imgConfig.imageMode" value="remote" />
                <span>远程存储</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="imgConfig.imageMode" value="remote_fallback" />
                <span>远程优先，失败切换本地</span>
              </label>
            </div>
          </div>
          <div class="field">
            <label class="field-label">本地存储目录</label>
            <input class="field-input" v-model="imgConfig.imageLocalDir" placeholder="绝对路径，例如 /data/uploads" />
            <span class="field-hint">留空则使用默认目录 ./uploads</span>
          </div>
          <div class="field" :class="{ 'field-disabled': imgConfig.imageMode === 'local' }">
            <label class="field-label">远程上传接口</label>
            <input class="field-input" v-model="imgConfig.imageRemoteUrl"
              :disabled="imgConfig.imageMode === 'local'"
              placeholder="https://example.com/api/upload" />
            <span class="field-hint">POST FormData (file 字段)，响应 {data:{url,size,filename}}</span>
          </div>
          <div v-if="settingsMsg" class="settings-msg" :class="{ 'settings-msg-err': settingsMsgErr }">{{ settingsMsg }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="showSettings = false">取消</button>
          <button class="btn-primary" @click="saveSettings">保存</button>
        </div>
      </div>
    </div>

    <!-- Editor pane -->
    <main class="editor-pane" @keydown.ctrl.s.prevent="saveNote" @keydown.meta.s.prevent="saveNote">
      <template v-if="currentNote">
        <div class="editor-header">
          <input
            class="title-input"
            v-model="currentNote.title"
            placeholder="无标题笔记"
            @input="markDirty"
          />
          <span class="save-status" :class="{ unsaved: isDirty }">{{ saveStatus }}</span>
          <button class="btn-save" :disabled="!isDirty" @click="saveNote">保存</button>
        </div>
        <div class="editor-wrap">
          <YuqueRichText
            :key="currentNote.id"
            ref="editorRef"
            :value="currentNote.content"
            @onChange="onContentChange"
          />
        </div>
      </template>
      <div v-else class="no-note">选择一篇笔记或点击 ＋ 新建</div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { YuqueRichText } from 'yuque-rich-text'
import type { IEditorRef } from 'yuque-rich-text'

const API = 'http://localhost:3001/api/notes'
const UPLOAD_API = 'http://localhost:3001/api/upload'

interface Note {
  id: number
  title: string
  content: string
  parent_id: number | null
  updated_at: string
}

const notes = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const editorRef = ref<IEditorRef>()
const saveStatus = ref('')
const isDirty = ref(false)
const expandedIds = reactive(new Set<number>())
const importFileInput = ref<HTMLInputElement>()
let pendingContent: string | null = null

// image storage settings
const showSettings = ref(false)
const settingsMsg = ref('')
const settingsMsgErr = ref(false)
const imgConfig = ref({ imageMode: 'local', imageLocalDir: '', imageRemoteUrl: '' })

async function openSettings() {
  try {
    const res = await fetch(`${UPLOAD_API}/config`)
    imgConfig.value = await res.json()
  } catch {
    imgConfig.value = { imageMode: 'local', imageLocalDir: '', imageRemoteUrl: '' }
  }
  settingsMsg.value = ''
  showSettings.value = true
}

async function saveSettings() {
  try {
    const res = await fetch(`${UPLOAD_API}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imgConfig.value),
    })
    if (!res.ok) throw new Error('failed')
    settingsMsg.value = '保存成功'
    settingsMsgErr.value = false
    setTimeout(() => { showSettings.value = false; settingsMsg.value = '' }, 800)
  } catch {
    settingsMsg.value = '保存失败，请检查服务是否运行'
    settingsMsgErr.value = true
  }
}

const topLevel = computed(() => notes.value.filter(n => n.parent_id === null))
function childrenOf(id: number) {
  return notes.value.filter(n => n.parent_id === id)
}
function toggleExpand(id: number) {
  expandedIds.has(id) ? expandedIds.delete(id) : expandedIds.add(id)
}

async function loadNotes() {
  const res = await fetch(API)
  notes.value = await res.json()
}

async function seedNotes() {
  const items = [
    { key: 'qt',           title: 'Qt 下载教程' },
    { key: 'cs-recursive', title: 'C#面试常见递归算法' },
    { key: 'cs-sort',      title: 'C#经典十大排序算法' },
    { key: 'vscode-cpp',   title: 'VScode中配置 C/C++ 环境' },
    { key: 'cpp-primer',   title: 'C++ Primer第五版中文版习题上' },
    { key: 'cpp-calc',     title: '基础 g++计算题',  parentKey: 'cpp-primer' },
    { key: 'cpp-cmd',      title: '命令行运行C++',    parentKey: 'cpp-primer' },
    { key: 'cpp-sql',      title: 'sqlList顺序表',    parentKey: 'cpp-primer' },
    { key: 'cpp-first',    title: '第一个 C++ 程序' },
    { key: 'cpp-types',    title: '基本类型和初始化', parentKey: 'cpp-first' },
    { key: 'cpp-array',    title: '数组类型',         parentKey: 'cpp-first' },
  ]
  await fetch(`${API}/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  })
}

async function createNote(parentId: number | null = null) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '无标题笔记', content: '', parent_id: parentId }),
  })
  const { id } = await res.json()
  await loadNotes()
  if (parentId !== null) expandedIds.add(parentId)
  const created = notes.value.find(n => n.id === id)
  if (created) selectNote(created)
}

function selectNote(note: Note) {
  pendingContent = null
  isDirty.value = false
  saveStatus.value = ''
  currentNote.value = { ...note }
}

async function deleteNote(id: number) {
  if (!confirm('确认删除这篇笔记？')) return
  await fetch(`${API}/${id}`, { method: 'DELETE' })
  if (currentNote.value?.id === id) {
    currentNote.value = null
    pendingContent = null
    isDirty.value = false
    saveStatus.value = ''
  }
  await loadNotes()
}

function onContentChange(lakeContent: string) {
  if (!currentNote.value) return
  pendingContent = lakeContent
  markDirty()
}

function markDirty() {
  isDirty.value = true
  saveStatus.value = '未保存'
}

async function saveNote() {
  if (!currentNote.value || !isDirty.value) return
  const content = pendingContent !== null ? pendingContent : currentNote.value.content
  const id = currentNote.value.id
  const title = currentNote.value.title

  await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  })

  pendingContent = null
  isDirty.value = false
  saveStatus.value = '已保存，2秒后刷新...'

  localStorage.setItem('lastNoteId', String(id))
  setTimeout(() => window.location.reload(), 2000)
}

async function exportBackup() {
  const res = await fetch('http://localhost:3001/api/backup/export')
  const text = await res.text()
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `notebook-${Date.now()}.nbk`
  a.click()
  URL.revokeObjectURL(url)
}

async function importBackup(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  ;(e.target as HTMLInputElement).value = ''
  if (!confirm(`导入备份将向现有笔记追加数据（不删除已有内容），确认继续？`)) return
  const res = await fetch('http://localhost:3001/api/backup/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: text }),
  })
  const json = await res.json()
  if (!res.ok) { alert(`导入失败：${json.error}`); return }
  alert(`成功导入 ${json.imported} 篇笔记`)
  await loadNotes()
}

onMounted(async () => {
  await seedNotes()
  await loadNotes()
  // auto-expand parents that have children
  for (const note of notes.value) {
    if (notes.value.some(n => n.parent_id === note.id)) {
      expandedIds.add(note.id)
    }
  }
  const lastId = localStorage.getItem('lastNoteId')
  if (lastId) {
    const note = notes.value.find(n => n.id === Number(lastId))
    if (note) selectNote(note)
    localStorage.removeItem('lastNoteId')
  }
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'n' || e.key === 'N')) {
    e.preventDefault()
    createNote()
  }
}
</script>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

:root {
  /* surface */
  --canvas:       #ffffff;
  --canvas-soft:  #fafafa;
  --canvas-soft2: #f5f5f5;
  /* text */
  --ink:    #171717;
  --body:   #4d4d4d;
  --mute:   #888888;
  /* border */
  --hairline:        #ebebeb;
  --hairline-strong: #a1a1a1;
  /* elevation */
  --shadow-inset: inset 0 0 0 1px rgba(0,0,0,.08);
  --shadow-2: 0 1px 1px rgba(0,0,0,.03), 0 2px 2px rgba(0,0,0,.06);
  --shadow-5: 0 1px 1px rgba(0,0,0,.03), 0 8px 16px -4px rgba(0,0,0,.06), 0 24px 32px -8px rgba(0,0,0,.06);
  /* radius */
  --r-sm:   6px;
  --r-md:   8px;
  --r-lg:   12px;
  --r-pill: 100px;
  --r-full: 9999px;
  /* font */
  --font:      Inter, system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  height: 100vh; overflow: hidden;
  font-family: var(--font);
  font-size: 14px; line-height: 20px;
  color: var(--ink);
  background: var(--canvas-soft);
  -webkit-font-smoothing: antialiased;
}
#app { height: 100vh; }

.icon { width: 16px; height: 16px; color: var(--mute); flex-shrink: 0; }

.notebook { display: flex; height: 100vh; }

/* ════════════════════════════
   Sidebar
════════════════════════════ */
.sidebar {
  width: 260px;
  min-width: 220px;
  background: var(--canvas);
  border-right: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* topbar */
.topbar {
  height: 56px;
  display: flex;
  align-items: center;
  padding: 0 12px 0 16px;
  gap: 8px;
  border-bottom: 1px solid var(--hairline);
  flex-shrink: 0;
}
.topbar-title {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  letter-spacing: -0.28px;
}
.spacer { flex: 1; }

/* create button — nav-cta-signup scale */
.create-wrap { position: relative; }
.create-btn {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--r-sm);
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font);
  display: inline-flex; align-items: center; gap: 4px;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: opacity .12s ease;
}
.create-btn:hover { opacity: .82; }

/* create dropdown — Level 5 shadow */
.create-menu {
  position: absolute;
  right: 0; top: 36px;
  width: 190px;
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-5), var(--shadow-inset);
  padding: 6px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity .14s ease, transform .14s ease, visibility .14s linear;
  z-index: 20;
}
.create-wrap:hover .create-menu,
.create-wrap:focus-within .create-menu {
  opacity: 1; visibility: visible; transform: translateY(0);
}
.cm-item {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  color: var(--ink);
}
.cm-divider { height: 1px; background: var(--hairline); margin: 4px 6px; }
.cm-item:hover { background: var(--canvas-soft2); }
.cm-ico { font-size: 14px; }
.cm-text { flex: 1; font-size: 13px; font-weight: 400; }
.cm-kbd {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mute);
}

/* nav scroll area */
.nav {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--hairline) transparent;
}
.nav::-webkit-scrollbar { width: 4px; }
.nav::-webkit-scrollbar-thumb { background: var(--hairline); border-radius: 4px; }

/* home pill */
.home-pill {
  display: flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 10px;
  border-radius: var(--r-md);
  background: var(--canvas-soft2);
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  user-select: none;
  margin-bottom: 4px;
}
.home-pill:hover { background: var(--hairline); }

/* section eyebrow — caption-mono style */
.section-title {
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--mute);
  padding: 16px 4px 6px;
  letter-spacing: .06em;
  text-transform: uppercase;
}

/* ── top-level group row — ex-app-shell-row pattern ── */
.group {
  position: relative;
  display: flex; align-items: center; gap: 6px;
  padding: 6px 8px 6px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  user-select: none;
  color: var(--body);
  font-size: 13px;
  font-weight: 400;
}
.group:hover { background: var(--canvas-soft); color: var(--ink); }

/* active: canvas-soft-2 bg + ink left-edge indicator */
.group.active {
  background: var(--canvas-soft2);
  color: var(--ink);
  font-weight: 500;
}
.group.active::before {
  content: '';
  position: absolute;
  left: 0; top: 5px; bottom: 5px;
  width: 2px;
  background: var(--ink);
  border-radius: 2px;
}

.chev {
  width: 14px; height: 14px;
  color: var(--mute);
  flex-shrink: 0;
  transition: transform .14s ease;
}
.chev.expanded { transform: rotate(90deg); }
.chev-placeholder { width: 14px; flex-shrink: 0; }

.group-name {
  flex: 1;
  text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: -0.28px;
}

/* action buttons — hidden until row hover */
.act {
  display: flex; gap: 3px;
  opacity: 0;
  transition: opacity .12s ease;
  flex-shrink: 0;
}
.group:hover .act,
.sub-item:hover .act { opacity: 1; }

.icon-btn {
  width: 22px; height: 22px;
  display: grid; place-items: center;
  border-radius: var(--r-sm);
  background: var(--canvas);
  box-shadow: var(--shadow-inset);
  font-size: 10px;
  color: var(--mute);
  cursor: pointer;
  transition: color .1s ease, background .1s ease;
}
.icon-btn:hover { color: #ee0000; background: #f7d4d6; box-shadow: none; }

/* sub-items */
.subnav { padding-left: 20px; }
.sub-item {
  position: relative;
  display: flex; align-items: center; gap: 8px;
  padding: 5px 8px 5px 20px;
  border-radius: var(--r-sm);
  cursor: pointer;
  user-select: none;
  color: var(--body);
  font-size: 13px;
}
.sub-item:hover { background: var(--canvas-soft); color: var(--ink); }
.sub-item.active {
  background: var(--canvas-soft2);
  color: var(--ink);
  font-weight: 500;
}
.sub-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 4px; bottom: 4px;
  width: 2px;
  background: var(--ink);
  border-radius: 2px;
}

.bullet {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: var(--hairline-strong);
  flex-shrink: 0;
}
.sub-name {
  flex: 1;
  text-align: left;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  letter-spacing: -0.28px;
}

.empty-tip {
  padding: 32px 8px;
  font-size: 12px;
  color: var(--mute);
  text-align: center;
  font-family: var(--font-mono);
}

/* ════════════════════════════
   Editor pane
════════════════════════════ */
.editor-pane {
  flex: 1;
  display: flex; flex-direction: column;
  overflow: hidden;
  background: var(--canvas-soft);
}
.editor-header {
  display: flex; align-items: center;
  padding: 12px 24px 15px;
  background: var(--canvas);
  border-bottom: 1px solid var(--hairline);
  gap: 12px;
}
.title-input {
  flex: 1; border: none; outline: none;
  font-size: 20px; font-weight: 600;
  font-family: var(--font);
  color: var(--ink);
  background: transparent;
  letter-spacing: -0.6px;
}
.title-input::placeholder { color: var(--mute); }
.save-status { font-size: 12px; color: var(--mute); white-space: nowrap; }
.save-status.unsaved { color: #f5a623; }

/* save button — button-primary-sm */
.btn-save {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: var(--r-pill);
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font);
  cursor: pointer;
  white-space: nowrap;
  transition: opacity .12s ease;
}
.btn-save:hover:not(:disabled) { opacity: .82; }
.btn-save:disabled { background: var(--hairline); color: var(--mute); cursor: default; }

.editor-wrap { flex: 1; overflow: hidden; background: var(--canvas); }

.no-note {
  flex: 1; display: flex;
  align-items: center; justify-content: center;
  color: var(--mute); font-size: 14px;
}

.settings-btn {
  width: 28px; height: 28px;
  font-size: 14px;
  color: var(--mute);
  flex-shrink: 0;
}
.settings-btn:hover { color: var(--ink); background: var(--canvas-soft2); }

.quick-add {
  width: 28px; height: 28px;
  font-size: 16px;
  color: var(--mute);
  flex-shrink: 0;
}
.quick-add:hover { color: var(--ink); background: var(--canvas-soft2); }

.icon-btn.add-sub:hover { color: var(--ink); background: var(--canvas-soft2); }

/* modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.modal {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-5);
  width: 460px; max-width: 95vw;
  display: flex; flex-direction: column;
}
.modal-header {
  display: flex; align-items: center;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--hairline);
  gap: 8px;
}
.modal-title { flex: 1; font-size: 15px; font-weight: 600; color: var(--ink); }
.modal-close {
  border: none; background: transparent; cursor: pointer;
  color: var(--mute); font-size: 14px; padding: 2px 6px;
  border-radius: var(--r-sm);
}
.modal-close:hover { background: var(--canvas-soft2); color: var(--ink); }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--hairline);
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field-disabled { opacity: .45; pointer-events: none; }
.field-label { font-size: 13px; font-weight: 500; color: var(--ink); }
.field-hint { font-size: 11px; color: var(--mute); font-family: var(--font-mono); }
.field-input {
  height: 32px; padding: 0 10px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-sm);
  font-size: 13px; font-family: var(--font);
  color: var(--ink); background: var(--canvas);
  outline: none;
}
.field-input:focus { border-color: var(--hairline-strong); }
.radio-group { display: flex; flex-direction: column; gap: 8px; }
.radio-item {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--body); cursor: pointer;
}
.radio-item input { accent-color: var(--ink); }
.settings-msg {
  font-size: 12px; color: #3a8a3a; background: #edf7ed;
  padding: 6px 10px; border-radius: var(--r-sm);
}
.settings-msg.settings-msg-err { color: #c0392b; background: #fdecea; }
.btn-cancel {
  height: 30px; padding: 0 14px;
  border: 1px solid var(--hairline); border-radius: var(--r-pill);
  background: var(--canvas); color: var(--body);
  font-size: 13px; font-family: var(--font); cursor: pointer;
}
.btn-cancel:hover { background: var(--canvas-soft2); }
.btn-primary {
  height: 30px; padding: 0 14px;
  border: none; border-radius: var(--r-pill);
  background: var(--ink); color: #fff;
  font-size: 13px; font-weight: 500; font-family: var(--font); cursor: pointer;
}
.btn-primary:hover { opacity: .82; }

@media (prefers-color-scheme: dark) {
  :root {
    --canvas:       #111111;
    --canvas-soft:  #0a0a0a;
    --canvas-soft2: #1a1a1a;
    --ink:          #ededed;
    --body:         #a1a1a1;
    --mute:         #666666;
    --hairline:     #2a2a2a;
    --hairline-strong: #444444;
  }
  .create-btn { background: #ededed; color: #111; }
  .icon-btn { background: #1a1a1a; }
  .btn-save { background: #ededed; color: #111; }
  .group.active::before,
  .sub-item.active::before { background: #ededed; }
}
</style>
