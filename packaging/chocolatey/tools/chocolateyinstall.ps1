$ErrorActionPreference = 'Stop'

$packageName = 'nextcloud-upload-tool'
$toolsDir    = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"
$version     = '0.1.0'
$url64       = "https://github.com/headhunter45/NextcloudUploadTool/releases/download/v$version/nut-x86_64-pc-windows-msvc.zip"
$checksum64  = '0000000000000000000000000000000000000000000000000000000000000000'

$packageArgs = @{
  packageName    = $packageName
  unzipLocation  = $toolsDir
  url64bit       = $url64
  checksum64     = $checksum64
  checksumType64 = 'sha256'
}

Install-ChocolateyZipPackage @packageArgs

