import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
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

export function App() {
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
        setSelectedAccount(def.id);
      } else if (list.length > 0) {
        setSelectedAccount(list[0].id);
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
          status: "pending",
        });
      } catch {
        const name = p.split(/[\\/]/).pop() || p;
        newItems.push({
          id: `${p}-${Date.now()}-${Math.random()}`,
          path: p,
          name,
          size: 0,
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
    let unlisten: (() => void) | undefined;
    try {
      const appWindow = getCurrentWebviewWindow();
      appWindow.onDragDropEvent((event) => {
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
      }).then((fn) => {
        unlisten = fn;
      }).catch((e) => {
        console.warn("Tauri drag-drop listener not active in current mode:", e);
      });
    } catch (e) {
      console.warn("Tauri getCurrentWebviewWindow not available:", e);
    }

    return () => {
      if (unlisten) unlisten();
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

  const handleUploadQueue = async () => {
    const pendingItems = fileQueue.filter((item) => item.status === "pending" || item.status === "error");
    if (pendingItems.length === 0) {
      showToast("No pending files in the queue to upload.");
      return;
    }

    if (accounts.length === 0) {
      showToast("No account configured. Please configure an account in your credentials store.");
      return;
    }

    setIsUploading(true);

    for (const item of pendingItems) {
      // Mark as uploading
      setFileQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", errorMessage: undefined } : q))
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
          prev.map((q) => (q.id === item.id ? { ...q, status: "done", result: res } : q))
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
    showToast("Queue processing completed.");
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
  const totalQueueBytes = fileQueue.reduce((acc, q) => acc + (q.size || 0), 0);

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
            <span style={{ fontSize: 13, color: "var(--danger)" }}>
              No Account Connected
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
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
                // In desktop webview with path property
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
            {isDragOver ? "Drop files now to add to queue" : "Drag and drop files here, or click to browse"}
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

          {fileQueue.length === 0 ? (
            <div className="empty-queue-hint">
              Queue is empty. Drop files above or click to select files for uploading.
            </div>
          ) : (
            <div className="queue-item-list">
              {fileQueue.map((item, index) => (
                <div
                  key={item.id}
                  className={`queue-item-row status-${item.status} ${draggedIndex === index ? "dragging" : ""}`}
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
                    {item.errorMessage && (
                      <div className="queue-item-error">Error: {item.errorMessage}</div>
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
              ))}
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
            disabled={isUploading || pendingCount === 0}
          >
            {isUploading
              ? "Uploading Queue..."
              : pendingCount > 0
              ? `Upload Queue (${pendingCount} pending files)`
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
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
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
                          onClick={() => handleCopy(r.direct_download_url!, "Direct Download Link")}
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
      </main>

      {/* Floating Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
