@echo off
title Prioritize Launcher
echo ==========================================
echo    Iniciando Prioritize (Backend + Frontend)
echo ==========================================

:: Iniciar o Backend em uma nova janela
echo Iniciando Backend FastAPI (Porta 8000)...
start "Prioritize - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Iniciar o Frontend em uma nova janela
echo Iniciando Frontend Expo...
start "Prioritize - Frontend (Expo)" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ==========================================
echo  Servicos iniciados em janelas separadas!
echo  - Backend:  http://127.0.0.1:8000
echo  - Swagger:  http://127.0.0.1:8000/docs
echo  - Frontend: Expo / Metro Bundler
echo ==========================================
echo.
