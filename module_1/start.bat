@echo off
setlocal EnableExtensions

REM Always run from this script's directory (module_1)
cd /d "%~dp0"

set "CONDA_ROOT=%USERPROFILE%\miniconda3"
if not exist "%CONDA_ROOT%\Scripts\activate.bat" (
  set "CONDA_ROOT=%USERPROFILE%\Miniconda3"
)
if not exist "%CONDA_ROOT%\Scripts\activate.bat" (
  echo ERROR: Miniconda not found at %%USERPROFILE%%\miniconda3
  echo Install Miniconda or update CONDA_ROOT in this script.
  pause
  exit /b 1
)

call "%CONDA_ROOT%\Scripts\activate.bat" module1_chores
if errorlevel 1 (
  echo ERROR: Could not activate conda env "module1_chores".
  echo Create it with: conda env create -f environment.yml
  pause
  exit /b 1
)

echo Starting household chores app at http://127.0.0.1:8000/
echo Press Ctrl+C to stop.
python manage.py runserver
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Server exited with code %EXIT_CODE%.
  pause
)

endlocal & exit /b %EXIT_CODE%
