pub mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::list_accounts,
            commands::get_default_account,
            commands::set_default_account,
            commands::delete_account,
            commands::initiate_login_flow,
            commands::poll_login_flow,
            commands::manual_login,
            commands::select_files,
            commands::get_file_info,
            commands::upload_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
