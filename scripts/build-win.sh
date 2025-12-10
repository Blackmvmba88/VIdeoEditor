#!/bin/bash
# BlackMamba Studio - Build Script for Windows
# Creates .exe installer using electron-builder

set -e

echo "🐍 BlackMamba Studio - Windows Build"
echo "======================================"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous build
echo "🧹 Cleaning previous builds..."
rm -rf dist/win-unpacked dist/*.exe 2>/dev/null || true

# Build for Windows
echo "🔨 Building Windows installer..."
npm run build:win

echo ""
echo "✅ Build complete!"
echo "📁 Output: dist/"
echo ""

# List output files
if [ -d "dist" ]; then
    echo "Generated files:"
    ls -la dist/*.exe 2>/dev/null || echo "No .exe files found"
fi
