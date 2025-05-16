import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import WebCrawler from '../../src/modes/web-crawler.js';

// Mock puppeteer
jest.mock('puppeteer');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('WebCrawler Integration Tests', () => {
  let testDir;
  let crawler;
  let mockPage;
  let mockBrowser;

  beforeAll(async () => {
    // Create test directory
    testDir = path.join(__dirname, '..', '..', 'test-data', 'web-crawler');
    await fs.ensureDir(testDir);
    
    // Setup mock browser and page
    mockPage = {
      goto: jest.fn(),
      setViewport: jest.fn(),
      $$eval: jest.fn(),
      close: jest.fn(),
    };
    
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(),
    };
    
    // Mock puppeteer
    const puppeteer = await import('puppeteer');
    puppeteer.launch.mockResolvedValue(mockBrowser);
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockPage.$$eval.mockResolvedValue([
      { url: 'http://example.com/image1.jpg', width: 800, height: 600 },
      { url: 'http://example.com/image2.jpg', width: 1024, height: 768 },
    ]);
    
    // Create a new crawler instance for each test
    crawler = new WebCrawler({
      query: 'test query',
      outputDir: path.join(testDir, 'output'),
      maxDownloads: 2,
      minWidth: 800,
      minHeight: 600,
      minFileSize: 0,
      safeSearch: true,
      headless: true
    });
  });

  it('should initialize with default options', () => {
    expect(crawler.options).toEqual(expect.objectContaining({
      query: 'test query',
      maxDownloads: 2,
      minWidth: 800,
      minHeight: 600,
      minFileSize: 0,
      safeSearch: true,
      headless: true
    }));
  });

  it('should search for images and download them', async () => {
    // Mock the download function
    const mockDownload = jest.fn().mockResolvedValue(true);
    crawler.downloadImage = mockDownload;
    
    // Run the crawler
    await crawler.start();
    
    // Verify puppeteer was used correctly
    expect(mockPage.goto).toHaveBeenCalledWith(
      expect.stringContaining('https://www.google.com/search?q=test+query&tbm=isch'),
      expect.any(Object)
    );
    
    // Verify image processing
    expect(mockPage.$$eval).toHaveBeenCalled();
    
    // Verify downloads were attempted
    expect(mockDownload).toHaveBeenCalledTimes(2);
  });

  it('should filter images by size', async () => {
    // Mock image data with different sizes
    mockPage.$$eval.mockResolvedValueOnce([
      { url: 'http://example.com/small.jpg', width: 100, height: 100 },
      { url: 'http://example.com/large.jpg', width: 1000, height: 800 },
    ]);
    
    const mockDownload = jest.fn().mockResolvedValue(true);
    crawler.downloadImage = mockDownload;
    
    await crawler.start();
    
    // Should only download the large image
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledWith(
      'http://example.com/large.jpg',
      expect.any(String)
    );
  });

  it('should respect maxDownloads limit', async () => {
    // Return more images than maxDownloads
    mockPage.$$eval.mockResolvedValueOnce([
      { url: 'http://example.com/image1.jpg', width: 800, height: 600 },
      { url: 'http://example.com/image2.jpg', width: 1024, height: 768 },
      { url: 'http://example.com/image3.jpg', width: 1200, height: 900 },
    ]);
    
    const mockDownload = jest.fn().mockResolvedValue(true);
    crawler.downloadImage = mockDownload;
    
    await crawler.start();
    
    // Should only download up to maxDownloads
    expect(mockDownload).toHaveBeenCalledTimes(2);
  });
});
