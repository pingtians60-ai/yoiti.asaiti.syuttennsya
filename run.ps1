$Host.UI.RawUI.WindowTitle = "夜市出店者管理システム"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   [ 夜市出店者管理システム ] 起動中..." -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ブラウザが自動的に開きます。" -ForegroundColor White
Write-Host "  ※ 終了するときは、この画面（ウィンドウ）を閉じてください。" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[エラー] Node.js が見つかりません。Node.js をインストールしてください。" -ForegroundColor Red
    Read-Host "Enterキーを押して終了します"
    exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "初回セットアップ中（ライブラリのインストール）..." -ForegroundColor Magenta
    cmd.exe /c npm.cmd install
}

Write-Host "サーバーを起動し、ブラウザを開きます..." -ForegroundColor Green
cmd.exe /c npm.cmd run dev -- --open
