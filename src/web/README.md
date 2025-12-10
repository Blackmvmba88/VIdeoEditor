# BlackMamba Studio - Web UI

## 📖 Descripción

Interfaz web básica para editar videos desde el navegador. Esta es una versión standalone que funciona independientemente de la aplicación Electron de escritorio.

## ✨ Características

- **Subir Videos**: Arrastra y suelta o selecciona videos desde tu computadora
- **Vista Previa**: Visualiza tus videos antes de editarlos
- **Recortar**: Corta tus videos especificando inicio y fin
- **Línea de Tiempo**: Organiza múltiples clips en una línea de tiempo
- **Unir Clips**: Combina múltiples clips en un solo video
- **Descargar**: Descarga el resultado final

## 🚀 Iniciar el Servidor Web

### Instalación de Dependencias

Si aún no has instalado las dependencias:

```bash
npm install
```

### Ejecutar el Servidor

```bash
npm run web
```

El servidor se iniciará en `http://localhost:3000`

### Puerto Personalizado

Puedes especificar un puerto diferente:

```bash
PORT=8080 npm run web
```

## 💻 Uso

1. **Abre tu navegador** en `http://localhost:3000`

2. **Sube un video**:
   - Arrastra un archivo de video al área de carga
   - O haz clic en "Seleccionar Video"

3. **Recorta el video** (opcional):
   - Usa los controles de tiempo para definir inicio y fin
   - Haz clic en "Usar Tiempo Actual" para establecer el punto exacto
   - Haz clic en "Recortar Video"

4. **Agrega a la línea de tiempo**:
   - Haz clic en "Agregar a Línea de Tiempo"
   - Repite para agregar más clips

5. **Organiza los clips**:
   - Usa las flechas ↑ ↓ para reordenar
   - Usa 🗑️ para eliminar clips

6. **Une los clips**:
   - Cuando tengas 2+ clips, haz clic en "Unir Clips"
   - Espera a que se procese

7. **Descarga el resultado**:
   - Haz clic en "Descargar Video"

## 🎬 Formatos Soportados

- MP4
- AVI
- MOV
- MKV
- WebM
- FLV

## 🔧 Requisitos

- **Node.js** v18 o superior
- **FFmpeg** instalado y en el PATH del sistema

### Verificar FFmpeg

```bash
ffmpeg -version
```

Si no está instalado:
- **Windows**: [Descargar FFmpeg](https://ffmpeg.org/download.html)
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt install ffmpeg`

## 🏗️ Estructura

```
src/web/
├── server.js          # Servidor Express
├── public/            # Archivos estáticos
│   ├── index.html    # Interfaz web
│   ├── styles.css    # Estilos
│   └── app.js        # Lógica del cliente
└── uploads/          # Videos subidos (temporal)
```

## 🔌 API Endpoints

### GET /api/health
Verificar estado del servidor y FFmpeg

### POST /api/upload
Subir un video
- Body: FormData con campo `video`
- Returns: Información del archivo

### POST /api/trim
Recortar un video
- Body: `{ filename, startTime, endTime }`
- Returns: Información del archivo recortado

### POST /api/join
Unir múltiples clips
- Body: `{ clips: [{ filename }, ...] }`
- Returns: Información del video final

### GET /api/download/:filename
Descargar un video procesado

### GET /api/videos
Listar videos subidos

### DELETE /api/delete/:filename
Eliminar un video

## 🛡️ Seguridad

- Límite de tamaño de archivo: 500MB
- Solo acepta formatos de video
- CORS habilitado para desarrollo
- Nombres de archivo únicos (UUID)

## 🐛 Solución de Problemas

### El servidor no inicia
- Verifica que el puerto 3000 no esté en uso
- Asegúrate de haber ejecutado `npm install`

### FFmpeg no disponible
- Verifica la instalación: `ffmpeg -version`
- Asegúrate de que FFmpeg esté en el PATH

### Error al procesar video
- Verifica que el formato sea compatible
- Asegúrate de que el archivo no esté corrupto
- Revisa los logs del servidor

## 📝 Notas

- Los videos subidos se almacenan temporalmente en `src/web/uploads/`
- Considera implementar limpieza automática de archivos antiguos
- Para producción, se recomienda agregar autenticación y límites de uso

## 🤝 Diferencias con la App de Escritorio

| Característica | Web UI | Electron App |
|----------------|--------|--------------|
| Instalación | No requiere | Requiere instalación |
| Acceso | Navegador | Aplicación nativa |
| Características | Básicas | Completas (Auto-Edit, IA, etc.) |
| Rendimiento | Depende del servidor | Rendimiento local |
| Multiplataforma | Cualquier navegador | Windows, macOS |

## 📄 Licencia

MIT - Parte del proyecto BlackMamba Studio
