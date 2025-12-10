# 🏗️ BlackMamba Studio - Build Guide

This guide explains how to build installers for BlackMamba Studio on different platforms.

## 📋 Prerequisites

### All Platforms
- **Node.js** v18 or higher
- **npm** (comes with Node.js)
- **Git** (for cloning the repository)

### Platform-Specific Requirements

#### macOS
- **Xcode Command Line Tools** (for macOS builds)
  ```bash
  xcode-select --install
  ```
- **macOS 10.13 or higher** recommended for building

#### Windows
- **Windows 7 or higher**
- **.NET Framework 4.5+** (usually pre-installed on Windows 10/11)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Navigate to project directory
cd VIdeoEditor

# Install all dependencies
npm install
```

This will:
- Install all Node.js dependencies
- Install Electron and electron-builder
- Set up the build environment

### 2. Build for Your Platform

#### Build macOS DMG (on macOS)

```bash
# Using npm script
npm run build:mac

# Or using the shell script
./scripts/build-mac.sh
```

**Output:** `dist/BlackMamba Studio-1.0.0-arm64.dmg` and/or `dist/BlackMamba Studio-1.0.0-x64.dmg`

#### Build Windows Installer (on Windows)

```bash
# Using npm script
npm run build:win

# Or using the batch script (Windows)
scripts\build-win.bat

# Or using the shell script (Linux/macOS with Wine)
./scripts/build-win.sh
```

**Output:** `dist/BlackMamba Studio Setup 1.0.0.exe`

#### Build Both Platforms

```bash
npm run build
```

This will attempt to build for both Windows and macOS (requires appropriate platform).

## 📦 Build Configuration

The build configuration is defined in `package.json` under the `"build"` section:

```json
{
  "build": {
    "appId": "com.blackmamba.studio",
    "productName": "BlackMamba Studio",
    "directories": {
      "output": "dist",
      "buildResources": "assets"
    },
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "assets/icon.icns",
      "category": "public.app-category.video"
    },
    "dmg": {
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ]
    }
  }
}
```

### macOS DMG Features

The DMG installer includes:
- **Dual Architecture**: Builds for both Intel (x64) and Apple Silicon (arm64)
- **Drag-to-Install**: Users can drag the app to Applications folder
- **Custom Icon**: Professional application icon in ICNS format
- **App Category**: Categorized as a video editing application

## 🎨 Assets

Application icons are located in the `assets/` directory:

- **`icon.icns`** - macOS application icon (multiple resolutions: 16px to 1024px)
- **`icon.ico`** - Windows application icon (multiple resolutions)
- **`icon.png`** - High-resolution PNG icon (512x512)

### Customizing Icons

To replace the default icons:

1. Prepare your icon in high resolution (1024x1024 recommended)
2. Convert to required formats:
   - **macOS**: `.icns` format (use [Image2Icon](https://img2icnsapp.com/) or similar)
   - **Windows**: `.ico` format with multiple sizes
3. Replace files in `assets/` directory
4. Rebuild the application

## 🔧 Advanced Build Options

### Clean Build

Remove previous build artifacts:

```bash
# Remove dist folder
rm -rf dist/

# Rebuild
npm run build:mac
```

### Debug Build

For debugging build issues:

```bash
# Enable verbose logging
DEBUG=electron-builder npm run build:mac
```

### Custom Build Configuration

You can override build settings via command line:

```bash
# Build for specific architecture
electron-builder --mac --x64

# Build with custom output directory
electron-builder --mac --dir=custom-dist
```

## 📊 Build Output

After building, you'll find:

```
dist/
├── BlackMamba Studio-1.0.0-arm64.dmg          # macOS ARM64 (Apple Silicon)
├── BlackMamba Studio-1.0.0-x64.dmg            # macOS Intel
├── BlackMamba Studio-1.0.0-arm64-mac.zip      # Zipped app (ARM64)
├── BlackMamba Studio-1.0.0-mac.zip            # Zipped app (x64)
├── mac-arm64/                                 # Unpacked app (ARM64)
│   └── BlackMamba Studio.app
└── mac/                                       # Unpacked app (x64)
    └── BlackMamba Studio.app
```

## 🐛 Troubleshooting

### "No identities found" on macOS

If you see code signing errors:
```bash
# Build without code signing
electron-builder --mac --config.mac.identity=null
```

Or set in `package.json`:
```json
{
  "build": {
    "mac": {
      "identity": null
    }
  }
}
```

### Missing electron-builder

If electron-builder is not found:
```bash
npm install electron-builder --save-dev
```

### Icon Not Found

Ensure the `assets/` directory exists with icon files:
```bash
ls -la assets/
# Should show: icon.icns, icon.ico, icon.png
```

### Build Fails on Linux

To build for macOS on Linux, you need additional tools:
```bash
# Install required packages
sudo apt-get install icnsutils graphicsmagick
```

## 📝 Notes

### Cross-Platform Building

- **macOS DMG**: Can only be built on macOS
- **Windows NSIS**: Can be built on Windows, Linux (with Wine), or macOS (with Wine)
- **Linux packages**: Can be built on any platform

### Code Signing

For distribution outside of development:

**macOS:**
- Requires Apple Developer account ($99/year)
- Use `electron-builder` with valid certificate
- Notarization required for macOS 10.15+

**Windows:**
- Optional but recommended
- Requires valid code signing certificate
- Use `electron-builder` with certificate configuration

### File Size

Built DMG files are typically:
- **macOS DMG**: 150-250 MB (includes Electron runtime and dependencies)
- **Windows NSIS**: 120-200 MB

## 🎯 Quick Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Run app in development mode |
| `npm run build:mac` | Build macOS DMG |
| `npm run build:win` | Build Windows installer |
| `npm run build` | Build for all platforms |
| `npm test` | Run tests |
| `npm run lint` | Check code style |

## 📚 Additional Resources

- [electron-builder Documentation](https://www.electron.build/)
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [Code Signing Guide](https://www.electron.build/code-signing)
- [DMG Configuration](https://www.electron.build/configuration/dmg)

---

**Need help?** Open an issue on [GitHub](https://github.com/Blackmvmba88/VIdeoEditor/issues)
