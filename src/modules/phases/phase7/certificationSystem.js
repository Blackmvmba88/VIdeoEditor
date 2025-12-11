/**
 * @module CertificationSystem
 * @description Sistema de certificación y logros para BlackMamba Studio
 * Badges, certificados, cursos, gamificación
 * @version 7.2.0
 */

const { v4: uuidv4 } = require('uuid');

class CertificationSystem {
  constructor(options = {}) {
    this.options = {
      xpPerLevel: options.xpPerLevel || 500,
      maxLevel: options.maxLevel || 100,
      requireExamPass: options.requireExamPass !== false,
      passThreshold: options.passThreshold || 70, // %
      ...options
    };
    
    // Usuarios
    this.users = new Map();
    
    // Badges
    this.badges = new Map();
    
    // Certificaciones
    this.certifications = new Map();
    
    // Cursos
    this.courses = new Map();
    
    // Exámenes
    this.exams = new Map();
    this.examAttempts = new Map();
    
    // Inicializar badges y certificaciones
    this._initializeBadges();
    this._initializeCertifications();
    this._initializeCourses();
  }
  
  /**
   * Inicializar badges predefinidos
   * @private
   */
  _initializeBadges() {
    const badgeList = [
      // Logros de aprendizaje
      { id: 'first_steps', name: 'Primeros Pasos', description: 'Completa tu primer tutorial', icon: '👶', category: 'learning', xp: 100 },
      { id: 'editor_novice', name: 'Editor Novato', description: 'Aprende edición básica', icon: '✂️', category: 'learning', xp: 150 },
      { id: 'ai_apprentice', name: 'Aprendiz de IA', description: 'Usa funciones de IA', icon: '🤖', category: 'learning', xp: 200 },
      { id: 'first_export', name: 'Primera Exportación', description: 'Exporta tu primer video', icon: '📤', category: 'learning', xp: 100 },
      { id: 'tutorial_master', name: 'Maestro Tutorial', description: 'Completa 10 tutoriales', icon: '🎓', category: 'learning', xp: 500 },
      
      // Logros de edición
      { id: 'clip_cutter', name: 'Cortador de Clips', description: 'Corta 100 clips', icon: '✂️', category: 'editing', xp: 200 },
      { id: 'timeline_warrior', name: 'Guerrero del Timeline', description: 'Edita 50 proyectos', icon: '⚔️', category: 'editing', xp: 300 },
      { id: 'effect_wizard', name: 'Mago de Efectos', description: 'Aplica 500 efectos', icon: '✨', category: 'editing', xp: 400 },
      { id: 'color_master', name: 'Maestro del Color', description: 'Completa curso de color grading', icon: '🎨', category: 'editing', xp: 500 },
      { id: 'audio_engineer', name: 'Ingeniero de Audio', description: 'Domina las herramientas de audio', icon: '🎧', category: 'editing', xp: 400 },
      
      // Logros de productividad
      { id: 'speed_demon', name: 'Demonio de Velocidad', description: 'Edita un proyecto en menos de 10 minutos', icon: '⚡', category: 'productivity', xp: 250 },
      { id: 'keyboard_ninja', name: 'Ninja del Teclado', description: 'Usa 50 atajos de teclado', icon: '⌨️', category: 'productivity', xp: 200 },
      { id: 'bulk_exporter', name: 'Exportador Masivo', description: 'Exporta 25 videos', icon: '📦', category: 'productivity', xp: 300 },
      
      // Logros sociales
      { id: 'community_member', name: 'Miembro de la Comunidad', description: 'Únete a la comunidad', icon: '👥', category: 'social', xp: 100 },
      { id: 'helper', name: 'Ayudante', description: 'Ayuda a 10 usuarios', icon: '🤝', category: 'social', xp: 300 },
      { id: 'content_creator', name: 'Creador de Contenido', description: 'Comparte 5 proyectos', icon: '🎬', category: 'social', xp: 250 },
      
      // Logros de IA
      { id: 'ai_explorer', name: 'Explorador IA', description: 'Prueba todas las funciones de IA', icon: '🔍', category: 'ai', xp: 400 },
      { id: 'ai_master', name: 'Maestro de IA', description: 'Crea 25 ediciones automáticas', icon: '🧠', category: 'ai', xp: 500 },
      
      // Logros especiales
      { id: 'early_adopter', name: 'Adoptador Temprano', description: 'Usuario de las primeras versiones', icon: '🌟', category: 'special', xp: 500, rare: true },
      { id: 'bug_hunter', name: 'Cazador de Bugs', description: 'Reporta 5 bugs', icon: '🐛', category: 'special', xp: 300 },
      { id: 'plugin_creator', name: 'Creador de Plugins', description: 'Crea tu primer plugin', icon: '🔌', category: 'special', xp: 600, rare: true },
      { id: 'blackmamba_legend', name: 'Leyenda BlackMamba', description: 'Alcanza nivel 50', icon: '🐍', category: 'special', xp: 1000, legendary: true }
    ];
    
    for (const badge of badgeList) {
      this.badges.set(badge.id, {
        ...badge,
        earnedCount: 0, // Cuántos usuarios lo tienen
        createdAt: new Date().toISOString()
      });
    }
  }
  
  /**
   * Inicializar certificaciones
   * @private
   */
  _initializeCertifications() {
    const certList = [
      {
        id: 'cert_basic_editor',
        name: 'BlackMamba Certified Editor - Basic',
        description: 'Certificación en edición básica de video',
        level: 'basic',
        icon: '🥉',
        requirements: {
          badges: ['first_steps', 'editor_novice', 'first_export'],
          courses: ['course_basic_editing'],
          examRequired: true,
          examId: 'exam_basic_editor'
        },
        benefits: [
          'Badge oficial de certificación',
          'Acceso a recursos exclusivos',
          'Perfil destacado en la comunidad'
        ]
      },
      {
        id: 'cert_advanced_editor',
        name: 'BlackMamba Certified Editor - Advanced',
        description: 'Certificación en edición avanzada de video',
        level: 'advanced',
        icon: '🥈',
        requirements: {
          certifications: ['cert_basic_editor'],
          badges: ['effect_wizard', 'color_master', 'audio_engineer'],
          courses: ['course_advanced_editing', 'course_color_grading'],
          examRequired: true,
          examId: 'exam_advanced_editor'
        },
        benefits: [
          'Badge oficial de nivel avanzado',
          'Soporte prioritario',
          'Acceso a beta features'
        ]
      },
      {
        id: 'cert_ai_specialist',
        name: 'BlackMamba AI Specialist',
        description: 'Especialización en herramientas de IA',
        level: 'specialist',
        icon: '🤖',
        requirements: {
          badges: ['ai_apprentice', 'ai_explorer', 'ai_master'],
          courses: ['course_ai_editing'],
          examRequired: true,
          examId: 'exam_ai_specialist'
        },
        benefits: [
          'Badge de especialista en IA',
          'Acceso anticipado a nuevas funciones de IA',
          'Invitación a programa de feedback'
        ]
      },
      {
        id: 'cert_master_editor',
        name: 'BlackMamba Master Editor',
        description: 'Certificación maestra - El nivel más alto',
        level: 'master',
        icon: '🏆',
        requirements: {
          certifications: ['cert_advanced_editor', 'cert_ai_specialist'],
          badges: ['tutorial_master', 'timeline_warrior'],
          minLevel: 30,
          examRequired: true,
          examId: 'exam_master_editor'
        },
        benefits: [
          'Badge de Master Editor',
          'Reconocimiento en Hall of Fame',
          'Acceso a eventos exclusivos',
          'Posibilidad de ser instructor'
        ]
      }
    ];
    
    for (const cert of certList) {
      this.certifications.set(cert.id, {
        ...cert,
        earnedCount: 0,
        createdAt: new Date().toISOString()
      });
    }
  }
  
  /**
   * Inicializar cursos
   * @private
   */
  _initializeCourses() {
    const courseList = [
      {
        id: 'course_basic_editing',
        name: 'Edición de Video Básica',
        description: 'Aprende los fundamentos de la edición de video',
        level: 'beginner',
        duration: 120, // minutos
        modules: [
          { id: 'mod_1', name: 'Introducción a la Interfaz', duration: 15, tutorials: ['getting_started_01'] },
          { id: 'mod_2', name: 'Importar y Organizar Medios', duration: 20, tutorials: [] },
          { id: 'mod_3', name: 'Cortar y Recortar', duration: 25, tutorials: ['basic_editing_01'] },
          { id: 'mod_4', name: 'Transiciones Básicas', duration: 20, tutorials: [] },
          { id: 'mod_5', name: 'Agregar Texto y Títulos', duration: 20, tutorials: [] },
          { id: 'mod_6', name: 'Exportar tu Video', duration: 20, tutorials: ['export_01'] }
        ],
        xpReward: 500,
        badgeReward: 'editor_novice'
      },
      {
        id: 'course_advanced_editing',
        name: 'Edición de Video Avanzada',
        description: 'Técnicas profesionales de edición',
        level: 'intermediate',
        duration: 240,
        prerequisites: ['course_basic_editing'],
        modules: [
          { id: 'mod_1', name: 'Edición Multi-Track', duration: 30, tutorials: [] },
          { id: 'mod_2', name: 'Keyframes y Animación', duration: 40, tutorials: [] },
          { id: 'mod_3', name: 'Efectos Visuales', duration: 40, tutorials: [] },
          { id: 'mod_4', name: 'Composición', duration: 45, tutorials: [] },
          { id: 'mod_5', name: 'Motion Graphics Básico', duration: 45, tutorials: [] },
          { id: 'mod_6', name: 'Proyecto Final', duration: 40, tutorials: [] }
        ],
        xpReward: 1000,
        badgeReward: 'effect_wizard'
      },
      {
        id: 'course_color_grading',
        name: 'Color Grading Profesional',
        description: 'Domina el arte del color grading',
        level: 'intermediate',
        duration: 180,
        prerequisites: ['course_basic_editing'],
        modules: [
          { id: 'mod_1', name: 'Teoría del Color', duration: 25, tutorials: [] },
          { id: 'mod_2', name: 'Corrección de Color', duration: 35, tutorials: [] },
          { id: 'mod_3', name: 'Color Grading Creativo', duration: 40, tutorials: [] },
          { id: 'mod_4', name: 'LUTs y Presets', duration: 30, tutorials: [] },
          { id: 'mod_5', name: 'HDR y Wide Gamut', duration: 25, tutorials: [] },
          { id: 'mod_6', name: 'Proyecto de Color Grading', duration: 25, tutorials: [] }
        ],
        xpReward: 800,
        badgeReward: 'color_master'
      },
      {
        id: 'course_ai_editing',
        name: 'Edición con Inteligencia Artificial',
        description: 'Aprende a usar las herramientas de IA de BlackMamba',
        level: 'intermediate',
        duration: 150,
        modules: [
          { id: 'mod_1', name: 'Introducción a la IA en Video', duration: 20, tutorials: [] },
          { id: 'mod_2', name: 'Auto-Edit', duration: 30, tutorials: ['ai_features_01'] },
          { id: 'mod_3', name: 'Detección de Escenas', duration: 25, tutorials: [] },
          { id: 'mod_4', name: 'Speech-to-Text y Subtítulos', duration: 25, tutorials: [] },
          { id: 'mod_5', name: 'Smart Reframe', duration: 25, tutorials: [] },
          { id: 'mod_6', name: 'Casos de Uso Avanzados', duration: 25, tutorials: [] }
        ],
        xpReward: 700,
        badgeReward: 'ai_master'
      }
    ];
    
    for (const course of courseList) {
      this.courses.set(course.id, {
        ...course,
        enrolledCount: 0,
        completedCount: 0,
        createdAt: new Date().toISOString()
      });
    }
    
    // Inicializar exámenes
    this._initializeExams();
  }
  
  /**
   * Inicializar exámenes
   * @private
   */
  _initializeExams() {
    const examList = [
      {
        id: 'exam_basic_editor',
        name: 'Examen de Certificación Básica',
        certificationId: 'cert_basic_editor',
        timeLimit: 30, // minutos
        passingScore: 70,
        questions: [
          {
            id: 'q1',
            type: 'multiple_choice',
            question: '¿Cuál es el atajo para dividir un clip en el playhead?',
            options: ['C', 'V', 'B', 'X'],
            correctAnswer: 'C'
          },
          {
            id: 'q2',
            type: 'multiple_choice',
            question: '¿Qué formato es mejor para YouTube?',
            options: ['AVI', 'MOV', 'MP4 H.264', 'WMV'],
            correctAnswer: 'MP4 H.264'
          },
          {
            id: 'q3',
            type: 'true_false',
            question: 'El timeline soporta múltiples pistas de video y audio.',
            correctAnswer: true
          },
          // ... más preguntas
        ]
      },
      {
        id: 'exam_advanced_editor',
        name: 'Examen de Certificación Avanzada',
        certificationId: 'cert_advanced_editor',
        timeLimit: 45,
        passingScore: 75,
        questions: []
      },
      {
        id: 'exam_ai_specialist',
        name: 'Examen de Especialista en IA',
        certificationId: 'cert_ai_specialist',
        timeLimit: 40,
        passingScore: 70,
        questions: []
      },
      {
        id: 'exam_master_editor',
        name: 'Examen de Master Editor',
        certificationId: 'cert_master_editor',
        timeLimit: 60,
        passingScore: 80,
        questions: []
      }
    ];
    
    for (const exam of examList) {
      this.exams.set(exam.id, exam);
    }
  }
  
  /**
   * Registrar/obtener usuario
   * @param {string} userId - ID del usuario
   * @returns {Object} Usuario
   */
  async getOrCreateUser(userId) {
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        id: userId,
        xp: 0,
        level: 1,
        badges: [],
        certifications: [],
        courses: {
          enrolled: [],
          completed: [],
          progress: {}
        },
        examHistory: [],
        achievements: [],
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      });
    }
    
    const user = this.users.get(userId);
    user.lastActiveAt = new Date().toISOString();
    
    return {
      success: true,
      user: this._sanitizeUser(user)
    };
  }
  
  /**
   * Otorgar badge a usuario
   * @param {string} userId - ID del usuario
   * @param {string} badgeId - ID del badge
   * @returns {Object} Resultado
   */
  async awardBadge(userId, badgeId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const badge = this.badges.get(badgeId);
    if (!badge) {
      return { success: false, error: 'Badge no encontrado' };
    }
    
    // Verificar si ya lo tiene
    if (user.badges.includes(badgeId)) {
      return { success: false, error: 'El usuario ya tiene este badge' };
    }
    
    // Otorgar badge
    user.badges.push(badgeId);
    badge.earnedCount++;
    
    // Otorgar XP
    user.xp += badge.xp;
    this._updateLevel(user);
    
    // Registrar achievement
    user.achievements.push({
      type: 'badge',
      id: badgeId,
      name: badge.name,
      earnedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      badge: {
        id: badge.id,
        name: badge.name,
        icon: badge.icon,
        xp: badge.xp
      },
      newXP: user.xp,
      newLevel: user.level,
      message: `¡Has obtenido el badge "${badge.name}"!`
    };
  }
  
  /**
   * Inscribirse en curso
   * @param {string} userId - ID del usuario
   * @param {string} courseId - ID del curso
   * @returns {Object} Resultado
   */
  async enrollInCourse(userId, courseId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const course = this.courses.get(courseId);
    if (!course) {
      return { success: false, error: 'Curso no encontrado' };
    }
    
    // Verificar prerrequisitos
    if (course.prerequisites) {
      const unmet = course.prerequisites.filter(
        prereq => !user.courses.completed.includes(prereq)
      );
      if (unmet.length > 0) {
        return {
          success: false,
          error: 'Prerrequisitos no completados',
          unmetPrerequisites: unmet.map(id => this.courses.get(id)?.name)
        };
      }
    }
    
    // Verificar si ya está inscrito
    if (user.courses.enrolled.includes(courseId)) {
      return { success: false, error: 'Ya estás inscrito en este curso' };
    }
    
    // Inscribir
    user.courses.enrolled.push(courseId);
    user.courses.progress[courseId] = {
      startedAt: new Date().toISOString(),
      completedModules: [],
      currentModule: 0,
      percentComplete: 0
    };
    
    course.enrolledCount++;
    
    return {
      success: true,
      courseId,
      courseName: course.name,
      modules: course.modules.length,
      estimatedDuration: course.duration,
      message: `Inscrito en "${course.name}"`
    };
  }
  
  /**
   * Completar módulo de curso
   * @param {string} userId - ID del usuario
   * @param {string} courseId - ID del curso
   * @param {string} moduleId - ID del módulo
   * @returns {Object} Resultado
   */
  async completeModule(userId, courseId, moduleId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const course = this.courses.get(courseId);
    if (!course) {
      return { success: false, error: 'Curso no encontrado' };
    }
    
    if (!user.courses.enrolled.includes(courseId)) {
      return { success: false, error: 'No estás inscrito en este curso' };
    }
    
    const progress = user.courses.progress[courseId];
    if (!progress) {
      return { success: false, error: 'Progreso no encontrado' };
    }
    
    // Verificar si el módulo ya está completado
    if (progress.completedModules.includes(moduleId)) {
      return { success: false, error: 'Módulo ya completado' };
    }
    
    // Completar módulo
    progress.completedModules.push(moduleId);
    progress.currentModule = progress.completedModules.length;
    progress.percentComplete = Math.round(
      (progress.completedModules.length / course.modules.length) * 100
    );
    
    // Verificar si el curso está completo
    if (progress.completedModules.length === course.modules.length) {
      return this._completeCourse(userId, courseId);
    }
    
    return {
      success: true,
      courseId,
      moduleId,
      progress: {
        completedModules: progress.completedModules.length,
        totalModules: course.modules.length,
        percentComplete: progress.percentComplete
      },
      message: 'Módulo completado'
    };
  }
  
  /**
   * Completar curso
   * @private
   */
  async _completeCourse(userId, courseId) {
    const user = this.users.get(userId);
    const course = this.courses.get(courseId);
    
    // Mover a completados
    user.courses.enrolled = user.courses.enrolled.filter(id => id !== courseId);
    user.courses.completed.push(courseId);
    user.courses.progress[courseId].completedAt = new Date().toISOString();
    
    course.completedCount++;
    
    // Otorgar recompensas
    user.xp += course.xpReward;
    this._updateLevel(user);
    
    const rewards = {
      xp: course.xpReward,
      badge: null
    };
    
    if (course.badgeReward) {
      await this.awardBadge(userId, course.badgeReward);
      rewards.badge = this.badges.get(course.badgeReward);
    }
    
    // Registrar achievement
    user.achievements.push({
      type: 'course',
      id: courseId,
      name: course.name,
      completedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      completed: true,
      courseId,
      courseName: course.name,
      rewards,
      message: `¡Has completado el curso "${course.name}"!`
    };
  }
  
  /**
   * Iniciar examen
   * @param {string} userId - ID del usuario
   * @param {string} examId - ID del examen
   * @returns {Object} Examen iniciado
   */
  async startExam(userId, examId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    const exam = this.exams.get(examId);
    if (!exam) {
      return { success: false, error: 'Examen no encontrado' };
    }
    
    // Crear intento
    const attemptId = uuidv4();
    const attempt = {
      id: attemptId,
      examId,
      userId,
      startedAt: new Date().toISOString(),
      timeLimit: exam.timeLimit,
      expiresAt: new Date(Date.now() + exam.timeLimit * 60 * 1000).toISOString(),
      answers: {},
      submitted: false,
      score: null
    };
    
    this.examAttempts.set(attemptId, attempt);
    
    return {
      success: true,
      attemptId,
      exam: {
        id: exam.id,
        name: exam.name,
        timeLimit: exam.timeLimit,
        questionsCount: exam.questions.length,
        passingScore: exam.passingScore
      },
      questions: exam.questions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options
        // No incluir respuesta correcta
      })),
      expiresAt: attempt.expiresAt
    };
  }
  
  /**
   * Enviar respuesta de examen
   * @param {string} attemptId - ID del intento
   * @param {string} questionId - ID de la pregunta
   * @param {any} answer - Respuesta
   * @returns {Object} Resultado
   */
  async submitAnswer(attemptId, questionId, answer) {
    const attempt = this.examAttempts.get(attemptId);
    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' };
    }
    
    if (attempt.submitted) {
      return { success: false, error: 'Examen ya enviado' };
    }
    
    if (new Date() > new Date(attempt.expiresAt)) {
      return { success: false, error: 'Tiempo expirado' };
    }
    
    attempt.answers[questionId] = {
      answer,
      answeredAt: new Date().toISOString()
    };
    
    return {
      success: true,
      questionId,
      saved: true
    };
  }
  
  /**
   * Enviar examen completo
   * @param {string} attemptId - ID del intento
   * @returns {Object} Resultado del examen
   */
  async submitExam(attemptId) {
    const attempt = this.examAttempts.get(attemptId);
    if (!attempt) {
      return { success: false, error: 'Intento no encontrado' };
    }
    
    if (attempt.submitted) {
      return { success: false, error: 'Examen ya enviado' };
    }
    
    const exam = this.exams.get(attempt.examId);
    
    // Calcular puntaje
    let correct = 0;
    const results = [];
    
    for (const question of exam.questions) {
      const userAnswer = attempt.answers[question.id]?.answer;
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) correct++;
      
      results.push({
        questionId: question.id,
        userAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect
      });
    }
    
    const score = Math.round((correct / exam.questions.length) * 100);
    const passed = score >= exam.passingScore;
    
    attempt.submitted = true;
    attempt.submittedAt = new Date().toISOString();
    attempt.score = score;
    attempt.passed = passed;
    attempt.results = results;
    
    // Guardar en historial del usuario
    const user = this.users.get(attempt.userId);
    if (user) {
      user.examHistory.push({
        examId: exam.id,
        attemptId,
        score,
        passed,
        date: new Date().toISOString()
      });
      
      // Si pasó, verificar si puede obtener certificación
      if (passed && exam.certificationId) {
        await this._checkCertificationEligibility(attempt.userId, exam.certificationId);
      }
    }
    
    return {
      success: true,
      score,
      passed,
      passingScore: exam.passingScore,
      correctAnswers: correct,
      totalQuestions: exam.questions.length,
      results,
      message: passed 
        ? '¡Felicitaciones! Has aprobado el examen.' 
        : 'No has alcanzado el puntaje mínimo. Puedes intentarlo de nuevo.'
    };
  }
  
  /**
   * Verificar elegibilidad para certificación
   * @private
   */
  async _checkCertificationEligibility(userId, certificationId) {
    const user = this.users.get(userId);
    const cert = this.certifications.get(certificationId);
    
    if (!user || !cert) return false;
    
    // Verificar si ya la tiene
    if (user.certifications.includes(certificationId)) return false;
    
    const req = cert.requirements;
    
    // Verificar badges
    if (req.badges) {
      const hasBadges = req.badges.every(b => user.badges.includes(b));
      if (!hasBadges) return false;
    }
    
    // Verificar cursos
    if (req.courses) {
      const hasCourses = req.courses.every(c => user.courses.completed.includes(c));
      if (!hasCourses) return false;
    }
    
    // Verificar certificaciones previas
    if (req.certifications) {
      const hasCerts = req.certifications.every(c => user.certifications.includes(c));
      if (!hasCerts) return false;
    }
    
    // Verificar nivel mínimo
    if (req.minLevel && user.level < req.minLevel) return false;
    
    // Verificar examen
    if (req.examRequired) {
      const passedExam = user.examHistory.some(
        e => e.examId === req.examId && e.passed
      );
      if (!passedExam) return false;
    }
    
    // Otorgar certificación
    await this._awardCertification(userId, certificationId);
    return true;
  }
  
  /**
   * Otorgar certificación
   * @private
   */
  async _awardCertification(userId, certificationId) {
    const user = this.users.get(userId);
    const cert = this.certifications.get(certificationId);
    
    user.certifications.push(certificationId);
    cert.earnedCount++;
    
    user.achievements.push({
      type: 'certification',
      id: certificationId,
      name: cert.name,
      earnedAt: new Date().toISOString()
    });
    
    // XP bonus por certificación
    const xpBonus = cert.level === 'master' ? 2000 : 
      cert.level === 'advanced' ? 1000 : 500;
    user.xp += xpBonus;
    this._updateLevel(user);
  }
  
  /**
   * Actualizar nivel del usuario
   * @private
   */
  _updateLevel(user) {
    const newLevel = Math.min(
      Math.floor(user.xp / this.options.xpPerLevel) + 1,
      this.options.maxLevel
    );
    
    if (newLevel > user.level) {
      user.level = newLevel;
      
      // Verificar badges de nivel
      if (newLevel >= 50 && !user.badges.includes('blackmamba_legend')) {
        this.awardBadge(user.id, 'blackmamba_legend');
      }
    }
  }
  
  /**
   * Obtener perfil de certificación del usuario
   * @param {string} userId - ID del usuario
   * @returns {Object} Perfil
   */
  getUserProfile(userId) {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    return {
      success: true,
      profile: this._sanitizeUser(user),
      badges: user.badges.map(id => this.badges.get(id)).filter(Boolean),
      certifications: user.certifications.map(id => this.certifications.get(id)).filter(Boolean),
      recentAchievements: user.achievements.slice(-10).reverse()
    };
  }
  
  /**
   * Listar badges
   * @param {Object} options - Opciones
   * @returns {Object} Lista de badges
   */
  listBadges(options = {}) {
    const { category = null, userId = null } = options;
    
    let badges = [...this.badges.values()];
    
    if (category) {
      badges = badges.filter(b => b.category === category);
    }
    
    // Enriquecer con estado del usuario
    if (userId) {
      const user = this.users.get(userId);
      badges = badges.map(badge => ({
        ...badge,
        earned: user?.badges.includes(badge.id) || false
      }));
    }
    
    return {
      success: true,
      badges,
      total: badges.length,
      categories: ['learning', 'editing', 'productivity', 'social', 'ai', 'special']
    };
  }
  
  /**
   * Listar cursos
   * @param {Object} options - Opciones
   * @returns {Object} Lista de cursos
   */
  listCourses(options = {}) {
    const { level = null, userId = null } = options;
    
    let courses = [...this.courses.values()];
    
    if (level) {
      courses = courses.filter(c => c.level === level);
    }
    
    // Enriquecer con estado del usuario
    if (userId) {
      const user = this.users.get(userId);
      courses = courses.map(course => ({
        id: course.id,
        name: course.name,
        description: course.description,
        level: course.level,
        duration: course.duration,
        modulesCount: course.modules.length,
        xpReward: course.xpReward,
        enrolled: user?.courses.enrolled.includes(course.id) || false,
        completed: user?.courses.completed.includes(course.id) || false,
        progress: user?.courses.progress[course.id]?.percentComplete || 0
      }));
    }
    
    return {
      success: true,
      courses,
      total: courses.length
    };
  }
  
  /**
   * Listar certificaciones
   * @param {Object} options - Opciones
   * @returns {Object} Lista de certificaciones
   */
  listCertifications(options = {}) {
    const { userId = null } = options;
    
    let certifications = [...this.certifications.values()];
    
    // Enriquecer con estado del usuario
    if (userId) {
      const user = this.users.get(userId);
      certifications = certifications.map(cert => ({
        ...cert,
        earned: user?.certifications.includes(cert.id) || false
      }));
    }
    
    return {
      success: true,
      certifications,
      total: certifications.length
    };
  }
  
  /**
   * Sanitizar datos de usuario
   * @private
   */
  _sanitizeUser(user) {
    return {
      id: user.id,
      xp: user.xp,
      level: user.level,
      xpToNextLevel: (user.level * this.options.xpPerLevel) - user.xp,
      badgesCount: user.badges.length,
      certificationsCount: user.certifications.length,
      coursesCompleted: user.courses.completed.length,
      coursesInProgress: user.courses.enrolled.length,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt
    };
  }
  
  /**
   * Limpiar recursos
   */
  cleanup() {
    this.examAttempts.clear();
    // No limpiar usuarios para persistencia
  }
}

module.exports = CertificationSystem;
