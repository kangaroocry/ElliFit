@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto failure

rem Prefer the working Python from PATH, including portable distributions.
rem Create packages only inside the local ElliFit environment.
if exist ".venv\Scripts\python.exe" goto check_environment
python -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,11) and struct.calcsize('P') == 8 else 1)" >nul 2>nul
if not errorlevel 1 goto create_with_python
py -3 -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,11) and struct.calcsize('P') == 8 else 1)" >nul 2>nul
if errorlevel 1 goto missing
py -3 -m venv ".venv"
goto created

:create_with_python
python -m venv ".venv"
:created
if errorlevel 1 goto failure

:check_environment
".venv\Scripts\python.exe" -c "import struct,sys; sys.exit(0 if sys.version_info >= (3,11) and struct.calcsize('P') == 8 else 1)"
if errorlevel 1 goto broken
if exist ".venv\ellifit_ready" goto launch

:install
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failure
type nul > ".venv\ellifit_ready"

:launch
".venv\Scripts\python.exe" launch.py %*
if errorlevel 1 goto failure
exit /b 0

:missing
echo Python 3.11 oder neuer in 64 Bit wurde nicht gefunden.
echo Den Ordner mit python.exe in den Benutzer-PATH aufnehmen und ein neues
echo Fenster oeffnen. Alternativ den Python-Launcher py verwenden.
goto failure

:broken
echo Die lokale Python-Umgebung ist nicht verwendbar.
echo Den Ordner .venv umbenennen und den Starter erneut ausfuehren.

:failure
echo.
echo Start fehlgeschlagen. Bitte die Meldung oberhalb beachten.
echo Ein beschreibbarer ElliFit-Ordner und Internet fuer die erste
echo Paketinstallation sind erforderlich. Adminrechte sind nicht noetig.
pause
exit /b 1
