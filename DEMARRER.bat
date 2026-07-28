@echo off
title Compte rendu hebdomadaire
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js n'est pas installe. Installez-le depuis https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installation des dependances...
  call npm install
)

if not exist ".env" (
  echo.
  echo ATTENTION : fichier .env manquant !
  echo Copiez .env.example vers .env et ajoutez vos cles Supabase.
  echo.
  pause
)

echo.
echo Demarrage...
start http://localhost:5173
npm run dev
