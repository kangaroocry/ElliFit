@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
if errorlevel 1 goto failure

rem This starter never installs packages into the WinPython distribution.
if not defined ELLIFIT_WINPYTHON_ROOT set "ELLIFIT_WINPYTHON_ROOT=C:\Programme_portable\WinPython\WPy64-31290"
set "ELLIFIT_WINPYTHON_EXE="
if exist "%ELLIFIT_WINPYTHON_ROOT%\python.exe" set "ELLIFIT_WINPYTHON_EXE=%ELLIFIT_WINPYTHON_ROOT%\python.exe"
if exist "%ELLIFIT_WINPYTHON_ROOT%\python\python.exe" set "ELLIFIT_WINPYTHON_EXE=%ELLIFIT_WINPYTHON_ROOT%\python\python.exe"
for /d %%D in ("%ELLIFIT_WINPYTHON_ROOT%\python-*") do if exist "%%~fD\python.exe" set "ELLIFIT_WINPYTHON_EXE=%%~fD\python.exe"
if not defined ELLIFIT_WINPYTHON_EXE goto missing

"%ELLIFIT_WINPYTHON_EXE%" -c "import sys,struct; assert sys.version_info >= (3,11) and struct.calcsize('P') == 8, 'Python 3.11+ in 64 Bit erforderlich'"
if errorlevel 1 goto failure

if exist ".venv-winpython\ellifit_ready" goto launch
if exist ".venv-winpython\Scripts\python.exe" goto install
echo Erstelle lokale ElliFit-Umgebung mit:
echo "%ELLIFIT_WINPYTHON_EXE%"
"%ELLIFIT_WINPYTHON_EXE%" -m venv ".venv-winpython"
if errorlevel 1 goto failure

:install
echo Installiere Pakete nur in .venv-winpython im ElliFit-Ordner.
".venv-winpython\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failure
type nul > ".venv-winpython\ellifit_ready"

:launch
".venv-winpython\Scripts\python.exe" launch.py %*
if errorlevel 1 goto failure
exit /b 0

:missing
echo WinPython wurde unter diesem Pfad nicht gefunden:
echo "%ELLIFIT_WINPYTHON_ROOT%"
echo Den Pfad oben in dieser Datei korrigieren oder ELLIFIT_WINPYTHON_ROOT setzen.
pause
exit /b 1

:failure
echo.
echo Start fehlgeschlagen. Bitte die Fehlermeldung oberhalb beachten.
echo Python 3.11+ in 64 Bit, ein beschreibbarer ElliFit-Ordner und
echo Internetzugriff auf PyPI fuer den ersten Start sind erforderlich.
echo Bei einer beschaedigten lokalen Umgebung .venv-winpython umbenennen
echo und diesen Starter erneut ausfuehren. WinPython bitte nicht loeschen.
pause
exit /b 1
