@echo off
REM Regenere les 4 alertes WebM (350x80, transparentes) dans le dossier export\
REM Options possibles : export-alertes.bat --ms 4000 --fps 30 --scale 2
cd /d "%~dp0tools"
if not exist node_modules (
  echo Installation des dependances...
  call npm install || goto :err
)
node export-webm.js %* || goto :err
echo.
echo Termine : fichiers dans "%~dp0export"
explorer "%~dp0export"
pause
exit /b 0
:err
echo.
echo ERREUR - voir les messages ci-dessus.
pause
exit /b 1
