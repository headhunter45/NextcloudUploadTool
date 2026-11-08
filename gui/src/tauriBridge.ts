import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow as tauriGetWindow } from "@tauri-apps/api/webviewWindow";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";

const isTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

interface DemoAccount {
  id: string;
  label?: string;
  username: string;
  server_url: string;
  is_default: boolean;
}

let demoAccounts: DemoAccount[] = [
  {
    id: "alice@cloud.example.com",
    label: "Work Cloud",
    username: "alice",
    server_url: "https://cloud.example.com",
    is_default: true,
  },
  {
    id: "tom@nextcloud.home.lan",
    label: "Home NAS",
    username: "tom",
    server_url: "https://nextcloud.home.lan",
    is_default: false,
  },
];

const demoFileCatalog: Record<string, { path: string; name: string; size: number }> = {
  "/Users/alice/Projects/Q4-Architecture-Review.pdf": {
    path: "/Users/alice/Projects/Q4-Architecture-Review.pdf",
    name: "Q4-Architecture-Review.pdf",
    size: 4_823_450,
  },
  "/Users/alice/Releases/nut-v0.1.0-aarch64-apple-darwin.tar.gz": {
    path: "/Users/alice/Releases/nut-v0.1.0-aarch64-apple-darwin.tar.gz",
    name: "nut-v0.1.0-aarch64-apple-darwin.tar.gz",
    size: 12_485_760,
  },
  "/Users/alice/Backups/postgres-prod-2026-11.sql.zst": {
    path: "/Users/alice/Backups/postgres-prod-2026-11.sql.zst",
    name: "postgres-prod-2026-11.sql.zst",
    size: 28_311_552,
  },
};

type ProgressListener = (event: {
  payload: { file_path: string; bytes_transferred: number; total_bytes?: number };
}) => void;

const progressListeners = new Set<ProgressListener>();
let demoPollChecks = 0;

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauriRuntime()) {
    return tauriInvoke<T>(cmd, args);
  }

  switch (cmd) {
    case "list_accounts":
      return [...demoAccounts] as unknown as T;

    case "select_files":
      return Object.keys(demoFileCatalog) as unknown as T;

    case "get_file_info": {
      const filePath = String(args?.filePath || "");
      if (demoFileCatalog[filePath]) {
        return demoFileCatalog[filePath] as unknown as T;
      }
      const name = filePath.split(/[\\/]/).pop() || "sample-file.dat";
      return {
        path: filePath,
        name,
        size: 6_291_456,
      } as unknown as T;
    }

    case "upload_file": {
      const filePath = String(args?.filePath || "");
      const remoteDir = String(args?.remoteDir || "Uploads").replace(/^\/+|\/+$/g, "");
      const createShare = Boolean(args?.createShare);
      const info = demoFileCatalog[filePath] || {
        path: filePath,
        name: filePath.split(/[\\/]/).pop() || "file.dat",
        size: 6_291_456,
      };

      const steps = 6;
      for (let step = 1; step <= steps; step++) {
        await new Promise((r) => setTimeout(r, 90));
        const transferred = Math.round((info.size * step) / steps);
        for (const cb of progressListeners) {
          cb({
            payload: {
              file_path: filePath,
              bytes_transferred: transferred,
              total_bytes: info.size,
            },
          });
        }
      }

      const token = Math.abs(
        info.name.split("").reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 7)
      )
        .toString(36)
        .slice(0, 8)
        .padEnd(8, "x");

      const remotePath = remoteDir ? `${remoteDir}/${info.name}` : info.name;
      return {
        file_path: filePath,
        file_name: info.name,
        remote_path: remotePath,
        bytes_uploaded: info.size,
        share_url: createShare ? `https://cloud.example.com/index.php/s/Nc${token}` : undefined,
        direct_download_url: createShare
          ? `https://cloud.example.com/index.php/s/Nc${token}/download`
          : undefined,
      } as unknown as T;
    }

    case "set_default_account": {
      const accountId = String(args?.accountId || "");
      demoAccounts = demoAccounts.map((a) => ({
        ...a,
        is_default: a.id === accountId,
      }));
      return undefined as unknown as T;
    }

    case "delete_account": {
      const accountId = String(args?.accountId || "");
      demoAccounts = demoAccounts.filter((a) => a.id !== accountId);
      if (demoAccounts.length > 0 && !demoAccounts.some((a) => a.is_default)) {
        demoAccounts[0].is_default = true;
      }
      return undefined as unknown as T;
    }

    case "initiate_login_flow": {
      const serverUrl = String(args?.serverUrl || "https://cloud.example.com").replace(/\/+$/, "");
      demoPollChecks = 0;
      return {
        login_url: `${serverUrl}/index.php/login/v2/flow/9f8e7d6c5b4a3210`,
        poll_endpoint: `${serverUrl}/login/v2/poll`,
        poll_token: "demo-poll-token-2026",
      } as unknown as T;
    }

    case "poll_login_flow": {
      demoPollChecks += 1;
      if (demoPollChecks < 3) {
        return null as unknown as T;
      }
      const isDefault = Boolean(args?.isDefault);
      const label = args?.label ? String(args.label) : "Staging Cloud";
      const newAcc: DemoAccount = {
        id: "devops@staging.cloud.example.com",
        label,
        username: "devops",
        server_url: "https://staging.cloud.example.com",
        is_default: isDefault,
      };
      if (isDefault) {
        demoAccounts = demoAccounts.map((a) => ({ ...a, is_default: false }));
      }
      demoAccounts = [...demoAccounts.filter((a) => a.id !== newAcc.id), newAcc];
      return newAcc as unknown as T;
    }

    case "manual_login": {
      const serverUrl = String(args?.serverUrl || "https://cloud.example.com").replace(/\/+$/, "");
      const username = String(args?.username || "admin");
      const isDefault = Boolean(args?.isDefault);
      const label = args?.label ? String(args.label) : undefined;
      let host = "cloud.example.com";
      try {
        host = new URL(serverUrl).host;
      } catch {
        // ignore
      }
      const id = `${username}@${host}`;
      const newAcc: DemoAccount = {
        id,
        label,
        username,
        server_url: serverUrl,
        is_default: isDefault,
      };
      if (isDefault) {
        demoAccounts = demoAccounts.map((a) => ({ ...a, is_default: false }));
      }
      demoAccounts = [...demoAccounts.filter((a) => a.id !== id), newAcc];
      return newAcc as unknown as T;
    }

    default:
      return undefined as unknown as T;
  }
}

export async function listen<T>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<() => void> {
  if (isTauriRuntime()) {
    return tauriListen<T>(event, handler);
  }
  if (event === "upload-progress") {
    const listener = handler as unknown as ProgressListener;
    progressListeners.add(listener);
    return () => {
      progressListeners.delete(listener);
    };
  }
  return () => {};
}

export function getCurrentWebviewWindow() {
  if (isTauriRuntime()) {
    return tauriGetWindow();
  }
  return {
    onDragDropEvent: async () => () => {},
  };
}

export async function openUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    return tauriOpenUrl(url);
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

