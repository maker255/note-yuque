-- 复用原 Note 表逻辑为「知识库」：删除旧表，建立 KnowledgeBase。
-- 对已有 dev.db（含 Note）与全新数据库均可由 _migrate_deploy() 顺序应用。

-- DropTable
DROP TABLE IF EXISTS "Note";

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emoji" TEXT NOT NULL DEFAULT '📘',
    "name" TEXT NOT NULL,
    "intro" TEXT NOT NULL DEFAULT '',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "fav" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT NOT NULL DEFAULT 'mine',
    "tree" TEXT NOT NULL DEFAULT '[]',
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
