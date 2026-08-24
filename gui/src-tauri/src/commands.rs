use serde::{Deserialize, Serialize};
use std::path::PathBuf;

use nextcloud_client::{
    initiate_login_flow as api_initiate_login_flow,
    poll_login_flow as api_poll_login_flow,
    ClientConfig, CredentialStore, NextcloudClient, StoredAccount, UploadOptions,
};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LoginFlowInitPayload {
    pub login_url: String,
    pub poll_endpoint: String,
    pub poll_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct GuiUploadResult {
    pub file_path: String,
    pub file_name: String,
    pub remote_path: String,
    pub bytes_uploaded: u64,
    pub share_url: Option<String>,
    pub direct_download_url: Option<String>,
}

#[tauri::command]
pub fn list_accounts() -> Result<Vec<StoredAccount>, String> {
    CredentialStore::list_accounts().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_default_account() -> Result<Option<StoredAccount>, String> {
    let accounts = CredentialStore::list_accounts().map_err(|e| e.to_string())?;
    Ok(accounts.into_iter().find(|a| a.is_default))
}

#[tauri::command]
pub fn set_default_account(account_id: String) -> Result<(), String> {
    CredentialStore::set_default_account(&account_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_account(account_id: String) -> Result<(), String> {
    CredentialStore::delete_account(&account_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn initiate_login_flow(server_url: String) -> Result<LoginFlowInitPayload, String> {
    let normalized = ClientConfig::normalize_url(&server_url).map_err(|e| e.to_string())?;
    let http = reqwest::Client::new();
    let flow = api_initiate_login_flow(&http, &normalized)
        .await
        .map_err(|e| e.to_string())?;

    // Attempt to launch desktop browser automatically
    let _ = open::that(&flow.login);

    Ok(LoginFlowInitPayload {
        login_url: flow.login,
        poll_endpoint: flow.poll.endpoint,
        poll_token: flow.poll.token,
    })
}

#[tauri::command]
pub async fn poll_login_flow(
    endpoint: String,
    token: String,
    is_default: bool,
    label: Option<String>,
) -> Result<Option<StoredAccount>, String> {
    let http = reqwest::Client::new();
    let poll_res = api_poll_login_flow(&http, &endpoint, &token)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(creds) = poll_res {
        let mut account = CredentialStore::save_account(
            &creds.server,
            &creds.login_name,
            &creds.app_password,
            is_default,
        )
        .map_err(|e| e.to_string())?;

        if let Some(lbl) = label {
            account.label = Some(lbl);
            let mut accounts = CredentialStore::list_accounts().map_err(|e| e.to_string())?;
            if let Some(a) = accounts.iter_mut().find(|a| a.id == account.id) {
                a.label = account.label.clone();
            }
            CredentialStore::save_accounts(&accounts).map_err(|e| e.to_string())?;
        }

        Ok(Some(account))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn manual_login(
    server_url: String,
    username: String,
    app_password: String,
    is_default: bool,
    label: Option<String>,
) -> Result<StoredAccount, String> {
    let normalized = ClientConfig::normalize_url(&server_url).map_err(|e| e.to_string())?;
    let config = ClientConfig::with_credentials(normalized.as_str(), &username, &app_password)
        .map_err(|e| e.to_string())?;
    let client = NextcloudClient::new(config).map_err(|e| e.to_string())?;

    // Verify connectivity and credentials
    client.test_connection().await.map_err(|e| e.to_string())?;

    let mut account = CredentialStore::save_account(
        normalized.as_str(),
        &username,
        &app_password,
        is_default,
    )
    .map_err(|e| e.to_string())?;

    if let Some(lbl) = label {
        account.label = Some(lbl);
        let mut accounts = CredentialStore::list_accounts().map_err(|e| e.to_string())?;
        if let Some(a) = accounts.iter_mut().find(|a| a.id == account.id) {
            a.label = account.label.clone();
        }
        CredentialStore::save_accounts(&accounts).map_err(|e| e.to_string())?;
    }

    Ok(account)
}

#[tauri::command]
pub async fn select_files() -> Result<Vec<String>, String> {
    let files = rfd::AsyncFileDialog::new()
        .set_title("Select Files to Upload to Nextcloud")
        .pick_files()
        .await;

    match files {
        Some(handles) => {
            let paths = handles
                .into_iter()
                .map(|h| h.path().to_string_lossy().to_string())
                .collect();
            Ok(paths)
        }
        None => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn upload_file(
    file_path: String,
    remote_dir: String,
    create_share: bool,
    share_password: Option<String>,
    account_id: Option<String>,
) -> Result<GuiUploadResult, String> {
    let client = match account_id {
        Some(id) if !id.is_empty() => {
            CredentialStore::create_client_for_account(&id).map_err(|e| e.to_string())?
        }
        _ => CredentialStore::create_client_for_default().map_err(|e| e.to_string())?,
    };

    let local_path = PathBuf::from(&file_path);
    if !local_path.exists() {
        return Err(format!("File '{}' does not exist", file_path));
    }

    let file_name = local_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file")
        .to_string();

    let clean_dir = remote_dir.trim_matches('/');
    let remote_path = if clean_dir.is_empty() {
        file_name.clone()
    } else {
        format!("{clean_dir}/{file_name}")
    };

    let options = UploadOptions {
        remote_path: remote_path.clone(),
        create_share,
        share_password,
        overwrite: true,
    };

    let res = client
        .upload_and_share(&local_path, &options, None)
        .await
        .map_err(|e| e.to_string())?;

    Ok(GuiUploadResult {
        file_path,
        file_name,
        remote_path,
        bytes_uploaded: res.bytes_uploaded,
        share_url: res.share_url,
        direct_download_url: res.direct_download_url,
    })
}

#[cfg(test)]
mod tests {
    use super::{GuiUploadResult, LoginFlowInitPayload};

    #[test]
    fn test_login_flow_payload_serialization() {
        let payload = LoginFlowInitPayload {
            login_url: "https://cloud.example.com/index.php/login/v2/flow/123".to_string(),
            poll_endpoint: "https://cloud.example.com/index.php/login/v2/poll".to_string(),
            poll_token: "abc-token".to_string(),
        };

        let json = serde_json::to_string(&payload).unwrap();
        let deserialized: LoginFlowInitPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(payload, deserialized);
    }

    #[test]
    fn test_gui_upload_result_serialization() {
        let res = GuiUploadResult {
            file_path: "/tmp/test.pdf".to_string(),
            file_name: "test.pdf".to_string(),
            remote_path: "Uploads/test.pdf".to_string(),
            bytes_uploaded: 1024,
            share_url: Some("https://cloud.example.com/s/ABC".to_string()),
            direct_download_url: Some("https://cloud.example.com/index.php/s/ABC/download".to_string()),
        };

        let json = serde_json::to_string(&res).unwrap();
        let deserialized: GuiUploadResult = serde_json::from_str(&json).unwrap();
        assert_eq!(res, deserialized);
    }
}
