@echo off
REM Pre-rend en PNG les calques statiques du fond d'Elwe (layers\*.svg -> layers-png\*.png)
REM A relancer apres toute modification d'un fichier de layers\ (voir tools\render-calques.js)
cd /d "%~dp0tools"
if not exist node_modules (
  echo Installation des dependances...
  call npm install || goto :err
)
node render-calques.js || goto :err
echo.
echo Termine.
pause
exit /b 0
:err
echo.
echo ERREUR - voir les messages ci-dessus.
pause
exit /b 1
