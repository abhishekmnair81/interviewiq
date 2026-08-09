param()

$ProjectRoot = "e:\interviewiq"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   InterviewIQ --- Starting Services" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Stopping any old servers..." -ForegroundColor Yellow

foreach ($port in @(8000, 3000)) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($conn) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        Write-Host "      Killed process on port $port" -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 2

Write-Host "[2/4] Starting Django backend (port 8000)..." -ForegroundColor Yellow

$backendScript = @"
`$Host.UI.RawUI.WindowTitle = 'InterviewIQ Backend :8000'
Set-Location '$ProjectRoot\backend'
Write-Host 'Starting Django...' -ForegroundColor Cyan
.\venv\Scripts\python.exe manage.py runserver 8000
Write-Host 'Backend stopped.' -ForegroundColor Red
Read-Host 'Press Enter to close'
"@

$backendScriptPath = "$env:TEMP\iiq_backend.ps1"
$backendScript | Out-File -FilePath $backendScriptPath -Encoding UTF8

Start-Process powershell.exe `
    -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $backendScriptPath `
    -WindowStyle Normal

Start-Sleep -Seconds 4

Write-Host "[3/4] Starting Next.js frontend (port 3000)..." -ForegroundColor Yellow

$frontendScript = @"
`$Host.UI.RawUI.WindowTitle = 'InterviewIQ Frontend :3000'
Set-Location '$ProjectRoot\frontend'
Write-Host 'Starting Next.js...' -ForegroundColor Cyan
npm run dev
Write-Host 'Frontend stopped.' -ForegroundColor Red
Read-Host 'Press Enter to close'
"@

$frontendScriptPath = "$env:TEMP\iiq_frontend.ps1"
$frontendScript | Out-File -FilePath $frontendScriptPath -Encoding UTF8

Start-Process powershell.exe `
    -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", $frontendScriptPath `
    -WindowStyle Normal

Start-Sleep -Seconds 6

Write-Host "[4/4] Verifying backend health..." -ForegroundColor Yellow

$ok = $false
for ($i = 0; $i -lt 15; $i++) {
    try {
        $r = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health/" -TimeoutSec 2 -ErrorAction Stop
        if ($r.status -eq "ok") { $ok = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
if ($ok) {
    Write-Host "  Backend   OK : http://127.0.0.1:8000" -ForegroundColor Green
} else {
    Write-Host "  Backend SLOW : check the backend window" -ForegroundColor Red
}
Write-Host "  Frontend     : http://localhost:3000" -ForegroundColor Green
Write-Host "  API Docs     : http://127.0.0.1:8000/api/docs/" -ForegroundColor Gray
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Do NOT close the two server windows that opened." -ForegroundColor Yellow
Write-Host "Close those windows when you want to stop the servers." -ForegroundColor Yellow
Write-Host ""
