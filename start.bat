@echo off
title Prioritize Launcher
echo ==========================================
echo    Iniciando Prioritize (Backend + Frontend)
echo ==========================================

:: Iniciar o Backend Node.js Express em uma nova janela
echo Iniciando Backend Node.js Express (Porta 8000)...
start "Prioritize - Backend (Node.js Express)" cmd /k "cd /d %~dp0backend && npm run dev"

:: Iniciar o Frontend em uma nova janela
echo Iniciando Frontend Expo...
start "Prioritize - Frontend (Expo)" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ==========================================
echo  Servicos iniciados em janelas separadas!
echo  - Backend:  http://127.0.0.1:8000
echo  - Frontend: Expo / Metro Bundler
echo ==========================================
echo.
