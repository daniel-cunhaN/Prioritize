@echo off
title Prioritize Launcher
echo ==========================================
echo    Iniciando Prioritize (Backend + Frontend)
echo ==========================================

:: Verifica e instala dependencias do Backend se necessario
if not exist "%~dp0backend\node_modules" (
    echo [Setup] Instalando dependencias do Backend...
    cd /d "%~dp0backend" && call npm.cmd install
)

:: Verifica e instala dependencias do Frontend se necessario
if not exist "%~dp0frontend\node_modules" (
    echo [Setup] Instalando dependencias do Frontend...
    cd /d "%~dp0frontend" && call npm.cmd install
)

:: Iniciar o Backend Node.js Express em uma nova janela
echo Iniciando Backend Node.js Express (Porta 8000)...
start "Prioritize - Backend (Node.js Express)" cmd /k "cd /d %~dp0backend && npm.cmd run dev"

:: Iniciar o Frontend Expo Web em uma nova janela (sem abrir navegador padrao)
echo Iniciando Frontend Expo Web (Porta 8081)...
start "Prioritize - Frontend (Expo Web)" cmd /k "cd /d %~dp0frontend && set BROWSER=none&& npm.cmd run web"

:: Aguarda a inicializacao do bundler e abre no Mozilla Firefox
echo Aguardando inicializacao para abrir no Firefox...
timeout /t 5 /nobreak >nul
if exist "C:\Program Files\Mozilla Firefox\firefox.exe" (
    start "" "C:\Program Files\Mozilla Firefox\firefox.exe" "http://localhost:8081"
) else (
    start firefox "http://localhost:8081"
)

echo.
echo ==========================================
echo  Servicos iniciados e abertos no Firefox!
echo  - Backend:  http://127.0.0.1:8000
echo  - Frontend: http://localhost:8081
echo ==========================================
echo.
