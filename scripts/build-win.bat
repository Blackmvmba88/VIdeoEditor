@echo off
REM BlackMamba Studio - Build Script for Windows
REM Creates .exe installer using electron-builder

echo 🐍 BlackMamba Studio - Windows Build
echo ======================================

REM Check if npm is installed
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Clean previous build
echo 🧹 Cleaning previous builds...
if exist "dist\win-unpacked" rmdir /s /q "dist\win-unpacked"

REM Build for Windows
echo 🔨 Building Windows installer...
call npm run build:win

echo.
echo ✅ Build complete!
echo 📁 Output: dist\
echo.

REM List output files
if exist "dist" (
    echo Generated files:
    dir /b dist\*.exe 2>nul
)
