use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use url::Url;

use crate::client::NextcloudClient;
use crate::config::{AccountCredentials, ClientConfig};
use crate::error::{NextcloudError, Result};

/// Service name identifier for OS Keychain / Keyring storage.
pub const KEYRING_SERVICE_NAME: &str = "me.majinnaibu.nut";

/// Metadata record of a configured Nextcloud account.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredAccount {
    /// Unique identifier for this account (e.g. `"tom@cloud.example.com"`).
    pub id: String,

    /// Optional user-friendly label/alias (e.g. `"Personal"`, `"Work"`).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,

    /// Username for this account on Nextcloud.
    pub username: String,

    /// Full server URL (e.g. `"https://cloud.example.com"`).
    pub server_url: String,

    /// Whether this is the default active account.
    #[serde(default)]
    pub is_default: bool,

    /// Fallback password storage (populated if system keyring is unavailable).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_password: Option<String>,
}

impl StoredAccount {
    /// Create a new `StoredAccount` with a generated canonical ID (`username@host`).
    pub fn new(username: impl Into<String>, server_url: impl Into<String>) -> Self {
        let username = username.into();
        let server_url = server_url.into();

        let host = Url::parse(&server_url)
            .ok()
            .and_then(|u| u.host_str().map(|h| h.to_string()))
            .unwrap_or_else(|| "unknown-host".to_string());

        let id = format!("{username}@{host}");

        Self {
            id,
            label: None,
            username,
            server_url,
            is_default: false,
            fallback_password: None,
        }
    }

    /// Set a friendly label for the account.
    pub fn with_label(mut self, label: impl Into<String>) -> Self {
        self.label = Some(label.into());
        self
    }

    /// Keyring account key identifier for secure storage.
    pub fn keyring_key(&self) -> &str {
        &self.id
    }
}

/// Manages multiple Nextcloud account credentials using system keychain (macOS Keychain,
/// Windows Credential Manager, Linux Secret Service) with fallback file persistence.
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

    /// Find an account by ID, label, or username.
    pub fn find_account(query: &str) -> Result<Option<StoredAccount>> {
        let accounts = Self::list_accounts()?;
        let found = accounts.into_iter().find(|a| {
            a.id == query
                || a.label.as_deref() == Some(query)
                || a.username == query
        });
        Ok(found)
    }

    /// Retrieve full credentials (including secret app password) for an account matching `query`.
    pub fn get_credentials(query: &str) -> Result<Option<(StoredAccount, AccountCredentials)>> {
        let account = match Self::find_account(query)? {
            Some(a) => a,
            None => return Ok(None),
        };

        let keyring_key = account.keyring_key();

        // 1. Attempt retrieval from OS Keyring (using full id username@host)
        if let Ok(entry) = Entry::new(KEYRING_SERVICE_NAME, keyring_key) {
            if let Ok(password) = entry.get_password() {
                let username = account.username.clone();
                return Ok(Some((account, AccountCredentials::new(username, password))));
            }
        }

        // Also try retrieval by username alone (if previously stored with just username)
        if let Ok(entry) = Entry::new(KEYRING_SERVICE_NAME, &account.username) {
            if let Ok(password) = entry.get_password() {
                let username = account.username.clone();
                return Ok(Some((account, AccountCredentials::new(username, password))));
            }
        }

        // 2. Check fallback password in account record
        if let Some(ref pass) = account.fallback_password {
            let username = account.username.clone();
            return Ok(Some((
                account.clone(),
                AccountCredentials::new(username, pass.clone()),
            )));
        }

        Ok(None)
    }

    /// Retrieve the default/active account credentials.
    pub fn get_default_credentials() -> Result<Option<(StoredAccount, AccountCredentials)>> {
        let accounts = Self::list_accounts()?;
        if accounts.is_empty() {
            return Ok(None);
        }

        let default_account = accounts
            .iter()
            .find(|a| a.is_default)
            .or_else(|| accounts.first());

        match default_account {
            Some(acc) => match Self::get_credentials(&acc.id)? {
                Some(res) => Ok(Some(res)),
                None => Err(NextcloudError::AuthenticationFailed {
                    username: acc.username.clone(),
                    message: format!(
                        "Account '{}' is registered, but its password was not found in Keychain. Please re-authenticate by running 'nut login {}'.",
                        acc.id, acc.server_url
                    ),
                }),
            },
            None => Ok(None),
        }
    }

    /// Set an account as the default active account.
    pub fn set_default_account(query: &str) -> Result<()> {
        let mut accounts = Self::list_accounts()?;
        let mut target_index = None;

        for (i, acc) in accounts.iter_mut().enumerate() {
            if acc.id == query || acc.label.as_deref() == Some(query) || acc.username == query {
                acc.is_default = true;
                target_index = Some(i);
            } else {
                acc.is_default = false;
            }
        }

        if target_index.is_some() {
            Self::save_accounts(&accounts)?;
            Ok(())
        } else {
            Err(NextcloudError::Other(format!(
                "Account '{query}' not found"
            )))
        }
    }

    /// Save or update an account with server URL and app password.
    pub fn save_account(
        server_url: &str,
        username: &str,
        app_password: &str,
        set_as_default: bool,
    ) -> Result<StoredAccount> {
        let mut accounts = Self::list_accounts()?;
        let mut new_account = StoredAccount::new(username, server_url);

        // If setting as default, clear default on existing accounts
        if set_as_default {
            for acc in &mut accounts {
                acc.is_default = false;
            }
        }

        let is_first = accounts.is_empty();
        let make_default = set_as_default || is_first;
        new_account.is_default = make_default;

        // Try storing password in OS Keyring
        let mut fallback_password = None;
        let entry_res = Entry::new(KEYRING_SERVICE_NAME, new_account.keyring_key());
        let keyring_saved = match entry_res {
            Ok(ref entry) => entry.set_password(app_password).is_ok(),
            Err(_) => false,
        };

        if !keyring_saved {
            // Save in fallback password field on failure
            fallback_password = Some(app_password.to_string());
        }
        new_account.fallback_password = fallback_password;

        // Update existing or append new
        if let Some(existing) = accounts.iter_mut().find(|a| a.id == new_account.id) {
            existing.server_url = server_url.to_string();
            existing.fallback_password = new_account.fallback_password.clone();
            if set_as_default {
                existing.is_default = true;
            }
            new_account = existing.clone();
        } else {
            accounts.push(new_account.clone());
        }

        Self::save_accounts(&accounts)?;
        Ok(new_account)
    }

    /// Delete an account from both OS Keyring and local account registry.
    pub fn delete_account(query: &str) -> Result<()> {
        let mut accounts = Self::list_accounts()?;
        let target = accounts.iter().find(|a| {
            a.id == query || a.label.as_deref() == Some(query) || a.username == query
        }).cloned();

        if let Some(acc) = target {
            // Delete from OS Keyring
            if let Ok(entry) = Entry::new(KEYRING_SERVICE_NAME, acc.keyring_key()) {
                let _ = entry.delete_credential();
            }

            accounts.retain(|a| a.id != acc.id);

            // Ensure at least one account is marked default if accounts remain
            if !accounts.is_empty() && !accounts.iter().any(|a| a.is_default) {
                accounts[0].is_default = true;
            }

            Self::save_accounts(&accounts)?;
            Ok(())
        } else {
            Err(NextcloudError::Other(format!(
                "Account '{query}' not found"
            )))
        }
    }

    /// Create an initialized `NextcloudClient` for an account matching `query`.
    pub fn create_client_for_account(query: &str) -> Result<NextcloudClient> {
        let (account, creds) = Self::get_credentials(query)?.ok_or_else(|| {
            NextcloudError::Other(format!("No credentials found for account '{query}'. Run 'nut login' to authenticate."))
        })?;

        let config = ClientConfig::new(&account.server_url, Some(creds))?;
        NextcloudClient::new(config)
    }

    /// Create an initialized `NextcloudClient` for the default account.
    pub fn create_client_for_default() -> Result<NextcloudClient> {
        let (account, creds) = Self::get_default_credentials()?.ok_or_else(|| {
            NextcloudError::Other("No accounts configured. Please run 'nut login <server_url>' to connect your Nextcloud instance.".into())
        })?;

        let config = ClientConfig::new(&account.server_url, Some(creds))?;
        NextcloudClient::new(config)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stored_account_generation() {
        let account = StoredAccount::new("tom", "https://cloud.example.com")
            .with_label("Personal Cloud");

        assert_eq!(account.id, "tom@cloud.example.com");
        assert_eq!(account.label.as_deref(), Some("Personal Cloud"));
        assert_eq!(account.username, "tom");
        assert_eq!(account.server_url, "https://cloud.example.com");
        assert_eq!(account.keyring_key(), "tom@cloud.example.com");
    }

    #[test]
    fn test_stored_account_serialization() {
        let account = StoredAccount::new("tom", "https://cloud.example.com")
            .with_label("Personal");

        let json = serde_json::to_string(&account).unwrap();
        assert!(json.contains("\"id\":\"tom@cloud.example.com\""));
        assert!(json.contains("\"label\":\"Personal\""));

        let deserialized: StoredAccount = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, account);
    }
}
