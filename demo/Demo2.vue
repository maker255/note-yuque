<template>
  <div class="demo2">
    <div class="tools">
      <button @click="openFile">打开本地 .md 文件</button>
      <button @click="saveFile" :disabled="!fileHandle">保存文件</button>
      <button @click="$emit('back')">返回首页</button>
      <span v-if="fileName" class="status">当前编辑: {{ fileName }}</span>
    </div>
    
    <div class="editor-container">
      <YuqueRichText 
        ref="editRef" 
        :value="initialValue" 
        @onChange="handleChange"
        @onLoad="handleLoad"
      />
    </div>

    <div class="preview-panel">
      <h3>实时 Markdown 预览 (由 HTML 转换):</h3>
      <pre class="md-preview"><code>{{ markdownOutput }}</code></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { YuqueRichText } from "yuque-rich-text";
import type { IEditorRef } from "yuque-rich-text";

const emit = defineEmits(['back']);

const editRef = ref<IEditorRef>();
const initialValue = ref("");
const markdownOutput = ref("");
const fileHandle = ref<any>(null);
const fileName = ref("");

// 动态加载转换库
let marked: any;
let TurndownService: any;

onMounted(async () => {
  try {
    const markedModule = await import("https://esm.sh/marked");
    marked = markedModule.marked;
    const turndownModule = await import("https://esm.sh/turndown");
    TurndownService = turndownModule.default;
  } catch (err) {
    console.error("加载转换库失败:", err);
  }
});

const openFile = async () => {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'Markdown Files',
          accept: { 'text/markdown': ['.md'] },
        },
      ],
    });
    fileHandle.value = handle;
    fileName.value = handle.name;
    
    const file = await handle.getFile();
    const text = await file.text();
    
    // MD -> HTML
    const html = marked ? await marked.parse(text) : text;
    
    // 设置编辑器内容
    if (editRef.value) {
      editRef.value.setContent(html, "text/html");
    } else {
      initialValue.value = html;
    }
    
    markdownOutput.value = text;
  } catch (err) {
    if ((err as any).name !== 'AbortError') {
      console.error("打开文件失败:", err);
      alert("无法打开文件，请确认浏览器支持 File System Access API 并拥有权限");
    }
  }
};

const saveFile = async () => {
  if (!fileHandle.value || !editRef.value) return;
  
  try {
    const html = editRef.value.getContent("text/html");
    const turndownService = new TurndownService();
    const md = turndownService.turndown(html);
    
    const writable = await fileHandle.value.createWritable();
    await writable.write(md);
    await writable.close();
    
    alert("保存成功！");
  } catch (err) {
    console.error("保存失败:", err);
    alert("保存失败，请检查权限");
  }
};

const handleChange = (val: string) => {
  // 当编辑器内容改变时，更新预览
  if (editRef.value && TurndownService) {
    try {
      const html = editRef.value.getContent("text/html");
      const turndownService = new TurndownService();
      markdownOutput.value = turndownService.turndown(html);
    } catch (e) {
      console.error("转换失败:", e);
    }
  }
};

const handleLoad = () => {
  console.log("编辑器加载完成");
};
</script>

<style scoped>
.demo2 {
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.tools {
  margin-bottom: 15px;
  display: flex;
  gap: 12px;
  align-items: center;
}
.status {
  font-size: 14px;
  color: #666;
  margin-left: 10px;
}
.editor-container {
  flex: 1;
  min-height: 400px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  overflow: hidden;
}
.preview-panel {
  margin-top: 20px;
  height: 200px;
  overflow-y: auto;
  background: #f5f5f5;
  padding: 10px;
  border: 1px solid #eee;
  border-radius: 4px;
}
.md-preview {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 13px;
  color: #333;
}
button {
  padding: 8px 16px;
  cursor: pointer;
  background-color: #00b96b;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  transition: all 0.2s;
}
button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
button:hover:not(:disabled) {
  background-color: #009456;
}
h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #333;
}
</style>
