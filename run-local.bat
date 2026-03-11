@echo off
setlocal

REM SRS Rereading App bootstrap + run script for Windows PowerShell/CMD
REM Usage: run-local.bat

where npm >nul 2>nul
if errorlevel 1 (
  echo Error: npm is not installed or not in PATH.
  exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if errorlevel 1 exit /b 1

echo [2/3] Building app for sanity check...
call npm run build
if errorlevel 1 exit /b 1

echo [3/3] Starting dev server...
call npm run dev
if errorlevel 1 exit /b 1

endlocal
