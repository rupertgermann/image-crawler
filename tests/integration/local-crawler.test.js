import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import LocalCrawler from '../../src/modes/local-crawler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('LocalCrawler Integration Tests', () => {
  let testDir;
  let outputDir;
  let crawler;

  beforeAll(async () => {
    // Create test directory structure
    testDir = path.join(__dirname, '..', '..', 'test-data', 'local-crawler');
    outputDir = path.join(testDir, 'output');
    
    // Clean up and create test directories
    await fs.remove(testDir);
    await fs.ensureDir(path.join(testDir, 'subdir'));
    await fs.ensureDir(outputDir);
    
    // Create test files
    await fs.writeFile(path.join(testDir, 'test1.jpg'), 'test');
    await fs.writeFile(path.join(testDir, 'test2.png'), 'test');
    await fs.writeFile(path.join(testDir, 'test3.txt'), 'not an image');
    await fs.writeFile(path.join(testDir, 'subdir', 'test4.jpg'), 'test');
  });

  afterAll(async () => {
    // Clean up test directories
    await fs.remove(testDir);
  });

  beforeEach(() => {
    // Create a new crawler instance for each test
    crawler = new LocalCrawler({
      sourceDir: testDir,
      outputDir,
      fileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      minWidth: 0,
      minHeight: 0,
      minFileSize: 0,
      maxFiles: 1000,
      preserveStructure: true
    });
  });

  it('should find and copy image files', async () => {
    const results = await crawler.start();
    
    // Verify the correct number of images were found
    expect(results.found).toBe(3);
    expect(results.copied).toBe(3);
    
    // Verify files were copied to the output directory
    const outputFiles = await fs.readdir(outputDir);
    expect(outputFiles).toContain('test1.jpg');
    expect(outputFiles).toContain('test2.png');
    
    // Verify subdirectory structure is preserved
    const subdirFiles = await fs.readdir(path.join(outputDir, 'subdir'));
    expect(subdirFiles).toContain('test4.jpg');
  });

  it('should respect file type filters', async () => {
    crawler.options.fileTypes = ['jpg'];
    
    const results = await crawler.start();
    
    // Should only find JPG files
    expect(results.found).toBe(2); // test1.jpg and subdir/test4.jpg
    expect(results.copied).toBe(2);
    
    const outputFiles = await fs.readdir(outputDir);
    expect(outputFiles).toContain('test1.jpg');
    expect(outputFiles).not.toContain('test2.png');
  });

  it('should respect the maxFiles limit', async () => {
    crawler.options.maxFiles = 2;
    
    const results = await crawler.start();
    
    // Should only process 2 files
    expect(results.found).toBe(2);
    expect(results.copied).toBe(2);
  });

  it('should handle non-existent source directory', async () => {
    crawler.options.sourceDir = path.join(testDir, 'nonexistent');
    
    await expect(crawler.start()).rejects.toThrow();
  });
});
