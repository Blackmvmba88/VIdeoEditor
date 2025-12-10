# Scripts Directory

This directory contains build and utility scripts for BlackMamba Studio.

## Build Scripts

### build-mac.sh
Builds macOS DMG installers using electron-builder.

**Usage:**
```bash
./scripts/build-mac.sh
```

**Output:**
- `dist/BlackMamba Studio-1.0.0-arm64.dmg` - Apple Silicon installer
- `dist/BlackMamba Studio-1.0.0-x64.dmg` - Intel installer

### build-win.sh / build-win.bat
Builds Windows NSIS installer using electron-builder.

**Usage:**
```bash
# On Linux/macOS
./scripts/build-win.sh

# On Windows
scripts\build-win.bat
```

**Output:**
- `dist/BlackMamba Studio Setup 1.0.0.exe` - Windows installer

## Utility Scripts

### create_icons.py
Generates application icons in all required formats (.icns, .ico, .png) using Python and Pillow.

**Requirements:**
- Python 3.6 or higher
- Pillow library (`pip install Pillow`)

**Usage:**
```bash
python3 scripts/create_icons.py
```

**Output:**
- `assets/icon.icns` - macOS icon (multi-resolution)
- `assets/icon.ico` - Windows icon (multiple sizes)
- `assets/icon.png` - PNG icon (512x512)

**When to use:**
- When you need to regenerate icons after modifying the design
- When icons are accidentally deleted
- When creating icons for a fork/rebrand

**Note:** The icons feature BlackMamba Studio branding. Modify the script's `create_base_icon()` function to customize the design.

## Quick Reference

| Script | Platform | Purpose | Output |
|--------|----------|---------|--------|
| `build-mac.sh` | macOS | Build DMG installer | `dist/*.dmg` |
| `build-win.sh` | Windows/Linux | Build Windows installer | `dist/*.exe` |
| `build-win.bat` | Windows | Build Windows installer | `dist/*.exe` |
| `create_icons.py` | Any | Generate app icons | `assets/icon.*` |

## Notes

- Build scripts check for dependencies and install them if needed
- Build output always goes to `dist/` directory
- Previous builds are cleaned automatically
- All scripts can be run from the project root directory

For detailed build instructions, see [BUILD.md](../BUILD.md)
