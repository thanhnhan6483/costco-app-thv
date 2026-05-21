@echo off
chcp 65001 >nul
title Costco App - Khoi dong...

echo ============================================
echo   COSTCO APP - KHOI DONG HE THONG
echo ============================================
echo.

:: ---- Kiem tra quyen Admin ----
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Can quyen Admin de cai dat. Dang yeu cau...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

:: ---- Kiem tra va cai Git ----
git --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Git chua duoc cai. Dang tai va cai dat Git...
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.47.1.windows.1/Git-2.47.1-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'"
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS /COMPONENTS="icons,ext\reg\shellhere,assoc,assoc_sh"
    del "%TEMP%\git-installer.exe"
    :: Refresh PATH
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    echo [OK] Git da duoc cai dat.
) else (
    echo [OK] Git da co san.
)

:: ---- Kiem tra va cai Node.js ----
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [*] Node.js chua duoc cai. Dang tai va cai dat Node.js...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'"
    msiexec /i "%TEMP%\node-installer.msi" /qn /norestart
    del "%TEMP%\node-installer.msi"
    :: Refresh PATH
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    echo [OK] Node.js da duoc cai dat.
) else (
    echo [OK] Node.js da co san.
)

:: ---- Di chuyen vao thu muc chua bat file ----
cd /d "%~dp0"

:: ---- Git pull (auto update) ----
echo.
echo [*] Dang kiem tra ban cap nhat moi...
git pull
if %errorLevel% neq 0 (
    echo [!] Khong the cap nhat. Tiep tuc voi phien ban hien tai.
)

:: ---- npm install neu can ----
if not exist "node_modules" (
    echo [*] Chua co node_modules. Dang cai dat...
    npm install
) else (
    :: Kiem tra xem package.json co thay doi khong
    git diff HEAD@{1} HEAD --name-only 2>nul | findstr /i "package.json" >nul
    if %errorLevel% equ 0 (
        echo [*] package.json thay doi. Dang cap nhat dependencies...
        npm install
    ) else (
        echo [OK] Dependencies da san sang.
    )
)

:: ---- Khoi dong server ----
echo.
echo [*] Dang khoi dong server...
echo [*] Trinh duyet se tu dong mo sau vai giay...
echo.
echo [De dung app: Nhan Ctrl+C trong cua so nay]
echo.

:: Mo browser sau 5 giay
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

:: Chay dev server
npm run dev

pause
