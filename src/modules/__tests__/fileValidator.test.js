/**
 * File Validator Module Tests
 */

const path = require('path');
const fs = require('fs');
const FileValidator = require('../fileValidator');

describe('FileValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new FileValidator();
  });

  describe('validateFile', () => {
    it('should reject null file path', async () => {
      const result = await validator.validateFile(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid file path provided');
    });

    it('should reject non-string file path', async () => {
      const result = await validator.validateFile(123);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid file path provided');
    });

    it('should reject non-existent file', async () => {
      const result = await validator.validateFile('/nonexistent/file.mp4');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('File not found');
    });

    it('should reject unsupported extension', async () => {
      // Create a temp file with unsupported extension (large enough to pass size check)
      const tempFile = path.join(require('os').tmpdir(), 'test.xyz');
      const content = Buffer.alloc(2048, 'x');
      fs.writeFileSync(tempFile, content);

      try {
        const result = await validator.validateFile(tempFile);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Unsupported file extension'))).toBe(true);
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('validateFiles', () => {
    it('should reject empty array', async () => {
      const result = await validator.validateFiles([]);
      expect(result.allValid).toBe(false);
      expect(result.results[0].errors).toContain('No files provided for validation');
    });

    it('should reject non-array input', async () => {
      const result = await validator.validateFiles(null);
      expect(result.allValid).toBe(false);
    });
  });

  describe('validateOutputPath', () => {
    it('should reject null output path', () => {
      const result = validator.validateOutputPath(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid output path provided');
    });

    it('should reject unsupported output format', () => {
      const result = validator.validateOutputPath('/tmp/output.xyz');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unsupported output format'))).toBe(true);
    });

    it('should accept valid output path', () => {
      const result = validator.validateOutputPath('/tmp/output.mp4');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(validator.formatBytes(0)).toBe('0.00 B');
      expect(validator.formatBytes(1024)).toBe('1.00 KB');
      expect(validator.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(validator.formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('setMaxFileSize', () => {
    it('should update max file size', () => {
      const newSize = 5 * 1024 * 1024 * 1024;
      validator.setMaxFileSize(newSize);
      expect(validator.maxFileSize).toBe(newSize);
    });

    it('should not update with invalid size', () => {
      const original = validator.maxFileSize;
      validator.setMaxFileSize(-1);
      expect(validator.maxFileSize).toBe(original);
    });
  });

  describe('isSafePath', () => {
    it('should return true for path within base', () => {
      const basePath = '/home/user/videos';
      const filePath = '/home/user/videos/clip.mp4';
      expect(validator.isSafePath(filePath, basePath)).toBe(true);
    });

    it('should return false for path traversal', () => {
      const basePath = '/home/user/videos';
      const filePath = '/home/user/videos/../../../etc/passwd';
      expect(validator.isSafePath(filePath, basePath)).toBe(false);
    });

    it('should handle subdirectories correctly', () => {
      const basePath = '/home/user/videos';
      const filePath = '/home/user/videos/subfolder/clip.mp4';
      expect(validator.isSafePath(filePath, basePath)).toBe(true);
    });
  });
});
