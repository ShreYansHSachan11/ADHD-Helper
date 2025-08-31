// Mock Chrome APIs for testing
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getBytesInUse: vi.fn(),
      QUOTA_BYTES: 5242880, // 5MB
    },
  },
  permissions: {
    contains: vi.fn(),
    request: vi.fn(),
  },
};

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
};
