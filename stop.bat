@echo off
title INFYPOS - Service Stopper
color 0C
setlocal

echo ================================================================
echo               INFYPOS STOPPING ALL SERVICES
echo ================================================================
echo.

echo Stopping services on ports 3000, 5173, and 5174...

:: Kill processes on port 3000 (Backend API)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Terminating Backend on Port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 5173 (Admin Dashboard)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo Terminating Admin Dashboard on Port 5173 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill processes on port 5174 (POS dev if running)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5174 ^| findstr LISTENING') do (
    echo Terminating POS Dev on Port 5174 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill electron instances if running
echo Terminating running POS Electron instances...
taskkill /F /IM electron.exe >nul 2>&1

echo.
echo ================================================================
echo               ALL INFYPOS SERVICES HAVE STOPPED
echo ================================================================
echo.
pause
