// Mock implementation of fs for testing
const fs = jest.requireActual('fs');
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
  readFileSync(filePath, options) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      if (mockFs[normalizedPath] !== undefined) {
        return mockFs[normalizedPath];
      }
      const err = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
      err.code = 'ENOENT';
      throw err;
    }
    return fs.readFileSync(filePath, options);
  },
  
  // Override writeFileSync to use mock filesystem when enabled
  writeFileSync(filePath, data, options) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      mockFs[normalizedPath] = data;
      return;
    }
    return fs.writeFileSync(filePath, data, options);
  },
  
  // Override existsSync to check mock filesystem
  existsSync(filePath) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      return mockFs[normalizedPath] !== undefined || 
             Object.keys(mockFs).some(key => key.startsWith(normalizedPath + path.sep));
    }
    return fs.existsSync(filePath);
  },
  
  // Override mkdirSync to track directory creation
  mkdirSync(dirPath, options) {
    if (useMock) {
      const normalizedPath = path.normalize(dirPath);
      mockFs[normalizedPath] = mockFs[normalizedPath] || {};
      return;
    }
    return fs.mkdirSync(dirPath, options);
  },
  
  // Override readdirSync to list mock files
  readdirSync(dirPath) {
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
    return fs.readdirSync(dirPath);
  },
  
  // Override statSync to return mock file stats
  statSync(filePath) {
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
    return fs.statSync(filePath);
  },
  
  // Override unlinkSync to delete from mock filesystem
  unlinkSync(filePath) {
    if (useMock) {
      const normalizedPath = path.normalize(filePath);
      delete mockFs[normalizedPath];
      return;
    }
    return fs.unlinkSync(filePath);
  },
  
  // Override rmdirSync to remove directories from mock filesystem
  rmdirSync(dirPath) {
    if (useMock) {
      const normalizedPath = path.normalize(dirPath);
      
      // Remove all files in the directory
      Object.keys(mockFs).forEach(key => {
        if (key.startsWith(normalizedPath + path.sep)) {
          delete mockFs[key];
        }
      });
      
      // Remove the directory itself
      delete mockFs[normalizedPath];
      return;
    }
    return fs.rmdirSync(dirPath);
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
