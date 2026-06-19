# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
# Start demo dev server
npm run dev

# Build the npm library (outputs to lib/)
npm run build:lib

# Build the demo app
npm run build:demo

# Preview the demo build
npm run demo:preview
```

No test suite exists in this project.

## Architecture

This is a Vue 3 component library (`yuque-rich-text`) that wraps the proprietary Yuque/Lake rich text editor (from `@alipay/lakex-doc`) as a reusable component.

**The core trick:** The Lake editor is a closed-source UMD bundle loaded from Alipay's CDN. It depends on React/ReactDOM at runtime. To isolate these globals from the host page, the component renders an `<iframe>` whose `srcdoc` is the full HTML page defined in `template.ts` — that page loads all CDN scripts and mounts the editor to `#root`.

**Data flow:**
1. `lake-rich.ts` renders an `<iframe srcdoc={templateHtml}>` via Vue's render function (no `<template>` block).
2. On iframe `load`, it calls `loadLakeEditor` (`load.ts`) which polls `contentWindow.Doc` every 100ms until the CDN bundle sets it (10s timeout).
3. Once ready, `InjectEditorPlugin` (`editor-plugin.ts`) registers custom kernel/editor plugins into the Lake factory before instantiation — this is where the toolbar config, `insertHTML` command, and custom HTML node readers live.
4. The editor instance is stored in `editor` ref and exposed via `IEditorRef` methods (`appendContent`, `setContent`, `getContent`, etc.).
5. `onLoad` fires via a `watch` on `[props.value, editor]` — meaning it fires whenever the editor becomes ready and the initial value is set via `editor.setDocument("lake", props.value)`.

**Important constraint:** Do not modify `props.value` inside the `onChange` handler — the handler fires on `contentchange` which calls `emit("onChange", ...)`, and setting `value` back would re-trigger `setDocument` causing infinite recursion.

**Build modes:** `vite.config.ts` checks `VITE_BUILD_TARGET === 'demo'` to switch between library mode (outputs `lib/yuque-rich-text.{js,cjs}` + type declarations via `vite-plugin-dts`) and demo app mode. The library externalizes `vue` only — React and the Lake bundle are loaded by the consumer via CDN scripts in their HTML (see README for required `<script>` tags).

**Public API surface** (`src/index.ts`): exports `YuqueRichText` component and types `IEditorRef`, `EditorEmits`, `EditorProps`.
