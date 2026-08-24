---
project:
  name: "Nextcloud Upload Tool"
  id: "nextcloud-upload-tool"
  prefix: "NUT"

task-statuses:
  - value: "triage"
    label: "Triage"
    description: "The task is being evaluated and prioritized. It may still be missing important information."
  - value: "pending"
    label: "Pending"
    description: "The task is ready to be acted on."
  - value: "in_progress"
    label: "In Progress"
    description: "The task is currently being worked on."
  - value: "done"
    label: "Fixed"
    description: "The task has been completed."
  - value: "blocked"
    label: "Blocked"
    description: "The task cannot proceed due to an obstacle or dependency."
  - value: "cancelled"
    label: "Cancelled"
    description: "The task was decided against or is no longer relevant."

task-types:
  - value: "foundation"
    prefix: "FND"
    label: "Foundation"
    description: "Core project setup, repo structure, build system, and shared libraries."
  - value: "feature"
    prefix: "FEA"
    label: "Feature"
    description: "A new feature to implement."
  - value: "bug"
    prefix: "BUG"
    label: "Bug"
    description: "A defect or incorrect behavior to fix."
  - value: "chore"
    prefix: "CHR"
    label: "Chore"
    description: "Routine maintenance or cleanup work."
  - value: "integration"
    prefix: "INT"
    label: "Integration"
    description: "Connecting components together or integrating external systems."
---

# Nextcloud Upload Tool — Project Plan

This document defines the complete project roadmap and task tracking system for the **Nextcloud Upload Tool**, encompassing the CLI and GUI applications, shared backend library, credential storage, and distribution packaging.

---

## Task Management Quick Guide

> [!IMPORTANT]
> **For Agents & Contributors:**
> - **Anchor Tags as SSOT**: The HTML anchor tag `<a id="..." class="task" data-status="..." data-task-type="..."></a>` above each task heading is the single source of truth (SSOT) for ID, status, and task type.
> - **Task Details as SSOT**: The detailed task body is the SSOT for title, description, requirements checklist, and direct dependencies.
> - **Rendered Sections**: The [Tasks Summary](#tasks-summary) table and the bottom enum tables ([Task Statuses](#task-statuses) & [Task Types](#task-types)) are rendered views that must be synchronized whenever SSOT data changes.
> - **Single Task Scope**: Implement only one task at a time, test and verify, update [Tasks.md](#tasks-summary), and pause for user commit.
> - **Full Documentation**: Review the complete rules, schemas, and contributor workflows in [Task System Documentation & Rules](#task-system-rules) and [AGENTS.md](file:///Users/tom/Projects/Apps/NextcloudUploadTool/AGENTS.md) before editing or restructuring tasks.

---

<a id="tasks-summary"></a>
## Tasks Summary (Rendered from task details)

| ID | Title | Status | Type |
|---|---|---|---|
| [NUT-014](#nut-014) | Implement GUI Credential Management UI | Triage | Feature |
| [NUT-015](#nut-015) | Implement GUI Upload Progress Bars | Triage | Feature |
| [NUT-016](#nut-016) | Implement Shared Auth Token Reuse | Triage | Integration |
| [NUT-017](#nut-017) | Implement Multi-Account Switching (GUI + CLI) | Triage | Integration |
| [NUT-018](#nut-018) | Implement Packaging for macOS, Windows, Linux | Triage | Chore |
| [NUT-019](#nut-019) | Implement Homebrew/Winget/Chocolatey Manifests | Triage | Chore |
| [NUT-020](#nut-020) | Write Documentation + Examples | Triage | Chore |
| [NUT-022](#nut-022) | Implement CLI Shell Completions Generation | Triage | Feature |
| [NUT-023](#nut-023) | Write Comprehensive CLI Documentation and Automation Guides | Triage | Chore |
| [NUT-024](#nut-024) | Create Docker/Podman Nextcloud Integration Test Harness | Triage | Foundation |
| [NUT-001](#nut-001) | Establish Repository Structure | Fixed | Foundation |
| [NUT-002](#nut-002) | Implement Shared Rust Backend Library | Fixed | Foundation |
| [NUT-003](#nut-003) | Implement WebDAV Upload Logic | Fixed | Feature |
| [NUT-004](#nut-004) | Implement OCS Share Link Generation | Fixed | Feature |
| [NUT-005](#nut-005) | Implement Direct Download URL Builder | Fixed | Feature |
| [NUT-006](#nut-006) | Implement Credential Storage System | Fixed | Feature |
| [NUT-007](#nut-007) | Implement Multi-Account Support (Backend) | Fixed | Feature |
| [NUT-008](#nut-008) | Implement CLI Frontend | Fixed | Feature |
| [NUT-009](#nut-009) | Implement CLI Output Formatting Options | Fixed | Feature |
| [NUT-010](#nut-010) | Implement CLI Multi-file Upload Support | Fixed | Feature |
| [NUT-011](#nut-011) | Implement CLI Progress Reporting + pv Support | Fixed | Feature |
| [NUT-012](#nut-012) | Implement GUI (Tauri) Frontend | Fixed | Feature |
| [NUT-013](#nut-013) | Implement GUI File Queue + Drag-and-Drop | Fixed | Feature |
| [NUT-021](#nut-021) | Support Headless & SSH Remote Authentication Modes | Fixed | Feature |

---

<a id="task-details"></a>
## Detailed Tasks

<a id="nut-001" class="task" data-status="done" data-task-type="foundation"></a>
### Establish Repository Structure  
**ID:** NUT-001  
**Status:** Fixed  
**Type:** Foundation  

**Description:**  
Create the initial repository layout for the project, including the shared Rust backend library, CLI tool, and Tauri GUI application. This establishes the monorepo structure and build configuration.

**Requirements:**  
- [x] Create root-level Cargo workspace  
- [x] Create `nextcloud_client/` Rust crate  
- [x] Create `cli/` Rust crate  
- [x] Create `gui/` Tauri project  
- [x] Add `.editorconfig` and `.gitignore`  
- [x] Add README with project overview  

**Dependencies:**  
None


<a id="nut-002" class="task" data-status="done" data-task-type="foundation"></a>
### Implement Shared Rust Backend Library  
**ID:** NUT-002  
**Status:** Fixed  
**Type:** Foundation  

**Description:**  
Implement the shared Rust library that provides all core functionality: WebDAV upload, OCS share creation, credential storage, and progress callbacks. This library is used by both the CLI and GUI.

**Requirements:**  
- [x] Create `NextcloudClient` struct  
- [x] Implement async runtime setup  
- [x] Define error types  
- [x] Define configuration structs  
- [x] Provide high-level API for upload + share  

**Dependencies:**  
- NUT-001


<a id="nut-003" class="task" data-status="done" data-task-type="feature"></a>
### Implement WebDAV Upload Logic  
**ID:** NUT-003  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Implement file upload using Nextcloud’s WebDAV API. Support streaming uploads, file size detection, and progress callbacks.

**Requirements:**  
- [x] Implement PUT request to WebDAV endpoint  
- [x] Support streaming from file or stdin  
- [x] Provide progress callback API  
- [x] Handle authentication  

**Dependencies:**  
- NUT-002


<a id="nut-004" class="task" data-status="done" data-task-type="feature"></a>
### Implement OCS Share Link Generation  
**ID:** NUT-004  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Implement creation of public share links using the OCS Sharing API.

**Requirements:**  
- [x] POST to `/ocs/v2.php/apps/files_sharing/api/v1/shares`  
- [x] Parse JSON/XML response  
- [x] Extract share token  
- [x] Return share metadata  

**Dependencies:**  
- NUT-002


<a id="nut-005" class="task" data-status="done" data-task-type="feature"></a>
### Implement Direct Download URL Builder  
**ID:** NUT-005  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Generate direct-download URLs from share tokens.

**Requirements:**  
- [x] Build URL: `/index.php/s/<token>/download`  
- [x] Validate token format  
- [x] Provide helper API  

**Dependencies:**  
- NUT-004


<a id="nut-006" class="task" data-status="done" data-task-type="feature"></a>
### Implement Credential Storage System  
**ID:** NUT-006  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Implement secure credential storage using OS keychain when available, falling back to encrypted config files. Support Nextcloud Login Flow v2 (`/index.php/login/v2`) for browser-based interactive authentication (supporting 2FA/SSO) alongside manual app password entry.

**Requirements:**  
- [x] Implement Nextcloud Login Flow v2 client (initiate + browser open + polling)  
- [x] macOS Keychain support  
- [x] Windows Credential Manager support  
- [x] Linux Secret Service support  
- [x] Encrypted fallback file  
- [x] Store server URL, username, app password  

**Dependencies:**  
- NUT-002


<a id="nut-007" class="task" data-status="done" data-task-type="feature"></a>
### Implement Multi-Account Support (Backend)  
**ID:** NUT-007  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Support multiple Nextcloud accounts in the backend credential system.

**Requirements:**  
- [x] Add account list structure  
- [x] Add default account selection  
- [x] Add account switching API  

**Dependencies:**  
- NUT-006


<a id="nut-008" class="task" data-status="done" data-task-type="feature"></a>
### Implement CLI Frontend  
**ID:** NUT-008  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Implement the CLI tool using the shared backend library, including interactive browser login via Login Flow v2 and file upload commands.

**Requirements:**  
- [x] Add `login` command (browser-based Login Flow v2)  
- [x] Add `upload` command  
- [x] Add `--account` flag  
- [x] Add `--stdin` support  
- [x] Add error reporting  

**Dependencies:**  
- NUT-003  
- NUT-004  
- NUT-005  
- NUT-006


<a id="nut-009" class="task" data-status="done" data-task-type="feature"></a>
### Implement CLI Output Formatting Options  
**ID:** NUT-009  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Add output formatting options for scripting and automation.

**Requirements:**  
- [x] JSON output (`--json`)  
- [x] TSV output (`--tsv`)  
- [x] Flags for path/filename/url (`--url-only`, `--direct-url-only`)    
- [x] Quiet mode (`--quiet` / `-q`)  

**Dependencies:**  
- NUT-008


<a id="nut-010" class="task" data-status="done" data-task-type="feature"></a>
### Implement CLI Multi-file Upload Support  
**ID:** NUT-010  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Support uploading multiple files in a single CLI invocation, including recursive directory uploading, glob expansions, batch progress summaries, and `--continue-on-error`.

**Requirements:**  
- [x] Accept multiple file paths and globs  
- [x] Recursive directory upload support (`--recursive` / `-r`)  
- [x] Continue on error option (`--continue-on-error` / `-c`)  
- [x] Aggregate upload summary (count, total bytes, share links)  
- [x] JSON array and multi-row TSV output formatting for multi-file batches  

**Dependencies:**  
- NUT-008  
- NUT-009


<a id="nut-011" class="task" data-status="done" data-task-type="feature"></a>
### Implement CLI Progress Reporting + pv Support  
**ID:** NUT-011  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Integrate rich progress reporting with `indicatif` (speed, ETA, byte counters), pipe-friendly detection (e.g. `pv` and headless/script pipes), and manual size hints for stdin streams.

**Requirements:**  
- [x] Detect file size & support `--size` hint for stdin streams  
- [x] Rich terminal progress bar with speed (MB/s), ETA, bytes transferred, and percentage  
- [x] Auto-detect TTY: silence progress bars when piped to downstream tools or files  
- [x] Support explicit `--no-progress` flag  
- [x] Support piping directly from `pv` or Unix pipelines without display conflicts  

**Dependencies:**  
- NUT-003  
- NUT-008


<a id="nut-012" class="task" data-status="done" data-task-type="feature"></a>
### Implement GUI (Tauri) Frontend  
**ID:** NUT-012  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Implement the Tauri-based GUI application with a clean, responsive layout connecting the React frontend to the shared Rust backend.

**Requirements:**  
- [x] Connect shared Rust backend library to Tauri commands in `gui/src-tauri`  
- [x] Implement responsive application layout with navigation & account indicator  
- [x] Implement file upload UI with destination path, public share link generation, and password protection  
- [x] Implement real-time feedback with share links, direct download URLs, and copy actions  

**Dependencies:**  
- NUT-002  
- NUT-003  
- NUT-004  
- NUT-005  
- NUT-006


<a id="nut-013" class="task" data-status="done" data-task-type="feature"></a>
### Implement GUI File Queue + Drag-and-Drop  
**ID:** NUT-013  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Add drag-and-drop file support and a queue system for multiple uploads.

**Requirements:**  
- [x] Drag-and-drop area  
- [x] File queue list  
- [x] Remove/reorder items  

**Dependencies:**  
- NUT-012


<a id="nut-014" class="task" data-status="triage" data-task-type="feature"></a>
### Implement GUI Credential Management UI  
**ID:** NUT-014  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add UI for managing accounts, logging in (including one-click browser authorization via Login Flow v2), logging out, and switching accounts.

**Requirements:**  
- [ ] Account list UI  
- [ ] Browser-based login button (Login Flow v2)  
- [ ] Manual login form (server/user/token)  
- [ ] Logout button  
- [ ] Switch account dropdown  

**Dependencies:**  
- NUT-007  
- NUT-012


<a id="nut-015" class="task" data-status="triage" data-task-type="feature"></a>
### Implement GUI Upload Progress Bars  
**ID:** NUT-015  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add per-file and total progress bars to the GUI.

**Requirements:**  
- [ ] Per-file progress  
- [ ] Total progress  
- [ ] Error display  

**Dependencies:**  
- NUT-003  
- NUT-012  
- NUT-013


<a id="nut-016" class="task" data-status="triage" data-task-type="integration"></a>
### Implement Shared Auth Token Reuse  
**ID:** NUT-016  
**Status:** Triage  
**Type:** Integration  

**Description:**  
Ensure both CLI and GUI reuse the same credential store and cached tokens.

**Requirements:**  
- [ ] Shared credential backend  
- [ ] Shared token cache  
- [ ] Unified config format  

**Dependencies:**  
- NUT-006  
- NUT-008  
- NUT-012


<a id="nut-017" class="task" data-status="triage" data-task-type="integration"></a>
### Implement Multi-Account Switching (GUI + CLI)  
**ID:** NUT-017  
**Status:** Triage  
**Type:** Integration  

**Description:**  
Add multi-account switching to both CLI and GUI.

**Requirements:**  
- [ ] CLI `--account` flag  
- [ ] GUI dropdown  
- [ ] Shared backend logic  

**Dependencies:**  
- NUT-007  
- NUT-008  
- NUT-014


<a id="nut-018" class="task" data-status="triage" data-task-type="chore"></a>
### Implement Packaging for macOS, Windows, Linux  
**ID:** NUT-018  
**Status:** Triage  
**Type:** Chore  

**Description:**  
Package the CLI and GUI for distribution.

**Requirements:**  
- [ ] macOS `.app` + `.dmg`  
- [ ] Windows `.exe` + installer  
- [ ] Linux `.deb` + `.rpm`  
- [ ] Static CLI binaries  

**Dependencies:**  
- NUT-008  
- NUT-012


<a id="nut-019" class="task" data-status="triage" data-task-type="chore"></a>
### Implement Homebrew/Winget/Chocolatey Manifests  
**ID:** NUT-019  
**Status:** Triage  
**Type:** Chore  

**Description:**  
Add package manager manifests for easy installation.

**Requirements:**  
- [ ] Homebrew formula  
- [ ] Winget manifest  
- [ ] Chocolatey package  
- [ ] AUR PKGBUILD  

**Dependencies:**  
- NUT-018


<a id="nut-020" class="task" data-status="triage" data-task-type="chore"></a>
### Write Documentation + Examples  
**ID:** NUT-020  
**Status:** Triage  
**Type:** Chore  

**Description:**  
Write comprehensive project documentation covering installation, GUI usage, multi-account setup, and overall project architecture.

**Requirements:**  
- [ ] GUI overview and visual walkthrough  
- [ ] Cross-platform installation instructions  
- [ ] Multi-account management guide  
- [ ] Architecture and developer setup documentation  

**Dependencies:**  
- NUT-012  
- NUT-017  
- NUT-018


<a id="nut-021" class="task" data-status="done" data-task-type="feature"></a>
### Support Headless & SSH Remote Authentication Modes  
**ID:** NUT-021  
**Status:** Fixed  
**Type:** Feature  

**Description:**  
Ensure smooth authentication experiences when running the CLI over SSH or in headless environments where a local graphical browser cannot be launched automatically.

**Requirements:**  
- [x] Terminal URL fallback: print clickable Login Flow v2 URL in terminal when browser fails to launch  
- [x] Add `--no-browser` flag to print URL and wait for authorization without attempting to open desktop browser  
- [x] Add interactive manual terminal prompt (`--manual`) for username and app password input  
- [x] Add non-interactive flag inputs (`--username`, `--app-password`) for automated provisioning and CI/CD  

**Dependencies:**  
- NUT-006  
- NUT-008


<a id="nut-022" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Shell Completions Generation  
**ID:** NUT-022  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add automated shell completion script generation using `clap_complete` for major shells (`bash`, `zsh`, `fish`, `powershell`, `elvish`).

**Requirements:**  
- [ ] Add `clap_complete` crate dependency  
- [ ] Implement `nut completions <SHELL>` subcommand  
- [ ] Support `bash`, `zsh`, `fish`, `powershell`, and `elvish` output to stdout  
- [ ] Include quick installation instructions in command help  

**Dependencies:**  
- NUT-008


<a id="nut-023" class="task" data-status="triage" data-task-type="chore"></a>
### Write Comprehensive CLI Documentation and Automation Guides  
**ID:** NUT-023  
**Status:** Triage  
**Type:** Chore  

**Description:**  
Write dedicated CLI reference documentation and practical automation guides for scripting, CI/CD, and Unix pipeline workflows.

**Requirements:**  
- [ ] Document all CLI subcommands (`login`, `upload`, `accounts`, `completions`) and flags in `README.md`  
- [ ] Provide practical recipes for piping data (`stdin`, `pv`, `curl`, `mysqldump`)  
- [ ] Provide scripting examples parsing `--json`, `--tsv`, `--url-only`, and `--direct-url-only` with `jq` and `xargs`  
- [ ] Document headless SSH and CI/CD automated provisioning with `--username` and `--app-password`  

**Dependencies:**  
- NUT-008  
- NUT-009  
- NUT-010  
- NUT-011  
- NUT-021


<a id="nut-024" class="task" data-status="triage" data-task-type="foundation"></a>
### Create Docker/Podman Nextcloud Integration Test Harness  
**ID:** NUT-024  
**Status:** Triage  
**Type:** Foundation  

**Description:**  
Create a containerized integration test harness using Docker or Podman to spin up an ephemeral, fresh Nextcloud instance, seed an admin test account and credentials, and execute end-to-end integration tests for the CLI against real WebDAV and OCS sharing endpoints.

**Requirements:**  
- [ ] Provide setup script (`scripts/test-server-up.sh`) using Docker/Podman compose to launch and initialize a fresh Nextcloud container  
- [ ] Automatically configure admin user credentials, disable password expiration, and establish app password / token  
- [ ] Provide teardown script (`scripts/test-server-down.sh`) for clean container and volume disposal  
- [ ] Implement Rust integration test suite (`tests/cli_integration.rs` or `cli/tests/`) running real CLI uploads, folder creations, stdin streams, and public share link verifications  
- [ ] Support automated CI/CD execution of the integration harness  

**Dependencies:**  
- NUT-008  
- NUT-009  
- NUT-010  
- NUT-011  
- NUT-021

---

<a id="task-system-rules"></a>
## Task System Documentation & Rules

This section defines how contributors and AI agents must interpret, update, and maintain this `Tasks.md` file.

### Single Source of Truth (SSOT)

- **Task Anchor Tag**: The HTML anchor tag directly above each task title is the SSOT for machine-readable attributes:
  - **Task ID**: `id` attribute (lowercase, e.g. `id="nut-001"`)
  - **Task Status**: `data-status` attribute (must match a value in `task-statuses` frontmatter)
  - **Task Type**: `data-task-type` attribute (must match a value in `task-types` frontmatter)
- **Detailed Task Section**: The markdown text under the task heading is the SSOT for human-readable content:
  - Task title (`### Title`)
  - Task ID label (`**ID:** NUT-XXX`)
  - Task status label (`**Status:** ...`)
  - Task type label (`**Type:** ...`)
  - Description, Requirements checklist (`- [ ] ...`), and Dependencies.
- **Rendered Sections**: Tables marked as `(Rendered from ...)` are non-canonical views generated from frontmatter and task anchor/detail sections.

### Task Lifecycle & Status Values

Tasks progress through defined statuses:
1. `triage`: Under initial evaluation and specification. Missing requirements allowed.
2. `pending`: Scope defined and ready for active work.
3. `in_progress`: Active implementation in progress.
4. `done`: Fixed. Work complete, requirements checked, and verified.
5. `blocked`: Blocked by an external obstacle or unmet dependency.
6. `cancelled`: Deprecated or abandoned.

### Formatting & Identification Invariants

- **Task ID Schema**: `${project.prefix}-XXX` where `XXX` is a zero-padded monotonic 3-digit number (e.g. `NUT-001`).
- IDs must be monotonic and never renumbered or reused.
- Anchor IDs are lowercase: `<a id="nut-001" class="task" data-status="pending" data-task-type="foundation"></a>`.
- Table and header IDs are uppercase: `[NUT-001](#nut-001)`.
- Dependencies list **direct dependencies only** (no transitive dependencies).
- Checklists must use standard GitHub Markdown `- [ ]` and `- [x]`.
- Spacing: Use two blank lines between detailed task blocks. Horizontal rules (`---`) are reserved for separating major top-level sections.

### Table & Section Sorting Rules

- **Tasks Summary Table**:
  - Non-fixed/open tasks (`triage`, `pending`, `in_progress`, `blocked`) are positioned at the top.
  - Fixed/done tasks are positioned at the bottom, sorted in **ascending numeric order** by task ID (`NUT-001`, `NUT-002`, `NUT-003`, ...).
- **Detailed Tasks Section**:
  - All detailed task sections remain in **strictly ascending numeric order** (`NUT-001`, `NUT-002`, `NUT-003`, ...).

### Contributor & Agent Workflow

1. **One Task at a Time**: Only one task is moved to `in_progress` and worked on per development turn.
2. **Verification First**: All unit and workspace tests (`cargo test --workspace`) and frontend builds (`cd gui && npm run build`) must pass cleanly before marking a task Fixed.
3. **Commit Handoff**: The agent updates [Tasks.md](#tasks-summary) upon task completion and pauses for the user to make the git commit. The agent does not execute commits or destructive git operations.

---

<a id="task-statuses"></a>
## Task Statuses (Rendered from task-statuses)

| Value | Label | Description |
|---|---|---|
| `triage` | Triage | The task is being evaluated and prioritized. It may still be missing important information. |
| `pending` | Pending | The task is ready to be acted on. |
| `in_progress` | In Progress | The task is currently being worked on. |
| `done` | Fixed | The task has been completed. |
| `blocked` | Blocked | The task cannot proceed due to an obstacle or dependency. |
| `cancelled` | Cancelled | The task was decided against or is no longer relevant. |

---

<a id="task-types"></a>
## Task Types (Rendered from task-types)

| Value | Prefix | Label | Description |
|---|---|---|---|
| `foundation` | FND | Foundation | Core project setup, repo structure, build system, and shared libraries. |
| `feature` | FEA | Feature | A new feature to implement. |
| `bug` | BUG | Bug | A defect or incorrect behavior to fix. |
| `chore` | CHR | Chore | Routine maintenance or cleanup work. |
| `integration` | INT | Integration | Connecting components together or integrating external systems. |
