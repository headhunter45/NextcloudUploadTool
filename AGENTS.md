# Agent Workflow & Project Guidelines

This document defines the operating rules, task lifecycle, and development conventions for AI agents and contributors working in the **Nextcloud Upload Tool** repository.

---

## 1. Core Operating Rules

### Single-Task Execution
- **Strictly one task at a time**: Never bundle multiple tasks or implement features outside the currently assigned task.
- **Workflow Steps**:
  1. Inspect [Tasks.md](file:///Users/tom/Projects/Apps/NextcloudUploadTool/Tasks.md) to identify the next prioritized task.
  2. Transition the task status to `in_progress` in [Tasks.md](file:///Users/tom/Projects/Apps/NextcloudUploadTool/Tasks.md).
  3. Implement only the requirements specified in that task's checklist.
  4. Verify changes using the test and build suite (`cargo test --workspace` and frontend build in `gui`).
  5. Update [Tasks.md](file:///Users/tom/Projects/Apps/NextcloudUploadTool/Tasks.md) to mark the task `done` (Fixed), checking off completed requirements and updating the summary table.
  6. Pause and present results to the user for review and git commit. Do not proceed to the next task until the user acknowledges.

### Git Operations
- **User-Managed Commits**: All `git commit`, branching, rebasing, resets, and destructive git commands are handled exclusively by the user.
- **Agent Git Scope**:
  - Allowed: Read-only inspection (`git status`, `git diff`, `git log`) and staging (`git add`, `git rm`) if needed.
  - Forbidden: Making commits, modifying files under `.git/`, or modifying git history.

### Environment & Build Commands
- Node version: Node 20 as specified in [`.nvmrc`](file:///Users/tom/Projects/Apps/NextcloudUploadTool/.nvmrc).
- Backend tests: `cargo test --workspace`
- Frontend build: `cd gui && npm run build`

---

## 2. Tasks.md Maintenance Rules

### Single Source of Truth (SSOT)
- **Anchor Tags**: `<a id="nut-xxx" class="task" data-status="..." data-task-type="..."></a>` directly above each task heading is the SSOT for machine-readable attributes (`id`, `data-status`, `data-task-type`).
- **Task Details**: The markdown body under each heading is the SSOT for title, description, checklist items (`- [x]`), and direct dependencies.

### Invariant Ordering
- **Tasks Summary Table**:
  - Open/Active tasks (`triage`, `pending`, `in_progress`, `blocked`) are listed at the top.
  - Completed (`done` / Fixed) tasks are listed at the bottom, sorted in **ascending numeric order** (`NUT-001`, `NUT-002`, ...).
- **Detailed Tasks Section**:
  - All detailed task entries must remain in **strict monotonic numeric ascending order** (`NUT-001`, `NUT-002`, `NUT-003`, ...).
  - Use two blank lines between detailed task blocks.

---

## 3. Communication & Code Style
- Always use clickable GitHub-style file links (`[file.rs](file:///path/to/file.rs)`) and symbol links when referencing files or types in responses.
- Keep responses focused, concise, and aligned with the single task being executed.
