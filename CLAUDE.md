# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Tauri 2 desktop notes app. Frontend is React 19 + TypeScript + Vite; backend is Rust using
`prisma-client-rust` over SQLite. Primary target is Linux (developed on Wuying Cloud Ubuntu).
UI strings and most code comments are in Chinese.

## Commands

Run frontend-only (Vite dev server on fixed port 1420, no native shell):
```bash
npm run dev
```

Run the full desktop app (spawns Vite via `beforeDevCommand`, then the Rust shell):
```bash
npm run tauri dev
```

Build:
```bash
npm run build        # tsc typecheck + vite build → dist/ (frontend only)
npm run tauri build  # full bundle (.deb etc.); runs `npm run build` first
```

Backend tests (full Prisma+SQLite CRUD roundtrip, no GUI needed):
```bash
cd src-tauri && cargo test                  # runs crud_roundtrip in src/lib.rs
cd src-tauri && cargo test crud_roundtrip    # single test
```

Regenerate the Prisma client after editing `src-tauri/prisma/schema.prisma`:
```bash
cd src-tauri && cargo prisma generate   # alias → `cargo run -p prisma-cli -- generate`
cd src-tauri && cargo prisma migrate dev --name <desc>   # create a migration
```

## Network proxy (required for fresh Rust builds)

`prisma-client-rust` is a git dependency. `src-tauri/.cargo/config.toml` routes cargo's HTTP and
git fetches through Clash on `http://127.0.0.1:7897` and uses `git-fetch-with-cli`. Clash must be
running on port 7897 for a clean `cargo` fetch. The shell's `http(s)_proxy` env vars are inherited
by the git CLI.

## Architecture

### Backend (`src-tauri/src/lib.rs`)
- Exposes four Tauri commands: `list_kbs`, `create_kb`, `update_kb`, `delete_kb`, operating on a
  single `KnowledgeBase` model (`schema.prisma`). Each row is one knowledge base; its document tree
  (frontend `TreeNode[]`) is serialized to JSON and stored in the `tree` text column, so the whole
  app's data persists through this one table. `update_kb` takes every field as `Option` for partial
  updates.
- On startup (`setup`): computes the SQLite path under `app_data_dir()/notes.db`, sets
  `DATABASE_URL`, creates the client, and calls `_migrate_deploy()` to apply embedded migrations
  (auto-creates tables). The `Arc<PrismaClient>` is stored in Tauri `State` for commands.
- `src/prisma.rs` is **generated** (gitignored). It must exist to compile — run
  `cargo prisma generate` if it's missing.
- `main.rs` sets `WEBKIT_DISABLE_DMABUF_RENDERER` / `WEBKIT_DISABLE_COMPOSITING_MODE` on Linux to
  avoid a white-screen bug under software rendering (llvmpipe/swrast). Do not remove.
- `prisma-cli/` is a **separate workspace member** crate (binary named `prisma`). It is deliberately
  not a default build target so the Prisma code generator does not get bundled into `tauri build`
  output. Only `cargo prisma …` compiles it.

### Frontend (`src/`)
- `App.tsx` holds all top-level state and orchestrates views, the command palette, and tree CRUD.
- Domain model (`lib/types.ts`): a `KnowledgeBase` contains an **infinite-level tree** of `TreeNode`s.
  Crucially, `type` (`"doc"` | `"folder"`) only determines icon/semantics — **any** node may have
  `children` (Yuque-style nesting). Don't assume only folders can have children.
- `lib/tree.ts` is a UI-decoupled set of **pure immutable** tree functions (add/remove/update/move,
  with `before`/`after`/`inside` drop semantics and cycle prevention). Treat these as the source of
  truth for tree manipulation.
- Theme: `index.html` has an inline pre-paint script reading `localStorage["notes.theme"]` to set
  `<html data-theme>` and avoid a flash; `hooks/useTheme.ts` manages it thereafter.

### Frontend ↔ backend data flow
`src/lib/api.ts` is the Tauri data-access layer: it wraps `invoke()` and converts between the DB row
(`tree` as a JSON string) and the frontend `KnowledgeBase` (`tree` as `TreeNode[]`). `App.tsx` loads
all KBs on startup (seeding from `SEED_KBS` on first run when the DB is empty), keeps an in-memory
mirror for instant rendering, and **writes through** every mutation: KB-level edits call
`updateKb`/`createKb`/`deleteKb`; tree-node edits go through `updateActiveTree`, which recomputes the
tree with the pure functions in `lib/tree.ts` and then `saveKb`s the whole KB. If `invoke` throws
(e.g. running `npm run dev` in a plain browser with no Tauri shell), the app falls back to in-memory
`SEED_KBS` and silently ignores persistence failures.
