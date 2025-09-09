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
  tabs: {
    onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
    onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
    query: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  windows: {
    onFocusChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    getAll: vi.fn(),
    WINDOW_ID_NONE: -1,
  },
  notifications: {
    create: vi.fn(),
    clear: vi.fn(),
    onClicked: { addListener: vi.fn(), removeListener: vi.fn() },
    onButtonClicked: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  runtime: {
    onInstalled: { addListener: vi.fn(), removeListener: vi.fn() },
    onStartup: { addListener: vi.fn(), removeListener: vi.fn() },
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
    onSuspend: { addListener: vi.fn(), removeListener: vi.fn() },
    sendMessage: vi.fn(),
    id: "test-extension-id",
  },
  action: {
    openPopup: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
};

// Mock Web APIs
global.fetch = vi.fn();
global.Audio = vi.fn().mockImplementation((src) => ({
  src,
  loop: false,
  volume: 0.5,
  currentTime: 0,
  duration: 0,
  paused: true,
  play: vi.fn().mockResolvedValue(),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));

global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.ResizeObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
};

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
  log: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};
