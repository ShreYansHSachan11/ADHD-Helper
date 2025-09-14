/**
 * Gemini API Service - AI-powered task breakdown functionality
 * Handles API key management, request formatting, and response parsing
 */

class GeminiService {
  constructor() {
    this.storageManager = null;
    this.apiKey = null;
    
    // Handle case where CONSTANTS might not be available (e.g., during testing)
    const constants = typeof CONSTANTS !== 'undefined' ? CONSTANTS : {
      API: {
        GEMINI: {
          BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
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
    
    this.baseUrl = constants.API.GEMINI.BASE_URL;
    this.maxRetries = constants.API.GEMINI.MAX_RETRIES;
    this.timeout = constants.API.GEMINI.TIMEOUT_MS;
    this.rateLimitDelay = constants.API.GEMINI.RATE_LIMIT_DELAY_MS;
    this.constants = constants;
    
    this.init();
  }

  /**
   * Initialize the service and set API key locally
   */
  async init() {
    try {
      // Initialize error handler
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }

      // Initialize storage manager
      if (typeof StorageManager !== 'undefined') {
        this.storageManager = new StorageManager();
      } else if (typeof window !== 'undefined' && window.storageManager) {
        this.storageManager = window.storageManager;
      }

      // Set API key directly (no user configuration needed)
      this.apiKey = 'AIzaSyAwRRtNciLbyKBLpl3b1K42OH7IS2N0Nt0';
      console.log('Gemini API key configured locally');
      
    } catch (error) {
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, 'GeminiService Init');
      } else {
        console.error('GeminiService initialization error:', error);
      }
    }
  }

  /**
   * Configure the default API key provided by the user
   * @returns {Promise<boolean>} - Whether the default key was configured successfully
   */
  async configureDefaultApiKey() {
    try {
      // The API key provided by the user
      const defaultApiKey = 'AIzaSyAwRRtNciLbyKBLpl3b1K42OH7IS2N0Nt0';
      
      console.log('Configuring default Gemini API key...');
      
      // Save the key directly (skip validation for now to avoid network issues during init)
      const saved = await this.saveApiKey(defaultApiKey);
      if (saved) {
        console.log('Default Gemini API key configured successfully');
        if (this.errorHandler) {
          this.errorHandler.showUserFeedback(
            'Gemini API key configured successfully!',
            'success',
            { duration: 3000 }
          );
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error configuring default API key:', error);
      // Even if there's an error, try to set the key directly
      try {
        this.apiKey = 'AIzaSyAwRRtNciLbyKBLpl3b1K42OH7IS2N0Nt0';
        console.log('API key set directly as fallback');
        return true;
      } catch (fallbackError) {
        console.error('Fallback API key setting failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Load API key from storage with decryption
   * @returns {Promise<boolean>} - Whether API key was loaded successfully
   */
  async loadApiKey() {
    try {
      if (!this.storageManager) {
        console.warn('Storage manager not available');
        return false;
      }

      const apiKeys = await this.storageManager.get(this.constants.STORAGE_KEYS.API_KEYS);
      if (apiKeys && apiKeys.gemini) {
        // Decrypt the API key
        this.apiKey = await this.decryptApiKey(apiKeys.gemini);
        console.log('Gemini API key loaded successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error loading Gemini API key:', error);
      return false;
    }
  }

  /**
   * Save API key to storage with encryption
   * @param {string} apiKey - The Gemini API key
   * @returns {Promise<boolean>} - Whether API key was saved successfully
   */
  async saveApiKey(apiKey) {
    try {
      if (!this.storageManager) {
        throw new Error('Storage manager not available');
      }

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
        throw new Error('Invalid API key provided');
      }

      // Validate API key format (Gemini keys start with AIzaSy)
      const trimmedKey = apiKey.trim();
      if (!trimmedKey.startsWith('AIzaSy') || trimmedKey.length < 30) {
        throw new Error('Invalid Gemini API key format');
      }

      // Encrypt the API key before storage
      const encryptedKey = await this.encryptApiKey(trimmedKey);

      // Get existing API keys or create new object
      const existingApiKeys = await this.storageManager.get(this.constants.STORAGE_KEYS.API_KEYS) || {};
      existingApiKeys.gemini = encryptedKey;

      const success = await this.storageManager.set(this.constants.STORAGE_KEYS.API_KEYS, existingApiKeys);
      if (success) {
        this.apiKey = trimmedKey;
        console.log('Gemini API key saved successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Error saving Gemini API key:', error);
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Failed to save API key: ' + error.message,
          'error',
          { duration: 5000 }
        );
      }
      return false;
    }
  }

  /**
   * Encrypt API key for secure storage
   * @param {string} apiKey - Plain text API key
   * @returns {Promise<string>} - Encrypted API key
   */
  async encryptApiKey(apiKey) {
    try {
      // Simple obfuscation for Chrome extension storage
      // In a production environment, you might want stronger encryption
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      // Use a simple XOR cipher with a fixed key for obfuscation
      const key = 'GeminiAPIKeyEncryption2024';
      const keyBytes = encoder.encode(key);
      
      const encrypted = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
      }
      
      // Convert to base64 for storage
      return btoa(String.fromCharCode(...encrypted));
    } catch (error) {
      console.error('Error encrypting API key:', error);
      // Fallback to plain text if encryption fails
      return apiKey;
    }
  }

  /**
   * Decrypt API key from storage
   * @param {string} encryptedKey - Encrypted API key
   * @returns {Promise<string>} - Decrypted API key
   */
  async decryptApiKey(encryptedKey) {
    try {
      // Check if it's already plain text (backward compatibility)
      if (encryptedKey.startsWith('AIzaSy')) {
        return encryptedKey;
      }

      // Decrypt the key
      const encrypted = new Uint8Array(atob(encryptedKey).split('').map(c => c.charCodeAt(0)));
      
      const key = 'GeminiAPIKeyEncryption2024';
      const encoder = new TextEncoder();
      const keyBytes = encoder.encode(key);
      
      const decrypted = new Uint8Array(encrypted.length);
      for (let i = 0; i < encrypted.length; i++) {
        decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
      }
      
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Error decrypting API key:', error);
      // Return as-is if decryption fails
      return encryptedKey;
    }
  }

  /**
   * Check if API key is configured
   * @returns {boolean} - Whether API key is available
   */
  isConfigured() {
    return !!(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Validate API key by making a test request
   * @param {string} apiKey - API key to validate (optional, uses stored key if not provided)
   * @returns {Promise<boolean>} - Whether API key is valid
   */
  async validateApiKey(apiKey = null) {
    try {
      const keyToTest = apiKey || this.apiKey;
      if (!keyToTest) {
        return false;
      }

      // Make a simple test request to validate the key
      const testRequest = {
        contents: [{
          parts: [{
            text: "Hello"
          }]
        }],
        generationConfig: {
          maxOutputTokens: 10,
        }
      };

      const response = await fetch(`${this.baseUrl}?key=${keyToTest}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequest),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      // Check if the response indicates a valid key
      if (response.ok) {
        return true;
      } else if (response.status === 400) {
        // 400 might indicate invalid key or malformed request
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.message) {
          console.warn('API key validation error:', errorData.error.message);
          return errorData.error.message.toLowerCase().includes('api key');
        }
        return false;
      } else if (response.status === 403) {
        // 403 typically indicates invalid or unauthorized key
        return false;
      }

      return false;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  }

  /**
   * Clear stored API key
   * @returns {Promise<boolean>} - Whether API key was cleared successfully
   */
  async clearApiKey() {
    try {
      if (!this.storageManager) {
        throw new Error('Storage manager not available');
      }

      const existingApiKeys = await this.storageManager.get(this.constants.STORAGE_KEYS.API_KEYS) || {};
      delete existingApiKeys.gemini;

      const success = await this.storageManager.set(this.constants.STORAGE_KEYS.API_KEYS, existingApiKeys);
      if (success) {
        this.apiKey = null;
        console.log('Gemini API key cleared successfully');
      }
      
      return success;
    } catch (error) {
      console.error('Error clearing Gemini API key:', error);
      return false;
    }
  }

  /**
   * Format task breakdown request for Gemini API
   * @param {string} taskName - Name of the task
   * @param {string} deadline - Task deadline (ISO string or readable format)
   * @returns {Object} - Formatted request payload
   */
  formatTaskBreakdownRequest(taskName, deadline) {
    const prompt = `Please break down the following task into actionable, specific steps that can be completed systematically. 

Task: "${taskName}"
Deadline: ${deadline}

Requirements:
- Provide 3-8 concrete, actionable steps
- Each step should be specific and measurable
- Steps should be ordered logically
- Consider the deadline when suggesting timing
- Focus on practical implementation
- Keep each step concise but clear

Format your response as a numbered list of actionable steps. Do not include explanations or additional text beyond the step list.`;

    return {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };
  }

  /**
   * Parse Gemini API response and extract actionable steps
   * @param {Object} response - Raw API response
   * @returns {string[]} - Array of actionable steps
   */
  parseTaskBreakdownResponse(response) {
    try {
      if (!response || !response.candidates || response.candidates.length === 0) {
        throw new Error('Invalid response format');
      }

      const candidate = response.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No content in response');
      }

      const text = candidate.content.parts[0].text;
      if (!text) {
        throw new Error('No text content in response');
      }

      // Parse numbered list from response
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const steps = [];

      for (const line of lines) {
        const trimmed = line.trim();
        // Match numbered list items (1., 2., etc. or 1), 2), etc.)
        const match = trimmed.match(/^\d+[\.\)]\s*(.+)$/);
        if (match) {
          steps.push(match[1].trim());
        } else if (trimmed.length > 0 && !trimmed.match(/^\d+[\.\)]/)) {
          // Include non-numbered lines that might be part of steps
          if (steps.length > 0) {
            steps[steps.length - 1] += ' ' + trimmed;
          }
        }
      }

      // Limit to maximum number of breakdown items
      return steps.slice(0, this.constants.TASKS.MAX_BREAKDOWN_ITEMS);
    } catch (error) {
      console.error('Error parsing Gemini response:', error);
      throw new Error('Failed to parse task breakdown from API response');
    }
  }

  /**
   * Make HTTP request to Gemini API with enhanced error handling
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} - API response
   */
  async makeApiRequest(payload) {
    if (!this.apiKey) {
      throw new Error('API key not configured');
    }

    const url = `${this.baseUrl}?key=${this.apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error && errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } catch (parseError) {
          // Use default error message if parsing fails
        }

        // Create specific error types for better handling
        if (response.status === 401) {
          const error = new Error('Invalid API key. Please check your Gemini API key configuration.');
          error.name = 'AuthenticationError';
          error.status = 401;
          throw error;
        } else if (response.status === 429) {
          const error = new Error('Rate limit exceeded. Please try again later.');
          error.name = 'RateLimitError';
          error.status = 429;
          throw error;
        } else if (response.status >= 500) {
          const error = new Error('Gemini API server error. Please try again later.');
          error.name = 'ServerError';
          error.status = response.status;
          throw error;
        } else if (response.status === 400) {
          const error = new Error(`Invalid request: ${errorMessage}`);
          error.name = 'ValidationError';
          error.status = 400;
          throw error;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format from Gemini API');
      }

      return data;

    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        const timeoutError = new Error('Request timeout. Please check your network connection.');
        timeoutError.name = 'TimeoutError';
        throw timeoutError;
      }

      // Network errors
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        const networkError = new Error('Network error. Please check your internet connection.');
        networkError.name = 'NetworkError';
        throw networkError;
      }

      // Re-throw with preserved error information
      throw error;
    }
  }

  /**
   * Break down a task into actionable steps using Gemini API
   * @param {string} taskName - Name of the task
   * @param {string} deadline - Task deadline
   * @returns {Promise<Object>} - Result object with success status and data
   */
  async breakdownTask(taskName, deadline) {
    try {
      // Validate inputs
      if (!taskName || typeof taskName !== 'string' || taskName.trim().length === 0) {
        const error = new Error('Task name is required');
        if (this.errorHandler) {
          return this.errorHandler.handleApiError(error, 'Task Breakdown', {
            showToUser: true,
            allowRetry: false,
            fallbackMessage: 'Please enter a task name'
          });
        }
        throw error;
      }

      if (taskName.length > this.constants.TASKS.MAX_TASK_NAME_LENGTH) {
        const error = new Error(`Task name too long (max ${this.constants.TASKS.MAX_TASK_NAME_LENGTH} characters)`);
        if (this.errorHandler) {
          return this.errorHandler.handleApiError(error, 'Task Breakdown', {
            showToUser: true,
            allowRetry: false,
            fallbackMessage: 'Task name is too long. Please shorten it.'
          });
        }
        throw error;
      }

      // Deadline is optional, use "as soon as possible" if not provided
      if (!deadline) {
        deadline = 'as soon as possible';
      }

      // Check if API is configured (should always be true now)
      if (!this.isConfigured()) {
        console.warn('API key not configured, using placeholder breakdown');
        return {
          success: false,
          error: 'API key not configured',
          placeholder: this.getPlaceholderBreakdown(taskName)
        };
      }

      // Use retry mechanism for API request
      const operation = async () => {
        // Format request
        const requestPayload = this.formatTaskBreakdownRequest(taskName.trim(), deadline);

        // Make API request
        const response = await this.makeApiRequest(requestPayload);

        // Parse response
        const steps = this.parseTaskBreakdownResponse(response);

        if (steps.length === 0) {
          throw new Error('No actionable steps found in API response');
        }

        return {
          success: true,
          steps: steps,
          taskName: taskName.trim(),
          deadline: deadline
        };
      };

      // Use retry mechanism if error handler is available
      if (this.errorHandler) {
        return await this.errorHandler.withRetry(operation, {
          maxRetries: 2,
          context: 'Task Breakdown',
          baseDelay: 1000
        });
      } else {
        return await operation();
      }

    } catch (error) {
      if (this.errorHandler) {
        const result = this.errorHandler.handleApiError(error, 'Task Breakdown', {
          showToUser: true,
          allowRetry: true,
          fallbackMessage: 'Failed to generate task breakdown'
        });
        
        // Always provide placeholder for task breakdown failures
        result.placeholder = this.getPlaceholderBreakdown(taskName);
        return result;
      } else {
        console.error('Task breakdown error:', error);
        
        return {
          success: false,
          error: error.message,
          placeholder: this.getPlaceholderBreakdown(taskName)
        };
      }
    }
  }

  /**
   * Get placeholder task breakdown when API is not available
   * @param {string} taskName - Name of the task
   * @returns {Object} - Placeholder breakdown object
   */
  getPlaceholderBreakdown(taskName) {
    const genericSteps = [
      "Research and gather information about the task requirements",
      "Create a detailed plan with timeline and milestones",
      "Identify necessary resources and tools",
      "Break down the task into smaller, manageable subtasks",
      "Set up your workspace and organize materials",
      "Begin implementation following your plan",
      "Review progress and adjust approach if needed",
      "Complete final testing and quality checks"
    ];

    return {
      isPlaceholder: true,
      steps: genericSteps,
      message: "API key not configured. Here's a generic breakdown to get you started. Configure your Gemini API key for personalized task breakdowns."
    };
  }

  /**
   * Utility function to create delays
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear stored API key
   * @returns {Promise<boolean>} - Whether API key was cleared successfully
   */
  async clearApiKey() {
    try {
      if (!this.storageManager) {
        return false;
      }

      const existingApiKeys = await this.storageManager.get(this.constants.STORAGE_KEYS.API_KEYS) || {};
      delete existingApiKeys.gemini;

      const success = await this.storageManager.set(this.constants.STORAGE_KEYS.API_KEYS, existingApiKeys);
      if (success) {
        this.apiKey = null;
      }
      
      return success;
    } catch (error) {
      console.error('Error clearing Gemini API key:', error);
      return false;
    }
  }

  /**
   * Test API connection with a simple request
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'API key not configured'
        };
      }

      const testResult = await this.breakdownTask('Test task', 'Tomorrow');
      
      return {
        success: testResult.success,
        error: testResult.error || null
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// For use in service worker and popup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiService;
} else {
  // Make available globally in both service worker and popup contexts
  globalThis.GeminiService = GeminiService;
}