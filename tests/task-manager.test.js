/**
 * Task Manager Component Tests
 * Tests for task input, breakdown display, and local storage functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn()
    }
  },
  runtime: {
    sendMessage: vi.fn(),
    getURL: vi.fn()
  }
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock DOM
global.document = {
  getElementById: vi.fn(),
  createElement: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(),
  addEventListener: vi.fn()
};

global.window = {
  storageManager: null,
  geminiService: null
};

// Import modules after mocking
let TaskManager;
let StorageManager;
let GeminiService;

describe('TaskManager Component', () => {
  let taskManager;
  let mockElements;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock DOM elements
    mockElements = {
      taskNameInput: { value: '', addEventListener: vi.fn(), focus: vi.fn() },
      taskDeadlineInput: { value: '', addEventListener: vi.fn(), focus: vi.fn() },
      getBreakdownBtn: { addEventListener: vi.fn(), classList: { add: vi.fn(), remove: vi.fn() }, disabled: false, textContent: '' },
      taskBreakdown: { style: { display: 'none' }, innerHTML: '', appendChild: vi.fn() },
      breakdownList: { innerHTML: '' },
      taskStatus: { textContent: '', className: '', style: { display: 'none' } },
      taskHistoryContainer: { style: { display: 'none' }, appendChild: vi.fn() }
    };

    // Mock document.getElementById
    global.document.getElementById.mockImplementation((id) => {
      return mockElements[id] || null;
    });

    // Mock document.createElement
    global.document.createElement.mockImplementation((tag) => {
      const element = {
        id: '',
        className: '',
        innerHTML: '',
        textContent: '',
        style: { display: 'block' },
        appendChild: vi.fn(),
        addEventListener: vi.fn(),
        parentNode: { insertBefore: vi.fn() },
        classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn(), toggle: vi.fn() }
      };
      
      // Special handling for div elements used in escapeHtml
      if (tag === 'div') {
        Object.defineProperty(element, 'textContent', {
          set: function(value) {
            this._textContent = value;
            // Simulate HTML escaping
            this.innerHTML = value ? value.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
          },
          get: function() {
            return this._textContent || '';
          }
        });
      }
      
      return element;
    });

    // Mock document.querySelector
    global.document.querySelector.mockImplementation((selector) => {
      if (selector === '.task-input-group') {
        return { parentNode: { insertBefore: vi.fn() } };
      }
      if (selector === '.task-section .section-content') {
        return { appendChild: vi.fn() };
      }
      return null;
    });

    // Mock document.querySelectorAll
    global.document.querySelectorAll.mockReturnValue([]);

    // Mock storage manager
    const mockStorageManager = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true),
      remove: vi.fn().mockResolvedValue(true)
    };
    global.window.storageManager = mockStorageManager;

    // Mock Gemini service
    const mockGeminiService = {
      breakdownTask: vi.fn().mockResolvedValue({
        success: true,
        steps: [
          'Research the task requirements',
          'Create a detailed plan',
          'Implement the solution',
          'Test and validate results'
        ]
      })
    };
    global.window.geminiService = mockGeminiService;

    // Import TaskManager class
    const taskManagerModule = await import('../popup/components/task-manager.js');
    TaskManager = taskManagerModule.default || global.window.TaskManager;

    // Create TaskManager instance
    taskManager = new TaskManager();
    
    // Wait for initialization
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      expect(taskManager.currentTask).toBeNull();
      expect(taskManager.taskHistory).toEqual([]);
      expect(taskManager.STORAGE_KEY).toBe('taskHistory');
    });

    it('should initialize DOM elements', () => {
      expect(global.document.getElementById).toHaveBeenCalledWith('taskNameInput');
      expect(global.document.getElementById).toHaveBeenCalledWith('taskDeadlineInput');
      expect(global.document.getElementById).toHaveBeenCalledWith('getBreakdownBtn');
    });

    it('should set up event listeners', () => {
      expect(mockElements.getBreakdownBtn.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      expect(mockElements.taskNameInput.addEventListener).toHaveBeenCalledWith('keypress', expect.any(Function));
    });
  });

  describe('Task Input Validation', () => {
    it('should show error when task name is empty', async () => {
      mockElements.taskNameInput.value = '';
      mockElements.taskDeadlineInput.value = '2024-12-31T23:59';

      await taskManager.handleGetBreakdown();

      expect(mockElements.taskNameInput.focus).toHaveBeenCalled();
    });

    it('should show error when deadline is empty', async () => {
      mockElements.taskNameInput.value = 'Test task';
      mockElements.taskDeadlineInput.value = '';

      await taskManager.handleGetBreakdown();

      expect(mockElements.taskDeadlineInput.focus).toHaveBeenCalled();
    });

    it('should show error when deadline is in the past', async () => {
      mockElements.taskNameInput.value = 'Test task';
      mockElements.taskDeadlineInput.value = '2020-01-01T00:00';

      await taskManager.handleGetBreakdown();

      expect(mockElements.taskDeadlineInput.focus).toHaveBeenCalled();
    });

    it('should accept valid inputs', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      mockElements.taskNameInput.value = 'Test task';
      mockElements.taskDeadlineInput.value = futureDate.toISOString().slice(0, 16);

      await taskManager.handleGetBreakdown();

      expect(global.window.geminiService.breakdownTask).toHaveBeenCalledWith(
        'Test task',
        futureDate.toISOString().slice(0, 16)
      );
    });
  });

  describe('Task Breakdown', () => {
    beforeEach(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      mockElements.taskNameInput.value = 'Test task';
      mockElements.taskDeadlineInput.value = futureDate.toISOString().slice(0, 16);
    });

    it('should handle successful AI breakdown', async () => {
      const mockSteps = [
        'Step 1: Research',
        'Step 2: Plan',
        'Step 3: Execute'
      ];

      global.window.geminiService.breakdownTask.mockResolvedValue({
        success: true,
        steps: mockSteps
      });

      await taskManager.handleGetBreakdown();

      expect(taskManager.currentTask).toBeTruthy();
      expect(taskManager.currentTask.breakdown).toEqual(mockSteps);
      expect(taskManager.currentTask.isPlaceholder).toBe(false);
    });

    it('should handle AI service failure with placeholder', async () => {
      global.window.geminiService.breakdownTask.mockResolvedValue({
        success: false,
        error: 'API key not configured',
        placeholder: {
          steps: ['Generic step 1', 'Generic step 2']
        }
      });

      await taskManager.handleGetBreakdown();

      expect(taskManager.currentTask).toBeTruthy();
      expect(taskManager.currentTask.isPlaceholder).toBe(true);
      expect(taskManager.currentTask.breakdown).toEqual(['Generic step 1', 'Generic step 2']);
    });

    it('should handle complete service failure', async () => {
      global.window.geminiService.breakdownTask.mockRejectedValue(new Error('Network error'));

      await taskManager.handleGetBreakdown();

      expect(taskManager.currentTask).toBeTruthy();
      expect(taskManager.currentTask.isPlaceholder).toBe(true);
    });

    it('should set loading state during breakdown', async () => {
      let resolveBreakdown;
      const breakdownPromise = new Promise(resolve => {
        resolveBreakdown = resolve;
      });

      global.window.geminiService.breakdownTask.mockReturnValue(breakdownPromise);

      const breakdownCall = taskManager.handleGetBreakdown();

      // Check loading state is set
      expect(mockElements.getBreakdownBtn.classList.add).toHaveBeenCalledWith('loading');
      expect(mockElements.getBreakdownBtn.disabled).toBe(true);

      // Resolve the breakdown
      resolveBreakdown({
        success: true,
        steps: ['Test step']
      });

      await breakdownCall;

      // Check loading state is cleared
      expect(mockElements.getBreakdownBtn.classList.remove).toHaveBeenCalledWith('loading');
    });
  });

  describe('Task History Management', () => {
    it('should save task to history', async () => {
      const testTask = {
        id: 'test-id',
        name: 'Test task',
        deadline: '2024-12-31T23:59',
        breakdown: ['Step 1', 'Step 2'],
        createdAt: new Date().toISOString()
      };

      await taskManager.saveTaskToHistory(testTask);

      expect(global.window.storageManager.set).toHaveBeenCalledWith(
        'taskHistory',
        expect.arrayContaining([testTask])
      );
    });

    it('should load task history from storage', async () => {
      const mockHistory = [
        {
          id: 'task1',
          name: 'Task 1',
          createdAt: '2024-01-01T00:00:00.000Z'
        },
        {
          id: 'task2',
          name: 'Task 2',
          createdAt: '2024-01-02T00:00:00.000Z'
        }
      ];

      global.window.storageManager.get.mockResolvedValue(mockHistory);

      await taskManager.loadTaskHistory();

      expect(taskManager.taskHistory).toEqual(mockHistory);
    });

    it('should limit history to 20 items', async () => {
      // Create 25 tasks
      const manyTasks = Array.from({ length: 25 }, (_, i) => ({
        id: `task${i}`,
        name: `Task ${i}`,
        createdAt: new Date().toISOString()
      }));

      taskManager.taskHistory = manyTasks;
      await taskManager.saveTaskHistory();

      const savedHistory = global.window.storageManager.set.mock.calls[0][1];
      expect(savedHistory).toHaveLength(20);
    });

    it('should delete task from history', async () => {
      taskManager.taskHistory = [
        { id: 'task1', name: 'Task 1' },
        { id: 'task2', name: 'Task 2' },
        { id: 'task3', name: 'Task 3' }
      ];

      await taskManager.deleteTaskFromHistory('task2');

      expect(taskManager.taskHistory).toHaveLength(2);
      expect(taskManager.taskHistory.find(t => t.id === 'task2')).toBeUndefined();
    });
  });

  describe('Step Completion', () => {
    beforeEach(() => {
      taskManager.currentTask = {
        id: 'test-task',
        name: 'Test Task',
        breakdown: ['Step 1', 'Step 2', 'Step 3'],
        completedSteps: []
      };
    });

    it('should toggle step completion', () => {
      const mockStepElement = {
        classList: {
          contains: vi.fn().mockReturnValue(false),
          toggle: vi.fn()
        },
        closest: vi.fn().mockReturnThis()
      };

      global.document.querySelector.mockReturnValue(mockStepElement);

      taskManager.toggleStepCompletion(0);

      expect(mockStepElement.classList.toggle).toHaveBeenCalledWith('completed');
    });

    it('should track completed steps', () => {
      const mockStepElement = {
        classList: {
          contains: vi.fn().mockReturnValue(true),
          toggle: vi.fn()
        },
        closest: vi.fn().mockReturnThis()
      };

      global.document.querySelector.mockReturnValue(mockStepElement);

      taskManager.toggleStepCompletion(1);

      expect(taskManager.currentTask.completedSteps).toContain(1);
    });
  });

  describe('Utility Functions', () => {
    it('should generate unique task IDs', () => {
      const id1 = taskManager.generateTaskId();
      const id2 = taskManager.generateTaskId();

      expect(id1).toMatch(/^task_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^task_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should format deadlines correctly', () => {
      const deadline = '2024-12-31T23:59';
      const formatted = taskManager.formatDeadline(deadline);

      expect(formatted).toContain('12/31/2024');
      expect(formatted).toContain('11:59 PM');
    });

    it('should format relative dates', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(taskManager.formatRelativeDate(today.toISOString())).toBe('Today');
      expect(taskManager.formatRelativeDate(yesterday.toISOString())).toBe('Yesterday');
    });

    it('should escape HTML to prevent XSS', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const escaped = taskManager.escapeHtml(maliciousInput);

      expect(escaped).not.toContain('<script>');
      expect(escaped).toContain('&lt;script&gt;');
    });

    it('should provide generic breakdown when needed', () => {
      const breakdown = taskManager.getGenericBreakdown('Test task');

      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toContain('Research');
    });
  });

  describe('Draft Management', () => {
    it('should save task draft to localStorage', () => {
      mockElements.taskNameInput.value = 'Draft task';
      mockElements.taskDeadlineInput.value = '2024-12-31T23:59';

      taskManager.saveCurrentTaskDraft();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'taskDraft',
        JSON.stringify({
          taskName: 'Draft task',
          deadline: '2024-12-31T23:59'
        })
      );
    });

    it('should load task draft from localStorage', () => {
      const draftData = {
        taskName: 'Loaded task',
        deadline: '2024-12-31T23:59'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(draftData));

      taskManager.loadTaskDraft();

      expect(mockElements.taskNameInput.value).toBe('Loaded task');
      expect(mockElements.taskDeadlineInput.value).toBe('2024-12-31T23:59');
    });

    it('should clear task draft', () => {
      taskManager.clearTaskDraft();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('taskDraft');
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      global.window.storageManager.get.mockRejectedValue(new Error('Storage error'));

      await taskManager.loadTaskHistory();

      expect(taskManager.taskHistory).toEqual([]);
    });

    it('should handle missing DOM elements', () => {
      global.document.getElementById.mockReturnValue(null);

      const newTaskManager = new TaskManager();

      // Should not throw errors
      expect(() => newTaskManager.initializeElements()).not.toThrow();
    });

    it('should handle missing services', async () => {
      // Set the service to null on the taskManager instance
      taskManager.geminiService = null;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      
      mockElements.taskNameInput.value = 'Test task';
      mockElements.taskDeadlineInput.value = futureDate.toISOString().slice(0, 16);

      await taskManager.handleGetBreakdown();

      expect(taskManager.currentTask.isPlaceholder).toBe(true);
    });
  });
});