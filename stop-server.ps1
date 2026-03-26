param(
  [int]$Port = 4173,
  [switch]$Force
)

$connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $connection) {
  Write-Host "No listening server found on port $Port."
  exit 0
}

$process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue

if (-not $process) {
  Write-Host "A process was listening on port $Port, but it exited before it could be stopped."
  exit 0
}

if (-not $Force -and $process.ProcessName -ne "node") {
  Write-Host "Port $Port is owned by '$($process.ProcessName)' (PID $($process.Id))."
  Write-Host "Run .\stop-server.ps1 -Port $Port -Force if you want to stop it anyway."
  exit 1
}

Stop-Process -Id $process.Id -ErrorAction Stop
Write-Host "Stopped $($process.ProcessName) (PID $($process.Id)) on port $Port."
