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

This document defines the full project plan for the **Nextcloud Upload Tool**, including the CLI and GUI applications, shared backend library, credential system, and packaging/distribution.

It follows the same conventions as your existing monorepo task system:

- Anchor tags are the **single source of truth** for task ID, status, and type  
- The summary table is a rendered view of the detailed tasks  
- Task dependencies are direct-only  
- IDs follow the format: `${project.prefix}-XXX` → `NUT-001`, `NUT-002`, etc.

---

Here’s the clean, unrendered **Notes / Directions for Agents & Users** section you asked for — formatted exactly like the style in your old Tasks.md, but adapted for your new single‑project document.

Every line is prefixed with `%` so you can copy/paste safely.  
You can append this block **just before the Rendered Task Statuses section** in your file.

---

## Task System Documentation (Requirements for Agents)

This section defines how agents and contributors must interpret, update, and maintain this Tasks.md file.  
It mirrors the conventions of the original multi‑project Tasks.md, adapted for a single‑project workflow.

### **Single Source of Truth (SSOT)**

- The **anchor tag** for each task is the SSOT for:
  - **Task ID** → from the `id` attribute  
  - **Task Status** → from the `data-status` attribute  
  - **Task Type** → from the `data-task-type` attribute  

- The **Detailed Task section** is the SSOT for:
  - Task title  
  - Task description  
  - Requirements checklist  
  - Dependencies  

- The **Tasks Summary table** is a *rendered view* of the SSOT.  
  It must be updated whenever SSOT attributes or task details change.

### **Rendered Sections**

Sections marked with **“(Rendered from …)”** are generated from frontmatter or SSOT data.  
These sections must be updated whenever:
- A task is added  
- A task’s ID, status, or type changes  
- A task type or status is added/removed/renamed in frontmatter  

Rendered sections include:
- Tasks Summary table  
- Task Statuses table  
- Task Types table  

These sections should never be manually edited except to regenerate them.

### **Task Identification**

- Every task begins with an anchor tag of the form:
  ```
  <a id="nut-001" class="task" data-status="pending" data-task-type="foundation"></a>
  ```
- The `id` attribute must match the task’s ID in the summary table.
- The `class="task"` attribute identifies the start of a detailed task section.

### **Task ID Format**

- All task IDs follow the format:  
  **`${project.prefix}-XXX`**  
  where `XXX` is a zero‑padded, monotonic 3‑digit number.

- IDs must never be reused or renumbered.  
  New tasks always append the next available number.

### **Task Lifecycle**

Tasks follow this lifecycle:

1. **Triage** — Initial state; incomplete information allowed  
2. **Pending** — Ready for implementation  
3. **In Progress** — Work is actively being done  
4. **Fixed / Done** — Work completed  
5. **Blocked** — Cannot proceed due to external dependency  
6. **Cancelled** — No longer relevant or intentionally discarded  

### **Adding New Tasks**

When adding a new task:

1. Create a new anchor tag with the next available ID  
2. Add a detailed task section immediately after the anchor  
3. Update the Tasks Summary table  
4. Ensure the task is placed in numeric order in the detailed list  

### **Missing Task Details**

If a task appears in the Tasks Summary table **without** a corresponding detailed section:

- Create a new detailed section for it  
- Insert it in numeric order  
- Use placeholder text if requirements are unknown  

### **Dependencies**

- Only **direct dependencies** should be listed  
- Avoid listing transitive dependencies  
- Dependencies must reference task IDs exactly  

### **Frontmatter Rules**

- The `project` section is the SSOT for:
  - Project name  
  - Project ID  
  - Task prefix  

- The `task-statuses` and `task-types` sections define the SSOT for:
  - Allowed status values  
  - Allowed type values  
  - Their labels  
  - Their descriptions  

- Rendered tables must reflect these values exactly.

### **Agent Responsibilities**

Agents modifying this file must:

- Update rendered sections when SSOT changes  
- Maintain numeric ordering of detailed tasks  
- Ensure anchor tags remain valid and consistent  
- Preserve the frontmatter structure  
- Avoid altering IDs or removing tasks  
- Add missing detailed sections when needed  

### **User Responsibilities**

- Users should modify only the detailed task sections when changing requirements  
- Users should not manually edit rendered tables except to regenerate them  
- Users should avoid renumbering tasks or altering IDs  

### **General Formatting Rules**

- All checklists use GitHub-style `[ ]` / `[x]` syntax  
- All anchor tags appear directly above their task’s heading  
- All headings use `###` for task titles  
- All rendered tables use pipes (`|`) and must align with SSOT  
- All tasks must include a **Description**, **Requirements**, and **Dependencies** section  

---



<a id="tasks-summary"></a>
## Tasks Summary

| ID       | Title                                           | Status      | Type        |
|----------|--------------------------------------------------|-------------|-------------|
| NUT-001  | Establish Repository Structure                   | Pending     | Foundation  |
| NUT-002  | Implement Shared Rust Backend Library            | Triage      | Foundation  |
| NUT-003  | Implement WebDAV Upload Logic                    | Triage      | Feature     |
| NUT-004  | Implement OCS Share Link Generation              | Triage      | Feature     |
| NUT-005  | Implement Direct Download URL Builder            | Triage      | Feature     |
| NUT-006  | Implement Credential Storage System              | Triage      | Feature     |
| NUT-007  | Implement Multi-Account Support (Backend)        | Triage      | Feature     |
| NUT-008  | Implement CLI Frontend                           | Triage      | Feature     |
| NUT-009  | Implement CLI Output Formatting Options          | Triage      | Feature     |
| NUT-010  | Implement CLI Multi-file Upload Support          | Triage      | Feature     |
| NUT-011  | Implement CLI Progress Reporting + pv Support    | Triage      | Feature     |
| NUT-012  | Implement GUI (Tauri) Frontend                   | Triage      | Feature     |
| NUT-013  | Implement GUI File Queue + Drag-and-Drop         | Triage      | Feature     |
| NUT-014  | Implement GUI Credential Management UI           | Triage      | Feature     |
| NUT-015  | Implement GUI Upload Progress Bars               | Triage      | Feature     |
| NUT-016  | Implement Shared Auth Token Reuse                | Triage      | Integration |
| NUT-017  | Implement Multi-Account Switching (GUI + CLI)    | Triage      | Integration |
| NUT-018  | Implement Packaging for macOS, Windows, Linux    | Triage      | Chore       |
| NUT-019  | Implement Homebrew/Winget/Chocolatey Manifests   | Triage      | Chore       |
| NUT-020  | Write Documentation + Examples                   | Triage      | Chore       |

---

<a id="task-details"></a>
## Detailed Tasks

---

<a id="nut-001" class="task" data-status="pending" data-task-type="foundation"></a>
### Establish Repository Structure  
**ID:** NUT-001  
**Status:** Pending  
**Type:** Foundation  

**Description:**  
Create the initial repository layout for the project, including the shared Rust backend library, CLI tool, and Tauri GUI application. This establishes the monorepo structure and build configuration.

**Requirements:**  
- [ ] Create root-level Cargo workspace  
- [ ] Create `nextcloud_client/` Rust crate  
- [ ] Create `cli/` Rust crate  
- [ ] Create `gui/` Tauri project  
- [ ] Add `.editorconfig` and `.gitignore`  
- [ ] Add README with project overview  

**Dependencies:**  
None

---

<a id="nut-002" class="task" data-status="triage" data-task-type="foundation"></a>
### Implement Shared Rust Backend Library  
**ID:** NUT-002  
**Status:** Triage  
**Type:** Foundation  

**Description:**  
Implement the shared Rust library that provides all core functionality: WebDAV upload, OCS share creation, credential storage, and progress callbacks. This library is used by both the CLI and GUI.

**Requirements:**  
- [ ] Create `NextcloudClient` struct  
- [ ] Implement async runtime setup  
- [ ] Define error types  
- [ ] Define configuration structs  
- [ ] Provide high-level API for upload + share  

**Dependencies:**  
- NUT-001

---

<a id="nut-003" class="task" data-status="triage" data-task-type="feature"></a>
### Implement WebDAV Upload Logic  
**ID:** NUT-003  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement file upload using Nextcloud’s WebDAV API. Support streaming uploads, file size detection, and progress callbacks.

**Requirements:**  
- [ ] Implement PUT request to WebDAV endpoint  
- [ ] Support streaming from file or stdin  
- [ ] Provide progress callback API  
- [ ] Handle authentication  

**Dependencies:**  
- NUT-002

---

<a id="nut-004" class="task" data-status="triage" data-task-type="feature"></a>
### Implement OCS Share Link Generation  
**ID:** NUT-004  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement creation of public share links using the OCS Sharing API.

**Requirements:**  
- [ ] POST to `/ocs/v2.php/apps/files_sharing/api/v1/shares`  
- [ ] Parse JSON/XML response  
- [ ] Extract share token  
- [ ] Return share metadata  

**Dependencies:**  
- NUT-002

---

<a id="nut-005" class="task" data-status="triage" data-task-type="feature"></a>
### Implement Direct Download URL Builder  
**ID:** NUT-005  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Generate direct-download URLs from share tokens.

**Requirements:**  
- [ ] Build URL: `/index.php/s/<token>/download`  
- [ ] Validate token format  
- [ ] Provide helper API  

**Dependencies:**  
- NUT-004

---

<a id="nut-006" class="task" data-status="triage" data-task-type="feature"></a>
### Implement Credential Storage System  
**ID:** NUT-006  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement secure credential storage using OS keychain when available, falling back to encrypted config files.

**Requirements:**  
- [ ] macOS Keychain support  
- [ ] Windows Credential Manager support  
- [ ] Linux Secret Service support  
- [ ] Encrypted fallback file  
- [ ] Store server URL, username, app password  

**Dependencies:**  
- NUT-002

---

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

---

<a id="nut-008" class="task" data-status="triage" data-task-type="feature"></a>
### Implement CLI Frontend  
**ID:** NUT-008  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Implement the CLI tool using the shared backend library.

**Requirements:**  
- [ ] Add `upload` command  
- [ ] Add `--account` flag  
- [ ] Add `--stdin` support  
- [ ] Add error reporting  

**Dependencies:**  
- NUT-003  
- NUT-004  
- NUT-005  
- NUT-006

---

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

---

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

---

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

---

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

---

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

---

<a id="nut-014" class="task" data-status="triage" data-task-type="feature"></a>
### Implement GUI Credential Management UI  
**ID:** NUT-014  
**Status:** Triage  
**Type:** Feature  

**Description:**  
Add UI for managing accounts, logging in, logging out, and switching accounts.

**Requirements:**  
- [ ] Account list UI  
- [ ] Login form  
- [ ] Logout button  
- [ ] Switch account dropdown  

**Dependencies:**  
- NUT-007  
- NUT-012

---

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

---

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

---

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

---

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

---

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

---

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

## Rendered Task Statuses
| Value       | Label       | Description                                                                                 |
|-------------|-------------|---------------------------------------------------------------------------------------------|
| triage      | Triage      | The task is being evaluated and prioritized. It may still be missing important information. |
| pending     | Pending     | The task is ready to be acted on.                                                           |
| in_progress | In Progress | The task is currently being worked on.                                                      |
| done        | Fixed       | The task has been completed.                                                                |
| blocked     | Blocked     | The task cannot proceed due to an obstacle or dependency.                                   |
| cancelled   | Cancelled   | The task was decided against or is no longer relevant.                                      |
