# ============================================================
#  run_yaku_test.ps1 - Tiisu Mahjong yaku / scoring assertions
#
#  Usage:
#    powershell -NoProfile -ExecutionPolicy Bypass -File P:\Playground\scripts\run_yaku_test.ps1
#    powershell ... -File scripts\run_yaku_test.ps1 -Port 7777 -NoStart
#
#  What it does:
#    1) checks port 7777 (starts server.py if not listening, same as smoke.ps1);
#    2) opens scripts/yaku_test.html in headless Edge and reads <pre id="out">;
#    3) prints per-case results plus the YAKUTEST summary line.
#       Exit code: 0 = all passed, 1 = failures, 2 = environment problem.
#
#  Division of labour with smoke.ps1:
#    smoke.ps1      -> project health (boots, renders, plays a full hand)
#    this script    -> rule correctness (yaku, fu, points, ma bonus)
#
#  Read-only on the repository; writes only under %TEMP%.
#  ASCII-only on purpose: PowerShell 5.1 reads .ps1 as ANSI, so non-ASCII
#  text here would be mangled (this is exactly why smoke.ps1 is ASCII).
# ============================================================
[CmdletBinding()]
param(
    [int]$Port = 7777,
    [string]$Edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    [int]$BudgetMs = 60000,
    [switch]$NoStart,
    [switch]$Quiet
)

$ErrorActionPreference = 'Continue'
$script:Root = Split-Path -Parent $PSScriptRoot

function Get-PythonExe {
    $cands = @(
        "C:\Users\rksk1\AppData\Local\Programs\Python\Python314\python.exe",
        "C:\Program Files\PyManager\python.exe",
        "C:\Python313\python.exe",
        "C:\Python312\python.exe"
    )
    foreach ($c in $cands) { if (Test-Path $c) { return $c } }
    foreach ($n in @("py", "python")) {
        $g = Get-Command $n -ErrorAction SilentlyContinue
        if ($g) { return $g.Source }
    }
    return $null
}

function Test-PortListening {
    param([int]$P)
    $c = Get-NetTCPConnection -State Listen -LocalPort $P -ErrorAction SilentlyContinue
    return (@($c).Count -gt 0)
}

function Start-ServerIfNeeded {
    param([int]$P)
    if (Test-PortListening -P $P) { return $true }
    if ($NoStart) { return $false }
    $py = Get-PythonExe
    if (-not $py) { return $false }
    Write-Host "   port $P not listening; starting server: $py"
    Start-Process -FilePath $py -ArgumentList (Join-Path $script:Root "server.py") -WindowStyle Hidden
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-PortListening -P $P) { return $true }
    }
    return $false
}

# ---- preconditions ----
if (-not (Test-Path $Edge)) {
    $alt = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    if (Test-Path $alt) { $Edge = $alt }
    else {
        Write-Host "Edge not found: $Edge" -ForegroundColor Red
        Write-Host "Pass -Edge <path> to point at a Chromium browser." -ForegroundColor Red
        exit 2
    }
}

Write-Host "Tiisu Mahjong yaku/score assertion test"
Write-Host "Root: $script:Root"

if (-not (Start-ServerIfNeeded -P $Port)) {
    Write-Host "server not ready on port $Port; cannot run the test page." -ForegroundColor Red
    Write-Host "Start it with run.cmd, then re-run this script." -ForegroundColor Red
    exit 2
}

# ---- headless run of the assertion page ----
$ud = Join-Path $env:TEMP "yt_runner_prof"
$cd = Join-Path $env:TEMP "yt_runner_cache"
$h  = Join-Path $env:TEMP "yt_runner_out.html"
$l  = Join-Path $env:TEMP "yt_runner.log"
Remove-Item -Recurse -Force $ud, $cd -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $ud, $cd | Out-Null

$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$url = "http://127.0.0.1:$Port/scripts/yaku_test.html?ts=$ts"
$cmd = "`"$Edge`" --headless=new --disable-gpu --disable-cache --disk-cache-dir=`"$cd`" " +
       "--enable-logging=stderr --v=0 --user-data-dir=`"$ud`" --dump-dom " +
       "--virtual-time-budget=$BudgetMs `"$url`" > `"$h`" 2> `"$l`""
cmd /c $cmd | Out-Null

if (-not (Test-Path $h)) {
    Write-Host "headless browser produced no output." -ForegroundColor Red
    exit 2
}

$html = [string](Get-Content $h -Raw -Encoding UTF8)
$m = [regex]::Match($html, '<pre id="out">(.*?)</pre>', 'Singleline')
if (-not $m.Success) {
    Write-Host "no <pre id=out> in the dumped DOM (page did not finish)." -ForegroundColor Red
    $log = ""
    if (Test-Path $l) { $log = [string](Get-Content $l -Raw -Encoding UTF8) }
    $errs = [regex]::Matches($log, '.*(Uncaught|ReferenceError|TypeError|SyntaxError).*')
    foreach ($e in $errs) { Write-Host ("  " + $e.Value.Trim()) -ForegroundColor DarkRed }
    exit 2
}

$text = $m.Groups[1].Value -replace "`r", ""
$lines = $text -split "`n"
$head = $lines[0]

# ---- print ----
foreach ($ln in $lines) {
    if ($Quiet -and ($ln -notmatch '^# ') -and ($ln -notmatch '^  (FAIL|ERROR)')) { continue }
    if ($ln -match '^# ') { Write-Host ""; Write-Host $ln -ForegroundColor Cyan }
    elseif ($ln -match '^  PASS') { Write-Host $ln -ForegroundColor DarkGray }
    elseif ($ln -match '^  (FAIL|ERROR)') { Write-Host $ln -ForegroundColor Red }
    elseif ($ln -match '^ +[^ ]') { Write-Host $ln -ForegroundColor DarkRed }
}

Write-Host ""
Write-Host "----------------------------------------"
if ($head -match '^YAKUTEST: PASS') {
    Write-Host $head -ForegroundColor Green
    exit 0
} elseif ($head -match '^YAKUTEST: FAIL') {
    Write-Host $head -ForegroundColor Yellow
    Write-Host "Note: cases titled [gap] are known-unimplemented rules; see the gap list doc." -ForegroundColor DarkGray
    exit 1
} else {
    Write-Host $head -ForegroundColor Red
    exit 2
}
