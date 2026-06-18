// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 虚拟显卡/纯软件渲染（llvmpipe/swrast）下，WebKitGTK 2.42+ 的 DMABUF
    // 渲染器及加速合成路径会导致白屏，必须在 GTK/WebKit 初始化前关闭。
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        // 无硬件 GL（仅 swrast）时关闭加速合成，避免残留白屏
        if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
    }

    notes_app_lib::run()
}
