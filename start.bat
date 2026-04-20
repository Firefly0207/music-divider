@echo off
setlocal enabledelayedexpansion
title Music Divider

set "ROOT=%~dp0"

echo ================================
echo  Music Divider - Starting...
echo ================================

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from python.org
    pause
    exit /b 1
)

:: Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 18+ from nodejs.org
    pause
    exit /b 1
)

:: Create Python venv (recreate if path has changed)
set "VENV_PYTHON=%ROOT%backend\venv\Scripts\python.exe"
set "VENV_OK=0"
if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" -c "import sys; assert sys.executable.startswith('%ROOT%')" >nul 2>&1
    if not errorlevel 1 set "VENV_OK=1"
)
if "%VENV_OK%"=="0" (
    echo [1/4] Creating Python virtual environment...
    if exist "%ROOT%backend\venv" rmdir /s /q "%ROOT%backend\venv"
    python -m venv "%ROOT%backend\venv"
    if errorlevel 1 (
        echo ERROR: Failed to create venv
        pause
        exit /b 1
    )
)

:: Install Python packages
echo [2/4] Checking Python packages...
"%ROOT%backend\venv\Scripts\pip.exe" install -r "%ROOT%backend\requirements.txt" -q
if errorlevel 1 (
    echo ERROR: pip install failed
    pause
    exit /b 1
)

:: Install frontend packages
if not exist "%ROOT%frontend\node_modules" (
    echo [3/4] Installing frontend packages...
    npm config set long-path-support true 2>nul
    npm install --prefix "%ROOT%frontend" --legacy-peer-deps
    if errorlevel 1 (
        echo.
        echo ========================================
        echo  ERROR: npm install failed
        echo.
        echo  Try this fix manually:
        echo    1. Open a new terminal
        echo    2. cd "%ROOT%frontend"
        echo    3. npm install
        echo ========================================
        pause
        exit /b 1
    )
)

:: Start backend
echo [4/4] Starting backend server...
start "MusicDivider-Backend" /MIN /d "%ROOT%backend" "%ROOT%backend\venv\Scripts\python.exe" main.py

:: Wait for backend
echo Waiting for backend to start...
ping 127.0.0.1 -n 5 >nul

:: Open browser
start http://localhost:5173

:: Start frontend dev server
cd /d "%ROOT%frontend"
npm run dev

endlocal
