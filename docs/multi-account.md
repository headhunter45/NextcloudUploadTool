# Multi-Account Management Guide

**Nextcloud Upload Tool** supports managing multiple Nextcloud instances and user accounts simultaneously. Credentials, account metadata, and active default states are shared seamlessly between the CLI and GUI frontends.

---

## 1. How Accounts Are Identified

Every configured account has a canonical ID in the format:
```
username@host
```
*(e.g. `alice@cloud.example.com` or `dev@nextcloud.local`)*

You can also assign an optional friendly **label** (e.g. `"Work"`, `"Personal"`, `"Backup"`).

---

## 2. Managing Accounts via CLI (`nut`)

### Listing Configured Accounts
```bash
nut accounts
# or
nut account list
```
Outputs:
```text
Configured Nextcloud Accounts:

  • alice@cloud.example.com * (active default)
    Username: alice
    Server:   https://cloud.example.com
    Label:    Work

  • bob@nextcloud.org 
    Username: bob
    Server:   https://nextcloud.org
    Label:    Personal
```

To output as JSON or TSV for scripting:
```bash
nut accounts --json
nut accounts --tsv
```

### Adding an Account
- **Interactive Browser Flow**:
  ```bash
  nut login https://cloud.example.com --label "Work"
  ```
- **Interactive Terminal Password Prompt**:
  ```bash
  nut login https://cloud.example.com --manual --label "Work"
  ```
- **Non-Interactive / Headless / Scripting**:
  ```bash
  nut login https://cloud.example.com -u alice -p "app-password-token" --label "Work"
  ```

### Switching the Active Default Account
```bash
# Set default by label
nut account default Work

# Or set default by full account ID
nut account default alice@cloud.example.com
```

### Uploading to a Specific Account
Use the `--account` / `-a` flag on any upload command to override the active default for that invocation:
```bash
nut upload --account "Work" report.pdf
nut upload --account "bob@nextcloud.org" archive.zip
```

### Removing an Account
```bash
nut account delete "Work"
```
This removes the account from `~/.config/nut/accounts.json` and deletes the associated app token from your OS keychain.

---

## 3. Managing Accounts in the GUI

1. Open the **Accounts & Auth** tab.
2. The list of connected accounts displays each account's server URL, username, label, and whether it is marked as default.
3. Click **Set as Default** on any account card to switch the primary default.
4. Click **Select as Active** to switch the current session's upload destination.
5. Click **Logout / Remove** to purge credentials from the OS keychain.
