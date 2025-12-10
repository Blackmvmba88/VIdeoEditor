# BlackMamba Studio - Instrucciones para Agentes de IA

## Visión General de la Arquitectura

**Aplicación de escritorio Electron** con tres capas:
- **Proceso Principal** (`src/main/main.js`): Ciclo de vida de Electron, manejadores IPC, inicializa todos los módulos
- **Renderer** (`src/renderer/`): Interfaz de usuario, se comunica vía `videoEditorAPI` expuesto en preload
- **Módulos** (`src/modules/`): Lógica de procesamiento de video, envuelve FFmpeg

**Interfaz Web Alternativa**: Servidor Express en `src/web/server.js` (ejecutar con `npm run web`)

### Organización de Módulos

Módulos core en `src/modules/`:
- `FFmpegWrapper` - Ejecución de comandos FFmpeg/FFprobe de bajo nivel
- `VideoProcessor` - Operaciones de cortar, unir, reordenar usando FFmpegWrapper
- `ContentAnalyzer` - Analiza videos para cambios de escena, picos de audio
- `AutoEditor` - Edición automática con IA, estilos: `highlights`, `summary`, `action`
- `ExportPresets` - Codificación específica por plataforma (YouTube, TikTok, Instagram)

**Sistema de Inteligencia BMIC** (pipeline de procesamiento inteligente):
- `FileValidator` → `Optimizer` → `AutoImprove` (llamados en secuencia)
- `BMIC` orquesta estos agentes con modos: `fast`, `highQuality`, `socialMedia`, `movie`, `balanced`

**Módulos por fases** en `src/modules/phases/`:
```
phase1/ - Rendimiento (proxy, aceleración de hardware, memoria)
phase2/ - IA (capítulos, sincronización de ritmo, speech-to-text)
phase3/ - Motion graphics, audio IA
phase4/ - Plugins, nube, colaboración, multi-cámara
phase5/ - Estudio IA, biblioteca de assets, marketplace
```

### Patrón de Comunicación IPC

El proceso principal expone APIs vía `ipcMain.handle()` en `main.js`. El renderer llama vía `preload.js`:
```javascript
// Renderer usa: window.videoEditorAPI.cutVideo({...})
// Se mapea a: ipcMain.handle('cut-video', handler) en main.js
```

## Comandos de Desarrollo

```bash
npm start          # Ejecutar app Electron de escritorio
npm run web        # Ejecutar servidor web UI (puerto 3000)
npm test           # Ejecutar tests Jest con cobertura
npm run lint       # Verificación ESLint
npm run lint:fix   # Auto-corregir problemas de lint
npm run build:mac  # Construir DMG para macOS
npm run build:win  # Construir instalador Windows
```

## Patrones de Testing

Los tests están en `src/modules/__tests__/` y `src/modules/phases/__tests__/`. La cobertura se enfoca en módulos, excluyendo main/renderer:

```javascript
// Patrón de tests: Siempre limpiar después de cada test
beforeEach(() => { instance = new Module(); });
afterEach(() => { instance.cleanup(); });

// Mockear FFmpeg para tests unitarios - FFmpeg real necesario para integración
```

## Convenciones de Código

- **Comentarios en español**: Los módulos usan comentarios JSDoc en español
- **Exportaciones de módulos**: Archivo barrel central en `src/modules/index.js` - agregar nuevos módulos ahí
- **Manejo de errores**: Usar `VideoEditorError` con `ErrorCodes` numéricos (1000s=archivo, 2000s=ffmpeg, 3000s=procesamiento, 4000s=validación)
- **Archivos temporales**: Usar `require('os').tmpdir()` con prefijos `video-editor-*`
- **Callbacks de progreso**: Funciones aceptan callback `onProgress` con `{stage, percent, message}`

## Agregar Nuevas Funcionalidades

1. Crear módulo en la carpeta de fase apropiada o en `src/modules/`
2. Exportar desde el `index.js` de la fase y desde `src/modules/index.js`
3. Agregar handler IPC en `src/main/main.js` si se necesita para el renderer
4. Exponer en `src/main/preload.js` para acceso del renderer
5. Agregar tests en la carpeta `__tests__/`

## Integración con FFmpeg

FFmpegWrapper auto-detecta las rutas de FFmpeg en macOS/Windows. Todo el procesamiento de video llama a:
```javascript
await this.ffmpeg.execute(args, onProgress);
```

Presets de plataforma en `optimizer.js` (PLATFORM_CONFIGS): youtube, tiktok, instagram, twitter, web, professional

## Errores Comunes a Evitar

### ❌ No limpiar archivos temporales
```javascript
// MAL: Olvidar cleanup después de procesar
const processor = new VideoProcessor();
await processor.joinVideos(clips, output);
// Los archivos temporales quedan en disco

// BIEN: Siempre llamar cleanup()
const processor = new VideoProcessor();
try {
  await processor.joinVideos(clips, output);
} finally {
  processor.cleanup();  // Limpia archivos en tempDir
}
```

### ❌ Usar `throw new Error()` en lugar de `VideoEditorError`
```javascript
// MAL: Error genérico sin código
throw new Error('Archivo no encontrado');

// BIEN: Error tipado con código para el UI
const { VideoEditorError, ErrorCodes } = require('./errorHandler');
throw new VideoEditorError('Archivo no encontrado', ErrorCodes.FILE_NOT_FOUND, { path: filePath });
```

### ❌ No validar archivos antes de procesar
```javascript
// MAL: Procesar directamente sin validar
await videoProcessor.cutVideo(input, start, end, output);

// BIEN: Usar FileValidator primero (o BMIC que lo hace automáticamente)
const validator = new FileValidator();
const validation = await validator.validateForProcessing(input, preset);
if (!validation.isValid) {
  // Manejar problemas de compatibilidad
}
```

### ❌ Olvidar exponer nuevas APIs al renderer
Cuando creas un nuevo handler IPC, debes:
1. Agregar en `main.js`: `ipcMain.handle('mi-operacion', handler)`
2. Exponer en `preload.js`: `miOperacion: (params) => ipcRenderer.invoke('mi-operacion', params)`
3. Sin paso 2, el renderer no puede llamar tu función

### ❌ No pasar callback de progreso
```javascript
// MAL: Sin feedback al usuario en operaciones largas
await autoEditor.autoEdit(input, output, options);

// BIEN: Proporcionar callback para actualizar UI
await autoEditor.autoEdit(input, output, options, (progress) => {
  console.log(`${progress.stage}: ${progress.percent}% - ${progress.message}`);
  // Enviar a renderer: mainWindow.webContents.send('progress', progress);
});
```

### ❌ Rutas relativas en archivos temporales
```javascript
// MAL: Ruta relativa (falla en diferentes contextos)
const tempFile = './temp/video.mp4';

// BIEN: Usar os.tmpdir() con prefijo único
const tempFile = path.join(require('os').tmpdir(), 'video-editor-pro', `${uuidv4()}.mp4`);
```

### ❌ No mockear FFmpeg en tests unitarios
```javascript
// MAL: Test depende de FFmpeg instalado
it('should cut video', async () => {
  await processor.cutVideo(realFile, 0, 10, output);  // Falla sin FFmpeg
});

// BIEN: Mockear FFmpegWrapper para tests unitarios
jest.mock('../ffmpegWrapper');
FFmpegWrapper.mockImplementation(() => ({
  execute: jest.fn().mockResolvedValue({ success: true })
}));
```
