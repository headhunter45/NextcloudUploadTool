export interface ReleaseAssetLink {
  label: string;
  filename: string;
  url: string;
  arch: string;
  kind: "gui" | "cli";
}

export interface ReleaseMetadata {
  version: string;
  tag: string;
  repo: string;
  releaseUrl: string;
  publishedAt?: string;
  assets: {
    macos: ReleaseAssetLink[];
    windows: ReleaseAssetLink[];
    linux: ReleaseAssetLink[];
  };
}

const DEFAULT_REPO =
  import.meta.env.VITE_GITHUB_REPO || "headhunter45/NextcloudUploadTool";
const RAW_BUILD_VERSION = import.meta.env.VITE_NUT_VERSION || "0.1.0";

function normalizeVersion(raw: string): { version: string; tag: string } {
  const cleaned = raw.trim().replace(/^v/, "").replace(/-dev.*$/, "") || "0.1.0";
  return {
    version: cleaned,
    tag: `v${cleaned}`,
  };
}

export function buildReleaseMetadata(
  rawVersion: string = RAW_BUILD_VERSION,
  repo: string = DEFAULT_REPO,
  apiAssets?: Array<{ name: string; browser_download_url: string }>,
  publishedAt?: string
): ReleaseMetadata {
  const { version, tag } = normalizeVersion(rawVersion);
  const baseDownload = `https://github.com/${repo}/releases/download/${tag}`;

  const resolveAssetUrl = (candidates: string[], fallbackFile: string): string => {
    if (apiAssets && apiAssets.length > 0) {
      for (const candidate of candidates) {
        const found = apiAssets.find(
          (a) => a.name.toLowerCase() === candidate.toLowerCase()
        );
        if (found) return found.browser_download_url;
      }
      for (const candidate of candidates) {
        const found = apiAssets.find((a) =>
          a.name.toLowerCase().includes(candidate.toLowerCase())
        );
        if (found) return found.browser_download_url;
      }
    }
    return `${baseDownload}/${fallbackFile}`;
  };

  return {
    version,
    tag,
    repo,
    releaseUrl: `https://github.com/${repo}/releases/tag/${tag}`,
    publishedAt,
    assets: {
      macos: [
        {
          label: "macOS Desktop App (.dmg)",
          filename: `Nextcloud.Upload.Tool_${version}_aarch64.dmg`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_aarch64.dmg`,
              `Nextcloud_Upload_Tool_${version}_aarch64.dmg`,
              "_aarch64.dmg",
            ],
            `Nextcloud.Upload.Tool_${version}_aarch64.dmg`
          ),
          arch: "Apple Silicon (arm64)",
          kind: "gui",
        },
        {
          label: "macOS Desktop App (.dmg)",
          filename: `Nextcloud.Upload.Tool_${version}_x64.dmg`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_x64.dmg`,
              `Nextcloud_Upload_Tool_${version}_x64.dmg`,
              "_x64.dmg",
            ],
            `Nextcloud.Upload.Tool_${version}_x64.dmg`
          ),
          arch: "Intel (x86_64)",
          kind: "gui",
        },
        {
          label: "Standalone CLI Binary (.tar.gz)",
          filename: "nut-aarch64-apple-darwin.tar.gz",
          url: resolveAssetUrl(
            ["nut-aarch64-apple-darwin.tar.gz"],
            "nut-aarch64-apple-darwin.tar.gz"
          ),
          arch: "Apple Silicon (arm64)",
          kind: "cli",
        },
        {
          label: "Standalone CLI Binary (.tar.gz)",
          filename: "nut-x86_64-apple-darwin.tar.gz",
          url: resolveAssetUrl(
            ["nut-x86_64-apple-darwin.tar.gz"],
            "nut-x86_64-apple-darwin.tar.gz"
          ),
          arch: "Intel (x86_64)",
          kind: "cli",
        },
      ],
      linux: [
        {
          label: "Debian / Ubuntu Package (.deb)",
          filename: `Nextcloud.Upload.Tool_${version}_amd64.deb`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_amd64.deb`,
              `nextcloud-upload-tool_${version}_amd64.deb`,
              "_amd64.deb",
            ],
            `Nextcloud.Upload.Tool_${version}_amd64.deb`
          ),
          arch: "x86_64 (amd64)",
          kind: "gui",
        },
        {
          label: "Fedora / RHEL Package (.rpm)",
          filename: `Nextcloud.Upload.Tool-${version}-1.x86_64.rpm`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool-${version}-1.x86_64.rpm`,
              ".x86_64.rpm",
            ],
            `Nextcloud.Upload.Tool-${version}-1.x86_64.rpm`
          ),
          arch: "x86_64",
          kind: "gui",
        },
        {
          label: "Universal AppImage (.AppImage)",
          filename: `Nextcloud.Upload.Tool_${version}_amd64.AppImage`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_amd64.AppImage`,
              "_amd64.AppImage",
            ],
            `Nextcloud.Upload.Tool_${version}_amd64.AppImage`
          ),
          arch: "x86_64",
          kind: "gui",
        },
        {
          label: "Static CLI Binary (musl .tar.gz)",
          filename: "nut-x86_64-unknown-linux-musl.tar.gz",
          url: resolveAssetUrl(
            ["nut-x86_64-unknown-linux-musl.tar.gz"],
            "nut-x86_64-unknown-linux-musl.tar.gz"
          ),
          arch: "x86_64 (zero-dependency static musl)",
          kind: "cli",
        },
      ],
      windows: [
        {
          label: "Windows NSIS Installer (.exe)",
          filename: `Nextcloud.Upload.Tool_${version}_x64-setup.exe`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_x64-setup.exe`,
              "_x64-setup.exe",
            ],
            `Nextcloud.Upload.Tool_${version}_x64-setup.exe`
          ),
          arch: "Windows 10/11 (x64)",
          kind: "gui",
        },
        {
          label: "Windows MSI Package (.msi)",
          filename: `Nextcloud.Upload.Tool_${version}_x64_en-US.msi`,
          url: resolveAssetUrl(
            [
              `Nextcloud.Upload.Tool_${version}_x64_en-US.msi`,
              "_x64_en-US.msi",
            ],
            `Nextcloud.Upload.Tool_${version}_x64_en-US.msi`
          ),
          arch: "Windows 10/11 (x64)",
          kind: "gui",
        },
        {
          label: "Standalone CLI Binary (.zip)",
          filename: "nut-x86_64-pc-windows-msvc.zip",
          url: resolveAssetUrl(
            ["nut-x86_64-pc-windows-msvc.zip"],
            "nut-x86_64-pc-windows-msvc.zip"
          ),
          arch: "Windows x64 (MSVC)",
          kind: "cli",
        },
      ],
    },
  };
}

export async function fetchLatestReleaseMetadata(): Promise<ReleaseMetadata> {
  const fallback = buildReleaseMetadata();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${DEFAULT_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    if (data && typeof data.tag_name === "string" && !data.tag_name.includes("-dev")) {
      return buildReleaseMetadata(
        data.tag_name,
        DEFAULT_REPO,
        Array.isArray(data.assets) ? data.assets : undefined,
        data.published_at
      );
    }
  } catch {
    // Use build-time fallback when offline or rate-limited
  }
  return fallback;
}

