import { jest } from '@jest/globals';
import sharp from 'sharp';
import ImageProcessor from '../../src/utils/image-processor.js';
import { createTestImage, removeDir } from '../utils/test-utils.js';

// Mock sharp
jest.mock('sharp');

// Mock fs-extra
jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(true),
  pathExists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue(Buffer.from('test')),
  writeFile: jest.fn().mockResolvedValue(),
  unlink: jest.fn().mockResolvedValue(),
  remove: jest.fn().mockResolvedValue(),
  stat: jest.fn().mockResolvedValue({ size: 1024 })
}));

describe('ImageProcessor', () => {
  let imageProcessor;
  let testImagePath;
  let testOutputDir;
  
  // Mock sharp instance
  const mockSharp = {
    metadata: jest.fn().mockResolvedValue({
      width: 1000,
      height: 800,
      format: 'jpeg',
      size: 1024
    }),
    resize: jest.fn().mockReturnThis(),
    toFormat: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('processed')),
    toFile: jest.fn().mockResolvedValue({})
  };
  
  beforeAll(async () => {
    // Set up test directories
    testOutputDir = path.join(os.tmpdir(), 'image-crawler-test-output');
    await fs.ensureDir(testOutputDir);
    
    // Create a test image
    testImagePath = await createTestImage(testOutputDir, 'test.jpg', 1000, 800);
  });
  
  afterAll(async () => {
    // Clean up test directories
    await removeDir(testOutputDir);
  });
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset sharp mock
    sharp.mockReturnValue(mockSharp);
    
    // Create a new ImageProcessor instance for each test
    imageProcessor = new ImageProcessor({
      outputDir: testOutputDir,
      minWidth: 800,
      minHeight: 600,
      quality: 85,
      format: 'original',
      skipExisting: false
    });
  });
  
  describe('processImage', () => {
    it('should process an image that meets the minimum dimensions', async () => {
      const result = await imageProcessor.processImage(testImagePath);
      
      expect(sharp).toHaveBeenCalledWith(testImagePath);
      expect(result).toEqual({
        path: expect.any(String),
        width: 1000,
        height: 800,
        size: 1024,
        format: 'jpeg',
        status: 'processed'
      });
    });
    
    it('should skip images that are too small', async () => {
      // Mock metadata for a small image
      mockSharp.metadata.mockResolvedValueOnce({
        width: 500,
        height: 400,
        format: 'jpeg',
        size: 512
      });
      
      const result = await imageProcessor.processImage(testImagePath);
      
      expect(result).toEqual({
        path: testImagePath,
        width: 500,
        height: 400,
        size: 512,
        format: 'jpeg',
        status: 'skipped',
        reason: 'Image too small'
      });
    });
    
    it('should resize the image if resize options are provided', async () => {
      const processorWithResize = new ImageProcessor({
        outputDir: testOutputDir,
        minWidth: 800,
        minHeight: 600,
        resize: {
          width: 800,
          height: 600,
          fit: 'inside'
        },
        quality: 85,
        format: 'original',
        skipExisting: false
      });
      
      await processorWithResize.processImage(testImagePath);
      
      expect(mockSharp.resize).toHaveBeenCalledWith(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      });
    });
    
    it('should convert the image format if specified', async () => {
      const processorWithFormat = new ImageProcessor({
        outputDir: testOutputDir,
        minWidth: 800,
        minHeight: 600,
        quality: 85,
        format: 'webp',
        skipExisting: false
      });
      
      await processorWithFormat.processImage(testImagePath);
      
      expect(mockSharp.toFormat).toHaveBeenCalledWith('webp', {
        quality: 85
      });
    });
    
    it('should skip existing files if skipExisting is true', async () => {
      const processorWithSkip = new ImageProcessor({
        outputDir: testOutputDir,
        minWidth: 800,
        minHeight: 600,
        quality: 85,
        format: 'original',
        skipExisting: true
      });
      
      // Mock that the output file already exists
      fs.pathExists.mockResolvedValueOnce(true);
      
      const result = await processorWithSkip.processImage(testImagePath);
      
      expect(result.status).toBe('skipped');
      expect(result.reason).toBe('File already exists');
      expect(sharp).not.toHaveBeenCalled();
    });
    
    it('should handle image processing errors', async () => {
      const error = new Error('Image processing failed');
      mockSharp.metadata.mockRejectedValueOnce(error);
      
      await expect(imageProcessor.processImage(testImagePath)).rejects.toThrow(error);
    });
  });
  
  describe('processImageBuffer', () => {
    it('should process an image buffer', async () => {
      const buffer = Buffer.from('test image data');
      const result = await imageProcessor.processImageBuffer(buffer, 'test.jpg');
      
      expect(sharp).toHaveBeenCalledWith(buffer);
      expect(result).toEqual(expect.objectContaining({
        path: expect.any(String),
        status: 'processed'
      }));
    });
    
    it('should handle processing errors', async () => {
      const error = new Error('Buffer processing failed');
      mockSharp.metadata.mockRejectedValueOnce(error);
      
      await expect(
        imageProcessor.processImageBuffer(Buffer.from('test'), 'test.jpg')
      ).rejects.toThrow(error);
    });
  });
  
  describe('getOutputPath', () => {
    it('should generate the correct output path', () => {
      const inputPath = '/path/to/image.jpg';
      const outputPath = imageProcessor.getOutputPath(inputPath);
      
      expect(outputPath).toContain(path.join(testOutputDir, 'image.jpg'));
    });
    
    it('should handle different file extensions', () => {
      const inputPath = '/path/to/image.png';
      const outputPath = imageProcessor.getOutputPath(inputPath, 'webp');
      
      expect(outputPath).toContain(path.join(testOutputDir, 'image.webp'));
    });
    
    it('should handle custom output filenames', () => {
      const inputPath = '/path/to/image.jpg';
      const outputPath = imageProcessor.getOutputPath(inputPath, undefined, 'custom-name');
      
      expect(outputPath).toContain(path.join(testOutputDir, 'custom-name.jpg'));
    });
  });
});
