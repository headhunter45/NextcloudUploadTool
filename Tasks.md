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
> - **Full Documentation**: Review the complete rules, schemas, and contributor workflows in [Task System Documentation & Rules](#task-system-rules) before editing or restructuring tasks.

---

<a id="tasks-summary"></a>
## Tasks Summary (Rendered from task details)

| ID | Title | Status | Type |
|---|---|---|---|
| [NUT-001](#nut-001) | Establish Repository Structure | Fixed | Foundation |
| [NUT-002](#nut-002) | Implement Shared Rust Backend Library | Fixed | Foundation |
| [NUT-003](#nut-003) | Implement WebDAV Upload Logic | Fixed | Feature |
| [NUT-004](#nut-004) | Implement OCS Share Link Generation | Fixed | Feature |
| [NUT-005](#nut-005) | Implement Direct Download URL Builder | Fixed | Feature |
| [NUT-006](#nut-006) | Implement Credential Storage System | Fixed | Feature |
| [NUT-007](#nut-007) | Implement Multi-Account Support (Backend) | Triage | Feature |
| [NUT-008](#nut-008) | Implement CLI Frontend | Triage | Feature |
| [NUT-009](#nut-009) | Implement CLI Output Formatting Options | Triage | Feature |
| [NUT-010](#nut-010) | Implement CLI Multi-file Upload Support | Triage | Feature |
| [NUT-011](#nut-011) | Implement CLI Progress Reporting + pv Support | Triage | Feature |
| [NUT-012](#nut-012) | Implement GUI (Tauri) Frontend | Triage | Feature |
| [NUT-013](#nut-013) | Implement GUI File Queue + Drag-and-Drop | Triage | Feature |
| [NUT-014](#nut-014) | Implement GUI Credential Management UI | Triage | Feature |
| [NUT-015](#nut-015) | Implement GUI Upload Progress Bars | Triage | Feature |
| [NUT-016](#nut-016) | Implement Shared Auth Token Reuse | Triage | Integration |
| [NUT-017](#nut-017) | Implement Multi-Account Switching (GUI + CLI) | Triage | Integration |
| [NUT-018](#nut-018) | Implement Packaging for macOS, Windows, Linux | Triage | Chore |
| [NUT-019](#nut-019) | Implement Homebrew/Winget/Chocolatey Manifests | Triage | Chore |
| [NUT-020](#nut-020) | Write Documentation + Examples | Triage | Chore |

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


<a id="nut-007" class="task" data-status="triage" data-task-type="feature"></a>
### Implement Multi-Account Support (Backend)  
**ID:** NUT-007  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Support multiple Nextcloud accounts in the backend credential system.

**Requirements:**  
- [ ] Add account list structure  
- [ ] Add default account selection  
- [ ] Add account switching API  

**Dependencies:**  
- NUT-006


<a id="nut-008" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Frontend  
**ID:** NUT-008  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement the CLI tool using the shared backend library, including interactive browser login via Login Flow v2 and file upload commands.

**Requirements:**  
- [ ] Add `login` command (browser-based Login Flow v2)  
- [ ] Add `upload` command  
- [ ] Add `--account` flag  
- [ ] Add `--stdin` support  
- [ ] Add error reporting  

**Dependencies:**  
- NUT-003  
- NUT-004  
- NUT-005  
- NUT-006


<a id="nut-009" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Output Formatting Options  
**ID:** NUT-009  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add output formatting options for scripting and automation.

**Requirements:**  
- [ ] JSON output  
- [ ] TSV output  
- [ ] Flags for path/filename/url    
- [ ] Quiet mode  

**Dependencies:**  
- NUT-008


<a id="nut-010" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Multi-file Upload Support  
**ID:** NUT-010  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Support uploading multiple files in a single CLI invocation.

**Requirements:**  
- [ ] Accept multiple file paths  
- [ ] Loop over uploads  
- [ ] Return list of results  

**Dependencies:**  
- NUT-008


<a id="nut-011" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Progress Reporting + pv Support  
**ID:** NUT-011  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Integrate with `pv` for progress reporting and support streaming uploads.

**Requirements:**  
- [ ] Detect file size  
- [ ] Report progress to stdout  
- [ ] Support piping from `pv`  

**Dependencies:**  
- NUT-003  
- NUT-008


<a id="nut-012" class="task" data-status="triage" data-task-type="feature"></a>
### Implement GUI (Tauri) Frontend  
**ID:** NUT-012  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement the Tauri-based GUI application.

**Requirements:**  
- [ ] Create window layout  
- [ ] Connect Rust backend    
- [ ] Implement basic upload UI  

**Dependencies:**  
- NUT-002  
- NUT-003  
- NUT-004  
- NUT-005  
- NUT-006


<a id="nut-013" class="task" data-status="triage" data-task-type="feature"></a>
### Implement GUI File Queue + Drag-and-Drop  
**ID:** NUT-013  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add drag-and-drop file support and a queue system for multiple uploads.

**Requirements:**  
- [ ] Drag-and-drop area  
- [ ] File queue list  
- [ ] Remove/reorder items  

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
Write documentation for installation, usage, examples, and API reference.

**Requirements:**  
- [ ] CLI usage docs  
- [ ] GUI usage docs  
- [ ] Multi-account docs  
- [ ] Examples for scripting  

**Dependencies:**  
- NUT-009  
- NUT-017  
- NUT-018

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

### Maintenance Procedures

- **Adding a Task**: Append the next sequential ID, create the anchor tag and detailed section separated by two blank lines, and add the row to [Tasks Summary](#tasks-summary).
- **Updating Status/Type**: Update the `data-status` and `data-task-type` attributes in the task anchor tag, the text fields in the task detail section, and the corresponding row in [Tasks Summary](#tasks-summary).
- **Modifying Enums**: Any changes to available statuses or types must originate in the YAML frontmatter (`task-statuses` / `task-types`) and be re-rendered into the corresponding reference tables below.

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
