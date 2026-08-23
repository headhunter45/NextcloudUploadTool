use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::config::AccountCredentials;
use crate::error::{NextcloudError, Result};

/// Service name identifier for OS Keychain / Keyring storage.
pub const KEYRING_SERVICE_NAME: &str = "me.majinnaibu.nut";

/// Metadata record of a configured Nextcloud account.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredAccount {
    /// Username for this account on Nextcloud.
    pub username: String,

    /// Full server URL (e.g. `"https://cloud.example.com"`).
    pub server_url: String,

    /// Whether this is the default active account.
    #[serde(default)]
    pub is_default: bool,

    /// Fallback password storage (only populated if system keyring is unavailable).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_password: Option<String>,
}

/// Manages account credentials using system keychain (macOS Keychain, Windows Credential Manager,
/// Linux Secret Service) with fallback file persistence.
#[derive(Debug, Clone, Default)]
pub struct CredentialStore;

impl CredentialStore {
    /// Get the configuration directory path for NUT.
    pub fn config_dir() -> Result<PathBuf> {
        let base = dirs::config_dir()
            .or_else(dirs::home_dir)
            .ok_or_else(|| NextcloudError::Other("Could not determine user config directory".into()))?;

        let app_dir = base.join("nut");
        if !app_dir.exists() {
            fs::create_dir_all(&app_dir).map_err(|e| {
                NextcloudError::Other(format!("Failed to create config directory: {e}"))
            })?;
        }
        Ok(app_dir)
    }

    /// Path to the `accounts.json` file.
    pub fn accounts_file_path() -> Result<PathBuf> {
        Ok(Self::config_dir()?.join("accounts.json"))
    }

    /// Load all stored account metadata.
    pub fn list_accounts() -> Result<Vec<StoredAccount>> {
        let path = Self::accounts_file_path()?;
        if !path.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&path)?;
        let accounts: Vec<StoredAccount> = serde_json::from_str(&content).unwrap_or_default();
        Ok(accounts)
    }

    /// Save the complete list of account records to disk.
    pub fn save_accounts(accounts: &[StoredAccount]) -> Result<()> {
        let path = Self::accounts_file_path()?;
        let json = serde_json::to_string_pretty(accounts)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// Retrieve full credentials (including secret app password) for a specific username.
    pub fn get_credentials(username: &str) -> Result<Option<(StoredAccount, AccountCredentials)>> {
        let accounts = Self::list_accounts()?;
        let account = match accounts.into_iter().find(|a| a.username == username) {
            Some(a) => a,
            None => return Ok(None),
        };

        // Attempt retrieval from OS Keyring first
        if let Ok(entry) = Entry::new(KEYRING_SERVICE_NAME, username) {
            if let Ok(password) = entry.get_password() {
                return Ok(Some((
                    account,
                    AccountCredentials::new(username, password),
                )));
            }
        }

        // Check fallback password if keyring didn't contain it
        if let Some(ref pass) = account.fallback_password {
            return Ok(Some((
                account.clone(),
                AccountCredentials::new(username, pass),
            )));
        }

        Ok(None)
    }

    /// Retrieve the default/active account credentials (if any account is configured).
    pub fn get_default_credentials() -> Result<Option<(StoredAccount, AccountCredentials)>> {
        let accounts = Self::list_accounts()?;
        let default_username = accounts
            .iter()
            .find(|a| a.is_default)
            .map(|a| a.username.clone())
            .or_else(|| accounts.first().map(|a| a.username.clone()));

        match default_username {
            Some(user) => Self::get_credentials(&user),
            None => Ok(None),
        }
    }

    /// Save or update an account with server URL and app password.
    pub fn save_account(
        server_url: &str,
        username: &str,
        app_password: &str,
        set_as_default: bool,
    ) -> Result<()> {
        let mut accounts = Self::list_accounts()?;

        // If setting as default, clear default on other accounts
        if set_as_default {
            for acc in &mut accounts {
                acc.is_default = false;
            }
        }

        let is_first = accounts.is_empty();
        let make_default = set_as_default || is_first;

        // Try storing password in OS Keyring
        let mut fallback_password = None;
        let keyring_result = Entry::new(KEYRING_SERVICE_NAME, username)
            .and_then(|entry| entry.set_password(app_password));

        if keyring_result.is_err() {
            // Keyring unavailable (e.g. headless environment), store in fallback
            fallback_password = Some(app_password.to_string());
        }

        // Update existing or append new account record
        if let Some(existing) = accounts.iter_mut().find(|a| a.username == username) {
            existing.server_url = server_url.to_string();
            existing.fallback_password = fallback_password;
            if set_as_default {
                existing.is_default = true;
            }
        } else {
            accounts.push(StoredAccount {
                username: username.to_string(),
                server_url: server_url.to_string(),
                is_default: make_default,
                fallback_password,
            });
        }

        Self::save_accounts(&accounts)
    }

    /// Delete an account from both OS Keyring and local account registry.
    pub fn delete_account(username: &str) -> Result<()> {
        // Delete from OS Keyring
        if let Ok(entry) = Entry::new(KEYRING_SERVICE_NAME, username) {
            let _ = entry.delete_credential();
        }

        let mut accounts = Self::list_accounts()?;
        accounts.retain(|a| a.username != username);

        // Ensure at least one account is marked default if accounts remain
        if !accounts.is_empty() && !accounts.iter().any(|a| a.is_default) {
            accounts[0].is_default = true;
        }

        Self::save_accounts(&accounts)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stored_account_serialization() {
        let account = StoredAccount {
            username: "tom".to_string(),
            server_url: "https://cloud.example.com".to_string(),
            is_default: true,
            fallback_password: None,
        };

        let json = serde_json::to_string(&account).unwrap();
        assert!(json.contains("\"username\":\"tom\""));
        assert!(json.contains("\"is_default\":true"));
        // fallback_password shouldn't serialize when None
        assert!(!json.contains("fallback_password"));

        let deserialized: StoredAccount = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, account);
    }
}
