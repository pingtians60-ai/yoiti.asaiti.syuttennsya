const fs = require('fs');
const path = require('path');

// UTF-8 with BOM を作成するヘルパー
function writeUtf8Bom(filePath, text) {
  const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
  const content = Buffer.from(text, 'utf8');
  fs.writeFileSync(filePath, Buffer.concat([bom, content]));
}

// 1. run.ps1 (UTF-8 with BOM で保存)
const runPs1Content = `$Host.UI.RawUI.WindowTitle = "夜市出店者管理システム"

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
`;

writeUtf8Bom(path.join(__dirname, 'run.ps1'), runPs1Content);

// 2. 起動する.bat (純粋なASCIIバッチ)
const batContent = `@echo off
cd /d "%~dp0"
powershell.exe -NoLogo -ExecutionPolicy Bypass -File "%~dp0run.ps1"
if %errorlevel% neq 0 pause
`;
fs.writeFileSync(path.join(__dirname, '起動する.bat'), batContent, 'ascii');

// 3. デスクトップにショートカット作成.vbs
const vbsContent = `Option Explicit
Dim oWS, oFSO, sScriptDir, sDesktop, oLink, isSilent

Set oWS = CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")
sScriptDir = oFSO.GetParentFolderName(WScript.ScriptFullName)
sDesktop = oWS.SpecialFolders("Desktop")

isSilent = False
If WScript.Arguments.Count > 0 Then
    If WScript.Arguments(0) = "/silent" Then isSilent = True
End If

' デスクトップにショートカット作成
Set oLink = oWS.CreateShortcut(sDesktop & "\\夜市出店者管理システム.lnk")
oLink.TargetPath = sScriptDir & "\\起動する.bat"
oLink.WorkingDirectory = sScriptDir
oLink.Description = "夜市出店者管理システムを起動"
oLink.WindowStyle = 1
oLink.Save

' フォルダ内にも同じショートカットを作成（エクスプローラーで見つけやすくするため）
Set oLink = oWS.CreateShortcut(sScriptDir & "\\夜市出店者管理システム.lnk")
oLink.TargetPath = sScriptDir & "\\起動する.bat"
oLink.WorkingDirectory = sScriptDir
oLink.Description = "夜市出店者管理システムを起動"
oLink.WindowStyle = 1
oLink.Save

If Not isSilent Then
    MsgBox "デスクトップおよびフォルダ内に「夜市出店者管理システム」のショートカットを作成しました！" & vbCrLf & vbCrLf & "アイコンをダブルクリックするだけでいつでも起動できます。", vbInformation, "夜市出店者管理システム"
End If
`;
// VBSはUTF-16LEで保存
const u16Bom = Buffer.from([0xFF, 0xFE]);
const u16Content = Buffer.from(vbsContent, 'utf16le');
const vbsPath = path.join(__dirname, 'デスクトップにショートカット作成.vbs');
fs.writeFileSync(vbsPath, Buffer.concat([u16Bom, u16Content]));

// cscript を使ってサイレントモードで即座にショートカットを生成
try {
  const cp = require('child_process');
  cp.execSync(`cscript //nologo "${vbsPath}" /silent`);
  console.log("Shortcuts created successfully!");
} catch (e) {
  console.error("Shortcut creation error:", e.message);
}

console.log("Successfully generated all startup scripts!");
