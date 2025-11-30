/**
 * Video Editor Pro - Modules Index
 * Central export for all modules
 */

const FFmpegWrapper = require('./ffmpegWrapper');
const VideoProcessor = require('./videoProcessor');
const FormatDetector = require('./formatDetector');
const FileValidator = require('./fileValidator');
const ExportPresets = require('./exportPresets');
const ExportRenderer = require('./exportRenderer');
const ContentAnalyzer = require('./contentAnalyzer');
const AutoEditor = require('./autoEditor');
const { VideoEditorError, ErrorCodes, ErrorMessages, ErrorHandler } = require('./errorHandler');

module.exports = {
  FFmpegWrapper,
  VideoProcessor,
  FormatDetector,
  FileValidator,
  ExportPresets,
  ExportRenderer,
  ContentAnalyzer,
  AutoEditor,
  VideoEditorError,
  ErrorCodes,
  ErrorMessages,
  ErrorHandler
};
