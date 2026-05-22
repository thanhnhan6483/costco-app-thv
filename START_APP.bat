@echo off
chcp 65001 >nul
title THV - Quản Lý Chấm Công

echo ============================================
echo   TAN HUE VIEN - Quan Ly Cham Cong
echo ============================================
echo.

:: Kiểm tra Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Chua co Node.js. Vui long cai dat tai: https://nodejs.org
    echo     Chon phien ban LTS, cai xong roi chay lai file nay.
    pause
    start https://nodejs.org
    exit /b 1
)

echo [OK] Node.js:
node -v
echo.

:: Cài dependencies nếu chưa có
if not exist "node_modules" (
    echo [*] Dang cai dat thu vien, vui long cho...
    call npm install
    if %errorlevel% neq 0 (
        echo [!] Cai dat that bai. Kiem tra ket noi mang va thu lai.
        pause
        exit /b 1
    )
    echo [OK] Cai dat thanh cong.
    echo.
)

:: Build nếu chưa có
if not exist ".next" (
    echo [*] Dang build ung dung, vui long cho (co the mat 2-5 phut)...
    call npm run build
    if %errorlevel% neq 0 (
        echo [!] Build that bai.
        pause
        exit /b 1
    )
    echo [OK] Build thanh cong.
    echo.
)

:: Mở trình duyệt sau 3 giây
powershell -Command "Start-Sleep 3; Start-Process 'http://localhost:3000'" >nul 2>&1 &

echo [OK] Ung dung dang chay tai: http://localhost:3000
echo      Giu cua so nay mo trong khi su dung.
echo      Nhan Ctrl+C de dung ung dung.
echo.
call npm start
pause
