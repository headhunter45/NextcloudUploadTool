#!/usr/bin/env bash
set -euo pipefail

# Nextcloud Upload Tool — Package Manager Manifest Updater
# Usage: ./scripts/update-manifests.sh <version> [path-to-SHA256SUMS]
#
# Updates version numbers and SHA256 checksums across Homebrew, Winget,
# Chocolatey, and AUR manifests in packaging/.

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version> [path-to-SHA256SUMS]" >&2
  exit 1
fi

RAW_VERSION="$1"
VERSION="${RAW_VERSION#v}"
SHA_FILE="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
PKG_DIR="${ROOT_DIR}/packaging"

lookup_sha() {
  local artifact="$1"
  if [ -n "${SHA_FILE}" ] && [ -f "${SHA_FILE}" ]; then
    grep -F "${artifact}" "${SHA_FILE}" | awk '{print $1}' | head -n 1 || true
  fi
}

SHA_DARWIN_ARM64="$(lookup_sha "nut-aarch64-apple-darwin.tar.gz")"
SHA_DARWIN_X64="$(lookup_sha "nut-x86_64-apple-darwin.tar.gz")"
SHA_LINUX_ARM64="$(lookup_sha "nut-aarch64-unknown-linux-musl.tar.gz")"
SHA_LINUX_X64="$(lookup_sha "nut-x86_64-unknown-linux-musl.tar.gz")"
SHA_WIN_X64="$(lookup_sha "nut-x86_64-pc-windows-msvc.zip")"

SHA_DARWIN_ARM64="${SHA_DARWIN_ARM64:-0000000000000000000000000000000000000000000000000000000000000000}"
SHA_DARWIN_X64="${SHA_DARWIN_X64:-0000000000000000000000000000000000000000000000000000000000000000}"
SHA_LINUX_ARM64="${SHA_LINUX_ARM64:-0000000000000000000000000000000000000000000000000000000000000000}"
SHA_LINUX_X64="${SHA_LINUX_X64:-0000000000000000000000000000000000000000000000000000000000000000}"
SHA_WIN_X64="${SHA_WIN_X64:-0000000000000000000000000000000000000000000000000000000000000000}"

python3 - "${PKG_DIR}" "${VERSION}" "${SHA_DARWIN_ARM64}" "${SHA_DARWIN_X64}" "${SHA_LINUX_ARM64}" "${SHA_LINUX_X64}" "${SHA_WIN_X64}" <<'PY'
import pathlib
import re
import sys

pkg_dir = pathlib.Path(sys.argv[1])
version = sys.argv[2]
sha_darwin_arm64 = sys.argv[3]
sha_darwin_x64 = sys.argv[4]
sha_linux_arm64 = sys.argv[5]
sha_linux_x64 = sys.argv[6]
sha_win_x64 = sys.argv[7]

# 1. Homebrew Formula
formula_path = pkg_dir / "homebrew" / "Formula" / "nut.rb"
formula = formula_path.read_text(encoding="utf-8")
formula = re.sub(r'version "[^"]+"', f'version "{version}"', formula)
formula = re.sub(
    r'(nut-aarch64-apple-darwin\.tar\.gz"\n\s+sha256 ")([0-9a-fA-F]{64})(")',
    rf"\g<1>{sha_darwin_arm64}\g<3>",
    formula,
)
formula = re.sub(
    r'(nut-x86_64-apple-darwin\.tar\.gz"\n\s+sha256 ")([0-9a-fA-F]{64})(")',
    rf"\g<1>{sha_darwin_x64}\g<3>",
    formula,
)
formula = re.sub(
    r'(nut-aarch64-unknown-linux-musl\.tar\.gz"\n\s+sha256 ")([0-9a-fA-F]{64})(")',
    rf"\g<1>{sha_linux_arm64}\g<3>",
    formula,
)
formula = re.sub(
    r'(nut-x86_64-unknown-linux-musl\.tar\.gz"\n\s+sha256 ")([0-9a-fA-F]{64})(")',
    rf"\g<1>{sha_linux_x64}\g<3>",
    formula,
)
formula_path.write_text(formula, encoding="utf-8")

# 2. Homebrew Cask
cask_path = pkg_dir / "homebrew" / "Casks" / "nextcloud-upload-tool.rb"
cask = cask_path.read_text(encoding="utf-8")
cask = re.sub(r'version "[^"]+"', f'version "{version}"', cask)
cask_path.write_text(cask, encoding="utf-8")

# 3. Winget manifests
for wg_file in (pkg_dir / "winget").glob("*.yaml"):
    text = wg_file.read_text(encoding="utf-8")
    text = re.sub(r"PackageVersion: .*", f"PackageVersion: {version}", text)
    text = re.sub(r"/releases/download/v[^/]+/", f"/releases/download/v{version}/", text)
    text = re.sub(r"Nextcloud\.Upload\.Tool_[^_]+_x64-setup\.exe", f"Nextcloud.Upload.Tool_{version}_x64-setup.exe", text)
    text = re.sub(r"/releases/tag/v.*", f"/releases/tag/v{version}", text)
    text = re.sub(
        r"(nut-x86_64-pc-windows-msvc\.zip\n\s+InstallerSha256: )([0-9a-fA-F]{64})",
        rf"\g<1>{sha_win_x64}",
        text,
    )
    wg_file.write_text(text, encoding="utf-8")

# 4. Chocolatey manifests
nuspec_path = pkg_dir / "chocolatey" / "nextcloud-upload-tool.nuspec"
nuspec = nuspec_path.read_text(encoding="utf-8")
nuspec = re.sub(r"<version>[^<]+</version>", f"<version>{version}</version>", nuspec)
nuspec = re.sub(r"/releases/tag/v[^<]+", f"/releases/tag/v{version}", nuspec)
nuspec_path.write_text(nuspec, encoding="utf-8")

choco_install_path = pkg_dir / "chocolatey" / "tools" / "chocolateyinstall.ps1"
choco_install = choco_install_path.read_text(encoding="utf-8")
choco_install = re.sub(r"\$version\s+=\s+'[^']+'", f"$version     = '{version}'", choco_install)
choco_install = re.sub(r"\$checksum64\s+=\s+'[0-9a-fA-F]{64}'", f"$checksum64  = '{sha_win_x64}'", choco_install)
choco_install_path.write_text(choco_install, encoding="utf-8")

# 5. AUR PKGBUILD & .SRCINFO
pkgbuild_path = pkg_dir / "aur" / "PKGBUILD"
pkgbuild = pkgbuild_path.read_text(encoding="utf-8")
pkgbuild = re.sub(r"^pkgver=.*$", f"pkgver={version}", pkgbuild, flags=re.MULTILINE)
pkgbuild = re.sub(r"^sha256sums_x86_64=\('[0-9a-fA-F]{64}'\)$", f"sha256sums_x86_64=('{sha_linux_x64}')", pkgbuild, flags=re.MULTILINE)
pkgbuild = re.sub(r"^sha256sums_aarch64=\('[0-9a-fA-F]{64}'\)$", f"sha256sums_aarch64=('{sha_linux_arm64}')", pkgbuild, flags=re.MULTILINE)
pkgbuild_path.write_text(pkgbuild, encoding="utf-8")

srcinfo_path = pkg_dir / "aur" / ".SRCINFO"
srcinfo = srcinfo_path.read_text(encoding="utf-8")
srcinfo = re.sub(r"^\tpkgver = .*$", f"\tpkgver = {version}", srcinfo, flags=re.MULTILINE)
srcinfo = re.sub(
    r"^\tsource_x86_64 = .*$",
    f"\tsource_x86_64 = nextcloud-upload-tool-bin-{version}-x86_64.tar.gz::https://github.com/headhunter45/NextcloudUploadTool/releases/download/v{version}/nut-x86_64-unknown-linux-musl.tar.gz",
    srcinfo,
    flags=re.MULTILINE,
)
srcinfo = re.sub(r"^\tsha256sums_x86_64 = .*$", f"\tsha256sums_x86_64 = {sha_linux_x64}", srcinfo, flags=re.MULTILINE)
srcinfo = re.sub(
    r"^\tsource_aarch64 = .*$",
    f"\tsource_aarch64 = nextcloud-upload-tool-bin-{version}-aarch64.tar.gz::https://github.com/headhunter45/NextcloudUploadTool/releases/download/v{version}/nut-aarch64-unknown-linux-musl.tar.gz",
    srcinfo,
    flags=re.MULTILINE,
)
srcinfo = re.sub(r"^\tsha256sums_aarch64 = .*$", f"\tsha256sums_aarch64 = {sha_linux_arm64}", srcinfo, flags=re.MULTILINE)
srcinfo_path.write_text(srcinfo, encoding="utf-8")
PY

echo "✓ Updated package manager manifests in ${PKG_DIR} to v${VERSION}"

