@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================================
echo  夜市出店者管理システム：公開ページ（GitHub Pages）更新
echo ========================================================
echo.
node deploy.cjs
echo.
pause
