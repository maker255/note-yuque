  - 前端：node_modules/、dist/、.vite/ 等
  - Tauri/Rust：src-tauri/target/、src-tauri/gen/schemas/（与 src-tauri 内已有的 .gitignore 一致，从根目录再覆盖一遍）
  - Prisma：忽略生成的 client src-tauri/src/prisma.rs（由 schema.prisma 的 output 生成）以及本地 dev.db / *.db 数据库文件
  - 环境变量:忽略 .env* 但保留 .env.example
  - 编辑器/系统杂项文件

  注意两点：

  1. .vscode/ 我没有忽略——Tauri 脚手架通常会提交它（含推荐扩展配置）。需要忽略的话告诉我。
  2. dev.db / dev.db-journal 当前已存在于 src-tauri/prisma/。如果之前已被 git 跟踪，加进 .gitignore 不会自动移除,需要执行 git rm --cached src-tauri/prisma/dev.db 
  src-tauri/prisma/dev.db-journal。同理 src-tauri/src/prisma.rs 若已被跟踪也需 git rm --cached。


