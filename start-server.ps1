param(
  [int]$Port = 4321
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

npm run dev -- --host 127.0.0.1 --port $Port
