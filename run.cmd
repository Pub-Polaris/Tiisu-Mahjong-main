@echo off
rem ============================================================
rem  Tiisu Mahjong - launcher
rem  Double-click this file to start the local server and open
rem  the portal page in your browser.
rem ============================================================
cd /d "%~dp0"

set "PY="
if not defined PY ( where py >nul 2>nul && set "PY=py" )
if not defined PY ( where python >nul 2>nul && set "PY=python" )
if not defined PY ( if exist "C:\Program Files\PyManager\python.exe" set "PY=C:\Program Files\PyManager\python.exe" )
if not defined PY ( if exist "C:\Python313\python.exe" set "PY=C:\Python313\python.exe" )

if not defined PY (
    echo [run] Python not found. Please install Python 3, then run again.
    pause
    exit /b 1
)

echo [run] Using interpreter: %PY%
echo [run] Opening http://127.0.0.1:7777/portal.html ...
start "" "http://127.0.0.1:7777/portal.html"

echo [run] Starting server (close this window to stop) ...
%PY% server.py --verbose
pause
