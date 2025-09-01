/**
 * Gemini Service Tests
 * Tests for API integration with mock responses
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
      getBytesInUse: vi.fn(),
      QUOTA_BYTES: 5242880
    }
  }
};

// Mock fetch
global.fetch = vi.fn();

// Mock constants
global.CONSTANTS = {
  API: {
    GEMINI: {
      BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      MAX_RETRIES: 3,
      TIMEOUT_MS: 10000,
      RATE_LIMIT_DELAY_MS: 1000
    }
  },
  STORAGE_KEYS: {
    API_KEYS: 'apiKeys'
  },
  TASKS: {
    MAX_TASK_NAME_LENGTH: 200,
    MAX_BREAKDOWN_ITEMS: 20
  }
};

// Import modules
import StorageManager from '../services/storage-manager.js';
import GeminiService from '../services/gemini-service.js';

describe('GeminiService', () => {
  let geminiService;
  let mockStorageManager;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock storage manager
    mockStorageManager = {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    };

    // Create service instance
    geminiService = new GeminiService();
    geminiService.storageManager = mockStorageManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Key Management', () => {
    it('should load API key from storage successfully', async () => {
      const mockApiKeys = { gemini: 'test-api-key-123' };
      mockStorageManager.get.mockResolvedValue(mockApiKeys);

      const result = await geminiService.loadApiKey();

      expect(result).toBe(true);
      expect(geminiService.apiKey).toBe('test-api-key-123');
      expect(mockStorageManager.get).toHaveBeenCalledWith('apiKeys');
    });

    it('should return false when no API key exists', async () => {
      mockStorageManager.get.mockResolvedValue(null);

      const result = await geminiService.loadApiKey();

      expect(result).toBe(false);
      expect(geminiService.apiKey).toBeNull();
    });

    it('should save API key to storage successfully', async () => {
      const existingKeys = { calendar: 'existing-key' };
      mockStorageManager.get.mockResolvedValue(existingKeys);
      mockStorageManager.set.mockResolvedValue(true);

      const result = await geminiService.saveApiKey('new-api-key');

      expect(result).toBe(true);
      expect(geminiService.apiKey).toBe('new-api-key');
      expect(mockStorageManager.set).toHaveBeenCalledWith('apiKeys', {
        calendar: 'existing-key',
        gemini: 'new-api-key'
      });
    });

    it('should reject invalid API keys', async () => {
      const result1 = await geminiService.saveApiKey('');
      const result2 = await geminiService.saveApiKey(null);
      const result3 = await geminiService.saveApiKey('   ');

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
      expect(mockStorageManager.set).not.toHaveBeenCalled();
    });

    it('should check if API is configured correctly', () => {
      geminiService.apiKey = null;
      expect(geminiService.isConfigured()).toBe(false);

      geminiService.apiKey = '';
      expect(geminiService.isConfigured()).toBe(false);

      geminiService.apiKey = 'valid-key';
      expect(geminiService.isConfigured()).toBe(true);
    });

    it('should clear API key successfully', async () => {
      const existingKeys = { gemini: 'test-key', calendar: 'other-key' };
      mockStorageManager.get.mockResolvedValue(existingKeys);
      mockStorageManager.set.mockResolvedValue(true);

      geminiService.apiKey = 'test-key';
      const result = await geminiService.clearApiKey();

      expect(result).toBe(true);
      expect(geminiService.apiKey).toBeNull();
      expect(mockStorageManager.set).toHaveBeenCalledWith('apiKeys', {
        calendar: 'other-key'
      });
    });
  });

  describe('Request Formatting', () => {
    it('should format task breakdown request correctly', () => {
      const taskName = 'Build a website';
      const deadline = '2024-12-31';

      const request = geminiService.formatTaskBreakdownRequest(taskName, deadline);

      expect(request).toHaveProperty('contents');
      expect(request.contents[0].parts[0].text).toContain(taskName);
      expect(request.contents[0].parts[0].text).toContain(deadline);
      expect(request).toHaveProperty('generationConfig');
      expect(request).toHaveProperty('safetySettings');
      expect(request.generationConfig.maxOutputTokens).toBe(1024);
    });

    it('should include proper safety settings', () => {
      const request = geminiService.formatTaskBreakdownRequest('Test task', 'Tomorrow');

      expect(request.safetySettings).toHaveLength(4);
      expect(request.safetySettings[0].category).toBe('HARM_CATEGORY_HARASSMENT');
      expect(request.safetySettings[0].threshold).toBe('BLOCK_MEDIUM_AND_ABOVE');
    });
  });

  describe('Response Parsing', () => {
    it('should parse valid API response correctly', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `1. Research the requirements and scope
2. Create wireframes and mockups
3. Set up development environment
4. Build the frontend components
5. Implement backend functionality
6. Test and debug the application
7. Deploy to production`
            }]
          }
        }]
      };

      const steps = geminiService.parseTaskBreakdownResponse(mockResponse);

      expect(steps).toHaveLength(7);
      expect(steps[0]).toBe('Research the requirements and scope');
      expect(steps[1]).toBe('Create wireframes and mockups');
      expect(steps[6]).toBe('Deploy to production');
    });

    it('should handle different numbering formats', () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: `1) First step with parenthesis
2. Second step with period
3) Third step mixed format`
            }]
          }
        }]
      };

      const steps = geminiService.parseTaskBreakdownResponse(mockResponse);

      expect(steps).toHaveLength(3);
      expect(steps[0]).toBe('First step with parenthesis');
      expect(steps[1]).toBe('Second step with period');
      expect(steps[2]).toBe('Third step mixed format');
    });

    it('should limit steps to maximum allowed', () => {
      const longText = Array.from({ length: 25 }, (_, i) => `${i + 1}. Step ${i + 1}`).join('\n');
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: longText }]
          }
        }]
      };

      const steps = geminiService.parseTaskBreakdownResponse(mockResponse);

      expect(steps).toHaveLength(20); // MAX_BREAKDOWN_ITEMS
    });

    it('should throw error for invalid response format', () => {
      const invalidResponses = [
        null,
        {},
        { candidates: [] },
        { candidates: [{}] },
        { candidates: [{ content: {} }] },
        { candidates: [{ content: { parts: [] } }] }
      ];

      invalidResponses.forEach(response => {
        expect(() => geminiService.parseTaskBreakdownResponse(response))
          .toThrow();
      });
    });
  });

  describe('API Requests', () => {
    beforeEach(() => {
      geminiService.apiKey = 'test-api-key';
    });

    it('should make successful API request', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '1. First step\n2. Second step'
            }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const payload = { test: 'data' };
      const result = await geminiService.makeApiRequest(payload);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('test-api-key'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      );
    });

    it('should handle 401 unauthorized error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"error": {"message": "Invalid API key"}}')
      });

      await expect(geminiService.makeApiRequest({}))
        .rejects.toThrow('Invalid API key. Please check your Gemini API key configuration.');
    });

    it('should retry on 429 rate limit error', async () => {
      // First call returns 429, second call succeeds
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          text: () => Promise.resolve('Rate limited')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      const result = await geminiService.makeApiRequest({});

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 server error', async () => {
      fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server error')
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true })
        });

      const result = await geminiService.makeApiRequest({});

      expect(result).toEqual({ success: true });
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when API key is missing', async () => {
      geminiService.apiKey = null;

      await expect(geminiService.makeApiRequest({}))
        .rejects.toThrow('API key not configured');
    });

    it('should handle network timeout', async () => {
      // Mock AbortError for all retry attempts
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      
      fetch
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError);

      await expect(geminiService.makeApiRequest({}))
        .rejects.toThrow('Request timeout. Please check your network connection.');
    });
  });

  describe('Task Breakdown', () => {
    beforeEach(() => {
      geminiService.apiKey = 'test-api-key';
    });

    it('should break down task successfully', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '1. Plan the project\n2. Execute the plan\n3. Review results'
            }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await geminiService.breakdownTask('Build app', '2024-12-31');

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(3);
      expect(result.taskName).toBe('Build app');
      expect(result.deadline).toBe('2024-12-31');
    });

    it('should return placeholder when API key not configured', async () => {
      geminiService.apiKey = null;

      const result = await geminiService.breakdownTask('Test task', 'Tomorrow');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
      expect(result.placeholder).toHaveProperty('isPlaceholder', true);
      expect(result.placeholder.steps).toBeInstanceOf(Array);
      expect(result.placeholder.steps.length).toBeGreaterThan(0);
    });

    it('should validate task name input', async () => {
      const invalidInputs = ['', null, undefined, '   '];

      for (const input of invalidInputs) {
        const result = await geminiService.breakdownTask(input, 'Tomorrow');
        expect(result.success).toBe(false);
        expect(result.error).toContain('Task name is required');
      }
    });

    it('should validate task name length', async () => {
      const longTaskName = 'a'.repeat(201); // Exceeds MAX_TASK_NAME_LENGTH

      const result = await geminiService.breakdownTask(longTaskName, 'Tomorrow');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Task name too long');
    });

    it('should validate deadline input', async () => {
      const result = await geminiService.breakdownTask('Valid task', null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deadline is required');
    });

    it('should handle API errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await geminiService.breakdownTask('Test task', 'Tomorrow');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.placeholder).toHaveProperty('isPlaceholder', true);
    });
  });

  describe('Placeholder Functionality', () => {
    it('should generate placeholder breakdown', () => {
      const placeholder = geminiService.getPlaceholderBreakdown('Test task');

      expect(placeholder.isPlaceholder).toBe(true);
      expect(placeholder.steps).toBeInstanceOf(Array);
      expect(placeholder.steps.length).toBeGreaterThan(0);
      expect(placeholder.message).toContain('API key not configured');
    });

    it('should provide generic but useful steps', () => {
      const placeholder = geminiService.getPlaceholderBreakdown('Any task');

      expect(placeholder.steps[0]).toContain('Research');
      expect(placeholder.steps.some(step => step.includes('plan'))).toBe(true);
      expect(placeholder.steps.some(step => step.includes('implementation') || step.includes('Begin'))).toBe(true);
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully when configured', async () => {
      geminiService.apiKey = 'test-key';
      
      // Mock successful breakdown
      vi.spyOn(geminiService, 'breakdownTask').mockResolvedValue({
        success: true,
        steps: ['Test step']
      });

      const result = await geminiService.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should fail connection test when not configured', async () => {
      geminiService.apiKey = null;

      const result = await geminiService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key not configured');
    });

    it('should handle connection test errors', async () => {
      geminiService.apiKey = 'test-key';
      
      vi.spyOn(geminiService, 'breakdownTask').mockResolvedValue({
        success: false,
        error: 'API error'
      });

      const result = await geminiService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('Utility Functions', () => {
    it('should create delays correctly', async () => {
      const start = Date.now();
      await geminiService.delay(100);
      const end = Date.now();

      expect(end - start).toBeGreaterThanOrEqual(90); // Allow some variance
    });
  });
});