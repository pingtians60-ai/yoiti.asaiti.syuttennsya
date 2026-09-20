Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   [ 夜市出店者管理システム ] GitHub Pages デプロイ" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $currentDir

$env:PATH = [Environment]::GetEnvironmentVariable("Path","User") + ";" + [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + $env:PATH

Write-Host "1. プロジェクトをビルド中..." -ForegroundColor Green
cmd.exe /c npm.cmd run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "[エラー] ビルドに失敗しました。" -ForegroundColor Red
    exit 1
}

# .nojekyll を配置（GitHub Pagesで_から始まるアセット等を無視させないため）
New-Item -ItemType File -Path "dist\.nojekyll" -Force | Out-Null

Write-Host "2. gh-pages ブランチへデプロイ中..." -ForegroundColor Green
$tempDir = Join-Path $env:TEMP "gh-pages-deploy"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
Copy-Item -Recurse "dist" $tempDir

git -C $tempDir init -b gh-pages
git -C $tempDir config user.name "pingtians60-ai"
git -C $tempDir config user.email "316494324+pingtians60-ai@users.noreply.github.com"
git -C $tempDir add .
git -C $tempDir commit -m "Deploy to GitHub Pages $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git -C $tempDir remote add origin https://github.com/pingtians60-ai/yoiti.asaiti.syuttennsya.git
git -C $tempDir push -f origin gh-pages

Remove-Item -Recurse -Force $tempDir

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "✅ デプロイが完了しました！" -ForegroundColor Green
Write-Host "🌐 公開URL: https://pingtians60-ai.github.io/yoiti.asaiti.syuttennsya/" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
