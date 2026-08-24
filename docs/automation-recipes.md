# CLI Automation & Scripting Recipes

This guide contains practical recipes for integrating `nut` into bash scripts, Unix pipelines, CI/CD runners, and headless server environments.

---

## 1. Piping Streams & Backups

### Piping Database Backups Directly to Nextcloud
Stream database dumps straight to Nextcloud without creating intermediate local files:

```bash
# MySQL / MariaDB Dump
mysqldump -u root -p mydb | gzip -9 | \
  nut upload -d "Backups/MySQL" --stdin --filename "mydb-$(date +%Y%m%d).sql.gz"

# PostgreSQL Dump
pg_dump mydb | zstd | \
  nut upload -d "Backups/Postgres" --stdin --filename "mydb-$(date +%Y%m%d).sql.zst"
```

### Piping Compressed Archives with `pv` Rate Metering
```bash
# Compress and stream with live throughput monitoring
tar -czf - /var/log/nginx | pv | \
  nut upload -d "Backups/Logs" --stdin --filename "nginx-logs-$(date +%F).tar.gz"
```

### Piping from `curl` / `wget`
Download a remote file and forward it to Nextcloud in one pipeline:
```bash
curl -fsSL https://example.com/large-dataset.csv.gz | \
  nut upload -s -d "Datasets" --stdin --filename "large-dataset.csv.gz"
```

---

## 2. Scripting with `jq`, `xargs`, and Clipboard

### Uploading and Instant Clipboard Copy (macOS, Linux, Windows)
```bash
# macOS
nut upload -s --url-only screenshot.png | pbcopy

# Linux (X11 / Wayland)
nut upload -s --url-only screenshot.png | xclip -selection clipboard
# or wl-copy
nut upload -s --url-only screenshot.png | wl-copy

# Windows PowerShell
nut upload -s --url-only screenshot.png | Set-Clipboard
```

### Batch Processing with `xargs`
Upload all modified markdown files found with `find`:
```bash
find ./notes -name "*.md" -mtime -1 -print0 | \
  xargs -0 nut upload -s -d "Notes/Daily" --json
```

### Extracting Links and Metadata with `jq`
```bash
# Extract all public share URLs into a text list
nut upload -s -r assets/ --json | jq -r '.[].share_url // empty' > links.txt

# Query direct download links
nut upload -s build/*.pkg --json | jq -r '.[] | select(.success == true) | "\(.file): \(.direct_download_url)"'
```

### Scripting with TSV
Parse tabular output in bash loops:
```bash
nut upload -s -r photos/ --tsv | while IFS=$'\t' read -r file remote bytes success share direct; do
  if [ "$success" = "true" ]; then
    echo "Uploaded $file ($bytes bytes) -> $share"
  else
    echo "Failed to upload $file"
  fi
done
```

---

## 3. CI/CD & Headless Automation

### Non-Interactive CI / GitHub Actions Setup
Authenticate non-interactively using environment secrets in CI pipelines:

```yaml
name: Deploy Build Artifacts
on: [push]

jobs:
  upload:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install nut
        run: |
          curl -fsSL https://github.com/majinnaibu/nextcloud-upload-tool/releases/latest/download/nut-x86_64-unknown-linux-musl.tar.gz | tar -xz
          sudo mv nut /usr/local/bin/

      - name: Authenticate Nextcloud
        env:
          NC_SERVER: ${{ secrets.NEXTCLOUD_SERVER_URL }}
          NC_USER: ${{ secrets.NEXTCLOUD_USERNAME }}
          NC_PASS: ${{ secrets.NEXTCLOUD_APP_PASSWORD }}
        run: |
          nut login "$NC_SERVER" -u "$NC_USER" -p "$NC_PASS" --label "CI"

      - name: Build and Upload Artifact
        run: |
          tar -czf release-build.tar.gz dist/
          SHARE_URL=$(nut upload -s --account "CI" --url-only release-build.tar.gz)
          echo "Download link: $SHARE_URL"
```

### Headless SSH Remote Server Authorization
When working over an SSH connection without X11 or desktop forwarding:

```bash
# Run login in headless mode
nut login https://cloud.example.com --no-browser --label "ProductionServer"

# nut prints:
# ==> Please authorize access in your browser:
#     https://cloud.example.com/index.php/login/v2/flow/abc123xyz
# ==> Waiting for browser authorization...

# Open that link on your local computer, authorize, and nut immediately captures the token!
```
