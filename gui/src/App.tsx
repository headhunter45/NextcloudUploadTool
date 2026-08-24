import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import "./App.css";

interface StoredAccount {
  id: string;
  label?: string;
  username: string;
  server_url: string;
  is_default: boolean;
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
  const [activeTab, setActiveTab] = useState<"upload" | "accounts">("upload");
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Upload Form State
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [remoteDir, setRemoteDir] = useState<string>("Uploads");
  const [createShare, setCreateShare] = useState<boolean>(true);
  const [sharePassword, setSharePassword] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResults, setUploadResults] = useState<GuiUploadResult[]>([]);

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

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSelectFiles = async () => {
    try {
      const files = await invoke<string[]>("select_files");
      if (files && files.length > 0) {
        setSelectedFiles((prev) => Array.from(new Set([...prev, ...files])));
      }
    } catch (e) {
      showToast(`Error picking files: ${e}`);
    }
  };

  const handleRemoveSelectedFile = (path: string) => {
    setSelectedFiles((prev) => prev.filter((p) => p !== path));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      showToast("Please select at least one file to upload.");
      return;
    }

    if (accounts.length === 0) {
      showToast("No account configured. Please configure an account in your credentials store.");
      return;
    }

    setIsUploading(true);
    const results: GuiUploadResult[] = [];

    for (const filePath of selectedFiles) {
      try {
        const res = await invoke<GuiUploadResult>("upload_file", {
          filePath,
          remoteDir,
          createShare,
          sharePassword: sharePassword.trim() ? sharePassword.trim() : null,
          accountId: selectedAccount ? selectedAccount : null,
        });
        results.push(res);
      } catch (e) {
        showToast(`Failed to upload ${filePath}: ${e}`);
      }
    }

    setUploadResults(results);
    setSelectedFiles([]);
    setIsUploading(false);
    showToast(`Uploaded ${results.length} file(s) successfully!`);
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

      {/* Navigation Tabs */}
      <nav className="nav-tabs">
        <button
          className={`tab-button ${activeTab === "upload" ? "active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          Upload & Share
        </button>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {activeTab === "upload" && (
          <div>
            {/* File Dropzone / Picker */}
            <div className="file-dropzone" onClick={handleSelectFiles}>
              <div className="dropzone-title">
                📁 Click here to select file(s) for upload
              </div>
              <div className="dropzone-subtitle">
                Upload any document, image, video, or archive to your Nextcloud
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="card">
                <div className="card-title">
                  <span>Selected Files ({selectedFiles.length})</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedFiles([])}
                  >
                    Clear All
                  </button>
                </div>
                <div className="selected-files-list">
                  {selectedFiles.map((file) => (
                    <div key={file} className="selected-file-chip">
                      <span>{file}</span>
                      <button
                        className="btn btn-sm"
                        style={{ border: "none", color: "var(--danger)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSelectedFile(file);
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Options Card */}
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
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
              >
                {isUploading ? "Uploading..." : `Upload ${selectedFiles.length > 0 ? `(${selectedFiles.length} files)` : ""}`}
              </button>
            </div>

            {/* Upload Results */}
            {uploadResults.length > 0 && (
              <div className="card">
                <div className="card-title">
                  <span>Upload Results</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setUploadResults([])}
                  >
                    Dismiss
                  </button>
                </div>
                {uploadResults.map((r, i) => (
                  <div key={i} className="result-card">
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
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Toast */}
      {toastMessage && <div className="toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
