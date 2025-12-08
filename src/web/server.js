/**
 * BlackMamba Studio - Web Server
 * Basic Web UI for Video Editing
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Import video processing modules
const { VideoProcessor, FFmpegWrapper } = require('../modules');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize modules
const videoProcessor = new VideoProcessor();
const ffmpeg = new FFmpegWrapper();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting for file operations
const fileOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for upload
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit uploads to 10 per 15 minutes per IP
  message: 'Too many upload requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm|flv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only video files are allowed!'));
  }
});

// Routes

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const ffmpegAvailable = ffmpeg.isExecutableAvailable(ffmpeg.ffmpegPath);
    res.json({
      status: 'ok',
      ffmpeg: ffmpegAvailable,
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

/**
 * Upload video file
 */
app.post('/api/upload', uploadLimiter, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Get video metadata
    const metadata = await ffmpeg.getVideoInfo(req.file.path);

    res.json({
      success: true,
      file: {
        id: path.basename(req.file.path, path.extname(req.file.path)),
        filename: req.file.originalname,
        path: req.file.filename,
        size: req.file.size,
        duration: metadata.duration || 0,
        format: metadata.format || 'unknown'
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload video',
      message: error.message
    });
  }
});

/**
 * Trim video
 */
app.post('/api/trim', fileOperationLimiter, async (req, res) => {
  try {
    const { filename, startTime, endTime } = req.body;

    if (!filename || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const inputPath = path.join(__dirname, 'uploads', filename);
    const outputFilename = `trimmed_${uuidv4()}.mp4`;
    const outputPath = path.join(__dirname, 'uploads', outputFilename);

    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    // Trim video
    await videoProcessor.trimVideo(inputPath, outputPath, startTime, endTime);

    res.json({
      success: true,
      file: {
        filename: outputFilename,
        path: outputFilename
      }
    });
  } catch (error) {
    console.error('Trim error:', error);
    res.status(500).json({
      error: 'Failed to trim video',
      message: error.message
    });
  }
});

/**
 * Join multiple videos
 */
app.post('/api/join', fileOperationLimiter, async (req, res) => {
  try {
    const { clips } = req.body;

    if (!clips || !Array.isArray(clips) || clips.length === 0) {
      return res.status(400).json({ error: 'No clips provided' });
    }

    const inputPaths = clips.map(clip => path.join(__dirname, 'uploads', clip.filename));
    
    // Check all files exist
    for (const inputPath of inputPaths) {
      if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: `File not found: ${path.basename(inputPath)}` });
      }
    }

    const outputFilename = `joined_${uuidv4()}.mp4`;
    const outputPath = path.join(__dirname, 'uploads', outputFilename);

    // Join videos
    await videoProcessor.joinVideos(inputPaths, outputPath);

    res.json({
      success: true,
      file: {
        filename: outputFilename,
        path: outputFilename
      }
    });
  } catch (error) {
    console.error('Join error:', error);
    res.status(500).json({
      error: 'Failed to join videos',
      message: error.message
    });
  }
});

/**
 * Download processed video
 */
app.get('/api/download/:filename', fileOperationLimiter, (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * Get video info
 */
app.get('/api/info/:filename', fileOperationLimiter, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const metadata = await ffmpeg.getVideoInfo(filePath);

    res.json({
      success: true,
      info: metadata
    });
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({
      error: 'Failed to get video info',
      message: error.message
    });
  }
});

/**
 * List uploaded videos
 */
app.get('/api/videos', fileOperationLimiter, (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ videos: [] });
    }

    const files = fs.readdirSync(uploadsDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.avi', '.mov', '.mkv', '.webm'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created);

    res.json({ videos: files });
  } catch (error) {
    console.error('List videos error:', error);
    res.status(500).json({
      error: 'Failed to list videos',
      message: error.message
    });
  }
});

/**
 * Delete video
 */
app.delete('/api/delete/:filename', fileOperationLimiter, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.promises.unlink(filePath);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🐍 BlackMamba Studio - Web UI           ║');
  console.log('║   Basic Video Editing Interface           ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║   Server running on port ${PORT.toString().padEnd(4)}           ║`);
  console.log(`║   Open: http://localhost:${PORT.toString().padEnd(4)}          ║`);
  console.log('╚════════════════════════════════════════════╝');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
