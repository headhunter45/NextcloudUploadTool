use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};

static COUNTER: AtomicU64 = AtomicU64::new(1);

/// Ephemeral directory helper that cleans up after itself on Drop.
struct TempDir {
    path: PathBuf,
}

impl TempDir {
    fn new(prefix: &str) -> Self {
        let id = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!(
            "nut_it_{}_{}_{}",
            prefix,
            std::process::id(),
            id
        ));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("Failed to create temp dir");
        Self { path: dir }
    }

    fn path(&self) -> &Path {
        &self.path
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.path);
    }
}

/// Shared state for the in-process Nextcloud WebDAV + OCS Sharing mock server
/// used when an external Docker/Podman `NEXTCLOUD_TEST_URL` is not provided.
#[derive(Default)]
struct MockNextcloudState {
    folders: HashSet<String>,
    files: HashMap<String, Vec<u8>>,
    shares: HashMap<String, String>, // token -> normalized file path
}

struct TestServerEndpoint {
    base_url: String,
    username: String,
    password: String,
    _shutdown: Option<tokio::sync::oneshot::Sender<()>>,
}

impl TestServerEndpoint {
    /// Connects to the external Docker/Podman Nextcloud container when `NEXTCLOUD_TEST_URL`
    /// is set in the environment, or launches a local Nextcloud-compatible WebDAV/OCS server.
    async fn acquire() -> Self {
        if let Ok(url) = std::env::var("NEXTCLOUD_TEST_URL") {
            let trimmed = url.trim();
            if !trimmed.is_empty() {
                let username = std::env::var("NEXTCLOUD_TEST_USER")
                    .unwrap_or_else(|_| "admin".to_string());
                let password = std::env::var("NEXTCLOUD_TEST_APP_PASSWORD")
                    .or_else(|_| std::env::var("NEXTCLOUD_TEST_PASS"))
                    .unwrap_or_else(|_| "AdminTestPass!2026".to_string());
                return Self {
                    base_url: trimmed.trim_end_matches('/').to_string(),
                    username,
                    password,
                    _shutdown: None,
                };
            }
        }

        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .expect("Failed to bind local test server");
        let addr: SocketAddr = listener.local_addr().unwrap();
        let base_url = format!("http://127.0.0.1:{}", addr.port());

        let state = Arc::new(Mutex::new(MockNextcloudState::default()));
        let (tx, mut rx) = tokio::sync::oneshot::channel::<()>();

        let server_base = base_url.clone();
        tokio::spawn(async move {
            loop {
                tokio::select! {
                    _ = &mut rx => break,
                    accept_res = listener.accept() => {
                        if let Ok((stream, _)) = accept_res {
                            let st = Arc::clone(&state);
                            let base = server_base.clone();
                            tokio::spawn(async move {
                                let _ = handle_connection(stream, st, base).await;
                            });
                        }
                    }
                }
            }
        });

        Self {
            base_url,
            username: "admin".to_string(),
            password: "AdminTestPass!2026".to_string(),
            _shutdown: Some(tx),
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    state: Arc<Mutex<MockNextcloudState>>,
    base_url: String,
) -> std::io::Result<()> {
    let mut reader = BufReader::new(stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await? == 0 {
        return Ok(());
    }

    let parts: Vec<&str> = request_line.trim().split_whitespace().collect();
    if parts.len() < 2 {
        return Ok(());
    }
    let method = parts[0].to_uppercase();
    let raw_target = parts[1];
    let path = raw_target.split('?').next().unwrap_or(raw_target);

    let mut content_length: usize = 0;
    let mut is_chunked = false;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await? == 0 {
            break;
        }
        let trimmed = line.trim();
        if trimmed.is_empty() {
            break;
        }
        if let Some((k, v)) = trimmed.split_once(':') {
            if k.eq_ignore_ascii_case("content-length") {
                content_length = v.trim().parse::<usize>().unwrap_or(0);
            } else if k.eq_ignore_ascii_case("transfer-encoding")
                && v.to_ascii_lowercase().contains("chunked")
            {
                is_chunked = true;
            }
        }
    }

    let body = if is_chunked {
        let mut decoded = Vec::new();
        loop {
            let mut size_line = String::new();
            reader.read_line(&mut size_line).await?;
            let size_hex = size_line.trim().split(';').next().unwrap_or("0");
            let chunk_size = usize::from_str_radix(size_hex, 16).unwrap_or(0);
            if chunk_size == 0 {
                let mut trailing = String::new();
                let _ = reader.read_line(&mut trailing).await;
                break;
            }
            let mut chunk = vec![0u8; chunk_size];
            reader.read_exact(&mut chunk).await?;
            decoded.extend_from_slice(&chunk);
            let mut crlf = [0u8; 2];
            reader.read_exact(&mut crlf).await?;
        }
        decoded
    } else if content_length > 0 {
        let mut buf = vec![0u8; content_length];
        reader.read_exact(&mut buf).await?;
        buf
    } else {
        Vec::new()
    };

    let mut stream = reader.into_inner();

    // 1. GET /status.php
    if method == "GET" && path == "/status.php" {
        let json = r#"{"installed":true,"maintenance":false,"needsDbUpgrade":false,"version":"29.0.0.1","versionstring":"29.0.0","edition":"","productname":"Nextcloud"}"#;
        return write_response(&mut stream, "200 OK", "application/json", json.as_bytes()).await;
    }

    // 2. WebDAV endpoints: /remote.php/dav/files/<user>/<relpath>
    if let Some(rest) = path.strip_prefix("/remote.php/dav/files/") {
        let rel = rest
            .split_once('/')
            .map(|(_, r)| r.trim_matches('/'))
            .unwrap_or("");

        match method.as_str() {
            "PROPFIND" => {
                let xml = r#"<?xml version="1.0"?><d:multistatus xmlns:d="DAV:"><d:response><d:status>HTTP/1.1 200 OK</d:status></d:response></d:multistatus>"#;
                return write_response(
                    &mut stream,
                    "207 Multi-Status",
                    "application/xml",
                    xml.as_bytes(),
                )
                .await;
            }
            "MKCOL" => {
                {
                    let mut st = state.lock().unwrap();
                    st.folders.insert(rel.to_string());
                }
                return write_response(&mut stream, "201 Created", "text/plain", b"").await;
            }
            "PUT" => {
                {
                    let mut st = state.lock().unwrap();
                    st.files.insert(rel.to_string(), body);
                }
                return write_response(&mut stream, "201 Created", "text/plain", b"").await;
            }
            "GET" => {
                let data_opt = {
                    let st = state.lock().unwrap();
                    st.files.get(rel).cloned()
                };
                if let Some(bytes) = data_opt {
                    return write_response(
                        &mut stream,
                        "200 OK",
                        "application/octet-stream",
                        &bytes,
                    )
                    .await;
                } else {
                    return write_response(&mut stream, "404 Not Found", "text/plain", b"Not Found")
                        .await;
                }
            }
            _ => {}
        }
    }

    // 3. OCS Share Creation: POST /ocs/v2.php/apps/files_sharing/api/v1/shares
    if method == "POST" && path == "/ocs/v2.php/apps/files_sharing/api/v1/shares" {
        let form_str = String::from_utf8_lossy(&body);
        let mut shared_path = String::new();
        for pair in url::form_urlencoded::parse(form_str.as_bytes()) {
            if pair.0 == "path" {
                shared_path = pair.1.trim_matches('/').to_string();
            }
        }

        let token_num = COUNTER.fetch_add(1, Ordering::SeqCst);
        let token = format!("ncsharetok{:08x}", token_num);
        {
            let mut st = state.lock().unwrap();
            st.shares.insert(token.clone(), shared_path.clone());
        }

        let share_url = format!("{base_url}/index.php/s/{token}");
        let resp = serde_json::json!({
            "ocs": {
                "meta": {
                    "status": "ok",
                    "statuscode": 200,
                    "message": "OK"
                },
                "data": {
                    "id": token_num.to_string(),
                    "share_type": 3,
                    "token": token,
                    "url": share_url,
                    "path": format!("/{shared_path}"),
                    "item_type": "file"
                }
            }
        });
        let bytes = serde_json::to_vec(&resp).unwrap();
        return write_response(&mut stream, "200 OK", "application/json", &bytes).await;
    }

    // 4. Direct download URL: GET /index.php/s/<token>/download
    if method == "GET" {
        if let Some(rest) = path.strip_prefix("/index.php/s/") {
            if let Some(token) = rest.strip_suffix("/download") {
                let data_opt = {
                    let st = state.lock().unwrap();
                    st.shares
                        .get(token)
                        .and_then(|file_path| st.files.get(file_path).cloned())
                };
                if let Some(bytes) = data_opt {
                    return write_response(
                        &mut stream,
                        "200 OK",
                        "application/octet-stream",
                        &bytes,
                    )
                    .await;
                }
            }
        }
    }

    write_response(&mut stream, "404 Not Found", "text/plain", b"Not Found").await
}

async fn write_response(
    stream: &mut TcpStream,
    status: &str,
    content_type: &str,
    body: &[u8],
) -> std::io::Result<()> {
    let header = format!(
        "HTTP/1.1 {status}\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",
        body.len()
    );
    stream.write_all(header.as_bytes()).await?;
    stream.write_all(body).await?;
    stream.flush().await
}

fn nut_cmd(config_dir: &Path) -> Command {
    let mut cmd = Command::new(env!("CARGO_BIN_EXE_nut"));
    cmd.env("NUT_CONFIG_DIR", config_dir);
    cmd.env("NUT_DISABLE_KEYRING", "1");
    cmd.env("NO_PROXY", "127.0.0.1,localhost");
    cmd.env("no_proxy", "127.0.0.1,localhost");
    cmd.env_remove("HTTP_PROXY");
    cmd.env_remove("http_proxy");
    cmd.env_remove("HTTPS_PROXY");
    cmd.env_remove("https_proxy");
    cmd.env_remove("ALL_PROXY");
    cmd.env_remove("all_proxy");
    cmd
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_cli_login_and_account_management() {
    let server = TestServerEndpoint::acquire().await;
    let config_dir = TempDir::new("config_login");

    // 1. Non-interactive login with --username, --app-password, --label, --default
    let output = nut_cmd(config_dir.path())
        .args([
            "login",
            &server.base_url,
            "--username",
            &server.username,
            "--app-password",
            &server.password,
            "--label",
            "IntegrationAccount",
            "--default",
        ])
        .output()
        .expect("Failed to execute nut login");

    assert!(
        output.status.success(),
        "nut login failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    // 2. Verify `nut accounts --json`
    let list_output = nut_cmd(config_dir.path())
        .args(["accounts", "--json"])
        .output()
        .expect("Failed to execute nut accounts --json");

    assert!(list_output.status.success());
    let accounts: Value =
        serde_json::from_slice(&list_output.stdout).expect("Invalid JSON from nut accounts");
    let arr = accounts.as_array().expect("Expected JSON array");
    assert_eq!(arr.len(), 1);
    assert_eq!(arr[0]["username"], server.username);
    assert_eq!(arr[0]["label"], "IntegrationAccount");
    assert_eq!(arr[0]["is_default"], true);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_cli_single_file_upload_and_public_share_verification() {
    let server = TestServerEndpoint::acquire().await;
    let config_dir = TempDir::new("config_single");
    let work_dir = TempDir::new("work_single");

    // Login first
    let login_status = nut_cmd(config_dir.path())
        .args([
            "login",
            &server.base_url,
            "-u",
            &server.username,
            "-p",
            &server.password,
        ])
        .status()
        .expect("Failed to run nut login");
    assert!(login_status.success());

    // Create sample local file
    let file_path = work_dir.path().join("hello-nextcloud.txt");
    let expected_payload = b"Hello from Nextcloud Upload Tool integration test!\nLine 2\n";
    fs::write(&file_path, expected_payload).unwrap();

    // Upload into a nested remote folder with share link generation and JSON output
    let upload_output = nut_cmd(config_dir.path())
        .args([
            "upload",
            file_path.to_str().unwrap(),
            "--remote-dir",
            "IntegrationTests/NestedFolder",
            "--share",
            "--no-progress",
            "--json",
        ])
        .output()
        .expect("Failed to run nut upload");

    assert!(
        upload_output.status.success(),
        "nut upload failed: {}",
        String::from_utf8_lossy(&upload_output.stderr)
    );

    let record: Value =
        serde_json::from_slice(&upload_output.stdout).expect("Failed to parse upload JSON");
    assert_eq!(record["success"], true);
    assert_eq!(record["bytes"], expected_payload.len() as u64);
    assert_eq!(
        record["remote_path"],
        "IntegrationTests/NestedFolder/hello-nextcloud.txt"
    );

    let share_url = record["share_url"]
        .as_str()
        .expect("Missing share_url in JSON output");
    let direct_url = record["direct_download_url"]
        .as_str()
        .expect("Missing direct_download_url in JSON output");

    assert!(share_url.contains("/s/"));
    assert!(direct_url.ends_with("/download"));

    // Verify public direct-download URL returns the uploaded payload
    let client = reqwest::Client::builder().no_proxy().build().unwrap();
    let dl_resp = client
        .get(direct_url)
        .send()
        .await
        .expect("Failed to GET direct_download_url");
    assert!(dl_resp.status().is_success());
    let downloaded_bytes = dl_resp.bytes().await.unwrap();
    assert_eq!(downloaded_bytes.as_ref(), expected_payload);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_cli_stdin_stream_upload_and_direct_url_only() {
    let server = TestServerEndpoint::acquire().await;
    let config_dir = TempDir::new("config_stdin");

    let login_status = nut_cmd(config_dir.path())
        .args([
            "login",
            &server.base_url,
            "-u",
            &server.username,
            "-p",
            &server.password,
        ])
        .status()
        .expect("Failed to run nut login");
    assert!(login_status.success());

    let stream_payload = b"Streamed stdin content via Unix pipeline for NUT-024";

    let mut child = nut_cmd(config_dir.path())
        .args([
            "upload",
            "--stdin",
            "--filename",
            "piped-stream.txt",
            "--size",
            &stream_payload.len().to_string(),
            "--remote-dir",
            "IntegrationTests/Pipelines",
            "--share",
            "--direct-url-only",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to spawn nut upload --stdin");

    {
        let stdin = child.stdin.as_mut().expect("Failed to open child stdin");
        stdin.write_all(stream_payload).unwrap();
    }

    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "stdin upload failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let direct_url = String::from_utf8_lossy(&output.stdout).trim().to_string();
    assert!(
        direct_url.ends_with("/download"),
        "Expected direct download URL, got: {direct_url}"
    );

    let client = reqwest::Client::builder().no_proxy().build().unwrap();
    let downloaded = client
        .get(&direct_url)
        .send()
        .await
        .expect("Failed to fetch streamed file via direct download URL")
        .bytes()
        .await
        .unwrap();
    assert_eq!(downloaded.as_ref(), stream_payload);
}

#[tokio::test(flavor = "multi_thread", worker_threads = 2)]
async fn test_cli_recursive_directory_upload_and_tsv_output() {
    let server = TestServerEndpoint::acquire().await;
    let config_dir = TempDir::new("config_recursive");
    let work_dir = TempDir::new("work_recursive");

    let login_status = nut_cmd(config_dir.path())
        .args([
            "login",
            &server.base_url,
            "-u",
            &server.username,
            "-p",
            &server.password,
        ])
        .status()
        .expect("Failed to run nut login");
    assert!(login_status.success());

    // Build nested directory tree
    let root_folder = work_dir.path().join("project_assets");
    let sub_folder = root_folder.join("docs");
    fs::create_dir_all(&sub_folder).unwrap();
    fs::write(root_folder.join("readme.md"), b"# Project Assets\n").unwrap();
    fs::write(sub_folder.join("guide.txt"), b"Detailed user guide\n").unwrap();

    let output = nut_cmd(config_dir.path())
        .args([
            "upload",
            "--recursive",
            root_folder.to_str().unwrap(),
            "--remote-dir",
            "IntegrationTests/RecursiveBatch",
            "--share",
            "--no-progress",
            "--tsv",
        ])
        .output()
        .expect("Failed to execute recursive nut upload");

    assert!(
        output.status.success(),
        "Recursive upload failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout_str = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout_str.lines().collect();
    assert_eq!(lines.len(), 2, "Expected 2 TSV rows, got:\n{stdout_str}");
    for row in &lines {
        let cols: Vec<&str> = row.split('\t').collect();
        assert!(cols.len() >= 6);
        assert_eq!(cols[3], "true");
        assert!(cols[4].contains("/s/"));
        assert!(cols[5].ends_with("/download"));
    }
}
