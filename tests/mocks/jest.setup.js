// Set up the Jest environment with mocks for external dependencies

// Import our mock implementation to avoid circular reference issues
const obsidianMock = require('./obsidian-mock');

// Mock the 'obsidian' module with our custom mock implementation
jest.mock('obsidian', () => obsidianMock, { virtual: true });  // 'virtual: true' is needed since the module doesn't exist in the test environment

// Set up global mocks or other Jest configuration here
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock DOM APIs that might not be available in Jest environment
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Jest setup file
require('jest-fetch-mock').enableMocks();

// Set up DOM environment globals
global.MutationObserver = class {
  constructor(callback) {}
  disconnect() {}
  observe(element, options) {}
};

// Mock window methods not in jsdom
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {}
  };
};

// Mock Obsidian-specific interfaces
global.createDiv = () => document.createElement('div');
global.createSpan = () => document.createElement('span');
global.moment = () => ({
  format: () => '2023-01-01'
});

// Add any other global mocks you need for your tests 