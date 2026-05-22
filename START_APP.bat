@echo off
chcp 65001 >nul
cd /d "%~dp0"
title THV - Quan Ly Cham Cong

echo.
echo  Thu muc hien tai: %CD%
echo  Kiem tra package.json:
if exist "package.json" (echo  [OK] Co package.json) else (echo  [LOI] KHONG co package.json)
echo.
echo  ============================================
echo    TAN HUE VIEN - Quan Ly Cham Cong
echo  ============================================
echo.

:: Kiem tra Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 goto NO_NODE

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

:: Build
if exist ".next\BUILD_ID" goto SKIP_BUILD
echo  [2/2] Dang build ung dung (3-5 phut), vui long doi...
call npm.cmd run build
if %errorlevel% neq 0 goto BUILD_FAIL
echo  [OK] Build xong.
echo.

:SKIP_BUILD

echo  ============================================
echo   San sang! Truy cap: http://localhost:3000
echo  ============================================
echo.
echo  Trinh duyet se tu mo sau 3 giay.
echo  Giu cua so nay mo khi dang su dung.
echo  Nhan Ctrl+C de dung.
echo.
powershell -Command "Start-Sleep 3; Start-Process 'http://localhost:3000'"
call npm.cmd start
goto END

:NO_NODE
echo.
echo  [LOI] Chua co Node.js!
echo  1. Vao https://nodejs.org
echo  2. Tai phien ban LTS va cai dat
echo  3. Khoi dong lai may, chay lai file nay
echo.
start https://nodejs.org
goto END

:INSTALL_FAIL
echo.
echo  [LOI] Cai dat thu vien that bai.
echo  Kiem tra ket noi Internet va thu lai.
echo.
goto END

:BUILD_FAIL
echo.
echo  [LOI] Build that bai. Lien he ky thuat de duoc ho tro.
echo.
goto END

:END
echo.
pause
