/**
 * ProjectManager - Sistema de Gestión de Proyectos Persistentes
 * Auto-guarda proyectos, escanea carpetas, mantiene historial
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

class ProjectManager {
  constructor() {
    // Directorio de proyectos en Application Support
    this.projectsDir = path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'BlackMamba Studio',
      'projects'
    );
    
    // Directorio de auto-guardado
    this.autosaveDir = path.join(this.projectsDir, 'autosave');
    
    // Proyecto actual
    this.currentProject = null;
    this.isDirty = false;
    
    // Intervalo de auto-guardado (30 segundos)
    this.autosaveInterval = 30000;
    this.autosaveTimer = null;
    
    // Extensiones de video soportadas
    this.videoExtensions = [
      // Contenedores comunes
      '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v',
      // Profesionales
      '.mxf', '.prores', '.dnxhd', '.r3d', '.braw', '.ari',
      // Otros
      '.mpg', '.mpeg', '.m2v', '.m2ts', '.mts', '.ts', '.vob',
      '.3gp', '.3g2', '.f4v', '.ogv', '.divx', '.xvid',
      // RAW de cámaras
      '.dng', '.crm', '.nef'
    ];
    
    this.ensureDirectories();
  }

  /**
   * Asegurar que existen los directorios necesarios
   */
  ensureDirectories() {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }
      if (!fs.existsSync(this.autosaveDir)) {
        fs.mkdirSync(this.autosaveDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creando directorios de proyectos:', error);
    }
  }

  /**
   * Crear nuevo proyecto
   * @param {string} name - Nombre del proyecto
   * @param {string} sourcePath - Carpeta fuente de medios (opcional)
   * @returns {Object} Proyecto creado
   */
  createProject(name, sourcePath = null) {
    const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    this.currentProject = {
      id: projectId,
      name: name || 'Proyecto Sin Título',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      sourcePath: sourcePath,
      
      // Biblioteca de medios escaneados
      mediaLibrary: [],
      
      // Timeline con clips
      timeline: {
        tracks: [
          { id: 'video-1', type: 'video', clips: [] },
          { id: 'audio-1', type: 'audio', clips: [] }
        ],
        duration: 0
      },
      
      // Configuración de exportación
      exportSettings: {
        preset: 'youtube1080p',
        outputPath: null
      },
      
      // Historial de cambios para undo/redo
      history: [],
      historyIndex: -1,
      
      // Metadatos
      version: '1.0'
    };
    
    this.isDirty = true;
    this.startAutosave();
    this.saveProject();
    
    return this.currentProject;
  }

  /**
   * Escanear carpeta recursivamente buscando videos
   * @param {string} folderPath - Ruta de la carpeta
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Array>} Lista de videos encontrados
   */
  async scanFolder(folderPath, onProgress = null) {
    const videos = [];
    let scannedCount = 0;
    let totalFiles = 0;
    
    // Primero contar archivos totales para progreso
    const countFiles = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          if (item.isDirectory() && !item.name.startsWith('.')) {
            countFiles(path.join(dir, item.name));
          } else if (item.isFile()) {
            totalFiles++;
          }
        }
      } catch (error) {
        // Ignorar errores de permisos
      }
    };
    
    countFiles(folderPath);
    
    // Función recursiva para escanear
    const scanRecursive = async (dir, depth = 0) => {
      // Limitar profundidad para evitar problemas
      if (depth > 10) return;
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          
          if (item.isDirectory() && !item.name.startsWith('.')) {
            // Recursión en subdirectorios
            await scanRecursive(fullPath, depth + 1);
          } else if (item.isFile()) {
            scannedCount++;
            
            const ext = path.extname(item.name).toLowerCase();
            if (this.videoExtensions.includes(ext)) {
              try {
                const stats = fs.statSync(fullPath);
                videos.push({
                  id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
                  path: fullPath,
                  name: item.name,
                  extension: ext,
                  size: stats.size,
                  sizeFormatted: this.formatFileSize(stats.size),
                  createdAt: stats.birthtime,
                  modifiedAt: stats.mtime,
                  // Metadatos de video se llenarán después con FFprobe
                  metadata: null
                });
              } catch (err) {
                // Ignorar archivos inaccesibles
              }
            }
            
            // Reportar progreso
            if (onProgress && totalFiles > 0) {
              onProgress({
                stage: 'scanning',
                current: scannedCount,
                total: totalFiles,
                percent: Math.round((scannedCount / totalFiles) * 100),
                currentFile: item.name,
                videosFound: videos.length
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error escaneando ${dir}:`, error.message);
      }
    };
    
    await scanRecursive(folderPath);
    
    // Ordenar por fecha de modificación (más recientes primero)
    videos.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
    
    return videos;
  }

  /**
   * Agregar medios al proyecto actual
   * @param {Array} mediaFiles - Lista de archivos de medios
   */
  addMediaToProject(mediaFiles) {
    if (!this.currentProject) {
      this.createProject('Proyecto Sin Título');
    }
    
    // Evitar duplicados
    const existingPaths = new Set(this.currentProject.mediaLibrary.map(m => m.path));
    const newMedia = mediaFiles.filter(m => !existingPaths.has(m.path));
    
    this.currentProject.mediaLibrary.push(...newMedia);
    this.currentProject.modifiedAt = new Date().toISOString();
    this.isDirty = true;
    
    return newMedia.length;
  }

  /**
   * Guardar proyecto actual
   * @returns {boolean} Éxito
   */
  saveProject() {
    if (!this.currentProject) return false;
    
    try {
      const projectPath = path.join(
        this.projectsDir,
        `${this.currentProject.id}.bmproj`
      );
      
      this.currentProject.modifiedAt = new Date().toISOString();
      
      fs.writeFileSync(
        projectPath,
        JSON.stringify(this.currentProject, null, 2),
        'utf-8'
      );
      
      this.isDirty = false;
      return true;
    } catch (error) {
      console.error('Error guardando proyecto:', error);
      return false;
    }
  }

  /**
   * Auto-guardar proyecto
   */
  autosave() {
    if (!this.currentProject || !this.isDirty) return;
    
    try {
      const autosavePath = path.join(
        this.autosaveDir,
        `${this.currentProject.id}_autosave.bmproj`
      );
      
      fs.writeFileSync(
        autosavePath,
        JSON.stringify(this.currentProject, null, 2),
        'utf-8'
      );
      
      console.log('Auto-guardado completado');
    } catch (error) {
      console.error('Error en auto-guardado:', error);
    }
  }

  /**
   * Iniciar timer de auto-guardado
   */
  startAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }
    
    this.autosaveTimer = setInterval(() => {
      this.autosave();
    }, this.autosaveInterval);
  }

  /**
   * Detener auto-guardado
   */
  stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  /**
   * Cargar proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {Object|null} Proyecto cargado
   */
  loadProject(projectId) {
    try {
      const projectPath = path.join(this.projectsDir, `${projectId}.bmproj`);
      
      if (!fs.existsSync(projectPath)) {
        // Intentar cargar desde autosave
        const autosavePath = path.join(this.autosaveDir, `${projectId}_autosave.bmproj`);
        if (fs.existsSync(autosavePath)) {
          const data = fs.readFileSync(autosavePath, 'utf-8');
          this.currentProject = JSON.parse(data);
          this.isDirty = true; // Marcar como dirty para guardar en ubicación principal
          this.startAutosave();
          return this.currentProject;
        }
        return null;
      }
      
      const data = fs.readFileSync(projectPath, 'utf-8');
      this.currentProject = JSON.parse(data);
      this.isDirty = false;
      this.startAutosave();
      
      return this.currentProject;
    } catch (error) {
      console.error('Error cargando proyecto:', error);
      return null;
    }
  }

  /**
   * Listar todos los proyectos
   * @returns {Array} Lista de proyectos
   */
  listProjects() {
    try {
      const files = fs.readdirSync(this.projectsDir);
      const projects = [];
      
      for (const file of files) {
        if (file.endsWith('.bmproj') && !file.includes('_autosave')) {
          try {
            const filePath = path.join(this.projectsDir, file);
            const data = fs.readFileSync(filePath, 'utf-8');
            const project = JSON.parse(data);
            
            projects.push({
              id: project.id,
              name: project.name,
              createdAt: project.createdAt,
              modifiedAt: project.modifiedAt,
              mediaCount: project.mediaLibrary ? project.mediaLibrary.length : 0,
              clipCount: project.timeline?.tracks?.[0]?.clips?.length || 0
            });
          } catch (err) {
            // Ignorar proyectos corruptos
          }
        }
      }
      
      // Ordenar por fecha de modificación
      projects.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
      
      return projects;
    } catch (error) {
      console.error('Error listando proyectos:', error);
      return [];
    }
  }

  /**
   * Eliminar proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {boolean} Éxito
   */
  deleteProject(projectId) {
    try {
      const projectPath = path.join(this.projectsDir, `${projectId}.bmproj`);
      const autosavePath = path.join(this.autosaveDir, `${projectId}_autosave.bmproj`);
      
      if (fs.existsSync(projectPath)) {
        fs.unlinkSync(projectPath);
      }
      
      if (fs.existsSync(autosavePath)) {
        fs.unlinkSync(autosavePath);
      }
      
      // Si es el proyecto actual, limpiar
      if (this.currentProject && this.currentProject.id === projectId) {
        this.currentProject = null;
        this.stopAutosave();
      }
      
      return true;
    } catch (error) {
      console.error('Error eliminando proyecto:', error);
      return false;
    }
  }

  /**
   * Obtener proyecto actual
   * @returns {Object|null}
   */
  getCurrentProject() {
    return this.currentProject;
  }

  /**
   * Actualizar timeline del proyecto
   * @param {Object} timeline - Nuevo estado del timeline
   */
  updateTimeline(timeline) {
    if (!this.currentProject) return;
    
    // Guardar en historial para undo
    this.pushToHistory({
      type: 'timeline_update',
      previous: JSON.parse(JSON.stringify(this.currentProject.timeline)),
      timestamp: Date.now()
    });
    
    this.currentProject.timeline = timeline;
    this.currentProject.modifiedAt = new Date().toISOString();
    this.isDirty = true;
  }

  /**
   * Agregar acción al historial (para undo/redo)
   * @param {Object} action - Acción a guardar
   */
  pushToHistory(action) {
    if (!this.currentProject) return;
    
    // Eliminar acciones futuras si estamos en medio del historial
    if (this.currentProject.historyIndex < this.currentProject.history.length - 1) {
      this.currentProject.history = this.currentProject.history.slice(
        0,
        this.currentProject.historyIndex + 1
      );
    }
    
    this.currentProject.history.push(action);
    this.currentProject.historyIndex = this.currentProject.history.length - 1;
    
    // Limitar historial a 100 acciones
    if (this.currentProject.history.length > 100) {
      this.currentProject.history.shift();
      this.currentProject.historyIndex--;
    }
  }

  /**
   * Formatear tamaño de archivo
   * @param {number} bytes - Tamaño en bytes
   * @returns {string} Tamaño formateado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Limpiar recursos al cerrar
   */
  cleanup() {
    this.stopAutosave();
    if (this.isDirty) {
      this.saveProject();
    }
  }
}

module.exports = ProjectManager;
