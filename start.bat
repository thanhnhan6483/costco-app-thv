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
    for /f "tokens=*" %%i in ('powershell -Command "[System.Environment]::GetEnvironmentVariable(\"PATH\",\"Machine\")"') do set "PATH=%%i;%PATH%"
    echo [OK] Node.js da duoc cai dat.
) else (
    echo [OK] Node.js da co san.
)

:: ---- Xac dinh thu muc app ----
:: start.bat co the nam o bat ky dau, app se clone vao cung thu muc voi start.bat
set "APP_DIR=%~dp0costco-app"
set "REPO_URL=https://github.com/thanhnhan6483/costco-app-thv.git"

:: ---- Clone neu chua co, pull neu da co ----
if not exist "%APP_DIR%\.git" (
    echo [*] Lan dau su dung. Dang tai ung dung ve may...
    git clone "%REPO_URL%" "%APP_DIR%"
    if %errorLevel% neq 0 (
        echo [!] Loi khi tai ung dung. Kiem tra ket noi internet.
        pause
        exit /b 1
    )
    echo [OK] Tai ung dung thanh cong.
) else (
    echo [*] Dang kiem tra ban cap nhat moi...
    cd /d "%APP_DIR%"
    git pull
    if %errorLevel% neq 0 (
        echo [!] Khong the cap nhat. Tiep tuc voi phien ban hien tai.
    )
)

cd /d "%APP_DIR%"

:: ---- npm install neu can ----
if not exist "node_modules" (
    echo [*] Dang cai dat dependencies (lan dau co the mat 5-10 phut)...
    npm install
) else (
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

start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

npm run dev

pause
