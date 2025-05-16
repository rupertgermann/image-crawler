// Mock implementation of puppeteer for testing
const puppeteer = jest.requireActual('puppeteer');

// Mock browser instance
class MockBrowser {
  constructor() {
    this.pages = [];
    this.isConnected = true;
    this.close = jest.fn().mockImplementation(() => {
      this.isConnected = false;
      return Promise.resolve();
    });
    this.newPage = jest.fn().mockImplementation(() => {
      const page = new MockPage();
      this.pages.push(page);
      return Promise.resolve(page);
    });
  }
}

// Mock page instance
class MockPage {
  constructor() {
    this.goto = jest.fn().mockResolvedValue({});
    this.setViewport = jest.fn().mockResolvedValue(undefined);
    this.$$eval = jest.fn().mockResolvedValue([]);
    this.evaluate = jest.fn().mockResolvedValue(undefined);
    this.close = jest.fn().mockResolvedValue(undefined);
    this.url = jest.fn().mockReturnValue('about:blank');
    this.setDefaultNavigationTimeout = jest.fn();
    this.setDefaultTimeout = jest.fn();
  }
}

// Mock puppeteer functions
const mockPuppeteer = {
  ...puppeteer,
  launch: jest.fn().mockImplementation(() => {
    const browser = new MockBrowser();
    return Promise.resolve(browser);
  }),
  
  // Helper methods for testing
  __resetMocks() {
    this.launch.mockClear();
  },
  
  __setMockPages(pages) {
    this.launch.mockImplementationOnce(() => {
      const browser = new MockBrowser();
      browser.pages = pages.map(() => {
        const page = new MockPage();
        browser.pages.push(page);
        return page;
      });
      browser.newPage = jest.fn().mockResolvedValue(browser.pages[0]);
      return Promise.resolve(browser);
    });
  },
  
  __getMockBrowser() {
    const calls = this.launch.mock.calls;
    if (calls.length === 0) return null;
    return calls[calls.length - 1][0];
  }
};

// Reset mocks before each test
afterEach(() => {
  mockPuppeteer.__resetMocks();
});

module.exports = mockPuppeteer;
