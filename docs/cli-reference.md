# Nextcloud Upload Tool (`nut`) — CLI Reference

The `nut` CLI provides a fast, pipe-friendly command-line interface for interacting with Nextcloud instances.

---

## Command Syntax

```bash
nut <COMMAND> [OPTIONS]
```

### Global Flags
- `-h`, `--help`: Print help documentation.
- `-V`, `--version`: Print version information.

---

## 1. `nut login`

Authenticates and saves a Nextcloud instance account into your operating system's native keychain.

```bash
nut login <SERVER_URL> [OPTIONS]
```

### Arguments
- `<SERVER_URL>`: The base URL of the Nextcloud instance (e.g. `https://cloud.example.com` or `http://localhost:8080/nextcloud`).

### Options
- `--label <LABEL>`: Optional friendly name for this account (e.g. `Work`, `Personal`, `Staging`).
- `--default <BOOL>`: Mark this account as the default active account (default: `true`).
- `--no-browser`: Do not attempt to launch a local browser. Prints the Login Flow v2 URL to stdout for copy-pasting (ideal for SSH sessions).
- `-m`, `--manual`: Interactively prompts for username and app password/token via terminal inputs.
- `-u`, `--username <USER>`: Username for non-interactive / automated login (requires `-p` / `--app-password`).
- `-p`, `--app-password <PASS>`: App password or token for non-interactive login (requires `-u` / `--username`).

### Examples
```bash
# Interactive browser authorization (default)
nut login https://cloud.example.com --label "Personal"

# Headless SSH authorization
nut login https://cloud.example.com --no-browser --label "Server-Backup"

# Interactive terminal credential entry
nut login https://cloud.example.com --manual

# Automated non-interactive CI / container provisioning
nut login https://cloud.example.com -u ci-bot -p "xxxx-xxxx-xxxx-xxxx" --label "CI"
```

---

## 2. `nut upload`

Uploads one or more files, folders, or standard input streams to Nextcloud with optional public share generation.

```bash
nut upload [FILE]... [OPTIONS]
```

### Arguments
- `[FILE]...`: One or more local file or directory paths to upload.

### Options
- `-a`, `--account <ACCOUNT>`: Override default account with a specific account ID or label.
- `-d`, `--remote-dir <DIR>`: Destination directory on Nextcloud (default: `Uploads`).
- `-s`, `--share`: Automatically create a public share link after upload.
- `--password <PASSWORD>`: Set a password for the generated public share link.
- `-r`, `--recursive`: Recursively upload directories and nested directory hierarchies.
- `-c`, `--continue-on-error`: Continue processing remaining files if one fails.
- `--no-progress`: Disable progress bars even when running in an interactive TTY.
- `--stdin`: Upload standard input data stream.
- `--filename <NAME>`: Remote filename to use when uploading via `--stdin` (default: `stdin_upload.txt`).
- `--size <BYTES>`: Expected size in bytes for stdin streams (enables ETA and progress bar).

### Formatting Options
- `--json`: Output machine-readable JSON (array for batches, object for single file).
- `--tsv`: Output Tab-Separated Values (file, remote path, bytes, success, share URL, direct URL).
- `--url-only`: Output only the public share URL (requires `--share`).
- `--direct-url-only`: Output only the direct download URL (requires `--share`).
- `-q`, `--quiet`: Suppress progress output and print only share links or uploaded paths.

### Examples
```bash
# Upload a single file with public share link
nut upload -s report.pdf

# Upload multiple files into a remote folder
nut upload -s -d "Documents/2026" sheet1.xlsx sheet2.xlsx

# Recursive directory upload
nut upload -s -r assets/

# Upload standard input stream with custom filename
cat database.sql | nut upload -s --stdin --filename "database.sql"

# Upload and copy public share URL directly to clipboard
nut upload -s --url-only image.png | pbcopy
```

---

## 3. `nut accounts` / `nut account`

Manage stored Nextcloud accounts and configure default active accounts.

### `nut accounts` / `nut account list`
List all stored accounts and their status.
```bash
nut accounts
nut accounts --json
nut accounts --tsv
```

### `nut account default <ACCOUNT>`
Set the active default account by ID or friendly label.
```bash
nut account default Work
nut account default alice@cloud.example.com
```

### `nut account delete <ACCOUNT>`
Remove an account and wipe its token from the OS keychain.
```bash
nut account delete "Personal"
```

---

## 4. `nut completions`

Generates shell completion scripts for your preferred shell environment.

```bash
nut completions <SHELL>
```

### Supported Shells
- `bash`
- `zsh`
- `fish`
- `powershell`
- `elvish`

### Installation Examples
```bash
# Zsh
nut completions zsh > ~/.zfunc/_nut

# Bash
nut completions bash > /etc/bash_completion.d/nut
# Or load in ~/.bashrc:
source <(nut completions bash)

# Fish
nut completions fish > ~/.config/fish/completions/nut.fish

# PowerShell
nut completions powershell >> $PROFILE

# Elvish
nut completions elvish > ~/.elvish/lib/nut.elv
```
