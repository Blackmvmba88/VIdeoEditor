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

### fix-sonar-issues.js
Automatically fixes common SonarLint code quality issues across the codebase.

**Usage:**
```bash
npm run fix:sonar
```

**What it fixes:**
- `parseInt()` → `Number.parseInt()`
- `parseFloat()` → `Number.parseFloat()`
- `isNaN()` → `Number.isNaN()`
- `require('fs')` → `require('node:fs')` (and other Node.js built-ins)
- Removes unnecessary `.0` from number literals (e.g., `1.0` → `1`)
- `window.` → `globalThis.` in renderer code

**Features:**
- Safe: Only applies non-breaking changes
- Fast: Processes ~100 files in seconds
- Idempotent: Can be run multiple times safely
- Detailed reporting: Shows all changes made
- Test-verified: Confirms no functionality breaks

**After running:**
1. Review changes: `git diff`
2. Run tests: `npm test`
3. Run linter: `npm run lint`
4. Commit if satisfied

See [SONAR_FIX_SUMMARY.md](../SONAR_FIX_SUMMARY.md) for detailed results.

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
| `fix-sonar-issues.js` | Any | Fix SonarLint issues | Modified source files |

## Notes

- Build scripts check for dependencies and install them if needed
- Build output always goes to `dist/` directory
- Previous builds are cleaned automatically
- All scripts can be run from the project root directory

For detailed build instructions, see [BUILD.md](../BUILD.md)
