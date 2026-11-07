cask "nextcloud-upload-tool" do
  version "0.1.0"

  on_arm do
    sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/Nextcloud.Upload.Tool_#{version}_aarch64.dmg"
  end
  on_intel do
    sha256 "0000000000000000000000000000000000000000000000000000000000000000"
    url "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v#{version}/Nextcloud.Upload.Tool_#{version}_x64.dmg"
  end

  name "Nextcloud Upload Tool"
  desc "Desktop GUI and uploader for Nextcloud with instant share link generation"
  homepage "https://github.com/headhunter45/NextcloudUploadTool"

  app "Nextcloud Upload Tool.app"

  zap trash: [
    "~/Library/Application Support/me.majinnaibu.nut",
    "~/Library/Caches/me.majinnaibu.nut",
    "~/Library/Preferences/me.majinnaibu.nut.plist",
    "~/Library/Saved Application State/me.majinnaibu.nut.savedState",
  ]
end

