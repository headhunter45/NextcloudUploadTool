import installationMd from "../../docs/installation.md?raw";
import guiGuideMd from "../../docs/gui-guide.md?raw";
import cliReferenceMd from "../../docs/cli-reference.md?raw";
import automationRecipesMd from "../../docs/automation-recipes.md?raw";
import multiAccountMd from "../../docs/multi-account.md?raw";
import architectureMd from "../../docs/architecture.md?raw";

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
    subtitle: "Install via Homebrew, Winget, Chocolatey, AUR, pre-built binaries, or Cargo.",
    badge: "Setup",
    sourceFile: "docs/installation.md",
    markdown: installationMd,
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

