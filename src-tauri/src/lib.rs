// Prisma 生成的客户端（大量宏生成代码，屏蔽告警）
#[allow(warnings, unused)]
mod prisma;

use std::sync::Arc;

use prisma::{knowledge_base, PrismaClient};
use prisma_client_rust::Direction;
use tauri::{Manager, State};

/// 共享的 Prisma 客户端句柄，存入 Tauri State 供各命令使用。
type Db = Arc<PrismaClient>;

/// 查：返回所有知识库，按 sort 升序（侧边栏顺序）。
#[tauri::command]
async fn list_kbs(db: State<'_, Db>) -> Result<Vec<knowledge_base::Data>, String> {
    db.knowledge_base()
        .find_many(vec![])
        .order_by(knowledge_base::sort::order(Direction::Asc))
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 增：创建一个知识库。name 必填，其余给出常用初值。
/// tree/fav/locked 为可选——播种演示数据时一次性带上整棵树，避免「先建后改」的两步写入不可靠。
#[tauri::command]
async fn create_kb(
    db: State<'_, Db>,
    emoji: String,
    name: String,
    intro: String,
    scope: String,
    sort: i32,
    tree: Option<String>,
    fav: Option<bool>,
    locked: Option<bool>,
) -> Result<knowledge_base::Data, String> {
    let mut extra = vec![
        knowledge_base::emoji::set(emoji),
        knowledge_base::intro::set(intro),
        knowledge_base::scope::set(scope),
        knowledge_base::sort::set(sort),
    ];
    if let Some(v) = tree {
        extra.push(knowledge_base::tree::set(v));
    }
    if let Some(v) = fav {
        extra.push(knowledge_base::fav::set(v));
    }
    if let Some(v) = locked {
        extra.push(knowledge_base::locked::set(v));
    }

    db.knowledge_base()
        .create(name, extra)
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 改：按 id 部分更新。仅对 Some(..) 的字段下发 set，未提供的保持不变。
/// tree 为前端序列化后的 JSON 字符串。
#[tauri::command]
#[allow(clippy::too_many_arguments)]
async fn update_kb(
    db: State<'_, Db>,
    id: String,
    name: Option<String>,
    emoji: Option<String>,
    intro: Option<String>,
    locked: Option<bool>,
    fav: Option<bool>,
    scope: Option<String>,
    tree: Option<String>,
    sort: Option<i32>,
) -> Result<knowledge_base::Data, String> {
    let mut changes = vec![];
    if let Some(v) = name {
        changes.push(knowledge_base::name::set(v));
    }
    if let Some(v) = emoji {
        changes.push(knowledge_base::emoji::set(v));
    }
    if let Some(v) = intro {
        changes.push(knowledge_base::intro::set(v));
    }
    if let Some(v) = locked {
        changes.push(knowledge_base::locked::set(v));
    }
    if let Some(v) = fav {
        changes.push(knowledge_base::fav::set(v));
    }
    if let Some(v) = scope {
        changes.push(knowledge_base::scope::set(v));
    }
    if let Some(v) = tree {
        changes.push(knowledge_base::tree::set(v));
    }
    if let Some(v) = sort {
        changes.push(knowledge_base::sort::set(v));
    }

    db.knowledge_base()
        .update(knowledge_base::id::equals(id), changes)
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 删：按 id 删除知识库。
#[tauri::command]
async fn delete_kb(db: State<'_, Db>, id: String) -> Result<(), String> {
    db.knowledge_base()
        .delete(knowledge_base::id::equals(id))
        .exec()
        .await
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // SQLite 文件落在应用数据目录，保证可写且持久化
            let data_dir = app.path().app_data_dir().expect("无法获取应用数据目录");
            std::fs::create_dir_all(&data_dir).ok();
            let db_path = data_dir.join("notes.db");
            let url = format!("file:{}", db_path.to_string_lossy());

            // schema.prisma 使用 env("DATABASE_URL")，迁移引擎需要它
            std::env::set_var("DATABASE_URL", &url);

            // 初始化客户端并应用已嵌入的迁移（自动建表）
            let client = tauri::async_runtime::block_on(async {
                let client = prisma::new_client_with_url(&url)
                    .await
                    .expect("创建 Prisma 客户端失败");
                client._migrate_deploy().await.expect("应用数据库迁移失败");
                client
            });

            app.manage(Arc::new(client) as Db);
            println!("[notes-app] SQLite: {}", db_path.display());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_kbs,
            create_kb,
            update_kb,
            delete_kb
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::prisma::{self, knowledge_base};
    use prisma_client_rust::Direction;

    // 无需 GUI 即可验证 Prisma + SQLite 的知识库增删查改全链路
    #[test]
    fn crud_roundtrip() {
        tauri::async_runtime::block_on(async {
            let dir = std::env::temp_dir().join("notes_app_test");
            std::fs::create_dir_all(&dir).unwrap();
            let db = dir.join("test.db");
            let _ = std::fs::remove_file(&db);
            let url = format!("file:{}", db.to_string_lossy());
            std::env::set_var("DATABASE_URL", &url);

            let client = prisma::new_client_with_url(&url).await.unwrap();
            client._migrate_deploy().await.unwrap();

            // 增
            let created = client
                .knowledge_base()
                .create(
                    "知识库A".into(),
                    vec![
                        knowledge_base::emoji::set("📗".into()),
                        knowledge_base::intro::set("简介A".into()),
                        knowledge_base::scope::set("mine".into()),
                    ],
                )
                .exec()
                .await
                .unwrap();
            assert_eq!(created.name, "知识库A");
            assert_eq!(created.emoji, "📗");
            assert_eq!(created.tree, "[]");

            // 查
            let all = client
                .knowledge_base()
                .find_many(vec![])
                .order_by(knowledge_base::sort::order(Direction::Asc))
                .exec()
                .await
                .unwrap();
            assert_eq!(all.len(), 1);

            // 改（含 tree JSON 与收藏标记）
            let updated = client
                .knowledge_base()
                .update(
                    knowledge_base::id::equals(created.id.clone()),
                    vec![
                        knowledge_base::name::set("知识库B".into()),
                        knowledge_base::fav::set(true),
                        knowledge_base::tree::set("[{\"id\":\"n1\"}]".into()),
                    ],
                )
                .exec()
                .await
                .unwrap();
            assert_eq!(updated.name, "知识库B");
            assert!(updated.fav);
            assert_eq!(updated.tree, "[{\"id\":\"n1\"}]");

            // 删
            client
                .knowledge_base()
                .delete(knowledge_base::id::equals(created.id.clone()))
                .exec()
                .await
                .unwrap();
            let after = client.knowledge_base().find_many(vec![]).exec().await.unwrap();
            assert_eq!(after.len(), 0);

            let _ = std::fs::remove_file(&db);
        });
    }
}
