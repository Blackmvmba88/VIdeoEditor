/**
 * Error Handler Module Tests
 */

const { VideoEditorError, ErrorCodes, ErrorMessages, ErrorHandler } = require('../errorHandler');

describe('VideoEditorError', () => {
  it('should create error with message and code', () => {
    const error = new VideoEditorError('Test error', ErrorCodes.FILE_NOT_FOUND);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
    expect(error.name).toBe('VideoEditorError');
  });

  it('should include timestamp', () => {
    const error = new VideoEditorError('Test', 1000);
    expect(error.timestamp).toBeDefined();
  });

  it('should convert to JSON', () => {
    const error = new VideoEditorError('Test', 1000, { extra: 'data' });
    const json = error.toJSON();

    expect(json.name).toBe('VideoEditorError');
    expect(json.message).toBe('Test');
    expect(json.code).toBe(1000);
    expect(json.details).toEqual({ extra: 'data' });
    expect(json.timestamp).toBeDefined();
  });
});

describe('ErrorCodes', () => {
  it('should have file error codes in 1000 range', () => {
    expect(ErrorCodes.FILE_NOT_FOUND).toBeGreaterThanOrEqual(1000);
    expect(ErrorCodes.FILE_NOT_FOUND).toBeLessThan(2000);
  });

  it('should have FFmpeg error codes in 2000 range', () => {
    expect(ErrorCodes.FFMPEG_NOT_FOUND).toBeGreaterThanOrEqual(2000);
    expect(ErrorCodes.FFMPEG_NOT_FOUND).toBeLessThan(3000);
  });

  it('should have processing error codes in 3000 range', () => {
    expect(ErrorCodes.PROCESSING_FAILED).toBeGreaterThanOrEqual(3000);
    expect(ErrorCodes.PROCESSING_FAILED).toBeLessThan(4000);
  });
});

describe('ErrorMessages', () => {
  it('should have message for FILE_NOT_FOUND', () => {
    expect(ErrorMessages[ErrorCodes.FILE_NOT_FOUND]).toBeDefined();
    expect(typeof ErrorMessages[ErrorCodes.FILE_NOT_FOUND]).toBe('string');
  });

  it('should have message for FFMPEG_NOT_FOUND', () => {
    expect(ErrorMessages[ErrorCodes.FFMPEG_NOT_FOUND]).toBeDefined();
    expect(ErrorMessages[ErrorCodes.FFMPEG_NOT_FOUND]).toContain('FFmpeg');
  });

  it('should have message for UNKNOWN_ERROR', () => {
    expect(ErrorMessages[ErrorCodes.UNKNOWN_ERROR]).toBeDefined();
  });
});

describe('ErrorHandler', () => {
  let handler;

  beforeEach(() => {
    handler = new ErrorHandler();
  });

  describe('createError', () => {
    it('should create VideoEditorError with default message', () => {
      const error = handler.createError(ErrorCodes.FILE_NOT_FOUND);
      expect(error).toBeInstanceOf(VideoEditorError);
      expect(error.code).toBe(ErrorCodes.FILE_NOT_FOUND);
      expect(error.message).toBe(ErrorMessages[ErrorCodes.FILE_NOT_FOUND]);
    });

    it('should create error with custom message', () => {
      const error = handler.createError(ErrorCodes.FILE_NOT_FOUND, 'Custom message');
      expect(error.message).toBe('Custom message');
    });
  });

  describe('handle', () => {
    it('should handle VideoEditorError', () => {
      const original = new VideoEditorError('Test', ErrorCodes.FILE_NOT_FOUND);
      const handled = handler.handle(original);
      expect(handled).toBe(original);
    });

    it('should convert native error to VideoEditorError', () => {
      const nativeError = new Error('Some error');
      const handled = handler.handle(nativeError);
      expect(handled).toBeInstanceOf(VideoEditorError);
    });

    it('should log errors', () => {
      const error = new VideoEditorError('Test', ErrorCodes.FILE_NOT_FOUND);
      handler.handle(error);
      expect(handler.getErrorLog().length).toBe(1);
    });

    it('should call error callback', () => {
      const callback = jest.fn();
      handler.setErrorCallback(callback);

      const error = new VideoEditorError('Test', ErrorCodes.FILE_NOT_FOUND);
      handler.handle(error);

      expect(callback).toHaveBeenCalledWith(error);
    });
  });

  describe('parseError', () => {
    it('should parse ENOENT as FILE_NOT_FOUND', () => {
      const error = new Error('ENOENT: no such file');
      const parsed = handler.parseError(error);
      expect(parsed.code).toBe(ErrorCodes.FILE_NOT_FOUND);
    });

    it('should parse permission denied as FILE_PERMISSION_DENIED', () => {
      const error = new Error('EACCES: permission denied');
      const parsed = handler.parseError(error);
      expect(parsed.code).toBe(ErrorCodes.FILE_PERMISSION_DENIED);
    });

    it('should parse ffmpeg spawn error as FFMPEG_NOT_FOUND', () => {
      const error = new Error('FFmpeg spawn error: not found');
      const parsed = handler.parseError(error);
      expect(parsed.code).toBe(ErrorCodes.FFMPEG_NOT_FOUND);
    });

    it('should parse unknown error as UNKNOWN_ERROR', () => {
      const error = new Error('Something weird happened');
      const parsed = handler.parseError(error);
      expect(parsed.code).toBe(ErrorCodes.UNKNOWN_ERROR);
    });
  });

  describe('getErrorLog', () => {
    it('should return copy of error log', () => {
      const error = new VideoEditorError('Test', 1000);
      handler.handle(error);

      const log = handler.getErrorLog();
      expect(log.length).toBe(1);
      expect(log).not.toBe(handler.errorLog);
    });
  });

  describe('clearErrorLog', () => {
    it('should clear all logged errors', () => {
      handler.handle(new VideoEditorError('Test', 1000));
      handler.handle(new VideoEditorError('Test2', 1001));
      expect(handler.getErrorLog().length).toBe(2);

      handler.clearErrorLog();
      expect(handler.getErrorLog().length).toBe(0);
    });
  });

  describe('getUserMessage', () => {
    it('should return user-friendly message', () => {
      const message = handler.getUserMessage(ErrorCodes.FILE_NOT_FOUND);
      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
    });

    it('should return unknown error message for invalid code', () => {
      const message = handler.getUserMessage(99999);
      expect(message).toBe(ErrorMessages[ErrorCodes.UNKNOWN_ERROR]);
    });
  });

  describe('isRecoverable', () => {
    it('should return false for FFMPEG_NOT_FOUND', () => {
      const error = new VideoEditorError('Test', ErrorCodes.FFMPEG_NOT_FOUND);
      expect(handler.isRecoverable(error)).toBe(false);
    });

    it('should return true for FILE_NOT_FOUND', () => {
      const error = new VideoEditorError('Test', ErrorCodes.FILE_NOT_FOUND);
      expect(handler.isRecoverable(error)).toBe(true);
    });
  });

  describe('getRecoverySuggestions', () => {
    it('should return suggestions for FILE_NOT_FOUND', () => {
      const error = new VideoEditorError('Test', ErrorCodes.FILE_NOT_FOUND);
      const suggestions = handler.getRecoverySuggestions(error);
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should return generic suggestions for unknown errors', () => {
      const error = new VideoEditorError('Test', ErrorCodes.UNKNOWN_ERROR);
      const suggestions = handler.getRecoverySuggestions(error);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
