// Prisma 生成的客户端（大量宏生成代码，屏蔽告警）
#[allow(warnings, unused)]
mod prisma;

use std::sync::Arc;

use prisma::{note, PrismaClient};
use prisma_client_rust::Direction;
use tauri::{Manager, State};

/// 共享的 Prisma 客户端句柄，存入 Tauri State 供各命令使用。
type Db = Arc<PrismaClient>;

/// 查：返回所有笔记，按更新时间倒序。
#[tauri::command]
async fn list_notes(db: State<'_, Db>) -> Result<Vec<note::Data>, String> {
    db.note()
        .find_many(vec![])
        .order_by(note::updated_at::order(Direction::Desc))
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 增：创建一条笔记，content 可为空。
#[tauri::command]
async fn create_note(
    db: State<'_, Db>,
    title: String,
    content: String,
) -> Result<note::Data, String> {
    db.note()
        .create(title, vec![note::content::set(content)])
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 改：按 id 更新标题与内容。
#[tauri::command]
async fn update_note(
    db: State<'_, Db>,
    id: String,
    title: String,
    content: String,
) -> Result<note::Data, String> {
    db.note()
        .update(
            note::id::equals(id),
            vec![note::title::set(title), note::content::set(content)],
        )
        .exec()
        .await
        .map_err(|e| e.to_string())
}

/// 删：按 id 删除。
#[tauri::command]
async fn delete_note(db: State<'_, Db>, id: String) -> Result<(), String> {
    db.note()
        .delete(note::id::equals(id))
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
            list_notes,
            create_note,
            update_note,
            delete_note
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::prisma::{self, note};
    use prisma_client_rust::Direction;

    // 无需 GUI 即可验证 Prisma + SQLite 的增删查改全链路
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
                .note()
                .create("标题A".into(), vec![note::content::set("内容A".into())])
                .exec()
                .await
                .unwrap();
            assert_eq!(created.title, "标题A");
            assert_eq!(created.content, "内容A");

            // 查
            let all = client
                .note()
                .find_many(vec![])
                .order_by(note::updated_at::order(Direction::Desc))
                .exec()
                .await
                .unwrap();
            assert_eq!(all.len(), 1);

            // 改
            let updated = client
                .note()
                .update(
                    note::id::equals(created.id.clone()),
                    vec![note::title::set("标题B".into())],
                )
                .exec()
                .await
                .unwrap();
            assert_eq!(updated.title, "标题B");

            // 删
            client
                .note()
                .delete(note::id::equals(created.id.clone()))
                .exec()
                .await
                .unwrap();
            let after = client.note().find_many(vec![]).exec().await.unwrap();
            assert_eq!(after.len(), 0);

            let _ = std::fs::remove_file(&db);
        });
    }
}
