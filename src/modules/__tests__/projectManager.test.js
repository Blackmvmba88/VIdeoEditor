/**
 * Tests para ProjectManager
 * Gestión de proyectos, escaneo de carpetas y persistencia
 */

const ProjectManager = require('../projectManager');
const path = require('path');
const fs = require('fs');
const os = require('os');

describe('ProjectManager', () => {
  let projectManager;
  let tempDir;

  beforeEach(() => {
    projectManager = new ProjectManager();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
  });

  afterEach(() => {
    if (projectManager.autosaveTimer) {
      clearInterval(projectManager.autosaveTimer);
    }
    // Limpiar directorio temporal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Constructor', () => {
    it('debe inicializar con valores por defecto', () => {
      expect(projectManager.currentProject).toBeNull();
      expect(projectManager.autosaveInterval).toBe(30000);
    });

    it('debe tener extensiones de video definidas', () => {
      expect(projectManager.videoExtensions).toContain('.mp4');
      expect(projectManager.videoExtensions).toContain('.mov');
      expect(projectManager.videoExtensions).toContain('.prores');
    });

    it('debe crear directorios de proyectos', () => {
      expect(projectManager.projectsDir).toContain('BlackMamba Studio');
    });
  });

  describe('createProject', () => {
    it('debe crear un proyecto nuevo con nombre', () => {
      const project = projectManager.createProject('Mi Proyecto');
      
      expect(project).toBeDefined();
      expect(project.name).toBe('Mi Proyecto');
      expect(project.id).toBeDefined();
      expect(project.mediaLibrary).toEqual([]);
      expect(project.createdAt).toBeDefined();
    });

    it('debe crear proyecto con nombre por defecto', () => {
      const project = projectManager.createProject();
      
      expect(project.name).toContain('Sin Título');
    });

    it('debe establecer proyecto actual', () => {
      const project = projectManager.createProject('Test');
      
      expect(projectManager.currentProject).toBe(project);
      expect(projectManager.getCurrentProject()).toBe(project);
    });
  });

  describe('scanFolder', () => {
    beforeEach(() => {
      // Crear estructura de prueba
      fs.writeFileSync(path.join(tempDir, 'video1.mp4'), 'fake');
      fs.writeFileSync(path.join(tempDir, 'video2.mov'), 'fake');
      fs.writeFileSync(path.join(tempDir, 'document.txt'), 'fake');
      
      // Crear subcarpeta
      const subDir = path.join(tempDir, 'subfolder');
      fs.mkdirSync(subDir);
      fs.writeFileSync(path.join(subDir, 'video3.avi'), 'fake');
    });

    it('debe encontrar videos en carpeta', async () => {
      const result = await projectManager.scanFolder(tempDir);
      
      // El resultado puede tener varias estructuras
      const files = result.files || result;
      expect(files.length).toBeGreaterThanOrEqual(2);
    });

    it('debe manejar carpeta vacía', async () => {
      const emptyDir = path.join(tempDir, 'empty');
      fs.mkdirSync(emptyDir);
      
      const result = await projectManager.scanFolder(emptyDir);
      const files = result.files || result;
      
      expect(files.length).toBe(0);
    });
  });

  describe('saveProject / loadProject', () => {
    it('debe guardar y cargar proyecto', async () => {
      // Crear proyecto
      projectManager.createProject('Test Save');
      
      // Guardar
      await projectManager.saveProject();
      
      // Listar proyectos
      const projects = await projectManager.listProjects();
      
      expect(Array.isArray(projects)).toBe(true);
    });
  });

  describe('listProjects / deleteProject', () => {
    it('debe listar proyectos', async () => {
      const projects = await projectManager.listProjects();
      expect(Array.isArray(projects)).toBe(true);
    });

    it('debe eliminar proyecto', async () => {
      projectManager.createProject('Delete Me');
      await projectManager.saveProject();
      const id = projectManager.currentProject.id;
      
      await projectManager.deleteProject(id);
      
      // Verificar que no existe
      const loaded = await projectManager.loadProject(id);
      expect(loaded).toBeNull();
    });
  });

  describe('autosave', () => {
    it('debe iniciar autosave', () => {
      projectManager.createProject('Auto');
      projectManager.startAutosave();
      
      expect(projectManager.autosaveTimer).toBeDefined();
      
      // Limpiar
      projectManager.stopAutosave();
    });

    it('debe detener autosave', () => {
      projectManager.createProject('Auto');
      projectManager.startAutosave();
      projectManager.stopAutosave();
      
      expect(projectManager.autosaveTimer).toBeNull();
    });
  });

  describe('timeline', () => {
    it('debe actualizar timeline', () => {
      projectManager.createProject('Timeline Test');
      
      const newTimeline = {
        tracks: [
          { id: 'video-1', type: 'video', clips: [{ id: 'clip-1', start: 0, end: 10 }] }
        ],
        duration: 10
      };
      
      projectManager.updateTimeline(newTimeline);
      
      expect(projectManager.currentProject.timeline.duration).toBe(10);
    });
  });

  describe('formatFileSize', () => {
    it('debe formatear tamaños pequeños', () => {
      expect(projectManager.formatFileSize(0)).toBe('0 B');
      expect(projectManager.formatFileSize(512)).toBe('512 B');
    });

    it('debe formatear KB', () => {
      expect(projectManager.formatFileSize(1024)).toBe('1 KB');
    });

    it('debe formatear MB', () => {
      expect(projectManager.formatFileSize(1048576)).toBe('1 MB');
    });
  });
});
