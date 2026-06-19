<template>
  <div class="notebook">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">笔记本</span>
        <button class="btn-new" @click="createNote" title="新建笔记">＋</button>
      </div>
      <div class="note-list">
        <div
          v-for="note in notes"
          :key="note.id"
          class="note-item"
          :class="{ active: currentNote?.id === note.id }"
          @click="selectNote(note)"
        >
          <div class="note-item-title">{{ note.title || '无标题笔记' }}</div>
          <div class="note-item-date">{{ formatDate(note.updated_at) }}</div>
          <button
            class="btn-delete"
            @click.stop="deleteNote(note.id)"
            title="删除"
          >✕</button>
        </div>
        <div v-if="notes.length === 0" class="empty-tip">暂无笔记，点击 ＋ 新建</div>
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
import { ref, onMounted } from 'vue'
import { YuqueRichText } from 'yuque-rich-text'
import type { IEditorRef } from 'yuque-rich-text'

const API = 'http://localhost:3001/api/notes'

interface Note {
  id: number
  title: string
  content: string
  updated_at: string
}

const notes = ref<Note[]>([])
const currentNote = ref<Note | null>(null)
const editorRef = ref<IEditorRef>()
const saveStatus = ref('')
const isDirty = ref(false)
// Latest lake content from onChange — never fed back into :value to avoid re-render
let pendingContent: string | null = null

async function loadNotes() {
  const res = await fetch(API)
  notes.value = await res.json()
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

  // 记住当前笔记 ID，刷新后自动恢复
  localStorage.setItem('lastNoteId', String(id))
  setTimeout(() => window.location.reload(), 2000)
}

function formatDate(dt: string) {
  if (!dt) return ''
  return new Date(dt).toLocaleString('zh-CN', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

onMounted(async () => {
  await loadNotes()
  const lastId = localStorage.getItem('lastNoteId')
  if (lastId) {
    const note = notes.value.find(n => n.id === Number(lastId))
    if (note) selectNote(note)
    localStorage.removeItem('lastNoteId')
  }
})
</script>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { height: 100vh; overflow: hidden; font-family: -apple-system, sans-serif; }
#app { height: 100vh; }

.notebook {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

/* Sidebar */
.sidebar {
  width: 240px;
  min-width: 200px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 14px 12px;
  border-bottom: 1px solid #e8e8e8;
}
.sidebar-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.btn-new {
  width: 28px; height: 28px;
  border: none; border-radius: 6px;
  background: #1677ff; color: #fff;
  font-size: 18px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.btn-new:hover { background: #0958d9; }

.note-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}
.note-item {
  position: relative;
  padding: 10px 36px 10px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}
.note-item:hover { background: #f5f5f5; }
.note-item.active { background: #e6f4ff; }
.note-item-title {
  font-size: 14px;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.note-item-date {
  font-size: 11px;
  color: #999;
  margin-top: 3px;
}
.btn-delete {
  position: absolute;
  right: 8px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  color: #bbb; font-size: 12px;
  cursor: pointer; padding: 2px 4px;
  border-radius: 4px;
  display: none;
}
.note-item:hover .btn-delete { display: block; }
.btn-delete:hover { color: #f5222d; background: #fff1f0; }
.empty-tip {
  padding: 24px 14px;
  color: #aaa;
  font-size: 13px;
  text-align: center;
}

/* Editor pane */
.editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-header {
  display: flex;
  align-items: center;
  padding: 12px 24px 8px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  gap: 12px;
}
.title-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  background: transparent;
}
.save-status {
  font-size: 12px;
  color: #aaa;
  white-space: nowrap;
}
.save-status.unsaved { color: #fa8c16; }
.btn-save {
  padding: 4px 14px;
  border: 1px solid #1677ff;
  border-radius: 5px;
  background: #1677ff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.btn-save:hover { background: #0958d9; border-color: #0958d9; }
.btn-save:disabled { background: #d9d9d9; border-color: #d9d9d9; cursor: default; }
.editor-wrap {
  flex: 1;
  overflow: hidden;
  background: #fff;
}
.no-note {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #bbb;
  font-size: 15px;
}
</style>
