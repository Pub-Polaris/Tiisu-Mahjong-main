# ============================================================
#  smoke.ps1 - Tiisu Mahjong smoke test
#  Usage:
#    powershell -NoProfile -ExecutionPolicy Bypass -File P:\Playground\scripts\smoke.ps1
#    powershell ... -File scripts\smoke.ps1 -Runs 8      # repeat auto game 8 times
#    powershell ... -File scripts\smoke.ps1 -NoStart     # do not auto-start server
#  Exit code: 0 = all passed, 1 = some failed
#  Note: reads/writes only under %TEMP%; does not modify the repository.
#  Note: ASCII-only on purpose, so PowerShell 5.1 console encoding cannot break it.
# ============================================================
[CmdletBinding()]
param(
    [int]$Runs = 5,
    [int]$Port = 7777,
    [string]$Edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    [switch]$NoStart
)

$ErrorActionPreference = 'Continue'
$script:Root   = Split-Path -Parent $PSScriptRoot
$script:Total  = 0
$script:Failed = @()
$script:Seq    = 0

function Write-Head($t) { Write-Host ""; Write-Host "== $t ==" -ForegroundColor Cyan }
function Write-Info($t) { Write-Host "   $t" -ForegroundColor DarkGray }

function Check {
    param([string]$Name, [bool]$Ok, [string]$Detail = "")
    $script:Total++
    if ($Ok) {
        Write-Host "  [PASS] $Name" -ForegroundColor Green
    } else {
        $msg = $Name
        if ($Detail) { $msg += "  -> $Detail" }
        Write-Host "  [FAIL] $msg" -ForegroundColor Red
        $script:Failed += $msg
    }
}

function Get-PythonExe {
    $cands = @(
        "<PYTHON>",
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

function Invoke-EdgeDom {
    param([string]$Url, [int]$BudgetMs, [string]$Tag)
    $script:Seq++
    $id = ("{0}_{1}" -f $Tag, $script:Seq)
    $ud = Join-Path $env:TEMP ("op_smoke_${id}_prof")
    $cd = Join-Path $env:TEMP ("op_smoke_${id}_cache")
    $h  = Join-Path $env:TEMP ("op_smoke_${id}.html")
    $l  = Join-Path $env:TEMP ("op_smoke_${id}.log")
    New-Item -ItemType Directory -Force -Path $ud, $cd | Out-Null
    $cmd = "`"$Edge`" --headless=new --disable-gpu --disable-cache --disk-cache-dir=`"$cd`" " +
           "--enable-logging=stderr --v=0 --user-data-dir=`"$ud`" --dump-dom " +
           "--virtual-time-budget=$BudgetMs `"$Url`" > `"$h`" 2> `"$l`""
    cmd /c $cmd | Out-Null
    $html = ""
    if (Test-Path $h) { $html = [string](Get-Content $h -Raw -Encoding UTF8) }
    $log = ""
    if (Test-Path $l) { $log = [string](Get-Content $l -Raw -Encoding UTF8) }
    return @{ Html = $html; Log = $log }
}

function Get-PreText {
    param([string]$Html, [string]$Id)
    if (-not $Html) { return $null }
    $pat = '<pre id="' + [regex]::Escape($Id) + '">(.*?)</pre>'
    $m = [regex]::Match($Html, $pat, 'Singleline')
    if ($m.Success) { return ($m.Groups[1].Value -replace "`r", "") } else { return $null }
}

# Strip <script>/<style> blocks so substring counting only sees real DOM, not template source.
function Get-DomText {
    param([string]$Html)
    if (-not $Html) { return "" }
    $t = [regex]::Replace($Html, '<script.*?</script>', '', 'Singleline')
    $t = [regex]::Replace($t, '<style.*?</style>', '', 'Singleline')
    return $t
}

function Get-JsErrorCount {
    param([string]$Log)
    if (-not $Log) { return 0 }
    return ([regex]::Matches($Log, 'Uncaught|ReferenceError|TypeError|SyntaxError')).Count
}

function Get-JsErrorSample {
    param([string]$Log, [int]$Max = 3)
    if (-not $Log) { return "" }
    $ms = [regex]::Matches($Log, '.*(Uncaught|ReferenceError|TypeError|SyntaxError).*')
    $out = @()
    foreach ($m in $ms) {
        $s = $m.Value.Trim()
        if ($s.Length -gt 160) { $s = $s.Substring(0, 160) }
        $out += $s
        if ($out.Count -ge $Max) { break }
    }
    return ($out -join " | ")
}

function New-Ts { return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }

# ------------------------------------------------------------
Write-Host "Tiisu Mahjong smoke test (Runs=$Runs, Port=$Port)"
Write-Host "Root: $script:Root"

# ---- 1) single instance + port ----
# NOTE: "single instance" means "only ONE process is LISTENING on $Port",
#       NOT "only one python.exe on the whole machine".
#       This machine may run unrelated python (e.g. unsloth_studio), which used
#       to make this check fail permanently (FAIL 8/9). See docs/DSH "known traps" 6.10.
Write-Head "1/5 server instance and port"
$owners = @(
    Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique
)
Check "listeners on port $Port <= 1" ($owners.Count -le 1) ("found " + $owners.Count)

$listening = Test-PortListening -P $Port
if (-not $listening -and -not $NoStart) {
    if ($owners.Count -eq 1) {
        Write-Info "a listener on $Port is coming up; waiting..."
        for ($i = 0; $i -lt 15 -and -not $listening; $i++) {
            Start-Sleep -Milliseconds 500
            $listening = Test-PortListening -P $Port
        }
    }
    if (-not $listening) {
        $py = Get-PythonExe
        if ($py) {
            Write-Info "starting server: $py"
            Start-Process -FilePath $py -ArgumentList (Join-Path $script:Root "server.py") -WindowStyle Hidden
            for ($i = 0; $i -lt 20 -and -not $listening; $i++) {
                Start-Sleep -Milliseconds 500
                $listening = Test-PortListening -P $Port
            }
        } else {
            Write-Info "no python interpreter found; cannot auto-start"
        }
    }
}
Check "port $Port is listening" $listening

if (-not $listening) {
    Write-Host ""
    Write-Host "server not ready; remaining checks skipped." -ForegroundColor Red
    Write-Host ("RESULT: FAIL 0/" + $script:Total) -ForegroundColor Red
    exit 1
}

# ---- 2) syntax probe ----
Write-Head "2/5 JS syntax probe"
$probeUrl = "http://127.0.0.1:$Port/scripts/syntax_probe.html?ts=$(New-Ts)"
$r = Invoke-EdgeDom -Url $probeUrl -BudgetMs 20000 -Tag "syntax"
$pre = Get-PreText -Html $r.Html -Id "out"
$files = @('tiles.js','uuid.js','notation.js','tenpai.js','aiPlayer.js','winchecker.js','engine.js','handAnalyzer.js')
if (-not $pre -or $pre.Trim() -eq 'running') {
    Check "syntax probe produced output" $false ("no <pre id=out>; html bytes=" + $r.Html.Length)
} else {
    $okCount = 0
    foreach ($f in $files) {
        $line = ($pre -split "`n" | Where-Object { $_ -like ($f + ' *') } | Select-Object -First 1)
        if ($line -and ($line -like '* OK')) { $okCount++ }
        else {
            $d = "no line"
            if ($line) { $d = $line.Trim() }
            Check ("syntax " + $f) $false $d
        }
    }
    Check ("syntax " + $okCount + "/" + $files.Count + " parse ok") ($okCount -eq $files.Count)
}

# ---- 3) human-mode render ----
Write-Head "3/5 human-mode render (index.html?mode=4)"
$r = Invoke-EdgeDom -Url "http://127.0.0.1:$Port/index.html?mode=4&ts=$(New-Ts)" -BudgetMs 25000 -Tag "human"
$dom = Get-DomText -Html $r.Html
$errs = Get-JsErrorCount -Log $r.Log
Check "no JS errors" ($errs -eq 0) (Get-JsErrorSample -Log $r.Log)
$clickable = ([regex]::Matches($dom, 'class="tile clickable"')).Count
Check "human hand has 14 clickable tiles" ($clickable -eq 14) ("actual " + $clickable)
$mw = [regex]::Match($dom, 'id="wallCount"[^>]*>(\d+)<')
Check "wall count rendered" ($mw.Success) ("matched=" + $mw.Success)

# ---- 4) auto game first run ----
Write-Head "4/5 auto game first run (index.html?auto=1&mode=4)"
$r = Invoke-EdgeDom -Url "http://127.0.0.1:$Port/index.html?auto=1&mode=4&ts=$(New-Ts)" -BudgetMs 120000 -Tag "auto1"
$dom = Get-DomText -Html $r.Html
$errs = Get-JsErrorCount -Log $r.Log
Check "auto game no JS errors" ($errs -eq 0) (Get-JsErrorSample -Log $r.Log)
$round = [regex]::Match($dom, 'id="roundDisplay"[^>]*>([^<]*)<')
$rval = ""
if ($round.Success) { $rval = $round.Groups[1].Value.Trim() }
Check "round info rendered" (($round.Success) -and ($rval.Length -gt 0)) ("value='" + $rval + "'")

# ---- 5) repeat auto game ----
Write-Head "5/5 repeat auto game ($Runs times)"
$autoFail = 0
for ($i = 1; $i -le $Runs; $i++) {
    $u = "http://127.0.0.1:$Port/index.html?auto=1&mode=4&smoke=$i&ts=$(New-Ts)"
    $ri = Invoke-EdgeDom -Url $u -BudgetMs 120000 -Tag ("auto" + ($i + 1))
    $domi = Get-DomText -Html $ri.Html
    $e = Get-JsErrorCount -Log $ri.Log
    $rd = [regex]::Match($domi, 'id="roundDisplay"[^>]*>([^<]*)<')
    $ok = ($e -eq 0) -and ($rd.Success)
    if (-not $ok) {
        $autoFail++
        Write-Host ("    run $i FAIL (errors=$e, roundMatch=" + $rd.Success + ")") -ForegroundColor Red
        $s = Get-JsErrorSample -Log $ri.Log
        if ($s) { Write-Host ("      " + $s) -ForegroundColor DarkRed }
    } else {
        Write-Host ("    run $i ok") -ForegroundColor DarkGray
    }
}
Check ("auto game repeat " + $Runs + "x all green") ($autoFail -eq 0) ("failed " + $autoFail)

# ---- summary ----
Write-Host ""
Write-Host "----------------------------------------"
$pass = $script:Total - $script:Failed.Count
if ($script:Failed.Count -eq 0) {
    Write-Host ("RESULT: PASS " + $pass + "/" + $script:Total) -ForegroundColor Green
    exit 0
} else {
    Write-Host ("RESULT: FAIL " + $pass + "/" + $script:Total) -ForegroundColor Red
    foreach ($f in $script:Failed) { Write-Host ("  - " + $f) -ForegroundColor Red }
    exit 1
}
