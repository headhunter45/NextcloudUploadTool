# typed: false
# frozen_string_literal: true

class Nut < Formula
  desc "Fast Nextcloud CLI file uploader and public share link generator"
  homepage "https://github.com/headhunter45/NextcloudUploadTool"
  version "0.1.0"
  license "MIT"

  on_macos do
    if Hardware::CPU.arm?
      url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/nut-aarch64-apple-darwin.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    else
      url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/nut-x86_64-apple-darwin.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  end

  on_linux do
    if Hardware::CPU.arm? && Hardware::CPU.is_64_bit?
      url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/nut-aarch64-unknown-linux-musl.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    else
      url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/nut-x86_64-unknown-linux-musl.tar.gz"
      sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    end
  end

  def install
    bin.install "nut"
    generate_completions_from_executable(bin/"nut", "completions")
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nut --version")
  end
end

