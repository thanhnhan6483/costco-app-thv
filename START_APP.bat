@echo off
chcp 65001 >nul
cd /d "%~dp0"
title THV - Quan Ly Cham Cong

echo.
echo  ============================================
echo    TAN HUE VIEN - Quan Ly Cham Cong
echo  ============================================
echo.

:: Kiem tra Node.js va version
node -v >nul 2>&1
if %errorlevel% neq 0 goto INSTALL_NODE

for /f "tokens=1 delims=." %%m in ('node -v') do set NODE_MAJOR=%%m
set NODE_MAJOR=%NODE_MAJOR:v=%
if "%NODE_MAJOR%"=="20" goto NODE_OK

echo  [!] Dang dung Node.js sai phien ban (can v20).
echo  [*] Tu dong cai dat Node.js v20 LTS...
goto INSTALL_NODE

:INSTALL_NODE
echo  [*] Dang tai Node.js v20 LTS (khoang 30MB)...
powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi' -OutFile '%TEMP%\node20.msi' -UseBasicParsing"
if %errorlevel% neq 0 goto DOWNLOAD_FAIL
echo  [*] Dang cai dat Node.js v20...
msiexec /i "%TEMP%\node20.msi" /qn /norestart
if %errorlevel% neq 0 goto INSTALL_NODE_FAIL
echo  [OK] Da cai Node.js v20. Dang khoi dong lai...
echo.
echo  Vui long KHOI DONG LAI MAY roi chay lai START_APP.bat
echo.
pause
exit /b 0

:NODE_OK
for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%
echo.

:: Cai dependencies
if exist "node_modules" goto SKIP_INSTALL
echo  [1/2] Dang cai dat thu vien, vui long doi...
call npm.cmd install --legacy-peer-deps
if %errorlevel% neq 0 goto INSTALL_FAIL
echo  [OK] Cai dat xong.
echo.

:SKIP_INSTALL
echo  ============================================
echo   San sang! Truy cap: http://localhost:3000
echo  ============================================
echo.
echo  Trinh duyet se tu mo sau 3 giay.
echo  Giu cua so nay mo khi dang su dung.
echo  Nhan Ctrl+C de dung.
echo.
powershell -Command "Start-Sleep 3; Start-Process 'http://localhost:3000'"
call npm.cmd run dev
goto END

:DOWNLOAD_FAIL
echo  [LOI] Khong tai duoc Node.js. Kiem tra ket noi Internet.
echo  Hoac tai thu cong tai: https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi
goto END

:INSTALL_NODE_FAIL
echo  [LOI] Cai dat Node.js that bai. Thu chay lai voi quyen Administrator.
goto END

:INSTALL_FAIL
echo  [LOI] Cai dat thu vien that bai. Kiem tra ket noi Internet va thu lai.
goto END

:END
echo.
pause
