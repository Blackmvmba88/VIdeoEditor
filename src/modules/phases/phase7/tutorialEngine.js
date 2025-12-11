/**
 * @module TutorialEngine
 * @description Motor de tutoriales interactivos para BlackMamba Studio
 * Learn-by-doing, guías paso a paso, tracking de progreso
 * @version 7.2.0
 */

const { v4: uuidv4 } = require('uuid');

class TutorialEngine {
  constructor(options = {}) {
    this.options = {
      autoAdvance: options.autoAdvance || false,
      showHints: options.showHints !== false,
      hintDelay: options.hintDelay || 5000,
      celebrateCompletion: options.celebrateCompletion !== false,
      ...options
    };
    
    // Estado del usuario
    this.userId = null;
    this.userProgress = new Map();
    
    // Tutoriales
    this.tutorials = new Map();
    this.activeTutorial = null;
    this.currentStep = 0;
    
    // Categorías
    this.categories = [
      'getting_started',
      'basic_editing',
      'advanced_editing',
      'effects',
      'audio',
      'color_grading',
      'export',
      'ai_features',
      'live_streaming',
      'collaboration'
    ];
    
    // Inicializar tutoriales predefinidos
    this._initializeTutorials();
    
    // Estadísticas
    this.stats = {
      tutorialsStarted: 0,
      tutorialsCompleted: 0,
      totalTimeSpent: 0,
      stepsCompleted: 0
    };
  }
  
  /**
   * Inicializar tutoriales predefinidos
   * @private
   */
  _initializeTutorials() {
    // Tutorial: Primeros pasos
    this.tutorials.set('getting_started_01', {
      id: 'getting_started_01',
      title: 'Bienvenido a BlackMamba Studio',
      description: 'Aprende los conceptos básicos de la interfaz y tu primer proyecto',
      category: 'getting_started',
      difficulty: 'beginner',
      estimatedTime: 10, // minutos
      prerequisites: [],
      steps: [
        {
          id: 'step_1',
          title: 'Conoce la interfaz',
          description: 'Familiarízate con las áreas principales del editor',
          type: 'info',
          content: {
            text: 'BlackMamba Studio tiene 4 áreas principales: Timeline, Preview, Media Browser y Properties.',
            highlights: ['timeline', 'preview', 'media-browser', 'properties']
          },
          action: null
        },
        {
          id: 'step_2',
          title: 'Importar medios',
          description: 'Aprende a agregar videos a tu proyecto',
          type: 'action',
          content: {
            text: 'Arrastra un archivo de video al Media Browser o haz clic en "Importar".',
            targetElement: '#import-button'
          },
          action: {
            type: 'click',
            target: '#import-button',
            validation: 'file_imported'
          },
          hints: [
            'Puedes arrastrar archivos directamente desde tu explorador',
            'Soportamos más de 25 formatos de video'
          ]
        },
        {
          id: 'step_3',
          title: 'Agregar clip al timeline',
          description: 'Arrastra un clip al timeline para comenzar a editar',
          type: 'action',
          content: {
            text: 'Arrastra el clip importado al timeline.',
            targetElement: '#timeline'
          },
          action: {
            type: 'drag',
            source: '.media-item',
            target: '#timeline',
            validation: 'clip_added'
          },
          hints: [
            'Mantén presionado y arrastra el clip',
            'Suelta sobre el timeline para agregarlo'
          ]
        },
        {
          id: 'step_4',
          title: 'Reproducir preview',
          description: 'Previsualiza tu proyecto',
          type: 'action',
          content: {
            text: 'Presiona la barra espaciadora o el botón Play para ver tu video.',
            targetElement: '#play-button'
          },
          action: {
            type: 'keypress',
            key: 'Space',
            validation: 'playback_started'
          }
        },
        {
          id: 'step_5',
          title: '¡Felicitaciones!',
          description: 'Has completado tu primer tutorial',
          type: 'completion',
          content: {
            text: '¡Excelente! Ya conoces los conceptos básicos. Continúa con el siguiente tutorial para aprender a cortar y editar.',
            reward: {
              type: 'badge',
              id: 'first_steps',
              name: 'Primeros Pasos'
            }
          }
        }
      ],
      reward: {
        xp: 100,
        badge: 'first_steps'
      }
    });
    
    // Tutorial: Edición básica
    this.tutorials.set('basic_editing_01', {
      id: 'basic_editing_01',
      title: 'Cortar y Recortar Clips',
      description: 'Aprende a cortar, dividir y recortar tus videos',
      category: 'basic_editing',
      difficulty: 'beginner',
      estimatedTime: 15,
      prerequisites: ['getting_started_01'],
      steps: [
        {
          id: 'step_1',
          title: 'Seleccionar un clip',
          description: 'Haz clic en un clip para seleccionarlo',
          type: 'action',
          content: {
            text: 'Haz clic en cualquier clip del timeline para seleccionarlo.',
            targetElement: '.timeline-clip'
          },
          action: {
            type: 'click',
            target: '.timeline-clip',
            validation: 'clip_selected'
          }
        },
        {
          id: 'step_2',
          title: 'Dividir clip',
          description: 'Usa la herramienta de corte para dividir el clip',
          type: 'action',
          content: {
            text: 'Posiciona el playhead donde quieras cortar y presiona "C" o usa la herramienta de corte.',
            targetElement: '#cut-tool'
          },
          action: {
            type: 'keypress',
            key: 'c',
            validation: 'clip_split'
          },
          hints: [
            'El playhead es la línea vertical roja',
            'También puedes usar Cmd/Ctrl + X para cortar'
          ]
        },
        {
          id: 'step_3',
          title: 'Recortar inicio',
          description: 'Arrastra el borde izquierdo para recortar el inicio',
          type: 'action',
          content: {
            text: 'Arrastra el borde izquierdo del clip hacia la derecha para recortar el inicio.',
            targetElement: '.clip-handle-left'
          },
          action: {
            type: 'drag',
            target: '.clip-handle-left',
            validation: 'clip_trimmed'
          }
        },
        {
          id: 'step_4',
          title: 'Recortar final',
          description: 'Arrastra el borde derecho para recortar el final',
          type: 'action',
          content: {
            text: 'Arrastra el borde derecho del clip hacia la izquierda.',
            targetElement: '.clip-handle-right'
          },
          action: {
            type: 'drag',
            target: '.clip-handle-right',
            validation: 'clip_trimmed'
          }
        },
        {
          id: 'step_5',
          title: 'Eliminar clip',
          description: 'Selecciona y elimina un clip',
          type: 'action',
          content: {
            text: 'Selecciona un clip y presiona Delete o Backspace para eliminarlo.',
            targetElement: '.timeline-clip'
          },
          action: {
            type: 'keypress',
            key: 'Delete',
            validation: 'clip_deleted'
          }
        },
        {
          id: 'step_6',
          title: '¡Tutorial completado!',
          type: 'completion',
          content: {
            text: '¡Ahora sabes cortar y recortar clips como un profesional!',
            reward: {
              type: 'badge',
              id: 'editor_novice',
              name: 'Editor Novato'
            }
          }
        }
      ],
      reward: {
        xp: 150,
        badge: 'editor_novice'
      }
    });
    
    // Tutorial: AI Features
    this.tutorials.set('ai_features_01', {
      id: 'ai_features_01',
      title: 'Auto-Edit con IA',
      description: 'Deja que la IA edite tu video automáticamente',
      category: 'ai_features',
      difficulty: 'beginner',
      estimatedTime: 8,
      prerequisites: ['basic_editing_01'],
      steps: [
        {
          id: 'step_1',
          title: 'Acceder a Auto-Edit',
          description: 'Abre el panel de IA',
          type: 'action',
          content: {
            text: 'Haz clic en el botón "AI" o "Auto-Edit" en la barra de herramientas.',
            targetElement: '#ai-panel-button'
          },
          action: {
            type: 'click',
            target: '#ai-panel-button',
            validation: 'ai_panel_opened'
          }
        },
        {
          id: 'step_2',
          title: 'Seleccionar estilo',
          description: 'Elige un estilo de edición automática',
          type: 'action',
          content: {
            text: 'Elige entre Highlights, Summary o Action.',
            options: ['highlights', 'summary', 'action']
          },
          action: {
            type: 'select',
            target: '.ai-style-selector',
            validation: 'style_selected'
          }
        },
        {
          id: 'step_3',
          title: 'Iniciar Auto-Edit',
          description: 'Deja que la IA trabaje su magia',
          type: 'action',
          content: {
            text: 'Haz clic en "Generar" y espera mientras la IA edita tu video.',
            targetElement: '#generate-button'
          },
          action: {
            type: 'click',
            target: '#generate-button',
            validation: 'auto_edit_complete'
          }
        },
        {
          id: 'step_4',
          title: '¡Increíble!',
          type: 'completion',
          content: {
            text: '¡La IA ha editado tu video! Puedes ajustar los resultados manualmente.',
            reward: {
              type: 'badge',
              id: 'ai_apprentice',
              name: 'Aprendiz de IA'
            }
          }
        }
      ],
      reward: {
        xp: 200,
        badge: 'ai_apprentice'
      }
    });
    
    // Tutorial: Exportar
    this.tutorials.set('export_01', {
      id: 'export_01',
      title: 'Exportar tu Video',
      description: 'Aprende a exportar tu proyecto finalizado',
      category: 'export',
      difficulty: 'beginner',
      estimatedTime: 5,
      prerequisites: ['getting_started_01'],
      steps: [
        {
          id: 'step_1',
          title: 'Abrir panel de exportación',
          description: 'Accede a las opciones de exportación',
          type: 'action',
          content: {
            text: 'Haz clic en "Exportar" o presiona Cmd/Ctrl + E.',
            targetElement: '#export-button'
          },
          action: {
            type: 'click',
            target: '#export-button',
            validation: 'export_panel_opened'
          }
        },
        {
          id: 'step_2',
          title: 'Seleccionar preset',
          description: 'Elige un preset de exportación',
          type: 'action',
          content: {
            text: 'Selecciona el destino de tu video: YouTube, Instagram, TikTok, etc.',
            options: ['youtube', 'instagram', 'tiktok', 'twitter', 'custom']
          },
          action: {
            type: 'select',
            target: '.preset-selector',
            validation: 'preset_selected'
          }
        },
        {
          id: 'step_3',
          title: 'Iniciar exportación',
          description: 'Exporta tu video',
          type: 'action',
          content: {
            text: 'Haz clic en "Exportar" para iniciar el proceso.',
            targetElement: '#start-export-button'
          },
          action: {
            type: 'click',
            target: '#start-export-button',
            validation: 'export_started'
          }
        },
        {
          id: 'step_4',
          title: '¡Exportación iniciada!',
          type: 'completion',
          content: {
            text: '¡Tu video está siendo exportado! Lo encontrarás en la carpeta seleccionada.',
            reward: {
              type: 'badge',
              id: 'first_export',
              name: 'Primera Exportación'
            }
          }
        }
      ],
      reward: {
        xp: 100,
        badge: 'first_export'
      }
    });
  }
  
  /**
   * Inicializar sesión de usuario
   * @param {string} userId - ID del usuario
   * @returns {Object} Resultado
   */
  async initializeUser(userId) {
    this.userId = userId;
    
    // Cargar progreso existente o crear nuevo
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, {
        completedTutorials: [],
        inProgressTutorials: {},
        totalXP: 0,
        badges: [],
        streakDays: 0,
        lastActiveDate: null
      });
    }
    
    const progress = this.userProgress.get(userId);
    
    return {
      success: true,
      userId,
      progress: {
        completed: progress.completedTutorials.length,
        inProgress: Object.keys(progress.inProgressTutorials).length,
        totalXP: progress.totalXP,
        badges: progress.badges.length
      }
    };
  }
  
  /**
   * Listar tutoriales
   * @param {Object} options - Opciones de filtrado
   * @returns {Object} Lista de tutoriales
   */
  listTutorials(options = {}) {
    const {
      category = null,
      difficulty = null,
      showCompleted = true,
      showLocked = true
    } = options;
    
    const progress = this.userProgress.get(this.userId) || { completedTutorials: [] };
    
    let tutorials = [...this.tutorials.values()];
    
    if (category) {
      tutorials = tutorials.filter(t => t.category === category);
    }
    
    if (difficulty) {
      tutorials = tutorials.filter(t => t.difficulty === difficulty);
    }
    
    // Enriquecer con estado del usuario
    tutorials = tutorials.map(tutorial => {
      const isCompleted = progress.completedTutorials.includes(tutorial.id);
      const isLocked = tutorial.prerequisites.some(
        prereq => !progress.completedTutorials.includes(prereq)
      );
      const inProgress = progress.inProgressTutorials?.[tutorial.id];
      
      return {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        category: tutorial.category,
        difficulty: tutorial.difficulty,
        estimatedTime: tutorial.estimatedTime,
        stepsCount: tutorial.steps.length,
        isCompleted,
        isLocked,
        progress: inProgress ? {
          currentStep: inProgress.currentStep,
          percentComplete: Math.round((inProgress.currentStep / tutorial.steps.length) * 100)
        } : null,
        reward: tutorial.reward
      };
    });
    
    if (!showCompleted) {
      tutorials = tutorials.filter(t => !t.isCompleted);
    }
    
    if (!showLocked) {
      tutorials = tutorials.filter(t => !t.isLocked);
    }
    
    return {
      success: true,
      tutorials,
      total: tutorials.length,
      categories: this.categories
    };
  }
  
  /**
   * Iniciar tutorial
   * @param {string} tutorialId - ID del tutorial
   * @returns {Object} Tutorial iniciado
   */
  async startTutorial(tutorialId) {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      return { success: false, error: 'Tutorial no encontrado' };
    }
    
    const progress = this.userProgress.get(this.userId);
    if (!progress) {
      return { success: false, error: 'Usuario no inicializado' };
    }
    
    // Verificar prerrequisitos
    const unmetPrereqs = tutorial.prerequisites.filter(
      prereq => !progress.completedTutorials.includes(prereq)
    );
    
    if (unmetPrereqs.length > 0) {
      return {
        success: false,
        error: 'Prerrequisitos no completados',
        unmetPrerequisites: unmetPrereqs.map(id => {
          const prereq = this.tutorials.get(id);
          return { id, title: prereq?.title };
        })
      };
    }
    
    this.activeTutorial = tutorial;
    this.currentStep = 0;
    
    // Guardar progreso
    progress.inProgressTutorials[tutorialId] = {
      startedAt: new Date().toISOString(),
      currentStep: 0
    };
    
    this.stats.tutorialsStarted++;
    
    return {
      success: true,
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        stepsCount: tutorial.steps.length
      },
      currentStep: this._enrichStep(tutorial.steps[0], 0, tutorial.steps.length),
      message: `Tutorial "${tutorial.title}" iniciado`
    };
  }
  
  /**
   * Obtener paso actual
   * @returns {Object} Paso actual
   */
  getCurrentStep() {
    if (!this.activeTutorial) {
      return { success: false, error: 'No hay tutorial activo' };
    }
    
    const step = this.activeTutorial.steps[this.currentStep];
    
    return {
      success: true,
      tutorialId: this.activeTutorial.id,
      step: this._enrichStep(step, this.currentStep, this.activeTutorial.steps.length)
    };
  }
  
  /**
   * Completar paso actual
   * @param {Object} validation - Datos de validación
   * @returns {Object} Resultado
   */
  async completeStep(validation = {}) {
    if (!this.activeTutorial) {
      return { success: false, error: 'No hay tutorial activo' };
    }
    
    const currentStepData = this.activeTutorial.steps[this.currentStep];
    
    // Validar acción si es necesario
    if (currentStepData.action && currentStepData.action.validation) {
      if (validation.type !== currentStepData.action.validation) {
        return {
          success: false,
          error: 'Acción no completada correctamente',
          expected: currentStepData.action.validation,
          received: validation.type
        };
      }
    }
    
    this.stats.stepsCompleted++;
    
    // Avanzar al siguiente paso
    this.currentStep++;
    
    const progress = this.userProgress.get(this.userId);
    if (progress) {
      progress.inProgressTutorials[this.activeTutorial.id].currentStep = this.currentStep;
    }
    
    // Verificar si el tutorial está completo
    if (this.currentStep >= this.activeTutorial.steps.length) {
      return this._completeTutorial();
    }
    
    const nextStep = this.activeTutorial.steps[this.currentStep];
    
    return {
      success: true,
      completed: false,
      nextStep: this._enrichStep(nextStep, this.currentStep, this.activeTutorial.steps.length),
      progress: {
        current: this.currentStep + 1,
        total: this.activeTutorial.steps.length,
        percent: Math.round(((this.currentStep + 1) / this.activeTutorial.steps.length) * 100)
      }
    };
  }
  
  /**
   * Completar tutorial
   * @private
   * @returns {Object} Resultado
   */
  async _completeTutorial() {
    const tutorial = this.activeTutorial;
    const progress = this.userProgress.get(this.userId);
    
    if (progress) {
      // Marcar como completado
      if (!progress.completedTutorials.includes(tutorial.id)) {
        progress.completedTutorials.push(tutorial.id);
      }
      
      // Eliminar de en progreso
      delete progress.inProgressTutorials[tutorial.id];
      
      // Otorgar recompensas
      if (tutorial.reward) {
        progress.totalXP += tutorial.reward.xp || 0;
        
        if (tutorial.reward.badge && !progress.badges.includes(tutorial.reward.badge)) {
          progress.badges.push(tutorial.reward.badge);
        }
      }
      
      progress.lastActiveDate = new Date().toISOString();
    }
    
    this.stats.tutorialsCompleted++;
    
    const result = {
      success: true,
      completed: true,
      tutorial: {
        id: tutorial.id,
        title: tutorial.title
      },
      rewards: tutorial.reward,
      message: `¡Tutorial "${tutorial.title}" completado!`
    };
    
    // Limpiar tutorial activo
    this.activeTutorial = null;
    this.currentStep = 0;
    
    return result;
  }
  
  /**
   * Saltar paso (si está permitido)
   * @returns {Object} Resultado
   */
  async skipStep() {
    if (!this.activeTutorial) {
      return { success: false, error: 'No hay tutorial activo' };
    }
    
    const currentStepData = this.activeTutorial.steps[this.currentStep];
    
    // No permitir saltar pasos de acción obligatorios
    if (currentStepData.type === 'action' && currentStepData.action?.required) {
      return { success: false, error: 'Este paso no se puede saltar' };
    }
    
    this.currentStep++;
    
    if (this.currentStep >= this.activeTutorial.steps.length) {
      return this._completeTutorial();
    }
    
    return {
      success: true,
      skipped: true,
      nextStep: this._enrichStep(
        this.activeTutorial.steps[this.currentStep],
        this.currentStep,
        this.activeTutorial.steps.length
      )
    };
  }
  
  /**
   * Obtener hint para paso actual
   * @returns {Object} Hint
   */
  getHint() {
    if (!this.activeTutorial) {
      return { success: false, error: 'No hay tutorial activo' };
    }
    
    const step = this.activeTutorial.steps[this.currentStep];
    
    if (!step.hints || step.hints.length === 0) {
      return { success: false, error: 'No hay hints disponibles' };
    }
    
    // Obtener hint aleatorio
    const hint = step.hints[Math.floor(Math.random() * step.hints.length)];
    
    return {
      success: true,
      hint,
      totalHints: step.hints.length
    };
  }
  
  /**
   * Abandonar tutorial
   * @returns {Object} Resultado
   */
  async abandonTutorial() {
    if (!this.activeTutorial) {
      return { success: false, error: 'No hay tutorial activo' };
    }
    
    const tutorialId = this.activeTutorial.id;
    const tutorialTitle = this.activeTutorial.title;
    
    // Guardar progreso para continuar después
    const progress = this.userProgress.get(this.userId);
    if (progress && progress.inProgressTutorials[tutorialId]) {
      progress.inProgressTutorials[tutorialId].pausedAt = new Date().toISOString();
    }
    
    this.activeTutorial = null;
    this.currentStep = 0;
    
    return {
      success: true,
      tutorialId,
      message: `Tutorial "${tutorialTitle}" pausado. Puedes continuar después.`
    };
  }
  
  /**
   * Continuar tutorial en progreso
   * @param {string} tutorialId - ID del tutorial
   * @returns {Object} Resultado
   */
  async continueTutorial(tutorialId) {
    const progress = this.userProgress.get(this.userId);
    if (!progress || !progress.inProgressTutorials[tutorialId]) {
      return { success: false, error: 'No hay progreso guardado para este tutorial' };
    }
    
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) {
      return { success: false, error: 'Tutorial no encontrado' };
    }
    
    this.activeTutorial = tutorial;
    this.currentStep = progress.inProgressTutorials[tutorialId].currentStep;
    
    return {
      success: true,
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        stepsCount: tutorial.steps.length
      },
      currentStep: this._enrichStep(
        tutorial.steps[this.currentStep],
        this.currentStep,
        tutorial.steps.length
      ),
      message: 'Continuando tutorial'
    };
  }
  
  /**
   * Obtener progreso del usuario
   * @returns {Object} Progreso
   */
  getUserProgress() {
    const progress = this.userProgress.get(this.userId);
    if (!progress) {
      return { success: false, error: 'Usuario no inicializado' };
    }
    
    const totalTutorials = this.tutorials.size;
    const completedCount = progress.completedTutorials.length;
    
    return {
      success: true,
      progress: {
        completed: completedCount,
        total: totalTutorials,
        percentComplete: Math.round((completedCount / totalTutorials) * 100),
        totalXP: progress.totalXP,
        badges: progress.badges,
        badgesCount: progress.badges.length,
        inProgress: Object.keys(progress.inProgressTutorials).length,
        streakDays: progress.streakDays,
        lastActive: progress.lastActiveDate
      }
    };
  }
  
  /**
   * Obtener recomendaciones
   * @returns {Object} Tutoriales recomendados
   */
  getRecommendations() {
    const progress = this.userProgress.get(this.userId) || { completedTutorials: [] };
    
    // Priorizar tutoriales en progreso
    const inProgress = Object.keys(progress.inProgressTutorials || {})
      .map(id => this.tutorials.get(id))
      .filter(Boolean);
    
    // Tutoriales no completados y desbloqueados
    const available = [...this.tutorials.values()]
      .filter(t => !progress.completedTutorials.includes(t.id))
      .filter(t => t.prerequisites.every(p => progress.completedTutorials.includes(p)))
      .filter(t => !progress.inProgressTutorials?.[t.id])
      .slice(0, 3);
    
    return {
      success: true,
      continueProgress: inProgress.map(t => ({
        id: t.id,
        title: t.title,
        progress: progress.inProgressTutorials[t.id]
      })),
      recommended: available.map(t => ({
        id: t.id,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime
      }))
    };
  }
  
  /**
   * Enriquecer paso con información adicional
   * @private
   */
  _enrichStep(step, index, total) {
    return {
      ...step,
      stepNumber: index + 1,
      totalSteps: total,
      isFirst: index === 0,
      isLast: index === total - 1,
      percentComplete: Math.round(((index + 1) / total) * 100)
    };
  }
  
  /**
   * Obtener estadísticas
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      success: true,
      stats: this.stats,
      totalTutorials: this.tutorials.size,
      categories: this.categories.length
    };
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.activeTutorial = null;
    this.currentStep = 0;
    // No limpiar progreso del usuario para persistencia
  }
}

module.exports = TutorialEngine;
