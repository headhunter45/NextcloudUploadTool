import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";

interface StoredAccount {
  id: string;
  label?: string;
  username: string;
  server_url: string;
  is_default: boolean;
}

interface LoginFlowInitPayload {
  login_url: string;
  poll_endpoint: string;
  poll_token: string;
}

interface FileInfo {
  path: string;
  name: string;
  size: number;
}

interface QueueItem {
  id: string;
  path: string;
  name: string;
  size: number;
  bytesTransferred: number;
  status: "pending" | "uploading" | "done" | "error";
  errorMessage?: string;
  result?: GuiUploadResult;
}

interface GuiUploadResult {
  file_path: string;
  file_name: string;
  remote_path: string;
  bytes_uploaded: number;
  share_url?: string;
  direct_download_url?: string;
}

interface GuiUploadProgressPayload {
  file_path: string;
  bytes_transferred: number;
  total_bytes?: number;
}

export function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<"upload" | "accounts">("upload");

  // Account State
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // File Queue State
  const [fileQueue, setFileQueue] = useState<QueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Upload Form State
  const [remoteDir, setRemoteDir] = useState<string>("Uploads");
  const [createShare, setCreateShare] = useState<boolean>(true);
  const [sharePassword, setSharePassword] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [currentUploadingIndex, setCurrentUploadingIndex] = useState<number>(0);

  // Add Account State
  const [authMode, setAuthMode] = useState<"browser" | "manual">("browser");
  const [serverUrl, setServerUrl] = useState<string>("https://");
  const [accountLabel, setAccountLabel] = useState<string>("");
  const [setAsDefault, setSetAsDefault] = useState<boolean>(true);

  // Manual Auth Fields
  const [manualUsername, setManualUsername] = useState<string>("");
  const [manualPassword, setManualPassword] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  // Browser Flow State
  const [loginFlowPayload, setLoginFlowPayload] = useState<LoginFlowInitPayload | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  const fileQueueRef = useRef(fileQueue);
  fileQueueRef.current = fileQueue;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const loadAccounts = async () => {
    try {
      const list = await invoke<StoredAccount[]>("list_accounts");
      setAccounts(list);
      const def = list.find((a) => a.is_default);
      if (def) {
        setSelectedAccount((prev) => (list.some((a) => a.id === prev) ? prev : def.id));
      } else if (list.length > 0) {
        setSelectedAccount((prev) => (list.some((a) => a.id === prev) ? prev : list[0].id));
      } else {
        setSelectedAccount("");
      }
    } catch (e) {
      console.error("Failed to load accounts:", e);
    }
  };

  const addPathsToQueue = async (paths: string[]) => {
    if (!paths || paths.length === 0) return;

    const existingPaths = new Set(fileQueueRef.current.map((q) => q.path));
    const newItems: QueueItem[] = [];

    for (const p of paths) {
      if (existingPaths.has(p)) continue;
      existingPaths.add(p);

      try {
        const info = await invoke<FileInfo>("get_file_info", { filePath: p });
        newItems.push({
          id: `${p}-${Date.now()}-${Math.random()}`,
          path: info.path,
          name: info.name,
          size: info.size,
          bytesTransferred: 0,
          status: "pending",
        });
      } catch {
        const name = p.split(/[\\/]/).pop() || p;
        newItems.push({
          id: `${p}-${Date.now()}-${Math.random()}`,
          path: p,
          name,
          size: 0,
          bytesTransferred: 0,
          status: "pending",
        });
      }
    }

    if (newItems.length > 0) {
      setFileQueue((prev) => [...prev, ...newItems]);
      showToast(`Added ${newItems.length} file(s) to queue.`);
    }
  };

  useEffect(() => {
    loadAccounts();

    // Listen to Tauri Drag-and-Drop events from OS
    let unlistenDrag: (() => void) | undefined;
    try {
      const appWindow = getCurrentWebviewWindow();
      appWindow
        .onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDragOver(true);
          } else if (event.payload.type === "drop") {
            setIsDragOver(false);
            if (event.payload.paths && event.payload.paths.length > 0) {
              addPathsToQueue(event.payload.paths);
            }
          } else if (event.payload.type === "leave") {
            setIsDragOver(false);
          }
        })
        .then((fn) => {
          unlistenDrag = fn;
        })
        .catch((e) => {
          console.warn("Tauri drag-drop listener not active in current mode:", e);
        });
    } catch (e) {
      console.warn("Tauri getCurrentWebviewWindow not available:", e);
    }

    // Listen to upload-progress events from Tauri backend
    let unlistenProgress: (() => void) | undefined;
    listen<GuiUploadProgressPayload>("upload-progress", (event) => {
      const { file_path, bytes_transferred, total_bytes } = event.payload;
      setFileQueue((prev) =>
        prev.map((item) => {
          if (item.path === file_path) {
            return {
              ...item,
              bytesTransferred: bytes_transferred,
              size: total_bytes && total_bytes > 0 ? total_bytes : item.size,
            };
          }
          return item;
        })
      );
    }).then((fn) => {
      unlistenProgress = fn;
    }).catch((e) => {
      console.warn("Progress listener setup warning:", e);
    });

    return () => {
      if (unlistenDrag) unlistenDrag();
      if (unlistenProgress) unlistenProgress();
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const handleSelectFiles = async () => {
    try {
      const files = await invoke<string[]>("select_files");
      if (files && files.length > 0) {
        addPathsToQueue(files);
      }
    } catch (e) {
      showToast(`Error picking files: ${e}`);
    }
  };

  const handleRemoveQueueItem = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveQueueItem = (index: number, direction: "up" | "down") => {
    setFileQueue((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setFileQueue((prev) => {
      const copy = [...prev];
      const [removed] = copy.splice(draggedIndex, 1);
      copy.splice(index, 0, removed);
      return copy;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleClearCompleted = () => {
    setFileQueue((prev) => prev.filter((item) => item.status !== "done"));
  };

  const handleClearAll = () => {
    if (isUploading) {
      showToast("Cannot clear queue while uploads are in progress.");
      return;
    }
    setFileQueue([]);
  };

  const handleRetryItem = (id: string) => {
    setFileQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "pending", errorMessage: undefined, bytesTransferred: 0 } : item
      )
    );
  };

  const handleUploadQueue = async () => {
    const pendingItems = fileQueue.filter(
      (item) => item.status === "pending" || item.status === "error"
    );
    if (pendingItems.length === 0) {
      showToast("No pending files in the queue to upload.");
      return;
    }

    if (accounts.length === 0) {
      showToast("No account configured. Please add an account in the Accounts tab.");
      setActiveTab("accounts");
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      setCurrentUploadingIndex(i + 1);

      setFileQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? { ...q, status: "uploading", bytesTransferred: 0, errorMessage: undefined }
            : q
        )
      );

      try {
        const res = await invoke<GuiUploadResult>("upload_file", {
          filePath: item.path,
          remoteDir,
          createShare,
          sharePassword: sharePassword.trim() ? sharePassword.trim() : null,
          accountId: selectedAccount ? selectedAccount : null,
        });

        setFileQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "done",
                  bytesTransferred: res.bytes_uploaded,
                  size: res.bytes_uploaded > 0 ? res.bytes_uploaded : q.size,
                  result: res,
                }
              : q
          )
        );
      } catch (err: unknown) {
        const errStr = typeof err === "string" ? err : String(err);
        setFileQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error", errorMessage: errStr } : q
          )
        );
      }
    }

    setIsUploading(false);
    setCurrentUploadingIndex(0);
    showToast("Queue processing completed.");
  };

  // --- Account Management Actions ---

  const handleSetDefaultAccount = async (accountId: string) => {
    try {
      await invoke("set_default_account", { accountId });
      showToast("Default account updated.");
      await loadAccounts();
    } catch (e) {
      showToast(`Failed to set default account: ${e}`);
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!confirm(`Are you sure you want to remove account '${accountId}'?`)) {
      return;
    }
    try {
      await invoke("delete_account", { accountId });
      showToast(`Account '${accountId}' removed.`);
      await loadAccounts();
    } catch (e) {
      showToast(`Failed to remove account: ${e}`);
    }
  };

  const handleStartBrowserLogin = async () => {
    if (!serverUrl.trim() || serverUrl.trim() === "https://") {
      showToast("Please enter a valid Nextcloud server URL.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const initPayload = await invoke<LoginFlowInitPayload>("initiate_login_flow", {
        serverUrl: serverUrl.trim(),
      });
      setLoginFlowPayload(initPayload);
      showToast("Browser opened for authorization.");

      // Start Polling
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

      pollingIntervalRef.current = window.setInterval(async () => {
        try {
          const account = await invoke<StoredAccount | null>("poll_login_flow", {
            endpoint: initPayload.poll_endpoint,
            token: initPayload.poll_token,
            isDefault: setAsDefault,
            label: accountLabel.trim() ? accountLabel.trim() : null,
          });

          if (account) {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsAuthenticating(false);
            setLoginFlowPayload(null);
            showToast(`Successfully connected account: ${account.id}`);
            await loadAccounts();
            setSelectedAccount(account.id);
            setServerUrl("https://");
            setAccountLabel("");
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 1500);
    } catch (e) {
      setIsAuthenticating(false);
      setLoginFlowPayload(null);
      showToast(`Failed to initiate browser login: ${e}`);
    }
  };

  const handleCancelBrowserLogin = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setIsAuthenticating(false);
    setLoginFlowPayload(null);
    showToast("Login cancelled.");
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim() || !manualUsername.trim() || !manualPassword.trim()) {
      showToast("Please enter server URL, username, and password.");
      return;
    }

    setIsAuthenticating(true);
    try {
      const account = await invoke<StoredAccount>("manual_login", {
        serverUrl: serverUrl.trim(),
        username: manualUsername.trim(),
        appPassword: manualPassword.trim(),
        isDefault: setAsDefault,
        label: accountLabel.trim() ? accountLabel.trim() : null,
      });

      setIsAuthenticating(false);
      showToast(`Successfully connected account: ${account.id}`);
      await loadAccounts();
      setSelectedAccount(account.id);
      setManualUsername("");
      setManualPassword("");
      setAccountLabel("");
      setServerUrl("https://");
    } catch (e) {
      setIsAuthenticating(false);
      showToast(`Failed to connect: ${e}`);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const handleOpenBrowser = (url: string) => {
    openUrl(url).catch((err) => {
      console.error("Failed to open URL:", err);
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const pendingCount = fileQueue.filter((q) => q.status === "pending").length;
  const doneCount = fileQueue.filter((q) => q.status === "done").length;
  const errorCount = fileQueue.filter((q) => q.status === "error").length;

  const totalQueueBytes = fileQueue.reduce((acc, q) => acc + (q.size || 0), 0);
  const totalTransferredBytes = fileQueue.reduce((acc, q) => {
    if (q.status === "done") return acc + (q.size || 0);
    if (q.status === "uploading") return acc + (q.bytesTransferred || 0);
    return acc;
  }, 0);

  const overallPercent =
    totalQueueBytes > 0
      ? Math.min(100, Math.round((totalTransferredBytes / totalQueueBytes) * 100))
      : 0;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">N</div>
          <span className="brand-title">Nextcloud Upload Tool</span>
        </div>

        <div className="header-actions">
          {accounts.length > 0 ? (
            <div className="account-selector">
              <div className="account-dot" />
              <select
                className="account-select"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.label ? `${acc.label} (${acc.id})` : acc.id}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span
              style={{
                fontSize: 13,
                color: "var(--danger)",
                cursor: "pointer",
                textDecoration: "underline",
              }}
              onClick={() => setActiveTab("accounts")}
            >
              + Connect Account
            </span>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-button ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          Upload & Queue
          {fileQueue.length > 0 && (
            <span className="tab-badge">{fileQueue.length}</span>
          )}
        </button>
        <button
          className={`tab-button ${activeTab === "accounts" ? "active" : ""}`}
          onClick={() => setActiveTab("accounts")}
        >
          Accounts & Auth
          <span className="tab-badge">{accounts.length}</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "upload" && (
          <>
            {/* File Dropzone */}
            <div
              className={`file-dropzone ${isDragOver ? "drag-over" : ""}`}
              onClick={handleSelectFiles}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const paths: string[] = [];
                  for (let i = 0; i < e.dataTransfer.files.length; i++) {
                    const f = e.dataTransfer.files[i];
                    if ("path" in f && typeof (f as { path: string }).path === "string") {
                      paths.push((f as { path: string }).path);
                    }
                  }
                  if (paths.length > 0) {
                    addPathsToQueue(paths);
                  }
                }
              }}
            >
              <div className="dropzone-icon">📥</div>
              <div className="dropzone-title">
                {isDragOver
                  ? "Drop files now to add to queue"
                  : "Drag and drop files here, or click to browse"}
              </div>
              <div className="dropzone-subtitle">
                Supports any files: documents, media, archives, and directories
              </div>
            </div>

            {/* File Queue List */}
            <div className="card">
              <div className="card-title">
                <div className="queue-title-meta">
                  <span>Upload Queue ({fileQueue.length})</span>
                  {fileQueue.length > 0 && (
                    <span className="queue-summary-pill">
                      {formatBytes(totalQueueBytes)} • {pendingCount} Pending • {doneCount} Done
                      {errorCount > 0 && ` • ${errorCount} Failed`}
                    </span>
                  )}
                </div>
                <div className="queue-actions">
                  {doneCount > 0 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearCompleted}
                      disabled={isUploading}
                    >
                      Clear Completed
                    </button>
                  )}
                  {fileQueue.length > 0 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleClearAll}
                      disabled={isUploading}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Overall Total Progress Bar */}
              {(isUploading || doneCount > 0) && fileQueue.length > 0 && (
                <div className="overall-progress-container">
                  <div className="overall-progress-header">
                    <span className="overall-progress-title">
                      {isUploading
                        ? `Uploading File ${currentUploadingIndex} of ${fileQueue.length}...`
                        : doneCount === fileQueue.length
                        ? "All uploads complete!"
                        : "Upload batch progress"}
                    </span>
                    <span className="overall-progress-stats">
                      {formatBytes(totalTransferredBytes)} / {formatBytes(totalQueueBytes)} ({overallPercent}%)
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${isUploading ? "progress-bar-animated" : ""}`}
                      style={{ width: `${overallPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {fileQueue.length === 0 ? (
                <div className="empty-queue-hint">
                  Queue is empty. Drop files above or click to select files for uploading.
                </div>
              ) : (
                <div className="queue-item-list">
                  {fileQueue.map((item, index) => {
                    const itemPercent =
                      item.size > 0
                        ? Math.min(100, Math.round((item.bytesTransferred / item.size) * 100))
                        : item.status === "done"
                        ? 100
                        : 0;

                    return (
                      <div
                        key={item.id}
                        className={`queue-item-row status-${item.status} ${
                          draggedIndex === index ? "dragging" : ""
                        }`}
                        draggable={!isUploading}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="queue-item-drag-handle" title="Drag to reorder">
                          ⋮⋮
                        </div>
                        <div className="queue-item-index">{index + 1}</div>

                        <div className="queue-item-info">
                          <div className="queue-item-name">{item.name}</div>
                          <div className="queue-item-path">{item.path}</div>

                          {/* Per-item progress bar when active or finished */}
                          {(item.status === "uploading" || item.status === "done") && (
                            <div className="item-progress-wrap">
                              <div className="item-progress-track">
                                <div
                                  className={`item-progress-fill ${
                                    item.status === "uploading" ? "item-progress-animated" : ""
                                  }`}
                                  style={{ width: `${item.status === "done" ? 100 : itemPercent}%` }}
                                />
                              </div>
                              <span className="item-progress-text">
                                {item.status === "done"
                                  ? "100%"
                                  : `${itemPercent}% (${formatBytes(item.bytesTransferred)} / ${formatBytes(
                                      item.size
                                    )})`}
                              </span>
                            </div>
                          )}

                          {item.errorMessage && (
                            <div className="queue-item-error">
                              <span>Error: {item.errorMessage}</span>
                              <button
                                className="btn-retry-inline"
                                onClick={() => handleRetryItem(item.id)}
                                disabled={isUploading}
                              >
                                ↻ Retry
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="queue-item-size">{formatBytes(item.size)}</div>

                        <div className="queue-item-badge">
                          <span className={`status-tag status-${item.status}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="queue-item-controls">
                          <button
                            className="btn-icon"
                            title="Move Up"
                            disabled={isUploading || index === 0}
                            onClick={() => handleMoveQueueItem(index, "up")}
                          >
                            ▲
                          </button>
                          <button
                            className="btn-icon"
                            title="Move Down"
                            disabled={isUploading || index === fileQueue.length - 1}
                            onClick={() => handleMoveQueueItem(index, "down")}
                          >
                            ▼
                          </button>
                          <button
                            className="btn-icon btn-icon-danger"
                            title="Remove from queue"
                            disabled={isUploading}
                            onClick={() => handleRemoveQueueItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upload Settings */}
            <div className="card">
              <div className="card-title">Upload Settings</div>
              <div className="form-group">
                <label className="form-label">Destination Folder on Nextcloud</label>
                <input
                  className="form-input"
                  type="text"
                  value={remoteDir}
                  onChange={(e) => setRemoteDir(e.target.value)}
                  placeholder="Uploads or Projects/Folder"
                />
              </div>

              <div className="form-group">
                <label className="form-checkbox">
                  <input
                    type="checkbox"
                    checked={createShare}
                    onChange={(e) => setCreateShare(e.target.checked)}
                  />
                  Automatically generate public share link after upload
                </label>
              </div>

              {createShare && (
                <div className="form-group">
                  <label className="form-label">Optional Share Password</label>
                  <input
                    className="form-input"
                    type="password"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    placeholder="Leave empty for public access without password"
                  />
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: 8 }}
                onClick={handleUploadQueue}
                disabled={isUploading || (pendingCount === 0 && errorCount === 0)}
              >
                {isUploading
                  ? `Uploading Queue (${overallPercent}%)...`
                  : pendingCount > 0 || errorCount > 0
                  ? `Upload Queue (${pendingCount + errorCount} files)`
                  : "All Files in Queue Uploaded"}
              </button>
            </div>

            {/* Completed Share Links & Results */}
            {fileQueue.some((q) => q.result) && (
              <div className="card">
                <div className="card-title">
                  <span>Share Links & Direct Downloads</span>
                </div>
                {fileQueue
                  .filter((q) => q.result)
                  .map((item) => {
                    const r = item.result!;
                    return (
                      <div key={item.id} className="result-card">
                        <div className="result-header">
                          <span className="result-file-name">{r.file_name}</span>
                          <span className="result-size">{formatBytes(r.bytes_uploaded)}</span>
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            marginBottom: 8,
                          }}
                        >
                          Destination: {r.remote_path}
                        </div>

                        {r.share_url && (
                          <div className="link-row">
                            <input className="link-input" readOnly value={r.share_url} />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleCopy(r.share_url!, "Share Link")}
                            >
                              Copy
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenBrowser(r.share_url!)}
                            >
                              Open
                            </button>
                          </div>
                        )}

                        {r.direct_download_url && (
                          <div className="link-row">
                            <input className="link-input" readOnly value={r.direct_download_url} />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() =>
                                handleCopy(r.direct_download_url!, "Direct Download Link")
                              }
                            >
                              Copy Direct
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {activeTab === "accounts" && (
          <>
            {/* Account List */}
            <div className="card">
              <div className="card-title">
                <span>Connected Accounts ({accounts.length})</span>
              </div>

              {accounts.length === 0 ? (
                <div className="empty-queue-hint">
                  No Nextcloud accounts stored yet. Add your account below to begin uploading.
                </div>
              ) : (
                <div className="account-list">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccount === acc.id;
                    return (
                      <div
                        key={acc.id}
                        className={`account-card ${isSelected ? "active" : ""}`}
                      >
                        <div className="account-card-header">
                          <div className="account-card-title">
                            <span className="account-name">
                              {acc.label ? acc.label : acc.username}
                            </span>
                            {acc.is_default && (
                              <span className="badge badge-default">DEFAULT</span>
                            )}
                            {isSelected && (
                              <span className="badge badge-active">ACTIVE</span>
                            )}
                          </div>

                          <div className="account-card-actions">
                            {!isSelected && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSelectedAccount(acc.id)}
                              >
                                Select
                              </button>
                            )}
                            {!acc.is_default && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleSetDefaultAccount(acc.id)}
                              >
                                Set Default
                              </button>
                            )}
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteAccount(acc.id)}
                            >
                              Logout
                            </button>
                          </div>
                        </div>

                        <div className="account-card-meta">
                          <div>
                            <strong>User:</strong> {acc.username}
                          </div>
                          <div>
                            <strong>Server:</strong> {acc.server_url}
                          </div>
                          <div>
                            <strong>ID:</strong> {acc.id}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add New Account Card */}
            <div className="card">
              <div className="card-title">Add Nextcloud Account</div>

              <div className="auth-mode-toggle">
                <button
                  className={`btn-mode ${authMode === "browser" ? "active" : ""}`}
                  onClick={() => setAuthMode("browser")}
                  disabled={isAuthenticating}
                >
                  🌐 Browser Login (Flow v2)
                </button>
                <button
                  className={`btn-mode ${authMode === "manual" ? "active" : ""}`}
                  onClick={() => setAuthMode("manual")}
                  disabled={isAuthenticating}
                >
                  🔑 Manual App Password
                </button>
              </div>

              {authMode === "browser" ? (
                <div className="auth-form-content">
                  <div className="form-group">
                    <label className="form-label">Nextcloud Server URL</label>
                    <input
                      className="form-input"
                      type="url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://cloud.example.com"
                      disabled={isAuthenticating}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Label (Optional)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={accountLabel}
                      onChange={(e) => setAccountLabel(e.target.value)}
                      placeholder="e.g. Work, Personal, Team Cloud"
                      disabled={isAuthenticating}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        disabled={isAuthenticating}
                      />
                      Set as default account
                    </label>
                  </div>

                  {loginFlowPayload ? (
                    <div className="polling-box">
                      <div className="polling-header">
                        <span className="spinner" />
                        <span>Waiting for browser authorization...</span>
                      </div>
                      <p className="polling-text">
                        A browser tab has been opened. Please log in and grant access to complete connection.
                      </p>
                      <div className="link-row" style={{ marginTop: 8 }}>
                        <input
                          className="link-input"
                          readOnly
                          value={loginFlowPayload.login_url}
                        />
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenBrowser(loginFlowPayload.login_url)}
                        >
                          Reopen Browser
                        </button>
                      </div>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: 12 }}
                        onClick={handleCancelBrowserLogin}
                      >
                        Cancel Login
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", marginTop: 8 }}
                      onClick={handleStartBrowserLogin}
                      disabled={isAuthenticating}
                    >
                      Authenticate in Browser (Login Flow v2)
                    </button>
                  )}
                </div>
              ) : (
                <form className="auth-form-content" onSubmit={handleManualLogin}>
                  <div className="form-group">
                    <label className="form-label">Nextcloud Server URL</label>
                    <input
                      className="form-input"
                      type="url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="https://cloud.example.com"
                      disabled={isAuthenticating}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Username</label>
                    <input
                      className="form-input"
                      type="text"
                      value={manualUsername}
                      onChange={(e) => setManualUsername(e.target.value)}
                      placeholder="admin or user@domain.com"
                      disabled={isAuthenticating}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">App Password / Token</label>
                    <input
                      className="form-input"
                      type="password"
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Generated app password from Nextcloud security settings"
                      disabled={isAuthenticating}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Account Label (Optional)</label>
                    <input
                      className="form-input"
                      type="text"
                      value={accountLabel}
                      onChange={(e) => setAccountLabel(e.target.value)}
                      placeholder="e.g. Work, Personal"
                      disabled={isAuthenticating}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-checkbox">
                      <input
                        type="checkbox"
                        checked={setAsDefault}
                        onChange={(e) => setSetAsDefault(e.target.checked)}
                        disabled={isAuthenticating}
                      />
                      Set as default account
                    </label>
                  </div>

                  <button
                    className="btn btn-primary"
                    type="submit"
                    style={{ width: "100%", marginTop: 8 }}
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? "Verifying Credentials..." : "Connect Account"}
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
