@echo off
title INFYPOS - Service Launcher
color 0A
setlocal EnableDelayedExpansion

echo ================================================================
echo               INFYPOS FULL-STACK STARTUP SCRIPT
echo ================================================================
echo.
echo Current Directory: %~dp0
echo.

:: 1. Check Docker / PostgreSQL Container
echo [1/4] Checking PostgreSQL database...
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo       Docker is running. Starting PostgreSQL container if needed...
    docker compose -f "%~dp0docker\docker-compose.yml" up -d
) else (
    echo       [NOTE] Docker Desktop not running. If you are using local PostgreSQL
    echo              service, ensure it is active on port 5432.
)
echo.

:: 2. Launch Backend NestJS API
echo [2/4] Starting Backend API (NestJS)...
echo       Directory: %~dp0backend
echo       URL:       http://localhost:3000
start "INFYPOS - Backend API (Port 3000)" cmd /k "cd /d "%~dp0backend" && npm run start:dev"
echo       Backend window launched!
echo.

:: Brief pause to let backend initialize
echo       Waiting 4 seconds for backend to initialize...
ping 127.0.0.1 -n 5 >nul 2>&1
echo.

:: 3. Launch Admin Dashboard Frontend
echo [3/4] Starting Admin Dashboard (Vite)...
echo       Directory: %~dp0INFEPOS_FRONTEND\admin-dashboard
echo       URL:       http://localhost:5173
start "INFYPOS - Admin Dashboard (Port 5173)" cmd /k "cd /d "%~dp0INFEPOS_FRONTEND\admin-dashboard" && npm run dev"
echo       Admin Dashboard window launched!
echo.

:: 4. Launch POS Terminal (Electron Desktop App)
echo [4/4] Starting POS Terminal (Electron)...
echo       Directory: %~dp0INFEPOS_FRONTEND\pos-terminal
start "INFYPOS - POS Terminal" cmd /k "cd /d "%~dp0INFEPOS_FRONTEND\pos-terminal" && npm run electron"
echo       POS Terminal window launched!
echo.

echo ================================================================
echo                   ALL SERVICES LAUNCHED!
echo ================================================================
echo.
echo   * Backend API:       http://localhost:3000/api/v1
echo   * Admin Dashboard:   http://localhost:5173
echo   * POS Terminal:      Desktop Window (Electron)
echo.
echo   Each service runs in its own window so you can monitor logs.
echo   To stop all services, run stop.bat or close their windows.
echo ================================================================
echo.
pause
