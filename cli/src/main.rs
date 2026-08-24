use clap::{Args, Parser, Subcommand};
use serde::Serialize;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use nextcloud_client::{
    initiate_login_flow, poll_login_flow, ClientConfig, CredentialStore, NextcloudClient,
    ProgressCallback, ProgressEvent, Result, UploadOptions,
};

#[derive(Parser, Debug)]
#[command(
    name = "nut",
    author = "Tom Hicks <headhunter3@gmail.com>",
    version,
    about = "Nextcloud Upload Tool — Fast, seamless file uploads & share links",
    long_about = "Upload files to Nextcloud directly from your terminal, automatically generate public share links, and manage multiple accounts with secure OS keychain storage."
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand, Debug)]
enum Commands {
    /// Log in to a Nextcloud server using browser authorization (Login Flow v2)
    Login(LoginArgs),

    /// Upload a file or stream to Nextcloud
    Upload(UploadArgs),

    /// Manage configured Nextcloud accounts
    #[command(subcommand)]
    Account(AccountCommands),

    /// Quick alias to list all configured accounts
    Accounts(AccountListArgs),
}

#[derive(Args, Debug)]
struct LoginArgs {
    /// Base URL of the Nextcloud instance (e.g. https://cloud.example.com)
    server_url: String,

    /// Optional friendly label for this account (e.g. "Work", "Home")
    #[arg(short, long)]
    label: Option<String>,

    /// Set this account as the default active account
    #[arg(short, long, default_value_t = true)]
    default: bool,
}

#[derive(Args, Debug, Clone, Default)]
struct OutputFormatArgs {
    /// Format output as JSON
    #[arg(long, conflicts_with_all = ["tsv", "url_only", "direct_url_only"])]
    json: bool,

    /// Format output as Tab-Separated Values (TSV)
    #[arg(long, conflicts_with_all = ["json", "url_only", "direct_url_only"])]
    tsv: bool,

    /// Output only the public share URL
    #[arg(long, conflicts_with_all = ["json", "tsv", "direct_url_only"])]
    url_only: bool,

    /// Output only the direct download URL
    #[arg(long, conflicts_with_all = ["json", "tsv", "url_only"])]
    direct_url_only: bool,

    /// Suppress progress and informational output
    #[arg(short, long)]
    quiet: bool,
}

impl OutputFormatArgs {
    pub fn is_machine_readable(&self) -> bool {
        self.json || self.tsv || self.url_only || self.direct_url_only || self.quiet
    }
}

#[derive(Args, Debug)]
struct UploadArgs {
    /// Path to local file(s) to upload
    #[arg(value_name = "FILE")]
    files: Vec<PathBuf>,

    /// Specific account identifier or label to use (defaults to active account)
    #[arg(short, long)]
    account: Option<String>,

    /// Remote destination folder on Nextcloud (defaults to "Uploads")
    #[arg(short = 'd', long, default_value = "Uploads")]
    remote_dir: String,

    /// Automatically generate a public share link after upload
    #[arg(short, long)]
    share: bool,

    /// Optional password to protect the public share link
    #[arg(short, long)]
    password: Option<String>,

    /// Upload content from standard input (stdin)
    #[arg(long)]
    stdin: bool,

    /// Remote filename to use when uploading via stdin
    #[arg(long, default_value = "stdin_upload.txt")]
    filename: String,

    #[command(flatten)]
    format: OutputFormatArgs,
}

#[derive(Subcommand, Debug)]
enum AccountCommands {
    /// List all configured Nextcloud accounts
    List(AccountListArgs),

    /// Set the active default account
    Default {
        /// Account ID, label, or username
        account: String,
    },

    /// Remove a configured account and its credentials
    Delete {
        /// Account ID, label, or username
        account: String,
    },
}

#[derive(Args, Debug, Clone, Default)]
struct AccountListArgs {
    /// Format output as JSON
    #[arg(long, conflicts_with = "tsv")]
    json: bool,

    /// Format output as Tab-Separated Values (TSV)
    #[arg(long, conflicts_with = "json")]
    tsv: bool,
}

#[derive(Debug, Clone, Serialize)]
struct UploadRecord {
    file: String,
    remote_path: String,
    bytes: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    share_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    direct_download_url: Option<String>,
}

#[tokio::main]
async fn main() {
    let cli = Cli::parse();

    let result = match cli.command {
        Commands::Login(args) => handle_login(args).await,
        Commands::Upload(args) => handle_upload(args).await,
        Commands::Account(AccountCommands::List(args)) | Commands::Accounts(args) => {
            handle_account_list(args)
        }
        Commands::Account(AccountCommands::Default { account }) => {
            handle_account_set_default(&account)
        }
        Commands::Account(AccountCommands::Delete { account }) => handle_account_delete(&account),
    };

    if let Err(err) = result {
        eprintln!("\x1b[1;31mError:\x1b[0m {err}");
        std::process::exit(1);
    }
}

/// Handle interactive browser login flow.
async fn handle_login(args: LoginArgs) -> Result<()> {
    let server_url = ClientConfig::normalize_url(&args.server_url)?;
    let http = reqwest::Client::new();

    println!("\x1b[1;34m==>\x1b[0m Initiating Nextcloud authentication with {}", server_url);
    let flow = initiate_login_flow(&http, &server_url).await?;

    println!("\x1b[1;32m==>\x1b[0m Please authorize access in your browser:");
    println!("    \x1b[1;36m{}\x1b[0m\n", flow.login);

    // Attempt to open the default desktop browser
    if open::that(&flow.login).is_err() {
        println!("    (Could not automatically launch browser. Please copy and open the link above.)");
    }

    print!("\x1b[1;33m==>\x1b[0m Waiting for browser authorization...");
    io::Write::flush(&mut io::stdout())?;

    let poll_interval = Duration::from_secs(2);
    let timeout = Duration::from_secs(300); // 5 minute timeout
    let start_time = tokio::time::Instant::now();

    loop {
        if start_time.elapsed() >= timeout {
            println!();
            return Err(nextcloud_client::NextcloudError::Other(
                "Timed out waiting for authorization in browser".into(),
            ));
        }

        tokio::time::sleep(poll_interval).await;

        if let Some(creds) = poll_login_flow(&http, &flow.poll.endpoint, &flow.poll.token).await? {
            println!("\n\x1b[1;32m==>\x1b[0m Authorization granted for user '\x1b[1m{}\x1b[0m'!", creds.login_name);

            // Save credentials to keychain & accounts list
            let mut account = CredentialStore::save_account(
                &creds.server,
                &creds.login_name,
                &creds.app_password,
                args.default,
            )?;

            if let Some(lbl) = args.label {
                account.label = Some(lbl);
                let mut accounts = CredentialStore::list_accounts()?;
                if let Some(a) = accounts.iter_mut().find(|a| a.id == account.id) {
                    a.label = account.label.clone();
                }
                CredentialStore::save_accounts(&accounts)?;
            }

            println!("\x1b[1;32m==>\x1b[0m Account '\x1b[1m{}\x1b[0m' saved securely in system keychain.", account.id);
            if account.is_default {
                println!("    Set as default active account.");
            }
            return Ok(());
        }
    }
}

/// Handle file and stdin uploads.
async fn handle_upload(args: UploadArgs) -> Result<()> {
    if (args.format.url_only || args.format.direct_url_only) && !args.share {
        return Err(nextcloud_client::NextcloudError::Other(
            "Flag --url-only or --direct-url-only requires --share to generate a link.".into(),
        ));
    }

    let client = match args.account.as_deref() {
        Some(acc) => CredentialStore::create_client_for_account(acc)?,
        None => CredentialStore::create_client_for_default()?,
    };

    let mut results: Vec<UploadRecord> = Vec::new();

    // Stdin Upload
    if args.stdin {
        if !args.format.is_machine_readable() {
            println!("\x1b[1;34m==>\x1b[0m Reading data from stdin...");
        }
        let mut buffer = Vec::new();
        io::stdin().read_to_end(&mut buffer)?;

        let len = buffer.len() as u64;
        let clean_dir = args.remote_dir.trim_matches('/');
        let remote_path = if clean_dir.is_empty() {
            args.filename.clone()
        } else {
            format!("{clean_dir}/{}", args.filename)
        };

        if !args.format.is_machine_readable() {
            println!("\x1b[1;34m==>\x1b[0m Uploading {} bytes to '{}'...", len, remote_path);
        }

        let progress_cb = if args.format.is_machine_readable() {
            None
        } else {
            Some(create_progress_callback(len))
        };

        let cursor = io::Cursor::new(buffer);
        let bytes = client
            .upload_reader(cursor, &remote_path, Some(len), progress_cb)
            .await?;

        let mut share_url = None;
        let mut direct_download_url = None;

        if args.share {
            if !args.format.is_machine_readable() {
                println!("\x1b[1;34m==>\x1b[0m Generating public share link...");
            }
            let share = client.create_public_share(&remote_path, args.password.as_deref()).await?;
            let direct = client.direct_download_url(&share.token)?;
            share_url = Some(share.url);
            direct_download_url = Some(direct.to_string());
        }

        results.push(UploadRecord {
            file: "stdin".to_string(),
            remote_path,
            bytes,
            share_url,
            direct_download_url,
        });
    } else {
        if args.files.is_empty() {
            return Err(nextcloud_client::NextcloudError::Other(
                "No files specified for upload. Usage: nut upload <FILE>... or nut upload --stdin".into(),
            ));
        }

        for file_path in &args.files {
            let record = upload_single_file(
                &client,
                file_path,
                &args.remote_dir,
                args.share,
                args.password.as_deref(),
                &args.format,
            )
            .await?;
            results.push(record);
        }
    }

    render_upload_results(&results, &args.format);
    Ok(())
}

async fn upload_single_file(
    client: &NextcloudClient,
    local_path: &Path,
    remote_dir: &str,
    create_share: bool,
    password: Option<&str>,
    format: &OutputFormatArgs,
) -> Result<UploadRecord> {
    if !local_path.exists() {
        return Err(nextcloud_client::NextcloudError::NotFound {
            path: local_path.display().to_string(),
        });
    }

    let file_name = local_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file");

    let clean_dir = remote_dir.trim_matches('/');
    let remote_path = if clean_dir.is_empty() {
        file_name.to_string()
    } else {
        format!("{clean_dir}/{file_name}")
    };

    let metadata = tokio::fs::metadata(local_path).await?;
    let file_size = metadata.len();

    if !format.is_machine_readable() {
        println!("\x1b[1;34m==>\x1b[0m Uploading '{}' ({} bytes) -> '{}'...", local_path.display(), file_size, remote_path);
    }

    let progress_cb = if format.is_machine_readable() {
        None
    } else {
        Some(create_progress_callback(file_size))
    };

    let options = UploadOptions {
        remote_path: remote_path.clone(),
        create_share,
        share_password: password.map(|s| s.to_string()),
        overwrite: true,
    };

    let result = client
        .upload_and_share(local_path, &options, progress_cb)
        .await?;

    Ok(UploadRecord {
        file: local_path.display().to_string(),
        remote_path,
        bytes: result.bytes_uploaded,
        share_url: result.share_url,
        direct_download_url: result.direct_download_url,
    })
}

fn render_upload_results(results: &[UploadRecord], format: &OutputFormatArgs) {
    if format.json {
        if results.len() == 1 {
            println!("{}", serde_json::to_string_pretty(&results[0]).unwrap());
        } else {
            println!("{}", serde_json::to_string_pretty(&results).unwrap());
        }
        return;
    }

    if format.tsv {
        for r in results {
            println!(
                "{}\t{}\t{}\t{}\t{}",
                r.file,
                r.remote_path,
                r.bytes,
                r.share_url.as_deref().unwrap_or(""),
                r.direct_download_url.as_deref().unwrap_or("")
            );
        }
        return;
    }

    if format.url_only {
        for r in results {
            if let Some(ref url) = r.share_url {
                println!("{url}");
            }
        }
        return;
    }

    if format.direct_url_only {
        for r in results {
            if let Some(ref url) = r.direct_download_url {
                println!("{url}");
            }
        }
        return;
    }

    if format.quiet {
        // Quiet mode: if share URL exists, print that, otherwise print remote path
        for r in results {
            if let Some(ref url) = r.share_url {
                println!("{url}");
            } else {
                println!("{}", r.remote_path);
            }
        }
        return;
    }

    // Default human-readable terminal output
    for r in results {
        println!("\n\x1b[1;32m✓\x1b[0m Uploaded '{}' ({} bytes)", r.file, r.bytes);
        if let Some(ref share_url) = r.share_url {
            println!("  \x1b[1;32mShare Link:\x1b[0m       {}", share_url);
        }
        if let Some(ref direct_url) = r.direct_download_url {
            println!("  \x1b[1;32mDirect Download:\x1b[0m  {}", direct_url);
        }
    }
}

fn create_progress_callback(total_bytes: u64) -> ProgressCallback {
    Arc::new(move |event| match event {
        ProgressEvent::Progress { bytes_transferred, total_bytes: total } => {
            let tot = total.unwrap_or(total_bytes);
            if tot > 0 {
                let percent = (bytes_transferred as f64 / tot as f64) * 100.0;
                print!("\r    \x1b[1;33mProgress:\x1b[0m {:>3.0}% ({}/{} bytes)", percent, bytes_transferred, tot);
            } else {
                print!("\r    \x1b[1;33mProgress:\x1b[0m {} bytes transferred", bytes_transferred);
            }
            let _ = io::Write::flush(&mut io::stdout());
        }
        ProgressEvent::Completed { total_bytes } => {
            print!("\r    \x1b[1;33mProgress:\x1b[0m 100% ({} bytes)    ", total_bytes);
            let _ = io::Write::flush(&mut io::stdout());
        }
        _ => {}
    })
}

/// List stored accounts.
fn handle_account_list(args: AccountListArgs) -> Result<()> {
    let accounts = CredentialStore::list_accounts()?;

    if args.json {
        println!("{}", serde_json::to_string_pretty(&accounts)?);
        return Ok(());
    }

    if args.tsv {
        for acc in &accounts {
            println!(
                "{}\t{}\t{}\t{}\t{}",
                acc.id,
                acc.username,
                acc.server_url,
                acc.is_default,
                acc.label.as_deref().unwrap_or("")
            );
        }
        return Ok(());
    }

    if accounts.is_empty() {
        println!("No Nextcloud accounts configured yet.");
        println!("Run \x1b[1;36mnut login <SERVER_URL>\x1b[0m to connect an account.");
        return Ok(());
    }

    println!("\x1b[1mConfigured Nextcloud Accounts:\x1b[0m\n");
    for acc in accounts {
        let default_mark = if acc.is_default { "\x1b[1;32m* (active default)\x1b[0m" } else { "" };
        let label_str = acc.label.as_deref().unwrap_or("—");
        println!("  • \x1b[1;36m{}\x1b[0m {}", acc.id, default_mark);
        println!("    Username: {}", acc.username);
        println!("    Server:   {}", acc.server_url);
        println!("    Label:    {}\n", label_str);
    }
    Ok(())
}

fn handle_account_set_default(account: &str) -> Result<()> {
    CredentialStore::set_default_account(account)?;
    println!("\x1b[1;32m✓\x1b[0m Active default account set to '\x1b[1m{}\x1b[0m'.", account);
    Ok(())
}

fn handle_account_delete(account: &str) -> Result<()> {
    CredentialStore::delete_account(account)?;
    println!("\x1b[1;32m✓\x1b[0m Account '\x1b[1m{}\x1b[0m' deleted.", account);
    Ok(())
}
