use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::sleep;
use url::Url;

use crate::error::{NextcloudError, Result};

/// Response received when initiating Nextcloud Login Flow v2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginFlowInitResponse {
    /// Information needed to poll for the completed authorization.
    pub poll: LoginFlowPollInfo,

    /// Web browser URL that the user visits to grant access.
    pub login: String,
}

/// Polling endpoint details for Login Flow v2.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginFlowPollInfo {
    /// Polling token associated with the session.
    pub token: String,

    /// Polling endpoint URL (e.g. `https://cloud.example.com/index.php/login/v2/poll`).
    pub endpoint: String,
}

/// Successful credential payload returned once the user clicks 'Grant access' in their browser.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginFlowPollSuccess {
    /// The canonical server URL reported by Nextcloud.
    pub server: String,

    /// The username of the authenticated user.
    pub login_name: String,

    /// The generated unique App Password token.
    pub app_password: String,
}

/// Initiates Nextcloud Login Flow v2 against a given server URL.
///
/// Sends `POST /index.php/login/v2` and returns the browser login URL and polling token.
pub async fn initiate_login_flow(
    http: &reqwest::Client,
    server_url: &Url,
) -> Result<LoginFlowInitResponse> {
    let init_url = server_url.join("index.php/login/v2")?;

    let response = http.post(init_url).send().await?.error_for_status()?;
    let payload: LoginFlowInitResponse = response.json().await?;
    Ok(payload)
}

/// Poll the Nextcloud Login Flow v2 endpoint once.
///
/// Returns:
/// - `Ok(Some(creds))` when user has completed login in browser.
/// - `Ok(None)` while user has not yet authorized (HTTP 404 response).
/// - `Err(NextcloudError)` on network or server errors.
pub async fn poll_login_flow(
    http: &reqwest::Client,
    endpoint: &str,
    token: &str,
) -> Result<Option<LoginFlowPollSuccess>> {
    let mut form = HashMap::new();
    form.insert("token", token);

    let response = http.post(endpoint).form(&form).send().await?;
    let status = response.status();

    if status.is_success() {
        let creds: LoginFlowPollSuccess = response.json().await?;
        Ok(Some(creds))
    } else if status == reqwest::StatusCode::NOT_FOUND {
        // Nextcloud returns 404 while waiting for user to click Grant
        Ok(None)
    } else {
        let err_text = response.text().await.unwrap_or_default();
        Err(NextcloudError::ServerError {
            status: status.as_u16(),
            message: format!("Polling Login Flow v2 failed: {err_text}"),
        })
    }
}

/// High-level interactive browser login helper.
///
/// 1. Initiates Login Flow v2 with the Nextcloud server.
/// 2. Opens the login URL in the user's default web browser.
/// 3. Polls the endpoint until authorization succeeds or `timeout` is reached.
pub async fn interactive_browser_login(
    http: &reqwest::Client,
    server_url: &Url,
    poll_interval: Duration,
    timeout: Duration,
) -> Result<LoginFlowPollSuccess> {
    let flow = initiate_login_flow(http, server_url).await?;

    // Attempt to open the default system browser
    let _ = open::that(&flow.login);

    let start_time = tokio::time::Instant::now();

    loop {
        if start_time.elapsed() >= timeout {
            return Err(NextcloudError::Other(
                "Timed out waiting for browser authorization in Nextcloud".into(),
            ));
        }

        sleep(poll_interval).await;

        if let Some(creds) = poll_login_flow(http, &flow.poll.endpoint, &flow.poll.token).await? {
            return Ok(creds);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_login_flow_init_deserialization() {
        let sample_json = r#"{
            "poll": {
                "token": "secret_poll_token_123",
                "endpoint": "https://nextcloud.example.com/index.php/login/v2/poll"
            },
            "login": "https://nextcloud.example.com/index.php/login/v2/flow/abcdef"
        }"#;

        let res: LoginFlowInitResponse = serde_json::from_str(sample_json).unwrap();
        assert_eq!(res.poll.token, "secret_poll_token_123");
        assert_eq!(
            res.poll.endpoint,
            "https://nextcloud.example.com/index.php/login/v2/poll"
        );
        assert_eq!(
            res.login,
            "https://nextcloud.example.com/index.php/login/v2/flow/abcdef"
        );
    }

    #[test]
    fn test_login_flow_poll_success_deserialization() {
        let sample_json = r#"{
            "server": "https://nextcloud.example.com",
            "loginName": "tom",
            "appPassword": "app-generated-password-token"
        }"#;

        let creds: LoginFlowPollSuccess = serde_json::from_str(sample_json).unwrap();
        assert_eq!(creds.server, "https://nextcloud.example.com");
        assert_eq!(creds.login_name, "tom");
        assert_eq!(creds.app_password, "app-generated-password-token");
    }
}
