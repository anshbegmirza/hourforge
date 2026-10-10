# Start backend + frontend for local testing.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

$npm = if (Get-Command npm.cmd -ErrorAction SilentlyContinue) { "npm.cmd" } else { "npm" }

$backend = Start-Process -FilePath $npm -ArgumentList "run", "dev" `
  -WorkingDirectory (Join-Path $Root "backend") `
  -NoNewWindow -PassThru

$frontend = Start-Process -FilePath $npm -ArgumentList "start" `
  -WorkingDirectory (Join-Path $Root "frontend") `
  -NoNewWindow -PassThru

Write-Host "Backend:  http://localhost:3000  (pid $($backend.Id))"
Write-Host "Frontend: http://localhost:4200  (pid $($frontend.Id))"
Write-Host "Both running. Press Ctrl+C to stop."

try {
  Wait-Process -Id $backend.Id, $frontend.Id
} finally {
  Write-Host "`nStopping..."
  foreach ($p in @($backend, $frontend)) {
    if (-not $p.HasExited) {
      Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
