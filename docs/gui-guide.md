# GUI Desktop Application Guide

The **Nextcloud Upload Tool GUI** is a fast desktop application designed for streamlined file queuing, drag-and-drop uploads, public share creation, and multi-account management.

---

## 1. Interface Overview

The interface is structured into three primary sections:

1. **Header Bar**:
   - Displays the application branding.
   - **Account Switcher**: Quick-switch dropdown to select the target Nextcloud account for uploads.
   - **Navigation Tabs**: Toggle between **Upload Queue** and **Accounts & Auth**.

2. **Upload Queue Tab**:
   - **Target Settings**: Configure remote directory on Nextcloud (default: `Uploads`), toggle public share generation, and set optional link passwords.
   - **Drag & Drop Zone**: Visual target supporting OS file drops or manual system file browser selection (`Browse Files`).
   - **Queue List**: Per-file upload queue showing status badges (`queued`, `uploading`, `completed`, `error`), live percentage, byte counters, and action buttons (`▲`, `▼`, `✕`, inline `↻ Retry`).
   - **Global Actions**: `Upload All (N)` button and `Clear Completed` / `Clear All`.

3. **Accounts & Auth Tab**:
   - **Connected Accounts**: Interactive cards displaying connected usernames, server endpoints, custom labels, and active default status.
   - **Browser Login (Login Flow v2)**: One-click interactive authorization opening your web browser with support for 2FA / SSO.
   - **Manual App Password Entry**: Form for connecting with custom server URLs, usernames, and generated application tokens.

---

## 2. Step-by-Step Walkthrough

### Connecting Your First Account
1. Open the application and switch to the **Accounts & Auth** tab.
2. Enter your Nextcloud server URL (e.g. `https://cloud.example.com`).
3. Click **Authorize in Browser (Login Flow v2)**.
4. Your default browser opens the authorization page. Click **Grant Access**.
5. The GUI automatically polls and securely stores your token in your operating system's native keychain.

### Uploading Files & Creating Share Links
1. Navigate to the **Upload Queue** tab.
2. Drag and drop one or more files from Finder / Explorer / File Manager into the dropzone.
3. (Optional) Check **Generate public share link** and specify a **Share password** if needed.
4. Set the **Remote Directory** (e.g. `Projects/Assets` or `Uploads`).
5. Click **Upload All**.
6. Real-time progress bars update for both the total batch and each individual file.
7. Once finished:
   - Click **Copy Link** to copy the public share URL to clipboard.
   - Click **Copy Direct Download** to copy the raw download URL.

### Managing Failed Uploads
- If any file fails (e.g. due to network glitch or server quota), an error badge is displayed with details.
- Click the inline **↻ Retry** button next to that item to re-attempt the upload immediately without resetting the queue.
