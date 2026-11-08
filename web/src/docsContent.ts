import installationMd from "../../docs/installation.md?raw";
import guiGuideMd from "../../docs/gui-guide.md?raw";
import cliReferenceMd from "../../docs/cli-reference.md?raw";
import automationRecipesMd from "../../docs/automation-recipes.md?raw";
import multiAccountMd from "../../docs/multi-account.md?raw";
import architectureMd from "../../docs/architecture.md?raw";

/**
 * Feature flags to control whether third-party package manager installation
 * options are displayed on the website. Keep sections in source and flip
 * individual flags to `true` once each package/tap is live and accepted.
 */
export const PACKAGE_MANAGER_FLAGS = {
  homebrew: false,
  winget: false,
  aur: false,
} as const;

export const ANY_PACKAGE_MANAGER_ENABLED = Object.values(
  PACKAGE_MANAGER_FLAGS
).some(Boolean);

function filterInstallationMarkdown(rawMd: string): string {
  if (
    PACKAGE_MANAGER_FLAGS.homebrew &&
    PACKAGE_MANAGER_FLAGS.winget &&
    PACKAGE_MANAGER_FLAGS.aur
  ) {
    return rawMd;
  }

  if (!ANY_PACKAGE_MANAGER_ENABLED) {
    // Hide the entire "## 1. Package Managers" section until at least one is enabled,
    // and renumber sections 2 and 3 to 1 and 2 for clean presentation.
    return rawMd
      .replace(/## 1\. Package Managers[\s\S]*?---\r?\n+/m, "")
      .replace("## 2. Pre-built Binaries & Installers", "## 1. Pre-built Binaries & Installers")
      .replace("## 3. Building from Source", "## 2. Building from Source");
  }

  let result = rawMd;
  if (!PACKAGE_MANAGER_FLAGS.homebrew) {
    result = result.replace(
      /### macOS & Linux \(Homebrew\)[\s\S]*?```\r?\n+/m,
      ""
    );
  }
  if (!PACKAGE_MANAGER_FLAGS.winget) {
    result = result.replace(
      /### Windows \(Winget & Chocolatey\)[\s\S]*?```\r?\n+/m,
      ""
    );
  }
  if (!PACKAGE_MANAGER_FLAGS.aur) {
    result = result.replace(/### Arch Linux \(AUR\)[\s\S]*?```\r?\n+/m, "");
  }
  return result;
}

export interface DocPage {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  sourceFile: string;
  markdown: string;
}

export const DOC_PAGES: DocPage[] = [
  {
    id: "installation",
    title: "Installation Guide",
    subtitle: ANY_PACKAGE_MANAGER_ENABLED
      ? "Install via Homebrew, Winget, Chocolatey, AUR, pre-built binaries, or Cargo."
      : "Install via pre-built release binaries, native OS installers, or Cargo.",
    badge: "Setup",
    sourceFile: "docs/installation.md",
    markdown: filterInstallationMarkdown(installationMd),
  },
  {
    id: "gui-guide",
    title: "GUI Desktop App Guide",
    subtitle: "Visual walkthrough of the Tauri v2 desktop uploader, queue, and share links.",
    badge: "Desktop GUI",
    sourceFile: "docs/gui-guide.md",
    markdown: guiGuideMd,
  },
  {
    id: "cli-reference",
    title: "CLI Command Reference",
    subtitle: "Complete reference for nut login, upload, accounts, completions, and output flags.",
    badge: "CLI",
    sourceFile: "docs/cli-reference.md",
    markdown: cliReferenceMd,
  },
  {
    id: "automation-recipes",
    title: "Automation & Scripting Recipes",
    subtitle: "Unix pipelines, database backup streaming, jq/TSV parsing, and CI/CD workflows.",
    badge: "Recipes",
    sourceFile: "docs/automation-recipes.md",
    markdown: automationRecipesMd,
  },
  {
    id: "multi-account",
    title: "Multi-Account Management",
    subtitle: "Share credentials and switch seamlessly between multiple Nextcloud servers.",
    badge: "Auth & Keychain",
    sourceFile: "docs/multi-account.md",
    markdown: multiAccountMd,
  },
  {
    id: "architecture",
    title: "Architecture & Developer Setup",
    subtitle: "Workspace structure, WebDAV streaming pipeline, OCS sharing, and local dev guide.",
    badge: "Internals",
    sourceFile: "docs/architecture.md",
    markdown: architectureMd,
  },
];

