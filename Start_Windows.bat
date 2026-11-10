@echo off
setlocal
cd /d "%~dp0"
if exist ".venv\ellifit_ready" goto launch
if exist ".venv\Scripts\python.exe" goto install
where py >nul 2>nul
if errorlevel 1 goto fallback
py -3 -m venv .venv
goto check
:fallback
python -m venv .venv
:check
if errorlevel 1 goto failure
:install
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failure
type nul > ".venv\ellifit_ready"
:launch
".venv\Scripts\python.exe" launch.py
if errorlevel 1 pause
exit /b
:failure
echo Python 3.11 oder neuer, 64 Bit, und Internet fuer den ersten Start erforderlich.
echo Installation pruefen und diese Datei erneut starten.
pause
exit /b 1
