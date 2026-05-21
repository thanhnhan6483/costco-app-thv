@echo off
chcp 65001 >nul
title Costco App - Khoi dong...
cd /d "%~dp0"

:: ── Kiem tra quyen Admin ──────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Can quyen Admin. Dang yeu cau...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ── Kiem tra Node.js ──────────────────────────────────────
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Node.js chua co. Dang tai va cai dat...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'"
    msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
    del "%TEMP%\node-installer.msi"
    :: Reload PATH
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    echo [OK] Node.js da cai xong.
) else (
    echo [OK] Node.js da co san.
)

:: ── Kiem tra Git ──────────────────────────────────────────
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Git chua co. Dang tai va cai dat...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'"
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    del "%TEMP%\git-installer.exe"
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    echo [OK] Git da cai xong.
) else (
    echo [OK] Git da co san.
)

:: ── Kiem tra node_modules ─────────────────────────────────
if not exist "node_modules" (
    echo [*] Dang cai dependencies lan dau ^(co the mat 5-10 phut^)...
    npm install
    echo [OK] Dependencies da cai xong.
) else (
    echo [OK] Dependencies da san sang.
)

:: ── Tat server cu neu co ──────────────────────────────────
echo [*] Tat server cu neu dang chay...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: ── Khoi dong ─────────────────────────────────────────────
echo.
echo [*] Dang khoi dong web tai http://localhost:3000 ...
echo [De dung: Nhan Ctrl+C]
echo.
start "" cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:3000"
npm run dev
pause
