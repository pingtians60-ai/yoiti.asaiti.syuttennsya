$currentDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $currentDir
node deploy.cjs
