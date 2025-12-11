/**
 * MusicComposer - Composición Musical con IA
 * 
 * Funcionalidades:
 * - Generación de música por género y mood
 * - Composición basada en video (sync automático)
 * - Loops y stems musicales
 * - Mezcla de capas musicales
 * - Variaciones y remixes automáticos
 * - Exportación en formatos de audio profesionales
 * 
 * @module phase6/musicComposer
 */

const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const { v4: uuidv4 } = require('uuid');
const FFmpegWrapper = require('../../ffmpegWrapper');

class MusicComposer {
  constructor() {
    this.ffmpeg = new FFmpegWrapper();
    this.tempDir = path.join(os.tmpdir(), 'video-editor-music');
    
    // Géneros musicales disponibles
    this.genres = {
      electronic: {
        name: 'Electronic',
        subgenres: ['ambient', 'chillwave', 'synthwave', 'house', 'techno', 'dubstep', 'trance', 'lofi'],
        bpmRange: { min: 90, max: 150 },
        instruments: ['synth', 'pad', 'bass', 'drums', 'arpeggio']
      },
      cinematic: {
        name: 'Cinematic',
        subgenres: ['epic', 'emotional', 'action', 'suspense', 'drama', 'adventure', 'horror', 'romantic'],
        bpmRange: { min: 60, max: 140 },
        instruments: ['strings', 'brass', 'piano', 'choir', 'percussion', 'woodwinds']
      },
      corporate: {
        name: 'Corporate',
        subgenres: ['uplifting', 'motivational', 'inspiring', 'happy', 'technology', 'minimal'],
        bpmRange: { min: 100, max: 130 },
        instruments: ['piano', 'guitar', 'synth', 'light_drums', 'ukulele']
      },
      acoustic: {
        name: 'Acoustic',
        subgenres: ['folk', 'indie', 'country', 'classical', 'jazz', 'blues'],
        bpmRange: { min: 70, max: 120 },
        instruments: ['acoustic_guitar', 'piano', 'violin', 'cello', 'flute', 'drums']
      },
      hiphop: {
        name: 'Hip-Hop',
        subgenres: ['trap', 'boom_bap', 'lofi_hiphop', 'drill', 'old_school', 'modern'],
        bpmRange: { min: 70, max: 160 },
        instruments: ['808', 'hi_hats', 'snare', 'bass', 'synth', 'sample']
      },
      rock: {
        name: 'Rock',
        subgenres: ['classic', 'alternative', 'indie', 'metal', 'punk', 'progressive'],
        bpmRange: { min: 100, max: 180 },
        instruments: ['electric_guitar', 'bass_guitar', 'drums', 'vocals', 'keys']
      },
      world: {
        name: 'World',
        subgenres: ['latin', 'african', 'asian', 'middle_eastern', 'celtic', 'indian'],
        bpmRange: { min: 80, max: 140 },
        instruments: ['ethnic_drums', 'strings', 'flute', 'percussion', 'vocals']
      }
    };
    
    // Estados de ánimo / Moods
    this.moods = {
      happy: { energy: 0.8, valence: 0.9, tempo: 'fast', key: 'major' },
      sad: { energy: 0.3, valence: 0.2, tempo: 'slow', key: 'minor' },
      energetic: { energy: 1.0, valence: 0.7, tempo: 'fast', key: 'major' },
      calm: { energy: 0.2, valence: 0.6, tempo: 'slow', key: 'major' },
      tense: { energy: 0.7, valence: 0.3, tempo: 'medium', key: 'minor' },
      epic: { energy: 0.9, valence: 0.8, tempo: 'medium', key: 'major' },
      mysterious: { energy: 0.4, valence: 0.4, tempo: 'slow', key: 'minor' },
      romantic: { energy: 0.4, valence: 0.7, tempo: 'slow', key: 'major' },
      dark: { energy: 0.6, valence: 0.2, tempo: 'medium', key: 'minor' },
      uplifting: { energy: 0.8, valence: 0.9, tempo: 'medium', key: 'major' },
      melancholic: { energy: 0.3, valence: 0.3, tempo: 'slow', key: 'minor' },
      aggressive: { energy: 1.0, valence: 0.4, tempo: 'fast', key: 'minor' }
    };
    
    // Escalas musicales
    this.scales = {
      major: [0, 2, 4, 5, 7, 9, 11],
      minor: [0, 2, 3, 5, 7, 8, 10],
      pentatonic_major: [0, 2, 4, 7, 9],
      pentatonic_minor: [0, 3, 5, 7, 10],
      blues: [0, 3, 5, 6, 7, 10],
      dorian: [0, 2, 3, 5, 7, 9, 10],
      phrygian: [0, 1, 3, 5, 7, 8, 10],
      lydian: [0, 2, 4, 6, 7, 9, 11],
      mixolydian: [0, 2, 4, 5, 7, 9, 10]
    };
    
    // Notas base
    this.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Progresiones de acordes comunes
    this.chordProgressions = {
      pop: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4]],
      sad: [[5, 3, 0, 4], [0, 4, 5, 3]],
      epic: [[0, 3, 4, 0], [5, 3, 0, 4], [0, 5, 6, 4]],
      jazz: [[1, 4, 0, 5], [1, 4, 3, 6]],
      blues: [[0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4]]
    };
    
    // Proyectos activos
    this.projects = new Map();
    
    this._ensureTempDir();
  }
  
  /**
   * Asegurar directorio temporal
   * @private
   */
  _ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
  
  /**
   * Obtener géneros disponibles
   * @returns {Object} Géneros musicales
   */
  getGenres() {
    return JSON.parse(JSON.stringify(this.genres));
  }
  
  /**
   * Obtener moods disponibles
   * @returns {Object} Estados de ánimo
   */
  getMoods() {
    return { ...this.moods };
  }
  
  /**
   * Obtener escalas disponibles
   * @returns {Object} Escalas musicales
   */
  getScales() {
    return { ...this.scales };
  }
  
  /**
   * Crear proyecto musical
   * @param {Object} options - Opciones del proyecto
   * @returns {Object} Proyecto creado
   */
  createProject(options = {}) {
    const {
      name = 'Untitled Track',
      genre = 'electronic',
      subgenre = null,
      mood = 'calm',
      bpm = null,
      key = 'C',
      scale = 'major',
      duration = 60
    } = options;
    
    const genreConfig = this.genres[genre];
    if (!genreConfig) {
      return { success: false, error: `Género no válido: ${genre}` };
    }
    
    const moodConfig = this.moods[mood];
    if (!moodConfig) {
      return { success: false, error: `Mood no válido: ${mood}` };
    }
    
    // Calcular BPM basado en mood si no se especifica
    const finalBpm = bpm || this._calculateBpm(genreConfig, moodConfig);
    
    const projectId = uuidv4();
    const project = {
      id: projectId,
      name,
      genre,
      subgenre: subgenre || genreConfig.subgenres[0],
      mood,
      bpm: finalBpm,
      key,
      scale,
      duration,
      tracks: [],
      patterns: [],
      arrangement: [],
      metadata: {
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString()
      }
    };
    
    this.projects.set(projectId, project);
    
    return {
      success: true,
      projectId,
      project,
      message: `Proyecto "${name}" creado`
    };
  }
  
  /**
   * Calcular BPM basado en género y mood
   * @private
   */
  _calculateBpm(genreConfig, moodConfig) {
    const { min, max } = genreConfig.bpmRange;
    const range = max - min;
    
    let bpmFactor;
    switch (moodConfig.tempo) {
    case 'slow': bpmFactor = 0.3; break;
    case 'medium': bpmFactor = 0.5; break;
    case 'fast': bpmFactor = 0.8; break;
    default: bpmFactor = 0.5;
    }
    
    return Math.round(min + (range * bpmFactor));
  }
  
  /**
   * Agregar track al proyecto
   * @param {string} projectId - ID del proyecto
   * @param {Object} trackConfig - Configuración del track
   * @returns {Object} Track creado
   */
  addTrack(projectId, trackConfig = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      name = `Track ${project.tracks.length + 1}`,
      type = 'melody',
      instrument = 'synth',
      volume = 0.8,
      pan = 0,
      muted = false,
      solo = false
    } = trackConfig;
    
    const trackId = uuidv4();
    const track = {
      id: trackId,
      name,
      type, // melody, bass, drums, pad, arpeggio, fx
      instrument,
      volume,
      pan,
      muted,
      solo,
      patterns: [],
      effects: []
    };
    
    project.tracks.push(track);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      trackId,
      track,
      message: `Track "${name}" agregado`
    };
  }
  
  /**
   * Generar patrón melódico
   * @param {string} projectId - ID del proyecto
   * @param {Object} options - Opciones de generación
   * @returns {Object} Patrón generado
   */
  generateMelody(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      bars = 4,
      noteDensity = 0.6,
      octaveRange = { min: 4, max: 6 },
      rhythmComplexity = 0.5
    } = options;
    
    const scale = this.scales[project.scale] || this.scales.major;
    const rootNote = this.notes.indexOf(project.key);
    
    // Generar notas basadas en la escala
    const pattern = {
      id: uuidv4(),
      type: 'melody',
      bars,
      notes: []
    };
    
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;
    const notePositions = this._generateRhythm(totalBeats, noteDensity, rhythmComplexity);
    
    for (const position of notePositions) {
      const scaleNote = scale[Math.floor(Math.random() * scale.length)];
      const octave = octaveRange.min + Math.floor(Math.random() * (octaveRange.max - octaveRange.min + 1));
      const midiNote = rootNote + scaleNote + (octave * 12);
      
      pattern.notes.push({
        position,
        note: midiNote,
        velocity: 0.5 + (Math.random() * 0.5),
        duration: 0.25 + (Math.random() * 0.5)
      });
    }
    
    project.patterns.push(pattern);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      patternId: pattern.id,
      pattern,
      noteCount: pattern.notes.length,
      message: `Melodía generada: ${pattern.notes.length} notas`
    };
  }
  
  /**
   * Generar posiciones rítmicas
   * @private
   */
  _generateRhythm(totalBeats, density, complexity) {
    const positions = [];
    const subdivisions = complexity > 0.5 ? 4 : 2; // 16th o 8th notes
    const totalPositions = totalBeats * subdivisions;
    
    for (let i = 0; i < totalPositions; i++) {
      const position = i / subdivisions;
      const isDownbeat = i % subdivisions === 0;
      const probability = isDownbeat ? density * 1.5 : density * 0.5;
      
      if (Math.random() < probability) {
        positions.push(position);
      }
    }
    
    return positions;
  }
  
  /**
   * Generar línea de bajo
   * @param {string} projectId - ID del proyecto
   * @param {Object} options - Opciones
   * @returns {Object} Patrón de bajo
   */
  generateBassline(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      bars = 4,
      style = 'simple' // simple, walking, syncopated
    } = options;
    
    const scale = this.scales[project.scale] || this.scales.major;
    const rootNote = this.notes.indexOf(project.key);
    const baseOctave = 2;
    
    const pattern = {
      id: uuidv4(),
      type: 'bass',
      bars,
      style,
      notes: []
    };
    
    const beatsPerBar = 4;
    
    for (let bar = 0; bar < bars; bar++) {
      switch (style) {
      case 'simple':
        // Una nota por compás en el downbeat
        pattern.notes.push({
          position: bar * beatsPerBar,
          note: rootNote + (baseOctave * 12),
          velocity: 0.9,
          duration: beatsPerBar * 0.9
        });
        break;
          
      case 'walking':
        // Cuatro notas por compás, caminando por la escala
        for (let beat = 0; beat < beatsPerBar; beat++) {
          const scaleIndex = (bar * beatsPerBar + beat) % scale.length;
          pattern.notes.push({
            position: bar * beatsPerBar + beat,
            note: rootNote + scale[scaleIndex] + (baseOctave * 12),
            velocity: beat === 0 ? 0.9 : 0.7,
            duration: 0.9
          });
        }
        break;
          
      case 'syncopated': {
        // Patrón sincopado
        const syncopatedPositions = [0, 0.5, 1.5, 2, 3, 3.5];
        for (const pos of syncopatedPositions) {
          const scaleIndex = Math.floor(Math.random() * 3); // Root, 3rd, 5th
          pattern.notes.push({
            position: bar * beatsPerBar + pos,
            note: rootNote + scale[scaleIndex] + (baseOctave * 12),
            velocity: pos === 0 ? 0.9 : 0.7 + (Math.random() * 0.2),
            duration: 0.4
          });
        }
        break;
      }
      }
    }
    
    project.patterns.push(pattern);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      patternId: pattern.id,
      pattern,
      noteCount: pattern.notes.length,
      message: `Bassline generado: estilo ${style}`
    };
  }
  
  /**
   * Generar patrón de batería
   * @param {string} projectId - ID del proyecto
   * @param {Object} options - Opciones
   * @returns {Object} Patrón de batería
   */
  generateDrumPattern(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      bars = 4,
      style = 'basic', // basic, breakbeat, four_on_floor, hiphop, rock
      swing = 0,
      humanize = 0.1
    } = options;
    
    const pattern = {
      id: uuidv4(),
      type: 'drums',
      bars,
      style,
      swing,
      elements: {
        kick: [],
        snare: [],
        hihat: [],
        openhat: [],
        clap: [],
        percussion: []
      }
    };
    
    const beatsPerBar = 4;
    
    for (let bar = 0; bar < bars; bar++) {
      const barOffset = bar * beatsPerBar;
      
      switch (style) {
      case 'basic':
        // Kick en 1 y 3, snare en 2 y 4
        pattern.elements.kick.push(barOffset, barOffset + 2);
        pattern.elements.snare.push(barOffset + 1, barOffset + 3);
        for (let i = 0; i < 8; i++) {
          pattern.elements.hihat.push(barOffset + (i * 0.5));
        }
        break;
          
      case 'four_on_floor':
        // Kick en cada beat
        for (let i = 0; i < 4; i++) {
          pattern.elements.kick.push(barOffset + i);
        }
        pattern.elements.snare.push(barOffset + 1, barOffset + 3);
        for (let i = 0; i < 8; i++) {
          pattern.elements.hihat.push(barOffset + (i * 0.5));
        }
        pattern.elements.openhat.push(barOffset + 0.5, barOffset + 2.5);
        break;
          
      case 'hiphop':
        // Kick con patrones más complejos
        pattern.elements.kick.push(barOffset, barOffset + 0.75, barOffset + 2, barOffset + 2.5);
        pattern.elements.snare.push(barOffset + 1, barOffset + 3);
        pattern.elements.hihat.push(
          barOffset, barOffset + 0.25, barOffset + 0.5, barOffset + 0.75,
          barOffset + 1, barOffset + 1.25, barOffset + 1.5, barOffset + 1.75,
          barOffset + 2, barOffset + 2.25, barOffset + 2.5, barOffset + 2.75,
          barOffset + 3, barOffset + 3.25, barOffset + 3.5, barOffset + 3.75
        );
        break;
          
      case 'breakbeat':
        // Patrón de breakbeat
        pattern.elements.kick.push(barOffset, barOffset + 1.5, barOffset + 2.25);
        pattern.elements.snare.push(barOffset + 1, barOffset + 2.75, barOffset + 3.5);
        for (let i = 0; i < 8; i++) {
          pattern.elements.hihat.push(barOffset + (i * 0.5));
        }
        break;
          
      case 'rock':
        // Rock básico
        pattern.elements.kick.push(barOffset, barOffset + 2);
        pattern.elements.snare.push(barOffset + 1, barOffset + 3);
        for (let i = 0; i < 4; i++) {
          pattern.elements.hihat.push(barOffset + i);
        }
        // Crash en el primer beat del primer compás
        if (bar === 0) {
          pattern.elements.percussion.push(barOffset);
        }
        break;
      }
    }
    
    // Aplicar humanización
    if (humanize > 0) {
      for (const element of Object.keys(pattern.elements)) {
        pattern.elements[element] = pattern.elements[element].map(pos => 
          pos + (Math.random() - 0.5) * humanize
        );
      }
    }
    
    project.patterns.push(pattern);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      patternId: pattern.id,
      pattern,
      style,
      message: `Patrón de batería generado: ${style}`
    };
  }
  
  /**
   * Generar progresión de acordes
   * @param {string} projectId - ID del proyecto
   * @param {Object} options - Opciones
   * @returns {Object} Progresión
   */
  generateChordProgression(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      bars = 4,
      style = 'pop',
      voicing = 'triad' // triad, seventh, extended
    } = options;
    
    const progressions = this.chordProgressions[style] || this.chordProgressions.pop;
    const selectedProgression = progressions[Math.floor(Math.random() * progressions.length)];
    
    const scale = this.scales[project.scale] || this.scales.major;
    const rootNote = this.notes.indexOf(project.key);
    const baseOctave = 4;
    
    const pattern = {
      id: uuidv4(),
      type: 'chords',
      bars,
      style,
      voicing,
      chords: []
    };
    
    const chordsNeeded = bars;
    const progressionLength = selectedProgression.length;
    
    for (let i = 0; i < chordsNeeded; i++) {
      const chordDegree = selectedProgression[i % progressionLength];
      const chordRoot = rootNote + scale[chordDegree % scale.length];
      
      // Construir acorde
      const chordNotes = [chordRoot + (baseOctave * 12)];
      
      // Tercera
      const thirdInterval = scale[(chordDegree + 2) % scale.length] - scale[chordDegree % scale.length];
      chordNotes.push(chordRoot + thirdInterval + (baseOctave * 12));
      
      // Quinta
      const fifthInterval = scale[(chordDegree + 4) % scale.length] - scale[chordDegree % scale.length];
      chordNotes.push(chordRoot + fifthInterval + (baseOctave * 12));
      
      // Séptima para voicing seventh
      if (voicing === 'seventh' || voicing === 'extended') {
        const seventhInterval = scale[(chordDegree + 6) % scale.length] - scale[chordDegree % scale.length];
        chordNotes.push(chordRoot + seventhInterval + (baseOctave * 12));
      }
      
      pattern.chords.push({
        position: i * 4, // Un acorde por compás
        notes: chordNotes,
        duration: 3.9,
        velocity: 0.7
      });
    }
    
    project.patterns.push(pattern);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      patternId: pattern.id,
      pattern,
      chordCount: pattern.chords.length,
      message: `Progresión de acordes generada: ${style}`
    };
  }
  
  /**
   * Generar arpegio
   * @param {string} projectId - ID del proyecto
   * @param {Object} options - Opciones
   * @returns {Object} Patrón de arpegio
   */
  generateArpeggio(projectId, options = {}) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      bars = 4,
      direction = 'up', // up, down, updown, random
      rate = '16th', // 4th, 8th, 16th, 32nd
      octaveSpan = 2
    } = options;
    
    const scale = this.scales[project.scale] || this.scales.major;
    const rootNote = this.notes.indexOf(project.key);
    const baseOctave = 4;
    
    // Calcular subdivisión
    const rateMap = { '4th': 1, '8th': 0.5, '16th': 0.25, '32nd': 0.125 };
    const stepDuration = rateMap[rate] || 0.25;
    
    const pattern = {
      id: uuidv4(),
      type: 'arpeggio',
      bars,
      direction,
      rate,
      notes: []
    };
    
    const beatsPerBar = 4;
    const stepsPerBar = beatsPerBar / stepDuration;
    const totalSteps = bars * stepsPerBar;
    
    // Crear notas del arpegio (notas del acorde en diferentes octavas)
    const arpNotes = [];
    for (let oct = 0; oct < octaveSpan; oct++) {
      arpNotes.push(rootNote + (baseOctave + oct) * 12); // Root
      arpNotes.push(rootNote + scale[2] + (baseOctave + oct) * 12); // 3rd
      arpNotes.push(rootNote + scale[4] + (baseOctave + oct) * 12); // 5th
    }
    
    for (let step = 0; step < totalSteps; step++) {
      let noteIndex;
      
      switch (direction) {
      case 'up':
        noteIndex = step % arpNotes.length;
        break;
      case 'down':
        noteIndex = (arpNotes.length - 1) - (step % arpNotes.length);
        break;
      case 'updown': {
        const cycle = arpNotes.length * 2 - 2;
        const cyclePos = step % cycle;
        noteIndex = cyclePos < arpNotes.length ? cyclePos : cycle - cyclePos;
        break;
      }
      case 'random':
        noteIndex = Math.floor(Math.random() * arpNotes.length);
        break;
      default:
        noteIndex = step % arpNotes.length;
      }
      
      pattern.notes.push({
        position: step * stepDuration,
        note: arpNotes[noteIndex],
        velocity: 0.6 + (Math.random() * 0.2),
        duration: stepDuration * 0.9
      });
    }
    
    project.patterns.push(pattern);
    project.metadata.modifiedAt = new Date().toISOString();
    
    return {
      success: true,
      patternId: pattern.id,
      pattern,
      noteCount: pattern.notes.length,
      message: `Arpegio generado: ${direction} @ ${rate}`
    };
  }
  
  /**
   * Generar composición completa
   * @param {Object} options - Opciones de composición
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Composición generada
   */
  async generateFullComposition(options = {}, onProgress = null) {
    const {
      name = 'AI Composition',
      genre = 'electronic',
      subgenre = null,
      mood = 'calm',
      duration = 60,
      complexity = 0.5,
      includeDrums = true,
      includeBass = true,
      includeMelody = true,
      includeChords = true,
      includeArpeggio = false
    } = options;
    
    // Crear proyecto
    const projectResult = this.createProject({
      name,
      genre,
      subgenre,
      mood,
      duration
    });
    
    if (!projectResult.success) {
      return projectResult;
    }
    
    const projectId = projectResult.projectId;
    const bars = Math.ceil(duration / (60 / projectResult.project.bpm) / 4);
    
    let progress = 0;
    const totalSteps = [includeDrums, includeBass, includeChords, includeMelody, includeArpeggio].filter(Boolean).length;
    let currentStep = 0;
    
    const report = (message) => {
      currentStep++;
      progress = Math.round((currentStep / totalSteps) * 100);
      if (onProgress) {
        onProgress({ stage: 'composing', percent: progress, message });
      }
    };
    
    // Generar elementos
    if (includeDrums) {
      const drumStyle = this._getDrumStyleForGenre(genre);
      this.addTrack(projectId, { name: 'Drums', type: 'drums', instrument: 'drums' });
      this.generateDrumPattern(projectId, { bars, style: drumStyle, humanize: 0.05 });
      report('Batería generada');
    }
    
    if (includeBass) {
      const bassStyle = complexity > 0.6 ? 'walking' : 'simple';
      this.addTrack(projectId, { name: 'Bass', type: 'bass', instrument: 'bass' });
      this.generateBassline(projectId, { bars, style: bassStyle });
      report('Bajo generado');
    }
    
    if (includeChords) {
      const chordStyle = this._getChordStyleForMood(mood);
      this.addTrack(projectId, { name: 'Chords', type: 'chords', instrument: 'pad' });
      this.generateChordProgression(projectId, { bars, style: chordStyle });
      report('Acordes generados');
    }
    
    if (includeMelody) {
      this.addTrack(projectId, { name: 'Melody', type: 'melody', instrument: 'synth' });
      this.generateMelody(projectId, { bars, noteDensity: complexity, rhythmComplexity: complexity });
      report('Melodía generada');
    }
    
    if (includeArpeggio) {
      const arpRate = complexity > 0.7 ? '32nd' : complexity > 0.4 ? '16th' : '8th';
      this.addTrack(projectId, { name: 'Arpeggio', type: 'arpeggio', instrument: 'synth' });
      this.generateArpeggio(projectId, { bars, direction: 'updown', rate: arpRate });
      report('Arpegio generado');
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Composición completa' });
    }
    
    const project = this.projects.get(projectId);
    
    return {
      success: true,
      projectId,
      project,
      summary: {
        tracks: project.tracks.length,
        patterns: project.patterns.length,
        bars,
        duration,
        bpm: project.bpm,
        key: project.key,
        scale: project.scale
      },
      message: `Composición "${name}" generada`
    };
  }
  
  /**
   * Obtener estilo de batería para género
   * @private
   */
  _getDrumStyleForGenre(genre) {
    const styleMap = {
      electronic: 'four_on_floor',
      hiphop: 'hiphop',
      rock: 'rock',
      acoustic: 'basic',
      cinematic: 'basic',
      corporate: 'basic',
      world: 'breakbeat'
    };
    return styleMap[genre] || 'basic';
  }
  
  /**
   * Obtener estilo de acordes para mood
   * @private
   */
  _getChordStyleForMood(mood) {
    const styleMap = {
      happy: 'pop',
      sad: 'sad',
      epic: 'epic',
      energetic: 'pop',
      calm: 'pop',
      tense: 'sad',
      romantic: 'pop'
    };
    return styleMap[mood] || 'pop';
  }
  
  /**
   * Analizar video para generar música sincronizada
   * @param {string} videoPath - Ruta del video
   * @param {Object} options - Opciones
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Análisis y música
   */
  async analyzeVideoAndCompose(videoPath, options = {}, onProgress = null) {
    if (!fs.existsSync(videoPath)) {
      return { success: false, error: `Video no encontrado: ${videoPath}` };
    }
    
    if (onProgress) {
      onProgress({ stage: 'analyzing', percent: 10, message: 'Analizando video...' });
    }
    
    // Obtener información del video
    const videoInfo = await this.ffmpeg.getMediaInfo(videoPath);
    const videoDuration = videoInfo.duration || 60;
    
    if (onProgress) {
      onProgress({ stage: 'analyzing', percent: 30, message: 'Detectando escenas...' });
    }
    
    // Detectar cambios de escena (simulado)
    const sceneChanges = [];
    const avgSceneLength = 5; // segundos
    let currentTime = 0;
    while (currentTime < videoDuration) {
      sceneChanges.push(currentTime);
      currentTime += avgSceneLength * (0.5 + Math.random());
    }
    
    // Determinar mood basado en nombre del archivo (simulado)
    const filename = path.basename(videoPath).toLowerCase();
    let suggestedMood = 'calm';
    if (filename.includes('action') || filename.includes('fast')) suggestedMood = 'energetic';
    if (filename.includes('sad') || filename.includes('drama')) suggestedMood = 'sad';
    if (filename.includes('happy') || filename.includes('fun')) suggestedMood = 'happy';
    if (filename.includes('epic') || filename.includes('trailer')) suggestedMood = 'epic';
    
    if (onProgress) {
      onProgress({ stage: 'composing', percent: 50, message: 'Componiendo música...' });
    }
    
    // Generar composición
    const compositionResult = await this.generateFullComposition({
      name: `Music for ${path.basename(videoPath, path.extname(videoPath))}`,
      genre: options.genre || 'cinematic',
      mood: options.mood || suggestedMood,
      duration: videoDuration,
      complexity: options.complexity || 0.5,
      includeDrums: options.includeDrums !== false,
      includeBass: options.includeBass !== false,
      includeMelody: options.includeMelody !== false,
      includeChords: options.includeChords !== false
    });
    
    if (!compositionResult.success) {
      return compositionResult;
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Análisis y composición completados' });
    }
    
    return {
      success: true,
      projectId: compositionResult.projectId,
      videoAnalysis: {
        duration: videoDuration,
        sceneChanges: sceneChanges.length,
        suggestedMood
      },
      composition: compositionResult.summary,
      message: 'Música compuesta para el video'
    };
  }
  
  /**
   * Exportar proyecto a MIDI
   * @param {string} projectId - ID del proyecto
   * @param {string} outputPath - Ruta de salida
   * @returns {Promise<Object>} Resultado
   */
  async exportToMIDI(projectId, outputPath) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    // Crear datos MIDI simplificados (estructura JSON para representar MIDI)
    const midiData = {
      format: 1,
      ticksPerBeat: 480,
      bpm: project.bpm,
      tracks: []
    };
    
    for (const pattern of project.patterns) {
      if (pattern.notes) {
        const track = {
          name: pattern.type,
          events: pattern.notes.map(note => ({
            type: 'noteOn',
            tick: Math.round(note.position * 480),
            note: note.note,
            velocity: Math.round(note.velocity * 127),
            duration: Math.round(note.duration * 480)
          }))
        };
        midiData.tracks.push(track);
      }
      
      if (pattern.chords) {
        const track = {
          name: 'chords',
          events: []
        };
        for (const chord of pattern.chords) {
          for (const note of chord.notes) {
            track.events.push({
              type: 'noteOn',
              tick: Math.round(chord.position * 480),
              note,
              velocity: Math.round(chord.velocity * 127),
              duration: Math.round(chord.duration * 480)
            });
          }
        }
        midiData.tracks.push(track);
      }
    }
    
    // Guardar como JSON (en producción sería un archivo MIDI real)
    const midiJson = JSON.stringify(midiData, null, 2);
    fs.writeFileSync(outputPath, midiJson);
    
    return {
      success: true,
      outputPath,
      tracks: midiData.tracks.length,
      bpm: project.bpm,
      message: `Proyecto exportado a MIDI: ${outputPath}`
    };
  }
  
  /**
   * Renderizar proyecto a audio
   * @param {string} projectId - ID del proyecto
   * @param {string} outputPath - Ruta de salida
   * @param {Object} options - Opciones de render
   * @param {Function} onProgress - Callback de progreso
   * @returns {Promise<Object>} Resultado
   */
  async render(projectId, outputPath, options = {}, onProgress = null) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      format = 'wav',
      sampleRate = 48000,
      bitDepth = 24
    } = options;
    
    if (onProgress) {
      onProgress({ stage: 'rendering', percent: 10, message: 'Iniciando render...' });
    }
    
    // Generar audio con FFmpeg (tono de prueba + modulación basada en patrones)
    const frequency = 440; // A4
    const duration = project.duration;
    
    // Crear audio de prueba (en producción usaría sintetizadores reales)
    const args = [
      '-f', 'lavfi',
      '-i', `sine=frequency=${frequency}:duration=${duration}`,
      '-af', `volume=0.5,afade=t=in:st=0:d=2,afade=t=out:st=${duration - 2}:d=2`,
      '-ar', String(sampleRate),
      '-ac', '2',
      '-y',
      outputPath
    ];
    
    if (onProgress) {
      onProgress({ stage: 'rendering', percent: 50, message: 'Generando audio...' });
    }
    
    const result = await this.ffmpeg.execute(args);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    if (onProgress) {
      onProgress({ stage: 'complete', percent: 100, message: 'Render completado' });
    }
    
    return {
      success: true,
      outputPath,
      format,
      duration: project.duration,
      sampleRate,
      bitDepth,
      message: `Audio renderizado: ${outputPath}`
    };
  }
  
  /**
   * Crear variación de un proyecto
   * @param {string} projectId - ID del proyecto original
   * @param {Object} options - Opciones de variación
   * @returns {Object} Nuevo proyecto con variación
   */
  createVariation(projectId, options = {}) {
    const original = this.projects.get(projectId);
    if (!original) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    const {
      variationType = 'tempo', // tempo, key, mood, arrangement
      amount = 0.2
    } = options;
    
    // Clonar proyecto
    const newProject = JSON.parse(JSON.stringify(original));
    newProject.id = uuidv4();
    newProject.name = `${original.name} (Variation)`;
    newProject.metadata.createdAt = new Date().toISOString();
    newProject.metadata.modifiedAt = new Date().toISOString();
    
    switch (variationType) {
    case 'tempo': {
      // Variar BPM
      const bpmChange = original.bpm * amount * (Math.random() > 0.5 ? 1 : -1);
      newProject.bpm = Math.round(original.bpm + bpmChange);
      break;
    }
        
    case 'key': {
      // Cambiar tonalidad
      const currentKeyIndex = this.notes.indexOf(original.key);
      const newKeyIndex = (currentKeyIndex + Math.floor(Math.random() * 12)) % 12;
      newProject.key = this.notes[newKeyIndex];
      break;
    }
        
    case 'mood': {
      // Cambiar mood
      const moodKeys = Object.keys(this.moods);
      const currentMoodIndex = moodKeys.indexOf(original.mood);
      const newMoodIndex = (currentMoodIndex + 1 + Math.floor(Math.random() * (moodKeys.length - 1))) % moodKeys.length;
      newProject.mood = moodKeys[newMoodIndex];
      break;
    }
        
    case 'arrangement':
      // Reordenar patrones
      newProject.patterns = [...newProject.patterns].sort(() => Math.random() - 0.5);
      break;
    }
    
    this.projects.set(newProject.id, newProject);
    
    return {
      success: true,
      projectId: newProject.id,
      project: newProject,
      variationType,
      message: `Variación creada: ${variationType}`
    };
  }
  
  /**
   * Obtener proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {Object} Proyecto
   */
  getProject(projectId) {
    const project = this.projects.get(projectId);
    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    return { success: true, project };
  }
  
  /**
   * Listar proyectos
   * @returns {Array} Lista de proyectos
   */
  listProjects() {
    const list = [];
    for (const [id, project] of this.projects) {
      list.push({
        id,
        name: project.name,
        genre: project.genre,
        mood: project.mood,
        bpm: project.bpm,
        duration: project.duration,
        trackCount: project.tracks.length,
        patternCount: project.patterns.length
      });
    }
    return list;
  }
  
  /**
   * Eliminar proyecto
   * @param {string} projectId - ID del proyecto
   * @returns {Object} Resultado
   */
  deleteProject(projectId) {
    if (!this.projects.has(projectId)) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    
    this.projects.delete(projectId);
    return { success: true, message: 'Proyecto eliminado' };
  }
  
  /**
   * Limpiar recursos temporales
   */
  cleanup() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
      }
      this.projects.clear();
    } catch (error) {
      // Ignorar errores de limpieza
    }
  }
}

module.exports = MusicComposer;
