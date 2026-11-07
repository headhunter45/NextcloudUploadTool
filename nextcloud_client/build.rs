use std::env;
use std::path::Path;
use std::process::Command;

fn resolve_git_tag_version() -> Option<String> {
    if let Ok(explicit) = env::var("NUT_VERSION") {
        let trimmed = explicit.trim().trim_start_matches('v');
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }

    let output = Command::new("git")
        .args([
            "-c",
            "versionsort.suffix=-dev",
            "tag",
            "--merged",
            "HEAD",
            "--list",
            "v*",
            "--sort=-v:refname",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let first_tag = stdout.lines().map(str::trim).find(|line| !line.is_empty())?;
    let version = first_tag.trim_start_matches('v');
    if version.is_empty() {
        None
    } else {
        Some(version.to_string())
    }
}

fn main() {
    println!("cargo:rerun-if-env-changed=NUT_VERSION");

    // Re-run build script when git HEAD or tags change
    let git_dir = Path::new("../.git");
    if git_dir.exists() {
        println!("cargo:rerun-if-changed=../.git/HEAD");
        println!("cargo:rerun-if-changed=../.git/packed-refs");
        println!("cargo:rerun-if-changed=../.git/refs/tags");
    }

    let fallback = env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| "0.1.0".to_string());
    let version = resolve_git_tag_version().unwrap_or(fallback);

    println!("cargo:rustc-env=NUT_VERSION={version}");
}

