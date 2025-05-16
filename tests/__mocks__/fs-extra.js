// Mock implementation of fs-extra for testing
const fs = jest.requireActual('fs-extra');
const path = require('path');

// Track all created files and directories
let mockFs = {};

// Track if we're in mock mode
let useMock = false;

// Helper to reset the mock filesystem
function resetMockFs() {
  mockFs = {};
}

// Helper to enable/disable mocking
function setUseMock(shouldUseMock) {
  useMock = shouldUseMock;
}

// Mock implementations
const mockFsExtra = {
  ...fs,
  
  // Override readFile to use mock filesystem when enabled
  async readFile(filePath, options) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      if (mockFs[normalizedPath] !== undefined) {
        return mockFs[normalizedPath];
      }
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return fs.readFile(filePath, options);
  },
  
  // Override writeFile to use mock filesystem when enabled
  async writeFile(filePath, data, options) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      mockFs[normalizedPath] = data;
      return;
    }
    return fs.writeFile(filePath, data, options);
  },
  
  // Override ensureDir to track directory creation
  async ensureDir(dirPath) {
    if (useMock) {
      const normalizedPath = path.normalize(dirPath);
      mockFs[normalizedPath] = mockFs[normalizedPath] || {};
      return;
    }
    return fs.ensureDir(dirPath);
  },
  
  // Override pathExists to check mock filesystem
  async pathExists(filePath) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      return mockFs[normalizedPath] !== undefined || 
             Object.keys(mockFs).some(key => key.startsWith(normalizedPath + path.sep));
    }
    return fs.pathExists(filePath);
  },
  
  // Override readdir to list mock files
  async readdir(dirPath) {
    if (useMock) {
      const normalizedPath = path.normalize(dirPath);
      const files = [];
      
      Object.keys(mockFs).forEach(filePath => {
        if (filePath.startsWith(normalizedPath + path.sep)) {
          const relativePath = path.relative(normalizedPath, filePath);
          const parts = relativePath.split(path.sep);
          if (parts.length === 1 || (parts[0] && !files.includes(parts[0]))) {
            files.push(parts[0]);
          }
        }
      });
      
      return files;
    }
    return fs.readdir(dirPath);
  },
  
  // Override stat to return mock file stats
  async stat(filePath) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      const isFile = mockFs[normalizedPath] !== undefined;
      const isDir = !isFile && Object.keys(mockFs).some(key => 
        key.startsWith(normalizedPath + path.sep)
      );
      
      if (!isFile && !isDir) {
        const err = new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
        err.code = 'ENOENT';
        throw err;
      }
      
      return {
        isFile: () => isFile,
        isDirectory: () => isDir,
        size: isFile ? (mockFs[normalizedPath]?.length || 0) : 0,
      };
    }
    return fs.stat(filePath);
  },
  
  // Override remove to delete from mock filesystem
  async remove(filePath) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      
      // Remove the file or directory
      delete mockFs[normalizedPath];
      
      // Remove all files in the directory if it's a directory
      if (await this.pathExists(filePath) && (await this.stat(filePath)).isDirectory()) {
        Object.keys(mockFs).forEach(key => {
          if (key.startsWith(normalizedPath + path.sep)) {
            delete mockFs[key];
          }
        });
      }
      
      return;
    }
    return fs.remove(filePath);
  },
  
  // Helper methods for testing
  __reset: resetMockFs,
  __setUseMock: setUseMock,
  __getMockFs: () => ({ ...mockFs }),
  __addMockFile: (filePath, content) => {
    const normalizedPath = path.normalize(filePath);
    mockFs[normalizedPath] = content;
  },
  __addMockDir: (dirPath) => {
    const normalizedPath = path.normalize(dirPath);
    mockFs[normalizedPath] = mockFs[normalizedPath] || {};
  }
};

// Reset mock filesystem before each test
afterEach(() => {
  resetMockFs();
});

module.exports = mockFsExtra;
