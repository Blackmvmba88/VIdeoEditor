# 🍎 Cómo Crear un DMG para BlackMamba Studio

## Guía Rápida en Español

Este documento explica cómo crear un archivo DMG (instalador para macOS) de BlackMamba Studio.

## ✅ Requisitos

Para crear un DMG, necesitas:

1. **Una Mac** con macOS 10.13 o superior
2. **Node.js** versión 18 o superior
3. **Xcode Command Line Tools** instalado

### Instalar Xcode Command Line Tools

```bash
xcode-select --install
```

## 🚀 Pasos para Crear el DMG

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Blackmvmba88/VIdeoEditor.git
cd VIdeoEditor
```

### 2. Instalar Dependencias

```bash
npm install
```

Este comando instalará:
- Electron (framework de la aplicación)
- electron-builder (herramienta de construcción)
- Todas las dependencias necesarias

### 3. Construir el DMG

```bash
npm run build:mac
```

O puedes usar el script incluido:

```bash
./scripts/build-mac.sh
```

### 4. Encontrar tu DMG

El archivo DMG se creará en la carpeta `dist/`:

```
dist/
├── BlackMamba Studio-1.0.0-arm64.dmg    # Para Macs con Apple Silicon (M1, M2, M3)
└── BlackMamba Studio-1.0.0-x64.dmg      # Para Macs con procesador Intel
```

## 📦 Características del DMG

El instalador DMG incluye:

- ✅ **Dos versiones**: Una para Intel (x64) y otra para Apple Silicon (arm64)
- ✅ **Instalación fácil**: Los usuarios solo tienen que arrastrar la aplicación a la carpeta Aplicaciones
- ✅ **Icono profesional**: Icono personalizado con el logo de BlackMamba Studio
- ✅ **Ventana de instalación**: Interfaz bonita para instalar la aplicación

## 🎯 Uso del DMG

Una vez creado el DMG, los usuarios pueden:

1. **Descargar** el archivo DMG
2. **Hacer doble clic** para abrir el instalador
3. **Arrastrar** el icono de BlackMamba Studio a la carpeta Aplicaciones
4. **Ejecutar** la aplicación desde Aplicaciones o Launchpad

## 🔍 Solución de Problemas

### Error: "No identities found"

Si ves errores de firma de código, puedes construir sin firmar:

```bash
electron-builder --mac --config.mac.identity=null
```

### Error: "Icon not found"

Asegúrate de que existe la carpeta `assets/` con los archivos de iconos:

```bash
ls -la assets/
# Debe mostrar: icon.icns, icon.ico, icon.png
```

Si faltan, ejecuta:

```bash
python3 scripts/create_icons.py
```

### El build es muy lento

La primera construcción puede tardar varios minutos porque:
- Descarga Electron para las dos arquitecturas
- Compila las dependencias nativas
- Crea los paquetes DMG

Construcciones posteriores serán más rápidas.

## 📊 Tamaño del Archivo

- **DMG ARM64**: ~150-200 MB
- **DMG x64**: ~150-200 MB

El tamaño incluye:
- La aplicación BlackMamba Studio
- Runtime de Electron
- FFmpeg y dependencias
- Todas las bibliotecas necesarias

## 🛡️ Distribución

### Para Uso Personal

Puedes distribuir el DMG directamente a tus usuarios.

### Para Distribución Pública

Para distribuir en la Mac App Store o fuera de ella:

1. **Firma de código**: Necesitas una cuenta de Apple Developer ($99/año)
2. **Notarización**: Requerido para macOS 10.15 (Catalina) y superior
3. **Configuración**: Actualiza `package.json` con tu certificado

Ver [BUILD.md](BUILD.md) para más detalles sobre firma y notarización.

## 📝 Comandos Útiles

```bash
# Ver la configuración de construcción
cat package.json | grep -A 30 '"build":'

# Limpiar construcciones anteriores
rm -rf dist/

# Construir con logs detallados
DEBUG=electron-builder npm run build:mac

# Construir solo para Intel
electron-builder --mac --x64

# Construir solo para Apple Silicon
electron-builder --mac --arm64

# Ver versión de electron-builder
npx electron-builder --version
```

## 🔗 Recursos Adicionales

- **Documentación completa**: [BUILD.md](BUILD.md)
- **electron-builder docs**: https://www.electron.build/
- **Configuración DMG**: https://www.electron.build/configuration/dmg
- **Reportar problemas**: https://github.com/Blackmvmba88/VIdeoEditor/issues

## ✨ Resultado Final

Después de construir, tendrás archivos DMG profesionales que:

- Se ven como aplicaciones profesionales de Mac
- Incluyen el icono de BlackMamba Studio
- Funcionan en todas las Macs modernas (Intel y Apple Silicon)
- Son fáciles de instalar para los usuarios

---

**¿Necesitas ayuda?** Abre un issue en GitHub o consulta la documentación completa en [BUILD.md](BUILD.md)

**¡Disfruta de tu aplicación BlackMamba Studio en macOS!** 🐍✨
