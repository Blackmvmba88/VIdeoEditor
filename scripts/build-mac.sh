#!/bin/bash
# BlackMamba Studio - Build Script for macOS
# Creates .dmg installer using electron-builder

set -e

echo "🐍 BlackMamba Studio - macOS Build"
echo "===================================="

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
rm -rf dist/mac dist/mac-arm64 dist/*.dmg 2>/dev/null || true

# Build for macOS
echo "🔨 Building macOS installer..."
npm run build:mac

echo ""
echo "✅ Build complete!"
echo "📁 Output: dist/"
echo ""

# List output files
if [ -d "dist" ]; then
    echo "Generated files:"
    ls -la dist/*.dmg 2>/dev/null || echo "No .dmg files found"
fi
