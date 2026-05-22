@echo off
chcp 65001 >nul
title THV - Quan Ly Cham Cong

echo.
echo  ============================================
echo    TAN HUE VIEN - Quan Ly Cham Cong
echo  ============================================
echo.
echo  Dang kiem tra he thong...
echo.

:: ── KIEM TRA NODE.JS ──────────────────────────
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  [THIEU] Node.js chua duoc cai dat.
    echo.
    echo  Vui long thuc hien:
    echo    1. Truy cap https://nodejs.org
    echo    2. Tai phien ban LTS ^(nut xanh la^)
    echo    3. Cai dat, khoi dong lai may
    echo    4. Chay lai file START_APP.bat nay
    echo.
    pause
    start https://nodejs.org
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
echo  [OK] Node.js %NODE_VER%

:: ── KIEM TRA NPM ──────────────────────────────
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo  [LOI] npm khong tim thay. Cai lai Node.js tai https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] npm da san sang
echo.

:: ── CAI DEPENDENCIES ──────────────────────────
if not exist "node_modules" (
    echo  [*] Buoc 1/2: Dang cai dat thu vien ^(co the mat 2-3 phut^)...
    echo      Vui long doi, KHONG tat cua so nay.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [LOI] Cai dat thu vien that bai.
        echo  Nguyen nhan co the:
        echo    - Mat ket noi Internet
        echo    - Khong du quyen ghi vao thu muc nay
        echo  Vui long kiem tra va thu lai.
        pause
        exit /b 1
    )
    echo  [OK] Cai dat thu vien thanh cong.
    echo.
) else (
    echo  [OK] Thu vien da co san.
)

:: ── BUILD ─────────────────────────────────────
if not exist ".next" (
    echo  [*] Buoc 2/2: Dang build ung dung ^(co the mat 3-5 phut^)...
    echo      Vui long doi, KHONG tat cua so nay.
    echo.
    call npm run build
    if %errorlevel% neq 0 (
        echo.
        echo  [LOI] Build ung dung that bai.
        echo  Vui long lien he ky thuat de duoc ho tro.
        pause
        exit /b 1
    )
    echo  [OK] Build thanh cong.
    echo.
) else (
    echo  [OK] Ung dung da duoc build san.
)

:: ── KHOI DONG ─────────────────────────────────
echo  ============================================
echo   Khoi dong thanh cong!
echo   Truy cap: http://localhost:3000
echo  ============================================
echo.
echo  Trinh duyet se tu dong mo sau 3 giay...
echo  ^(Neu khong tu mo, hay vao http://localhost:3000^)
echo.
echo  GIU CUA SO NAY MO trong khi su dung phan mem.
echo  Nhan Ctrl+C de dung phan mem.
echo.

powershell -Command "Start-Sleep 3; Start-Process 'http://localhost:3000'" >nul 2>&1 &
call npm start
pause
