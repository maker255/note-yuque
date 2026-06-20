<template>
  <div class="notebook">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="topbar">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 18l-6-6 6-6"/></svg>
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 5h10l6 6v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"/></svg>
        <div class="topbar-title">笔记本</div>
        <div class="create-wrap">
          <div class="create-btn" title="新建">＋ 新建</div>
          <div class="create-menu" role="menu">
            <div class="cm-item" @click="createNote">
              <span class="cm-ico">📄</span>
              <span class="cm-text">新建笔记</span>
              <span class="cm-kbd">⌘ N</span>
            </div>
          </div>
        </div>
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
import { ref, computed, reactive, onMounted } from 'vue'
import { YuqueRichText } from 'yuque-rich-text'
import type { IEditorRef } from 'yuque-rich-text'

const API = 'http://localhost:3001/api/notes'

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
let pendingContent: string | null = null

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

async function createNote() {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '无标题笔记', content: '' }),
  })
  const { id } = await res.json()
  await loadNotes()
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
})
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
  padding: 12px 24px 10px;
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
