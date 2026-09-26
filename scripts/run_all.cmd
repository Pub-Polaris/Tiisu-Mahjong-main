@echo off
rem ============================================================
rem  run_all.cmd - Tiisu Mahjong: run every check in one command
rem
rem  Usage:  double-click, or:  run_all.cmd [runs]
rem          runs = full auto games for the smoke step (default 2)
rem
rem  Delegates to scripts\run_all.py (robust: avoids the Windows AMSI
rem  crash that can happen when chaining the PowerShell runners).
rem
rem  Steps: 1) yaku/score assertions  2) engine-rule assertions
rem         3) smoke: N full auto games
rem  Exit code: 0 = all passed, 1 = some failed, 2 = environment problem.
rem ============================================================
setlocal
cd /d "%~dp0"
set RUNS=%1
if "%RUNS%"=="" set RUNS=2

set PY=python
if exist "C:\Users\rksk1\AppData\Local\Programs\Python\Python314\python.exe" set "PY=C:\Users\rksk1\AppData\Local\Programs\Python\Python314\python.exe"
if exist "C:\Program Files\PyManager\python.exe" set "PY=C:\Program Files\PyManager\python.exe"

"%PY%" "%~dp0run_all.py" --runs %RUNS%
set CODE=%ERRORLEVEL%
if "%CODE%"=="" set CODE=0
echo.
if "%CODE%"=="0" echo run_all: OK & endlocal & exit /b 0
echo run_all: FAILED ^(code %CODE%^)
endlocal & exit /b %CODE%
