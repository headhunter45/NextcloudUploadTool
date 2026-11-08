import { useEffect, useState } from "react";
import {
  buildReleaseMetadata,
  fetchLatestReleaseMetadata,
  ReleaseMetadata,
} from "./releases";
import { DOC_PAGES, PACKAGE_MANAGER_FLAGS } from "./docsContent";
import { MarkdownRenderer } from "./MarkdownRenderer";

type ShowcaseSlideId =
  | "upload-gif"
  | "accounts-gif"
  | "queue-png"
  | "links-png"
  | "accounts-png";

interface ShowcaseSlide {
  id: ShowcaseSlideId;
  label: string;
  badge: string;
  src: string;
  caption: string;
}

const BASE = import.meta.env.BASE_URL;

const SHOWCASE_SLIDES: ShowcaseSlide[] = [
  {
    id: "upload-gif",
    label: "Live Upload & Share Workflow (GIF)",
    badge: "Animated GIF",
    src: `${BASE}assets/screenshots/gui-upload-workflow.gif`,
    caption:
      "Drag-and-drop file queueing, real-time WebDAV upload progress bars, and automatic OCS public share & direct-download link creation.",
  },
  {
    id: "accounts-gif",
    label: "Multi-Account & Login Flow v2 (GIF)",
    badge: "Animated GIF",
    src: `${BASE}assets/screenshots/gui-accounts-workflow.gif`,
    caption:
      "One-click Nextcloud Login Flow v2 browser authorization with background polling and unified OS Keychain storage.",
  },
  {
    id: "queue-png",
    label: "Upload Queue & Settings",
    badge: "Screenshot",
    src: `${BASE}assets/screenshots/gui-upload-queue.png`,
    caption:
      "Queue multiple files, reorder items via drag-and-drop, set a remote Nextcloud folder, and configure optional share passwords.",
  },
  {
    id: "links-png",
    label: "Public Share & Direct URLs",
    badge: "Screenshot",
    src: `${BASE}assets/screenshots/gui-share-links.png`,
    caption:
      "Instant access to both the Nextcloud public share page (/s/<token>) and raw direct-download URL (/s/<token>/download).",
  },
  {
    id: "accounts-png",
    label: "Accounts & Keychain Auth",
    badge: "Screenshot",
    src: `${BASE}assets/screenshots/gui-accounts-auth.png`,
    caption:
      "Switch between multiple Nextcloud servers and user accounts; credentials are shared seamlessly between CLI and GUI.",
  },
];

export function App() {
  const [release, setRelease] = useState<ReleaseMetadata>(() =>
    buildReleaseMetadata()
  );
  const [activeSlide, setActiveSlide] = useState<ShowcaseSlideId>("upload-gif");
  const [installMethod, setInstallMethod] = useState<
    "homebrew" | "winget" | "curl" | "aur" | "cargo"
  >(PACKAGE_MANAGER_FLAGS.homebrew ? "homebrew" : "curl");
  const [osTab, setOsTab] = useState<"macos" | "linux" | "windows">("macos");

  // Interactive CLI command builder state
  const [cliMode, setCliMode] = useState<"file" | "dir" | "stdin">("file");
  const [cliShare, setCliShare] = useState<boolean>(true);
  const [cliPassword, setCliPassword] = useState<boolean>(false);
  const [cliAccount, setCliAccount] = useState<string>("Work");
  const [cliRemoteDir, setCliRemoteDir] = useState<string>("Releases/2026");
  const [cliOutputFormat, setCliOutputFormat] = useState<
    "human" | "json" | "tsv" | "url-only" | "direct-url-only"
  >("json");

  // Docs explorer state
  const [activeDocId, setActiveDocId] = useState<string>("installation");
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const [copiedBannerCmd, setCopiedBannerCmd] = useState<boolean>(false);
  const [copiedBuilderCmd, setCopiedBuilderCmd] = useState<boolean>(false);

  useEffect(() => {
    fetchLatestReleaseMetadata().then(setRelease);
  }, []);

  const installSnippets: Record<typeof installMethod, { title: string; cmd: string }> =
    {
      homebrew: {
        title: "macOS & Linux via Homebrew",
        cmd: `brew install headhunter45/tap/nut\nbrew install --cask headhunter45/tap/nextcloud-upload-tool`,
      },
      winget: {
        title: "Windows via Winget or Chocolatey",
        cmd: `winget install headhunter45.NextcloudUploadTool\n# Or via Chocolatey:\nchoco install nextcloud-upload-tool`,
      },
      curl: {
        title: `Pre-built Static CLI (${release.tag})`,
        cmd: `# macOS (Apple Silicon)\ncurl -fsSL https://github.com/${release.repo}/releases/download/${release.tag}/nut-aarch64-apple-darwin.tar.gz | tar -xz\nsudo mv nut /usr/local/bin/\n\n# Linux (Static musl x86_64)\ncurl -fsSL https://github.com/${release.repo}/releases/download/${release.tag}/nut-x86_64-unknown-linux-musl.tar.gz | tar -xz\nsudo mv nut /usr/local/bin/`,
      },
      aur: {
        title: "Arch Linux (AUR)",
        cmd: `yay -S nextcloud-upload-tool-bin`,
      },
      cargo: {
        title: "Build from Source with Rust & Cargo",
        cmd: `git clone https://github.com/${release.repo}.git\ncd NextcloudUploadTool\ncargo install --path cli`,
      },
    };

  // Build interactive CLI command and output preview
  const buildInteractiveCli = () => {
    const parts: string[] = [];
    if (cliMode === "stdin") {
      parts.push("pg_dump production_db | zstd | nut upload --stdin");
      parts.push('--filename "prod-db-2026.sql.zst"');
    } else if (cliMode === "dir") {
      parts.push("nut upload --recursive ./build-artifacts/");
    } else {
      parts.push("nut upload Q4-Architecture-Review.pdf");
    }

    if (cliAccount.trim()) {
      parts.push(`--account "${cliAccount.trim()}"`);
    }
    if (cliRemoteDir.trim() && cliRemoteDir.trim() !== "Uploads") {
      parts.push(`--remote-dir "${cliRemoteDir.trim()}"`);
    }
    if (cliShare) {
      parts.push("--share");
      if (cliPassword) {
        parts.push('--password "S3cretShare!2026"');
      }
    }
    if (cliOutputFormat !== "human") {
      parts.push(`--${cliOutputFormat}`);
    }

    const command = parts.join(" ");
    const targetName =
      cliMode === "stdin"
        ? "prod-db-2026.sql.zst"
        : cliMode === "dir"
        ? "build-artifacts/app-bundle.tar.gz"
        : "Q4-Architecture-Review.pdf";
    const remotePath = `${cliRemoteDir.trim() || "Uploads"}/${targetName}`;
    const shareUrl = "https://cloud.example.com/index.php/s/Nc84war1xx";
    const directUrl =
      "https://cloud.example.com/index.php/s/Nc84war1xx/download";

    let output = "";
    if (cliOutputFormat === "json") {
      output = JSON.stringify(
        {
          file: targetName,
          remote_path: remotePath,
          bytes: 4823450,
          success: true,
          ...(cliShare
            ? {
                share_url: shareUrl,
                direct_download_url: directUrl,
              }
            : {}),
        },
        null,
        2
      );
    } else if (cliOutputFormat === "tsv") {
      output = `${targetName}\t${remotePath}\t4823450\ttrue\t${
        cliShare ? shareUrl : ""
      }\t${cliShare ? directUrl : ""}`;
    } else if (cliOutputFormat === "url-only") {
      output = cliShare
        ? shareUrl
        : "# Note: --url-only requires --share flag";
    } else if (cliOutputFormat === "direct-url-only") {
      output = cliShare
        ? directUrl
        : "# Note: --direct-url-only requires --share flag";
    } else {
      output = [
        `==> Uploading '${targetName}' (4.60 MB) -> '${remotePath}'...`,
        `  [00:00:01] [████████████████████████████████████████] 4.60 MiB/4.60 MiB (4.12 MiB/s, 0s)`,
        `✓ Uploaded to ${remotePath}`,
        ...(cliShare
          ? [
              `  Share Link:      ${shareUrl}`,
              `  Direct Download: ${directUrl}`,
            ]
          : []),
      ].join("\n");
    }

    return { command, output };
  };

  const { command: generatedCliCmd, output: generatedCliOutput } =
    buildInteractiveCli();

  const filteredDocs = DOC_PAGES.filter((doc) => {
    if (!docSearchQuery.trim()) return true;
    const q = docSearchQuery.toLowerCase();
    return (
      doc.title.toLowerCase().includes(q) ||
      doc.subtitle.toLowerCase().includes(q) ||
      doc.markdown.toLowerCase().includes(q)
    );
  });

  const currentDoc =
    filteredDocs.find((d) => d.id === activeDocId) ||
    filteredDocs[0] ||
    DOC_PAGES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            className="flex items-center gap-3 font-bold text-base tracking-tight text-slate-900 dark:text-white"
          >
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-lg bg-sky-600 text-white font-extrabold flex items-center justify-center shadow-sm"
            >
              N
            </span>
            <span>Nextcloud Upload Tool</span>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300/50 dark:border-sky-800">
              {release.tag}
            </span>
          </a>

          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#showcase" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
              GUI Walkthrough
            </a>
            <a href="#features" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
              Features
            </a>
            <a href="#cli-playground" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
              CLI Playground
            </a>
            <a href="#downloads" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
              Downloads
            </a>
            <a href="#documentation" className="hover:text-sky-600 dark:hover:text-sky-400 transition">
              Documentation
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <a
              href="#downloads"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition"
            >
              Download {release.tag}
            </a>
            <a
              href={`https://github.com/${release.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-14 sm:py-20 border-b border-slate-200 dark:border-slate-800/80 bg-gradient-to-b from-sky-50/60 via-white to-slate-50 dark:from-slate-900/60 dark:via-slate-950 dark:to-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 mb-6">
                <span>Latest Release {release.tag}</span>
                <span aria-hidden="true">•</span>
                <a
                  href={release.releaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-sky-500"
                >
                  Release Notes &amp; Binaries
                </a>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
                Fast, Pipe-Friendly Nextcloud Uploads &amp; Instant Share Links
              </h1>

              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                Upload files, directories, and <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800">stdin</code> streams from your terminal with{" "}
                <code className="font-mono text-sm px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800">nut</code>, or drag-and-drop batches in the native{" "}
                <strong>Tauri v2 Desktop App</strong>. Powered by a unified Rust WebDAV + OCS engine with shared OS Keychain credentials.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="#downloads"
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20 transition"
                >
                  Download for macOS, Linux &amp; Windows ({release.tag})
                </a>
                <a
                  href="#documentation"
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Read Documentation
                </a>
              </div>
            </div>

            {/* Quick Install Command Switcher */}
            <div className="mt-10 max-w-3xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Package manager tabs">
                  {(
                    [
                      ["homebrew", "Homebrew", PACKAGE_MANAGER_FLAGS.homebrew],
                      ["winget", "Winget / Choco", PACKAGE_MANAGER_FLAGS.winget],
                      ["curl", "Static Binary", true],
                      ["aur", "Arch AUR", PACKAGE_MANAGER_FLAGS.aur],
                      ["cargo", "Cargo", true],
                    ] as const
                  )
                    .filter(([, , enabled]) => enabled)
                    .map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={installMethod === key}
                      onClick={() => setInstallMethod(key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                        installMethod === key
                          ? "bg-sky-600 text-white"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      installSnippets[installMethod].cmd
                    );
                    setCopiedBannerCmd(true);
                    setTimeout(() => setCopiedBannerCmd(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                >
                  {copiedBannerCmd ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre
                tabIndex={0}
                className="p-4 text-xs sm:text-sm font-mono leading-relaxed text-sky-300 overflow-x-auto"
              >
                <code>{installSnippets[installMethod].cmd}</code>
              </pre>
            </div>

            {/* GUI Walkthrough Showcase (GIFs & High-DPI Screenshots) */}
            <div id="showcase" className="mt-14 scroll-mt-20">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                {SHOWCASE_SLIDES.map((slide) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlide(slide.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition cursor-pointer ${
                      activeSlide === slide.id
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-sky-500/50"
                    }`}
                  >
                    <span>{slide.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activeSlide === slide.id
                          ? "bg-black/25 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      {slide.badge}
                    </span>
                  </button>
                ))}
              </div>

              <div className="max-w-5xl mx-auto">
                {SHOWCASE_SLIDES.map((slide, index) => {
                  const isActive = activeSlide === slide.id;
                  return (
                    <figure
                      key={slide.id}
                      hidden={!isActive}
                      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/95 p-3 sm:p-4 shadow-2xl"
                    >
                      {index === 0 ? (
                        <img
                          src={slide.src}
                          alt={slide.caption}
                          fetchPriority="high"
                          width={960}
                          height={740}
                          className="w-full h-auto rounded-xl border border-slate-700/70"
                        />
                      ) : (
                        <img
                          src={slide.src}
                          alt={slide.caption}
                          fetchPriority="low"
                          loading="lazy"
                          width={960}
                          height={740}
                          className="w-full h-auto rounded-xl border border-slate-700/70"
                        />
                      )}
                      <figcaption className="mt-3 text-center text-xs sm:text-sm text-slate-300">
                        {slide.caption}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Grid */}
        <section
          id="features"
          className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 scroll-mt-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                One Shared Rust Core. Two Native Experiences.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Built around the shared <code className="font-mono">nextcloud_client</code> crate so your accounts, tokens, and upload behavior stay 100% consistent across terminal scripts and desktop workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  title: "Streaming WebDAV Uploads",
                  desc: "Uploads gigabyte-scale files and live stdin pipes via chunked async streams with constant RAM overhead and automatic remote MKCOL directory creation.",
                },
                {
                  title: "Public Share & Direct Download URLs",
                  desc: "Automatically creates OCS public read-only shares (/index.php/s/<token>) and deterministic direct-download URLs (/index.php/s/<token>/download).",
                },
                {
                  title: "Shared OS Keychain Storage",
                  desc: "Stores app tokens in Apple Keychain, Windows Credential Manager, or Linux Secret Service (me.majinnaibu.nut) shared between CLI and GUI.",
                },
                {
                  title: "Login Flow v2 & Headless SSH",
                  desc: "Authenticate with 2FA/SSO via Nextcloud Login Flow v2 in browser, --no-browser URL polling over SSH, or non-interactive CI credentials.",
                },
                {
                  title: "Pipe & Automation Ready",
                  desc: "First-class support for --stdin, pv throughput monitoring, and structured --json, --tsv, --url-only, and --direct-url-only outputs.",
                },
                {
                  title: "Native Tauri v2 Desktop GUI",
                  desc: "Drag-and-drop file queue, item reordering, real-time batch and per-file progress bars, inline error retry, and instant account switching.",
                },
              ].map((feat) => (
                <article
                  key={feat.title}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-sm"
                >
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Interactive CLI Playground */}
        <section
          id="cli-playground"
          className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/30 scroll-mt-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Interactive CLI Command Builder
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Customize flags for <code className="font-mono">nut upload</code> and preview the exact command and terminal output format.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Controls */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                    1. Upload Source
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ["file", "Single File"],
                        ["dir", "Directory (-r)"],
                        ["stdin", "Stdin Pipe"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCliMode(mode)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                          cliMode === mode
                            ? "bg-sky-600 text-white border-sky-600"
                            : "border-slate-200 dark:border-slate-700 hover:border-sky-500/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="cli-account-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Account Label / ID (--account)
                    </label>
                    <input
                      id="cli-account-input"
                      type="text"
                      value={cliAccount}
                      onChange={(e) => setCliAccount(e.target.value)}
                      placeholder="Work"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="cli-remote-dir-input"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Remote Folder (--remote-dir)
                    </label>
                    <input
                      id="cli-remote-dir-input"
                      type="text"
                      value={cliRemoteDir}
                      onChange={(e) => setCliRemoteDir(e.target.value)}
                      placeholder="Uploads"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    2. Share Options
                  </h3>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cliShare}
                        onChange={(e) => setCliShare(e.target.checked)}
                      />
                      <span>Generate public share link (--share)</span>
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cliPassword}
                        disabled={!cliShare}
                        onChange={(e) => setCliPassword(e.target.checked)}
                      />
                      <span className={!cliShare ? "opacity-50" : ""}>
                        Protect share link with password (--password)
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    3. Output Format
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["human", "Interactive TTY"],
                        ["json", "--json"],
                        ["tsv", "--tsv"],
                        ["url-only", "--url-only"],
                        ["direct-url-only", "--direct-url-only"],
                      ] as const
                    ).map(([fmt, label]) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setCliOutputFormat(fmt)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold border transition cursor-pointer ${
                          cliOutputFormat === fmt
                            ? "bg-sky-600 text-white border-sky-600"
                            : "border-slate-200 dark:border-slate-700 hover:border-sky-500/50"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Command & Output Terminal Preview */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
                  <span className="text-xs font-mono text-slate-400">
                    Generated Command
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCliCmd);
                      setCopiedBuilderCmd(true);
                      setTimeout(() => setCopiedBuilderCmd(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    {copiedBuilderCmd ? "✓ Copied" : "Copy Command"}
                  </button>
                </div>
                <pre
                  tabIndex={0}
                  className="p-4 text-xs sm:text-sm font-mono text-sky-300 border-b border-slate-800/80 overflow-x-auto"
                >
                  <code>$ {generatedCliCmd}</code>
                </pre>

                <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 text-xs font-mono text-slate-400">
                  Stdout / Terminal Output Preview
                </div>
                <pre
                  tabIndex={0}
                  className="p-4 text-xs sm:text-sm font-mono text-emerald-300 leading-relaxed overflow-x-auto"
                >
                  <code>{generatedCliOutput}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        {/* Latest Release Downloads Matrix */}
        <section
          id="downloads"
          className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800 scroll-mt-16"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Download Latest Release ({release.tag})
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                  Pre-built native GUI installers and standalone static CLI binaries from{" "}
                  <a
                    href={release.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-sky-600 dark:text-sky-400 underline"
                  >
                    GitHub Release {release.tag}
                  </a>
                  .
                </p>
              </div>

              <div className="flex gap-2" role="tablist" aria-label="Operating system downloads">
                {(
                  [
                    ["macos", "macOS"],
                    ["linux", "Linux"],
                    ["windows", "Windows"],
                  ] as const
                ).map(([osKey, osLabel]) => (
                  <button
                    key={osKey}
                    type="button"
                    role="tab"
                    aria-selected={osTab === osKey}
                    onClick={() => setOsTab(osKey)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition cursor-pointer ${
                      osTab === osKey
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-500/50"
                    }`}
                  >
                    {osLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {release.assets[osTab].map((asset) => (
                <div
                  key={asset.filename}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          asset.kind === "gui"
                            ? "bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300"
                            : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        {asset.kind === "gui" ? "Desktop GUI" : "CLI Binary"}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {asset.arch}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-white truncate">
                      {asset.label}
                    </h3>
                    <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                      {asset.filename}
                    </p>
                  </div>

                  <a
                    href={asset.url}
                    className="shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Full Integrated Documentation Explorer */}
        <section id="documentation" className="py-16 sm:py-20 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                Comprehensive Documentation &amp; Guides
              </h2>
              <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Complete reference guides synced directly from the repository&apos;s{" "}
                <code className="font-mono">docs/</code> directory.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Sidebar Navigation */}
              <aside
                aria-label="Documentation Navigation"
                className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-20"
              >
                <search>
                  <label htmlFor="doc-search" className="sr-only">
                    Filter documentation guides
                  </label>
                  <input
                    id="doc-search"
                    type="search"
                    value={docSearchQuery}
                    onChange={(e) => setDocSearchQuery(e.target.value)}
                    placeholder="Filter guides & commands..."
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm"
                  />
                </search>

                <nav aria-label="Documentation Pages" className="space-y-1.5">
                  {filteredDocs.map((doc) => {
                    const isSelected = currentDoc.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setActiveDocId(doc.id)}
                        className={`w-full text-left rounded-xl p-3 border transition cursor-pointer ${
                          isSelected
                            ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-sky-500/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm">
                            {doc.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isSelected
                                ? "bg-black/25 text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {doc.badge}
                          </span>
                        </div>
                        <p
                          className={`mt-1 text-xs line-clamp-2 ${
                            isSelected
                              ? "text-sky-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {doc.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </nav>
              </aside>

              {/* Documentation Reader Panel */}
              <article className="lg:col-span-8 xl:col-span-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-5 mb-6 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      {currentDoc.sourceFile}
                    </span>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {currentDoc.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {currentDoc.subtitle}
                    </p>
                  </div>

                  <a
                    href={`https://github.com/${release.repo}/blob/develop/${currentDoc.sourceFile}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    View Source on GitHub
                  </a>
                </div>

                <MarkdownRenderer
                  markdown={currentDoc.markdown}
                  release={release}
                />
              </article>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="w-6 h-6 rounded bg-sky-600 text-white font-bold flex items-center justify-center"
            >
              N
            </span>
            <span>
              Nextcloud Upload Tool ({release.tag}) — MIT License
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href={`https://github.com/${release.repo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-500"
            >
              GitHub Repository
            </a>
            <a
              href={release.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-sky-500"
            >
              Releases ({release.tag})
            </a>
            <a href="#documentation" className="hover:text-sky-500">
              Documentation
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
