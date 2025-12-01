# 🐍 BlackMamba Studio

<div align="center">

**Professional Cross-Platform Video Editor**

*Edita como los profesionales • Ahorra tiempo con IA • Pasa más tiempo con tu familia*

[![Version](https://img.shields.io/badge/version-1.0.0-00d4ff?style=for-the-badge)](https://github.com/Blackmvmba88/VIdeoEditor/releases)
[![License](https://img.shields.io/badge/license-MIT-00d4ff?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-00d4ff?style=for-the-badge)](https://github.com/Blackmvmba88/VIdeoEditor)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-00d4ff?style=for-the-badge)](https://nodejs.org/)

[🚀 **Ver Roadmap Completo**](ROADMAP.md) • [📦 Releases](https://github.com/Blackmvmba88/VIdeoEditor/releases) • [🐛 Reportar Bug](https://github.com/Blackmvmba88/VIdeoEditor/issues)

</div>

---

A cinematic video editing application built with Electron and Node.js, featuring FFmpeg integration for professional video processing.

![BlackMamba Studio](https://img.shields.io/badge/BlackMamba-Studio-00d4ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTAwIDEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBmaWxsPSIjMDBkNGZmIiBkPSJNNTAgNSBDMjUgNSAxMCAyNSAxMCA0NSBDMTAgNTUgMTUgNjUgMjUgNzAgTDIwIDkwIEMyMCA5NSAyNSA5OCAzMCA5NSBMNTAgODAgTDcwIDk1IEM3NSA5OCA4MCA5NSA4MCA5MCBMNSA3MCBDODUgNjUgOTAgNTUgOTAgNDUgQzkwIDI1IDc1IDUgNTAgNSBaIE0zNSA0MCBDMzggNDAgNDAgNDIgNDAgNDUgQzQwIDQ4IDM4IDUwIDM1IDUwIEMzMiA1MCAzMCA0OCAzMCA0NSBDM Agog== MCAzMiA0MCAzNSA0MCBaIE02NSA0MCBDNjggNDAgNzAgNDIgNzAgNDUgQzcwIDQ4IDY4IDUwIDY1IDUwIEM2MiA1MCA2MCA0OCA2MCA0NSBDNjAgNDIgNjIgNDAgNjUgNDAgWiIvPjwvc3ZnPg==)

## ✨ Features

### 🤖 Auto-Edit - Automatic Video Editing (NEW!)
**Save hours of editing time and spend more time with your family!**

- **Smart Content Detection** - Automatically analyzes your video to find the most interesting moments
- **Scene Change Detection** - Identifies visual transitions and key moments
- **Audio Peak Analysis** - Detects high-energy audio moments for engaging content
- **Multiple Editing Styles**:
  - **Highlights** - Selects the best moments based on content analysis
  - **Summary** - Creates a balanced overview of your entire video
  - **Action** - Focuses on high-activity visual and audio moments
- **Customizable Settings** - Control clip duration and target video length
- **Time-Saving Statistics** - See how much editing time you've saved

### Video Editing
- **Join Clips** - Combine multiple video clips into one seamless video
- **Cut/Trim** - Precisely trim videos with frame-accurate controls
- **Reorder** - Drag and drop clips to arrange your timeline
- **Format Detection** - Automatic detection of video formats and codecs

### Professional Interface
- **Cinematic Dark Theme** - DaVinci Resolve-inspired UI with electric blue and quantum purple accents
- **Timeline with Thumbnails** - Visual timeline for easy clip management
- **Preview Window** - Real-time preview with timecode overlay
- **Properties Panel** - Transform, scale, and rotation controls

### Export Options
- **Platform Presets** - Optimized settings for YouTube, Instagram, TikTok, Twitter
- **Quality Presets** - From web-optimized to professional 4K
- **Custom Settings** - Full control over codec, bitrate, resolution, and more
- **Progress Tracking** - Cinematic progress modal with ETA

### Technical Features
- **FFmpeg Integration** - Full FFmpeg support for video processing
- **File Validation** - Comprehensive input validation and error handling
- **Cross-Platform** - Works on Windows and macOS
- **Modular Architecture** - Clean, maintainable codebase

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **FFmpeg** (must be installed and in PATH)

### Installation

```bash
# Clone the repository
git clone https://github.com/Blackmvmba88/VIdeoEditor.git
cd VIdeoEditor

# Install dependencies
npm install

# Start the application
npm start
```

### Development

```bash
# Run in development mode
npm start

# Lint code
npm run lint

# Run tests
npm test
```

## 📦 Building Installers

### Windows (.exe)

```bash
# Using npm
npm run build:win

# Or using the script
./scripts/build-win.sh      # Linux/macOS
scripts\build-win.bat       # Windows
```

### macOS (.dmg)

```bash
# Using npm
npm run build:mac

# Or using the script
./scripts/build-mac.sh
```

Build outputs are saved to the `dist/` directory.

## 🎨 Export Presets

| Preset | Resolution | Use Case |
|--------|------------|----------|
| YouTube 1080p | 1920x1080 | Standard YouTube uploads |
| YouTube 4K | 3840x2160 | High-quality YouTube content |
| Instagram | 1080x1080 | Instagram feed posts |
| TikTok | 1080x1920 | TikTok vertical videos |
| Twitter | 1280x720 | Twitter video posts |
| High Quality | Source | Professional archival |

## 🛠️ Project Structure

```
blackmamba-studio/
├── src/
│   ├── main/           # Electron main process
│   │   ├── main.js     # Application entry point
│   │   └── preload.js  # Preload script for security
│   ├── renderer/       # Frontend UI
│   │   ├── index.html  # Main HTML
│   │   ├── styles.css  # Cinematic styling
│   │   └── renderer.js # UI logic
│   ├── modules/        # Core business logic
│   │   ├── ffmpegWrapper.js    # FFmpeg integration
│   │   ├── videoProcessor.js   # Video operations
│   │   ├── formatDetector.js   # Format detection
│   │   ├── fileValidator.js    # Input validation
│   │   ├── exportPresets.js    # Export configurations
│   │   ├── exportRenderer.js   # Export handling
│   │   ├── contentAnalyzer.js  # Smart content analysis (NEW)
│   │   ├── autoEditor.js       # Automatic video editing (NEW)
│   │   └── errorHandler.js     # Error management
│   └── presets/        # Export preset definitions
├── scripts/            # Build scripts
├── assets/             # Application icons
└── package.json        # Project configuration
```

## 🎬 Usage

1. **Import Media** - Drag and drop video files or click to browse
2. **Arrange Timeline** - Drag clips to reorder them
3. **Edit Clips** - Use the properties panel to trim and adjust
4. **Select Preset** - Choose an export preset or customize settings
5. **Export** - Click "Export Masterpiece" and watch the magic happen

### 🤖 Using Auto-Edit (Save Time!)

1. **Import Video** - Import the video you want to automatically edit
2. **Click Auto Edit** - Select the "Auto Edit" button in the toolbar
3. **Choose Style** - Select your preferred editing style:
   - **Mejores Momentos (Highlights)** - Best moments only
   - **Resumen (Summary)** - Balanced overview
   - **Acción (Action)** - High-activity moments
4. **Configure Settings** - Adjust target duration and clip lengths
5. **Click "¡Crear Video Automático!"** - Let the AI detect and edit for you
6. **Enjoy Your Free Time** - Spend time with your family while the video is created!

## 🔧 Supported Formats

### Video
- MP4, MOV, AVI, MKV, WebM, FLV
- MPEG, 3GP, TS, M2TS, VOB, OGV

### Audio
- MP3, AAC, WAV, FLAC, OGG, M4A
- WMA, OPUS, AIFF, APE

### Codecs
- H.264, H.265/HEVC, VP8, VP9, AV1
- ProRes, DNxHD, MPEG-2, MPEG-4

## 🗺️ Roadmap

Tenemos planes ambiciosos para BlackMamba Studio. Consulta nuestro [**Roadmap Épico**](ROADMAP.md) para ver:

- 🚀 **Fase 1:** Mejoras de rendimiento y herramientas esenciales
- 🤖 **Fase 2:** Inteligencia Artificial avanzada (Auto-Edit 2.0, transcripción, subtítulos)
- 💎 **Fase 3:** Color grading profesional, audio, motion graphics y VFX
- 🌐 **Fase 4:** Colaboración en la nube e integraciones
- 🔮 **Fase 5:** Editor AI-First, realidad extendida y streaming

[**→ Ver Roadmap Completo**](ROADMAP.md)

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Consulta nuestra guía de contribución:

1. 🍴 Fork el repositorio
2. 🌿 Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push a la rama (`git push origin feature/AmazingFeature`)
5. 🔃 Abre un Pull Request

## 📝 License

MIT License - feel free to use this project for your own video editing needs.

## 🙏 Acknowledgments

- FFmpeg team for the amazing video processing library
- Electron team for the cross-platform framework
- DaVinci Resolve for UI inspiration

---

<div align="center">

**⭐ Si te gusta BlackMamba Studio, dale una estrella al repo ⭐**

[🗺️ Roadmap](ROADMAP.md) • [🐛 Issues](https://github.com/Blackmvmba88/VIdeoEditor/issues) • [💬 Discussions](https://github.com/Blackmvmba88/VIdeoEditor/discussions)

**Made with 💜 by the BlackMamba Team**

</div>
