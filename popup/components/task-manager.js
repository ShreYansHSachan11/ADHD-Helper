/**
 * Task Manager Component - Handles task input, AI breakdown, and local storage
 * Integrates with Gemini API service for AI-powered task breakdown
 */

class TaskManager {
  constructor() {
    this.storageManager = null;
    this.geminiService = null;
    this.currentTask = null;
    this.taskHistory = [];
    
    // DOM elements will be set during initialization
    this.elements = {};
    
    // Task storage key
    this.STORAGE_KEY = 'taskHistory';
    
    this.init();
  }

  /**
   * Initialize the task manager component
   */
  async init() {
    try {
      // Initialize error handler
      if (typeof errorHandler !== 'undefined') {
        this.errorHandler = errorHandler;
      }

      // Initialize services with error handling
      await this.initializeServicesWithErrorHandling();
      
      // Initialize DOM elements
      this.initializeElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load task history from storage with error handling
      await this.loadTaskHistoryWithErrorHandling();
      
      // Update UI with current state
      this.updateUI();
      
      console.log('TaskManager initialized successfully');
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Task manager ready!',
          'success',
          { duration: 2000 }
        );
      }
    } catch (error) {
      console.error('Failed to initialize TaskManager:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleExtensionError(error, 'Task Manager Init');
      } else {
        this.showStatus('Failed to initialize task manager', 'error');
      }
      
      // Continue with limited functionality
      this.initializeFallbackMode();
    }
  }

  /**
   * Initialize services with comprehensive error handling
   */
  async initializeServicesWithErrorHandling() {
    const initTasks = [
      {
        name: 'Storage Manager',
        fn: () => this.initializeStorageManager(),
        required: true
      },
      {
        name: 'Gemini Service',
        fn: () => this.initializeGeminiService(),
        required: false
      }
    ];

    for (const task of initTasks) {
      try {
        await task.fn();
      } catch (error) {
        console.error(`Failed to initialize ${task.name}:`, error);
        
        if (this.errorHandler) {
          this.errorHandler.handleExtensionError(error, `${task.name} Init`);
        }
        
        if (task.required) {
          throw new Error(`Required service ${task.name} failed to initialize`);
        }
      }
    }
  }

  /**
   * Initialize storage manager
   */
  initializeStorageManager() {
    if (typeof StorageManager !== 'undefined') {
      this.storageManager = new StorageManager();
    } else if (typeof window !== 'undefined' && window.storageManager) {
      this.storageManager = window.storageManager;
    } else {
      throw new Error('StorageManager not available');
    }
  }

  /**
   * Initialize Gemini service
   */
  async initializeGeminiService() {
    if (typeof GeminiService !== 'undefined') {
      this.geminiService = new GeminiService();
      await this.geminiService.init();
      console.log('GeminiService initialized successfully');
    } else if (typeof window !== 'undefined' && window.geminiService) {
      this.geminiService = window.geminiService;
    } else {
      console.warn('GeminiService not available, task breakdown will use fallback');
    }
  }

  /**
   * Load task history with error handling
   */
  async loadTaskHistoryWithErrorHandling() {
    try {
      await this.loadTaskHistory();
    } catch (error) {
      console.error('Failed to load task history:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleStorageError(error, 'Load Task History');
      }
      
      // Use empty history as fallback
      this.taskHistory = [];
    }
  }

  /**
   * Initialize fallback mode when full initialization fails
   */
  initializeFallbackMode() {
    console.warn('TaskManager running in fallback mode');
    
    // Initialize basic elements
    try {
      this.initializeElements();
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to initialize fallback mode:', error);
    }
    
    // Show fallback message
    this.showStatus('Task manager running with limited functionality', 'warning');
  }

  /**
   * Create fallback DOM elements
   */
  createFallbackElements() {
    if (!this.elements.taskStatus) {
      this.elements.taskStatus = this.createStatusElement();
    }
  }

  /**
   * Set up basic event listeners for fallback mode
   */
  setupBasicEventListeners() {
    if (this.elements.getBreakdownBtn) {
      this.elements.getBreakdownBtn.addEventListener('click', () => {
        this.handleGetBreakdownFallback();
      });
    }
  }

  /**
   * Initialize required services
   */
  async initializeServices() {
    // Initialize storage manager
    if (typeof window !== 'undefined' && window.storageManager) {
      this.storageManager = window.storageManager;
    } else if (typeof StorageManager !== 'undefined') {
      this.storageManager = new StorageManager();
    }

    // Initialize Gemini service
    if (typeof window !== 'undefined' && window.geminiService) {
      this.geminiService = window.geminiService;
    } else if (typeof GeminiService !== 'undefined') {
      this.geminiService = new GeminiService();
      await this.geminiService.init();
    }
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.elements = {
      taskNameInput: document.getElementById('taskNameInput'),
      taskDeadlineInput: document.getElementById('taskDeadlineInput'),
      getBreakdownBtn: document.getElementById('getBreakdownBtn'),
      taskBreakdown: document.getElementById('taskBreakdown'),
      breakdownList: document.getElementById('breakdownList'),
      taskStatus: this.createStatusElement(),
      taskHistoryContainer: this.createHistoryContainer()
    };

    // Validate required elements exist
    const requiredElements = ['taskNameInput', 'taskDeadlineInput', 'getBreakdownBtn', 'taskBreakdown', 'breakdownList'];
    for (const elementKey of requiredElements) {
      if (!this.elements[elementKey]) {
        console.error(`Required element not found: ${elementKey}`);
      }
    }
  }

  /**
   * Create status display element
   */
  createStatusElement() {
    let statusEl = document.getElementById('taskStatus');
    if (!statusEl) {
      statusEl = document.createElement('div');
      statusEl.id = 'taskStatus';
      statusEl.className = 'task-status';
      statusEl.style.display = 'none';
      
      // Insert after the task input group
      const taskInputGroup = document.querySelector('.task-input-group');
      if (taskInputGroup) {
        taskInputGroup.parentNode.insertBefore(statusEl, taskInputGroup.nextSibling);
      }
    }
    return statusEl;
  }

  /**
   * Create task history container
   */
  createHistoryContainer() {
    let historyContainer = document.getElementById('taskHistoryContainer');
    if (!historyContainer) {
      historyContainer = document.createElement('div');
      historyContainer.id = 'taskHistoryContainer';
      historyContainer.className = 'task-history-container';
      historyContainer.style.display = 'none';
      
      // Create history header
      const historyHeader = document.createElement('div');
      historyHeader.className = 'task-history-header';
      historyHeader.innerHTML = `
        <h4>Recent Tasks</h4>
        <button class="btn btn-small btn-text" id="toggleTaskHistoryBtn">Show History</button>
      `;
      
      // Create history list
      const historyList = document.createElement('div');
      historyList.id = 'taskHistoryList';
      historyList.className = 'task-history-list';
      
      historyContainer.appendChild(historyHeader);
      historyContainer.appendChild(historyList);
      
      // Insert after task breakdown section
      const taskSection = document.querySelector('.task-section .section-content');
      if (taskSection) {
        taskSection.appendChild(historyContainer);
      }
    }
    return historyContainer;
  }

  /**
   * Set up event listeners with enhanced interactions
   */
  setupEventListeners() {
    // Task breakdown button with enhanced interactions
    if (this.elements.getBreakdownBtn) {
      this.elements.getBreakdownBtn.addEventListener('click', () => this.handleGetBreakdown());
      
      // Add hover sound effect (optional)
      this.elements.getBreakdownBtn.addEventListener('mouseenter', () => {
        this.elements.getBreakdownBtn.style.transform = 'translateY(-2px) scale(1.02)';
      });
      
      this.elements.getBreakdownBtn.addEventListener('mouseleave', () => {
        if (!this.elements.getBreakdownBtn.classList.contains('loading')) {
          this.elements.getBreakdownBtn.style.transform = '';
        }
      });
    }

    // Enhanced task name input interactions
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleGetBreakdown();
        }
      });
      
      // Character count and validation feedback with animations
      this.elements.taskNameInput.addEventListener('input', (e) => {
        this.updateCharacterCount();
        this.validateTaskInputRealTime();
        this.saveCurrentTaskDraft();
        this.addInputAnimation();
      });
      
      // Enhanced focus effects with section highlighting
      this.elements.taskNameInput.addEventListener('focus', () => {
        const section = document.querySelector('.task-input-section');
        if (section) {
          section.classList.add('focused');
        }
        this.elements.taskNameInput.parentElement?.classList.add('focused');
      });
      
      this.elements.taskNameInput.addEventListener('blur', () => {
        const section = document.querySelector('.task-input-section');
        if (section) {
          section.classList.remove('focused');
        }
        this.elements.taskNameInput.parentElement?.classList.remove('focused');
      });
    }

    // Deadline input enhancements
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.addEventListener('change', () => {
        this.validateTaskInputRealTime();
        this.saveCurrentTaskDraft();
      });
    }

    // Task history toggle
    const toggleHistoryBtn = document.getElementById('toggleTaskHistoryBtn');
    if (toggleHistoryBtn) {
      toggleHistoryBtn.addEventListener('click', () => this.toggleTaskHistory());
    }

    // Clear task button
    const clearTaskBtn = document.getElementById('clearTaskBtn');
    if (clearTaskBtn) {
      clearTaskBtn.addEventListener('click', () => this.handleClearInputs());
    }
  }

  /**
   * Update character count display with enhanced animations
   */
  updateCharacterCount() {
    try {
      const charCountEl = document.getElementById('charCount');
      if (!charCountEl || !this.elements.taskNameInput) return;
      
      const currentLength = this.elements.taskNameInput.value.length;
      const maxLength = 500;
      
      // Animate the count change
      const oldCount = parseInt(charCountEl.textContent) || 0;
      if (oldCount !== currentLength) {
        charCountEl.style.transform = 'scale(1.1)';
        setTimeout(() => {
          charCountEl.style.transform = 'scale(1)';
        }, 150);
      }
      
      charCountEl.textContent = currentLength;
      
      const charCountContainer = charCountEl.parentElement;
      if (charCountContainer) {
        charCountContainer.classList.remove('warning');
        
        if (currentLength > maxLength * 0.8) {
          charCountContainer.classList.add('warning');
          
          // Add warning animation
          if (currentLength > maxLength * 0.9) {
            charCountContainer.style.animation = 'shake 0.5s ease-in-out';
            setTimeout(() => {
              charCountContainer.style.animation = '';
            }, 500);
          }
        }
      }
      
    } catch (error) {
      console.error('Error updating character count:', error);
    }
  }

  /**
   * Add input animation for better feedback
   */
  addInputAnimation() {
    try {
      if (!this.elements.taskNameInput) return;
      
      // Add subtle pulse animation on input
      this.elements.taskNameInput.style.boxShadow = '0 0 0 4px rgba(0, 106, 107, 0.2)';
      setTimeout(() => {
        this.elements.taskNameInput.style.boxShadow = '';
      }, 200);
      
    } catch (error) {
      console.error('Error adding input animation:', error);
    }
  }

  /**
   * Real-time input validation with visual feedback
   */
  validateTaskInputRealTime() {
    try {
      if (!this.elements.taskNameInput) return;
      
      const taskName = this.elements.taskNameInput.value.trim();
      
      // Remove previous validation classes
      this.elements.taskNameInput.classList.remove('valid', 'invalid');
      
      if (taskName.length === 0) {
        // No validation styling for empty input
        return;
      }
      
      if (taskName.length >= 3 && taskName.length <= 500) {
        this.elements.taskNameInput.classList.add('valid');
      } else {
        this.elements.taskNameInput.classList.add('invalid');
      }
      
    } catch (error) {
      console.error('Error in real-time validation:', error);
    }
  }

  /**
   * Handle clear inputs button click
   */
  handleClearInputs() {
    try {
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.value = '';
        this.elements.taskNameInput.classList.remove('valid', 'invalid');
      }
      
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.value = '';
      }
      
      this.updateCharacterCount();
      this.clearTaskDraft();
      
      // Focus back to task input
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.focus();
      }
      
    } catch (error) {
      console.error('Error clearing inputs:', error);
    }
  }

  /**
   * Handle task breakdown request with comprehensive error handling
   */
  async handleGetBreakdown() {
    try {
      const validationResult = this.validateTaskInputs();
      if (!validationResult.valid) {
        this.showValidationError(validationResult);
        return;
      }

      const { taskName, deadline } = validationResult;

      // Set loading state with progress feedback
      this.setLoadingState(true);
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Generating AI task breakdown...',
          'info',
          { duration: 2000 }
        );
      } else {
        this.showStatus('Getting AI breakdown...', 'loading');
      }

      // Create task object
      const task = {
        id: this.generateTaskId(),
        name: taskName,
        deadline: deadline,
        createdAt: new Date().toISOString(),
        breakdown: null,
        isPlaceholder: false,
        retryCount: 0
      };

      // Get breakdown with retry mechanism
      const breakdownResult = await this.getTaskBreakdownWithRetry(task);

      // Process result and update UI
      await this.processBreakdownResult(task, breakdownResult);

    } catch (error) {
      console.error('Task breakdown error:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleApiError(error, 'Task Breakdown', {
          showToUser: true,
          allowRetry: true,
          fallbackMessage: 'Failed to generate task breakdown'
        });
      } else {
        this.showStatus('Failed to generate task breakdown', 'error');
      }
      
      // Create emergency fallback
      await this.createEmergencyFallbackTask();
      
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Validate task inputs with detailed error messages
   */
  validateTaskInputs() {
    const taskName = this.elements.taskNameInput?.value?.trim();
    const deadline = this.elements.taskDeadlineInput?.value;

    // Check task name
    if (!taskName) {
      return {
        valid: false,
        error: 'Task name is required',
        field: 'taskName',
        element: this.elements.taskNameInput
      };
    }

    if (taskName.length < 3) {
      return {
        valid: false,
        error: 'Task name must be at least 3 characters long',
        field: 'taskName',
        element: this.elements.taskNameInput
      };
    }

    if (taskName.length > 200) {
      return {
        valid: false,
        error: 'Task name is too long (maximum 200 characters)',
        field: 'taskName',
        element: this.elements.taskNameInput
      };
    }

    // Check deadline (optional)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      
      if (isNaN(deadlineDate.getTime())) {
        return {
          valid: false,
          error: 'Invalid deadline format',
          field: 'deadline',
          element: this.elements.taskDeadlineInput
        };
      }

      if (deadlineDate <= now) {
        return {
          valid: false,
          error: 'Deadline must be in the future',
          field: 'deadline',
          element: this.elements.taskDeadlineInput
        };
      }

      // Check if deadline is too far in the future (more than 5 years)
      const fiveYearsFromNow = new Date();
      fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
      
      if (deadlineDate > fiveYearsFromNow) {
        return {
          valid: false,
          error: 'Deadline is too far in the future (maximum 5 years)',
          field: 'deadline',
          element: this.elements.taskDeadlineInput
        };
      }
    }

    return {
      valid: true,
      taskName,
      deadline: deadline || 'as soon as possible'
    };
  }

  /**
   * Show validation error with focus management
   */
  showValidationError(validationResult) {
    const { error, element } = validationResult;
    
    if (this.errorHandler) {
      this.errorHandler.showUserFeedback(error, 'warning', {
        duration: 4000,
        context: 'Task Input Validation'
      });
    } else {
      this.showStatus(error, 'error');
    }
    
    // Focus the problematic field
    if (element) {
      setTimeout(() => {
        element.focus();
        if (typeof element.select === 'function') {
          element.select();
        }
      }, 100);
    }
  }

  /**
   * Get task breakdown with retry mechanism
   */
  async getTaskBreakdownWithRetry(task) {
    if (!this.geminiService) {
      return {
        success: false,
        error: 'AI service not available',
        placeholder: {
          steps: this.getGenericBreakdown(task.name),
          message: 'AI service not configured. Using generic breakdown.'
        }
      };
    }

    // Use error handler's retry mechanism if available
    if (this.errorHandler) {
      return await this.errorHandler.withRetry(
        () => this.geminiService.breakdownTask(task.name, task.deadline),
        {
          maxRetries: 2,
          context: 'Task Breakdown',
          baseDelay: 1000
        }
      );
    } else {
      // Fallback retry logic
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return await this.geminiService.breakdownTask(task.name, task.deadline);
        } catch (error) {
          lastError = error;
          if (attempt < 3) {
            console.warn(`Task breakdown attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      throw lastError;
    }
  }

  /**
   * Process breakdown result and update UI
   */
  async processBreakdownResult(task, breakdownResult) {
    if (breakdownResult.success) {
      task.breakdown = breakdownResult.steps;
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Task breakdown generated successfully!',
          'success',
          { duration: 3000 }
        );
      } else {
        this.showStatus('Task breakdown generated!', 'success');
      }
      
    } else {
      // Handle API failure with fallback
      task.breakdown = breakdownResult.placeholder ? breakdownResult.placeholder.steps : this.getGenericBreakdown(task.name);
      task.isPlaceholder = true;
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          breakdownResult.placeholder ? breakdownResult.placeholder.message : 'Using generic task breakdown',
          'warning',
          { duration: 4000 }
        );
      } else {
        this.showStatus('Using generic breakdown', 'warning');
      }
    }

    // Update UI and save task
    this.displayTaskBreakdown(task);
    await this.saveTaskWithErrorHandling(task);
    this.currentTask = task;
  }

  /**
   * Create emergency fallback task when everything fails
   */
  async createEmergencyFallbackTask() {
    try {
      const taskName = this.elements.taskNameInput?.value?.trim() || 'Unnamed Task';
      const deadline = this.elements.taskDeadlineInput?.value || new Date().toISOString();
      
      const emergencyTask = {
        id: this.generateTaskId(),
        name: taskName,
        deadline: deadline,
        createdAt: new Date().toISOString(),
        breakdown: this.getGenericBreakdown(taskName),
        isPlaceholder: true,
        isEmergencyFallback: true
      };

      this.displayTaskBreakdown(emergencyTask);
      this.currentTask = emergencyTask;
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Created basic task breakdown as fallback',
          'info',
          { duration: 3000 }
        );
      }
      
    } catch (error) {
      console.error('Failed to create emergency fallback task:', error);
    }
  }

  /**
   * Save task with error handling
   */
  async saveTaskWithErrorHandling(task) {
    try {
      await this.saveTask(task);
    } catch (error) {
      console.error('Failed to save task:', error);
      
      if (this.errorHandler) {
        this.errorHandler.handleStorageError(error, 'Save Task');
      } else {
        this.showStatus('Failed to save task', 'warning');
      }
    }
  }

  /**
   * Set loading state with enhanced visual feedback and animations
   */
  setLoadingState(isLoading) {
    if (!this.elements.getBreakdownBtn) return;
    
    if (isLoading) {
      // Enhanced loading button state
      this.elements.getBreakdownBtn.classList.add('loading');
      this.elements.getBreakdownBtn.disabled = true;
      this.elements.getBreakdownBtn.innerHTML = '<span class="btn-icon">✨</span>Generating...';
      
      // Add pulsing animation to button
      this.elements.getBreakdownBtn.style.animation = 'pulse 2s infinite';
      
      // Disable inputs with smooth transition
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.disabled = true;
        this.elements.taskNameInput.style.transition = 'opacity 0.3s ease';
        this.elements.taskNameInput.style.opacity = '0.6';
      }
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.disabled = true;
        this.elements.taskDeadlineInput.style.transition = 'opacity 0.3s ease';
        this.elements.taskDeadlineInput.style.opacity = '0.6';
      }
      
      // Add loading shimmer effect to the container
      const taskInputSection = document.querySelector('.task-input-section');
      if (taskInputSection) {
        taskInputSection.classList.add('loading-state');
      }
      
      // Add progress indicator
      this.showLoadingProgress();
      
    } else {
      // Reset button state with animation
      this.elements.getBreakdownBtn.classList.remove('loading');
      this.elements.getBreakdownBtn.disabled = false;
      this.elements.getBreakdownBtn.innerHTML = '<span class="btn-icon">🤖</span>Get AI Breakdown';
      this.elements.getBreakdownBtn.style.animation = '';
      
      // Re-enable inputs with smooth transition
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.disabled = false;
        this.elements.taskNameInput.style.opacity = '1';
      }
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.disabled = false;
        this.elements.taskDeadlineInput.style.opacity = '1';
      }
      
      // Remove loading shimmer effect
      const taskInputSection = document.querySelector('.task-input-section');
      if (taskInputSection) {
        taskInputSection.classList.remove('loading-state');
      }
      
      // Hide progress indicator
      this.hideLoadingProgress();
    }
  }

  /**
   * Show loading progress indicator
   */
  showLoadingProgress() {
    try {
      let progressEl = document.getElementById('taskLoadingProgress');
      if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.id = 'taskLoadingProgress';
        progressEl.className = 'task-loading-progress';
        progressEl.innerHTML = `
          <div class="loading-bar">
            <div class="loading-fill"></div>
          </div>
          <div class="loading-text">Generating AI breakdown...</div>
        `;
        
        const taskInputSection = document.querySelector('.task-input-section');
        if (taskInputSection) {
          taskInputSection.appendChild(progressEl);
        }
      }
      
      progressEl.style.display = 'block';
      progressEl.style.animation = 'fadeIn 0.3s ease';
      
    } catch (error) {
      console.error('Error showing loading progress:', error);
    }
  }

  /**
   * Hide loading progress indicator
   */
  hideLoadingProgress() {
    try {
      const progressEl = document.getElementById('taskLoadingProgress');
      if (progressEl) {
        progressEl.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          progressEl.style.display = 'none';
        }, 300);
      }
    } catch (error) {
      console.error('Error hiding loading progress:', error);
    }
  }

  /**
   * Get generic task breakdown as fallback
   */
  getGenericBreakdown(taskName) {
    return [
      `Research and gather information about "${taskName}"`,
      "Create a detailed plan with timeline and milestones",
      "Identify necessary resources and tools",
      "Break down the task into smaller, manageable subtasks",
      "Set up your workspace and organize materials",
      "Begin implementation following your plan",
      "Review progress and adjust approach if needed",
      "Complete final testing and quality checks"
    ];
  }




  /**
   * Fallback breakdown handler for when services are unavailable
   */
  handleGetBreakdownFallback() {
    const validationResult = this.validateTaskInputs();
    if (!validationResult.valid) {
      this.showValidationError(validationResult);
      return;
    }

    const { taskName, deadline } = validationResult;

    const fallbackTask = {
      id: this.generateTaskId(),
      name: taskName,
      deadline: deadline,
      createdAt: new Date().toISOString(),
      breakdown: this.getGenericBreakdown(taskName),
      isPlaceholder: true,
      isFallbackMode: true
    };

    this.currentTask = fallbackTask;
    this.displayTaskBreakdown(fallbackTask);
    this.showStatus('Created task with generic breakdown (limited mode)', 'warning');
    this.clearTaskDraft();
  }

  /**
   * Display task breakdown in the UI with enhanced styling and interactions
   */
  displayTaskBreakdown(task) {
    if (!this.elements.breakdownList || !this.elements.taskBreakdown) {
      return;
    }

    // Clear existing breakdown
    this.elements.breakdownList.innerHTML = '';

    // Add task header with enhanced styling
    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-breakdown-header';
    taskHeader.innerHTML = `
      <h3>${this.escapeHtml(task.name)}</h3>
      <div class="task-meta">
        <span class="task-deadline">${this.formatDeadline(task.deadline)}</span>
        ${task.isPlaceholder ? '<span class="task-placeholder-badge">Generic Breakdown</span>' : '<span class="task-ai-badge">AI Generated</span>'}
      </div>
    `;

    // Create breakdown list with enhanced styling
    const breakdownSteps = document.createElement('ol');
    breakdownSteps.className = 'breakdown-steps';

    if (Array.isArray(task.breakdown)) {
      task.breakdown.forEach((step, index) => {
        const stepItem = document.createElement('li');
        stepItem.className = 'breakdown-step';
        stepItem.setAttribute('tabindex', '0');
        stepItem.setAttribute('role', 'button');
        stepItem.setAttribute('aria-label', `Step ${index + 1}: ${step}`);
        
        const stepContent = document.createElement('div');
        stepContent.className = 'step-content';
        stepContent.innerHTML = `
          <span class="step-text">${this.escapeHtml(step)}</span>
          <div class="step-actions">
            <button class="step-complete-btn" data-step="${index}" title="Mark step ${index + 1} as complete" aria-label="Mark step ${index + 1} as complete">
              ✓
            </button>
          </div>
        `;
        
        stepItem.appendChild(stepContent);
        breakdownSteps.appendChild(stepItem);
        
        // Enhanced click handler for step completion with animations
        stepContent.addEventListener('click', (e) => {
          if (!e.target.classList.contains('step-complete-btn')) {
            this.toggleStepCompletion(stepItem, index);
          }
        });
        
        // Enhanced keyboard support with visual feedback
        stepItem.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.toggleStepCompletion(stepItem, index);
          }
        });
        
        // Add hover effects for better interactivity
        stepContent.addEventListener('mouseenter', () => {
          stepItem.style.transform = 'translateX(5px)';
          stepItem.style.transition = 'transform 0.2s ease';
        });
        
        stepContent.addEventListener('mouseleave', () => {
          stepItem.style.transform = '';
        });
      });
    }

    // Add progress indicator
    const progressIndicator = document.createElement('div');
    progressIndicator.className = 'task-progress';
    progressIndicator.innerHTML = `
      <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
      </div>
      <span class="progress-text">0%</span>
    `;

    // Add action buttons with enhanced styling
    const actionButtons = document.createElement('div');
    actionButtons.className = 'task-actions';
    actionButtons.innerHTML = `
      <button class="btn btn-primary" id="saveTaskBtn" title="Save this task breakdown">
        <span class="btn-icon">💾</span> Save Task
      </button>
      <button class="btn btn-secondary" id="regenerateTaskBtn" title="Generate a new breakdown">
        <span class="btn-icon">🔄</span> Regenerate
      </button>
      <button class="btn btn-text" id="clearTaskBtn" title="Clear this breakdown">
        <span class="btn-icon">🗑️</span> Clear
      </button>
    `;

    // Assemble the breakdown display
    this.elements.taskBreakdown.innerHTML = '';
    this.elements.taskBreakdown.appendChild(taskHeader);
    this.elements.taskBreakdown.appendChild(breakdownSteps);
    this.elements.taskBreakdown.appendChild(progressIndicator);
    this.elements.taskBreakdown.appendChild(actionButtons);

    // Set up event listeners for action buttons
    this.setupBreakdownActionListeners();

    // Set up step completion listeners
    this.setupStepCompletionListeners();

    // Initialize progress tracking with animation
    this.updateTaskProgress();
    
    // Show breakdown with enhanced animation
    this.elements.taskBreakdown.style.display = 'block';
    this.elements.taskBreakdown.style.animation = 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Add celebration effect for successful generation
    this.addSuccessAnimation();

    // Add event listeners for action buttons
    this.setupBreakdownEventListeners();
  }

  /**
   * Set up event listeners for breakdown actions
   */
  setupBreakdownEventListeners() {
    // Save task button
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if (saveTaskBtn) {
      saveTaskBtn.addEventListener('click', () => this.saveCurrentTask());
    }

    // Regenerate task button
    const regenerateTaskBtn = document.getElementById('regenerateTaskBtn');
    if (regenerateTaskBtn) {
      regenerateTaskBtn.addEventListener('click', () => this.regenerateBreakdown());
    }

    // Clear task button
    const clearTaskBtn = document.getElementById('clearTaskBtn');
    if (clearTaskBtn) {
      clearTaskBtn.addEventListener('click', () => this.clearCurrentTask());
    }

    // Step completion buttons
    const stepCompleteButtons = document.querySelectorAll('.step-complete-btn');
    stepCompleteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stepIndex = parseInt(e.target.dataset.step);
        this.toggleStepCompletion(stepIndex);
      });
    });
  }

  /**
   * Toggle step completion status with enhanced animations
   */
  toggleStepCompletion(stepItem, stepIndex) {
    if (!stepItem) {
      stepItem = document.querySelector(`.step-complete-btn[data-step="${stepIndex}"]`)?.closest('.breakdown-step');
    }
    
    if (stepItem) {
      const isCompleted = stepItem.classList.contains('completed');
      
      if (!isCompleted) {
        // Completing the step - add celebration animation
        stepItem.classList.add('completed');
        
        // Add completion animation
        stepItem.style.animation = 'completeStep 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Show completion feedback
        this.showStepCompletionFeedback(stepItem, stepIndex);
        
        // Play completion sound effect (if available)
        this.playCompletionSound();
        
      } else {
        // Uncompleting the step
        stepItem.classList.remove('completed');
        stepItem.style.animation = '';
      }
      
      // Update current task completion status
      if (this.currentTask) {
        if (!this.currentTask.completedSteps) {
          this.currentTask.completedSteps = [];
        }
        
        const newIsCompleted = stepItem.classList.contains('completed');
        if (newIsCompleted && !this.currentTask.completedSteps.includes(stepIndex)) {
          this.currentTask.completedSteps.push(stepIndex);
        } else if (!newIsCompleted) {
          this.currentTask.completedSteps = this.currentTask.completedSteps.filter(i => i !== stepIndex);
        }
        
        // Update progress with animation
        this.updateTaskProgress();
      }
    }
  }

  /**
   * Show step completion feedback
   */
  showStepCompletionFeedback(stepItem, stepIndex) {
    try {
      // Create floating completion indicator
      const feedback = document.createElement('div');
      feedback.className = 'step-completion-feedback';
      feedback.innerHTML = '✨ Completed!';
      feedback.style.cssText = `
        position: absolute;
        top: -30px;
        right: 10px;
        background: linear-gradient(135deg, #4caf50, #66bb6a);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        z-index: 10;
        animation: floatUp 2s ease-out forwards;
        pointer-events: none;
      `;
      
      stepItem.style.position = 'relative';
      stepItem.appendChild(feedback);
      
      // Remove feedback after animation
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.parentNode.removeChild(feedback);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Error showing step completion feedback:', error);
    }
  }

  /**
   * Play completion sound effect (optional)
   */
  playCompletionSound() {
    try {
      // Create a subtle completion sound using Web Audio API
      if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        const audioContext = new (AudioContext || webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      // Silently fail if audio is not available
      console.debug('Audio not available for completion sound');
    }
  }

  /**
   * Update task progress with enhanced animations
   */
  updateTaskProgress() {
    try {
      const progressBar = document.querySelector('.progress-fill');
      const progressText = document.querySelector('.progress-text');
      
      if (!progressBar || !progressText || !this.currentTask) return;
      
      const totalSteps = this.currentTask.breakdown ? this.currentTask.breakdown.length : 0;
      const completedSteps = this.currentTask.completedSteps ? this.currentTask.completedSteps.length : 0;
      const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      // Animate progress bar
      progressBar.style.width = `${percentage}%`;
      
      // Animate progress text with scaling effect
      progressText.classList.add('updating');
      setTimeout(() => {
        progressText.textContent = `${percentage}%`;
        progressText.classList.remove('updating');
      }, 150);
      
      // Add celebration effect when task is completed
      if (percentage === 100 && completedSteps > 0) {
        this.celebrateTaskCompletion();
      }
      
    } catch (error) {
      console.error('Error updating task progress:', error);
    }
  }

  /**
   * Add success animation for task generation
   */
  addSuccessAnimation() {
    try {
      const taskBreakdown = this.elements.taskBreakdown;
      if (!taskBreakdown) return;
      
      // Add success glow effect
      taskBreakdown.style.boxShadow = '0 0 30px rgba(76, 175, 80, 0.3)';
      setTimeout(() => {
        taskBreakdown.style.boxShadow = '';
      }, 1000);
      
    } catch (error) {
      console.error('Error adding success animation:', error);
    }
  }

  /**
   * Celebrate task completion with animations
   */
  celebrateTaskCompletion() {
    try {
      // Add confetti-like effect
      const taskBreakdown = this.elements.taskBreakdown;
      if (!taskBreakdown) return;
      
      // Create celebration overlay
      const celebration = document.createElement('div');
      celebration.className = 'task-completion-celebration';
      celebration.innerHTML = '🎉 Task Completed! 🎉';
      celebration.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #4caf50, #66bb6a);
        color: white;
        padding: 16px 24px;
        border-radius: 20px;
        font-size: 16px;
        font-weight: 700;
        z-index: 100;
        animation: celebrationPop 3s ease-out forwards;
        box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
        pointer-events: none;
      `;
      
      taskBreakdown.style.position = 'relative';
      taskBreakdown.appendChild(celebration);
      
      // Remove celebration after animation
      setTimeout(() => {
        if (celebration.parentNode) {
          celebration.parentNode.removeChild(celebration);
        }
      }, 3000);
      
      // Play celebration sound
      this.playCompletionSound();
      
    } catch (error) {
      console.error('Error celebrating task completion:', error);
    }
  }

  /**
   * Save current task to history
   */
  async saveCurrentTask() {
    if (!this.currentTask) {
      this.showStatus('No task to save', 'error');
      return;
    }

    try {
      // Update task with current completion status
      this.currentTask.savedAt = new Date().toISOString();
      
      // Save to history if not already saved
      const existingTaskIndex = this.taskHistory.findIndex(t => t.id === this.currentTask.id);
      if (existingTaskIndex === -1) {
        await this.saveTaskToHistory(this.currentTask);
      } else {
        // Update existing task
        this.taskHistory[existingTaskIndex] = { ...this.currentTask };
        await this.saveTaskHistory();
      }

      this.showStatus('Task saved successfully!', 'success');
      this.updateTaskHistoryDisplay();
    } catch (error) {
      console.error('Failed to save task:', error);
      this.showStatus('Failed to save task', 'error');
    }
  }

  /**
   * Regenerate task breakdown
   */
  async regenerateBreakdown() {
    if (!this.currentTask) {
      return;
    }

    // Reset task inputs
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.value = this.currentTask.name;
    }
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.value = this.currentTask.deadline;
    }

    // Trigger new breakdown
    await this.handleGetBreakdown();
  }

  /**
   * Clear current task display
   */
  clearCurrentTask() {
    this.currentTask = null;
    
    if (this.elements.taskBreakdown) {
      this.elements.taskBreakdown.style.display = 'none';
      this.elements.taskBreakdown.innerHTML = '';
    }

    // Clear inputs
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.value = '';
    }
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.value = '';
    }

    this.clearTaskDraft();
    this.showStatus('Task cleared', 'success');
  }



  /**
   * Load task history from storage
   */
  async loadTaskHistory() {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }

    try {
      const history = await this.storageManager.get(this.STORAGE_KEY);
      
      // Validate and sanitize history data
      if (Array.isArray(history)) {
        this.taskHistory = this.validateAndSanitizeTaskHistory(history);
      } else if (history === null || history === undefined) {
        this.taskHistory = [];
      } else {
        console.warn('Invalid task history format, resetting to empty array');
        this.taskHistory = [];
      }
      
      // Sort by creation date (newest first)
      this.taskHistory.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      this.updateTaskHistoryDisplay();
      
    } catch (error) {
      if (error.message.includes('quota')) {
        throw new Error('Storage quota exceeded. Please clear some task history.');
      } else if (error.message.includes('corrupted')) {
        throw new Error('Task history data is corrupted. Resetting history.');
      } else {
        throw new Error('Failed to access task history: ' + error.message);
      }
    }
  }

  /**
   * Validate and sanitize task history data
   */
  validateAndSanitizeTaskHistory(history) {
    const validTasks = [];
    
    for (const task of history) {
      try {
        // Validate required fields
        if (!task || typeof task !== 'object') {
          continue;
        }
        
        if (!task.id || !task.name || !task.createdAt) {
          continue;
        }
        
        // Validate date fields
        if (isNaN(new Date(task.createdAt).getTime())) {
          continue;
        }
        
        if (task.deadline && isNaN(new Date(task.deadline).getTime())) {
          delete task.deadline;
        }
        
        // Validate breakdown array
        if (task.breakdown && !Array.isArray(task.breakdown)) {
          task.breakdown = [];
        }
        
        // Sanitize text fields
        task.name = this.sanitizeText(task.name);
        
        if (task.breakdown) {
          task.breakdown = task.breakdown.map(step => this.sanitizeText(step)).filter(Boolean);
        }
        
        validTasks.push(task);
        
      } catch (error) {
        console.warn('Skipping invalid task in history:', error);
      }
    }
    
    return validTasks;
  }

  /**
   * Sanitize text input to prevent XSS and ensure valid content
   */
  sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Remove any HTML tags and limit length
    return text.replace(/<[^>]*>/g, '').trim().substring(0, 1000);
  }

  /**
   * Save task to history
   */
  async saveTaskToHistory(task) {
    try {
      // Add to beginning of history array
      this.taskHistory.unshift(task);
      
      // Limit history to 20 most recent tasks
      this.taskHistory = this.taskHistory.slice(0, 20);
      
      await this.saveTaskHistory();
      this.updateTaskHistoryDisplay();
    } catch (error) {
      console.error('Failed to save task to history:', error);
    }
  }

  /**
   * Save task history to storage
   */
  async saveTaskHistory() {
    if (!this.storageManager) {
      return false;
    }

    try {
      // Ensure we limit to 20 items before saving
      const limitedHistory = this.taskHistory.slice(0, 20);
      return await this.storageManager.set(this.STORAGE_KEY, limitedHistory);
    } catch (error) {
      console.error('Failed to save task history:', error);
      return false;
    }
  }



  /**
   * Update task history display
   */
  updateTaskHistoryDisplay() {
    const historyList = document.getElementById('taskHistoryList');
    const historyContainer = this.elements.taskHistoryContainer;
    
    if (!historyList || !historyContainer) {
      return;
    }

    if (this.taskHistory.length === 0) {
      historyContainer.style.display = 'none';
      return;
    }

    historyContainer.style.display = 'block';
    historyList.innerHTML = '';

    // Show up to 5 most recent tasks
    const recentTasks = this.taskHistory.slice(0, 5);
    
    recentTasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = 'task-history-item';
      
      const completedSteps = task.completedSteps ? task.completedSteps.length : 0;
      const totalSteps = task.breakdown ? task.breakdown.length : 0;
      const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      
      taskItem.innerHTML = `
        <div class="task-history-content">
          <div class="task-history-name">${this.escapeHtml(task.name)}</div>
          <div class="task-history-meta">
            <span class="task-history-date">${this.formatRelativeDate(task.createdAt)}</span>
            <span class="task-history-progress">${completedSteps}/${totalSteps} steps (${progressPercent}%)</span>
          </div>
        </div>
        <div class="task-history-actions">
          <button class="btn btn-small" onclick="taskManager.loadTaskFromHistory('${task.id}')" title="Load task">
            ↻
          </button>
          <button class="btn btn-small btn-text" onclick="taskManager.deleteTaskFromHistory('${task.id}')" title="Delete task">
            ×
          </button>
        </div>
      `;
      
      historyList.appendChild(taskItem);
    });
  }

  /**
   * Toggle task history visibility
   */
  toggleTaskHistory() {
    const historyList = document.getElementById('taskHistoryList');
    const toggleBtn = document.getElementById('toggleTaskHistoryBtn');
    
    if (!historyList || !toggleBtn) {
      return;
    }

    const isVisible = historyList.style.display !== 'none';
    
    if (isVisible) {
      historyList.style.display = 'none';
      toggleBtn.textContent = 'Show History';
    } else {
      historyList.style.display = 'block';
      toggleBtn.textContent = 'Hide History';
    }
  }

  /**
   * Load task from history
   */
  loadTaskFromHistory(taskId) {
    const task = this.taskHistory.find(t => t.id === taskId);
    if (!task) {
      this.showStatus('Task not found', 'error');
      return;
    }

    // Set current task
    this.currentTask = { ...task };
    
    // Update inputs
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.value = task.name;
    }
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.value = task.deadline;
    }

    // Display breakdown
    this.displayTaskBreakdown(task);
    
    // Restore completion status
    if (task.completedSteps) {
      task.completedSteps.forEach(stepIndex => {
        const stepItem = document.querySelector(`.step-complete-btn[data-step="${stepIndex}"]`)?.closest('.breakdown-step');
        if (stepItem) {
          stepItem.classList.add('completed');
        }
      });
    }

    this.showStatus('Task loaded from history', 'success');
  }

  /**
   * Delete task from history
   */
  async deleteTaskFromHistory(taskId) {
    try {
      this.taskHistory = this.taskHistory.filter(t => t.id !== taskId);
      await this.saveTaskHistory();
      this.updateTaskHistoryDisplay();
      this.showStatus('Task deleted from history', 'success');
    } catch (error) {
      console.error('Failed to delete task:', error);
      this.showStatus('Failed to delete task', 'error');
    }
  }

  /**
   * Save current task as draft
   */
  saveCurrentTaskDraft() {
    const taskName = this.elements.taskNameInput?.value?.trim();
    const deadline = this.elements.taskDeadlineInput?.value;
    
    if (taskName || deadline) {
      const draft = { taskName, deadline };
      localStorage.setItem('taskDraft', JSON.stringify(draft));
    }
  }

  /**
   * Load task draft
   */
  loadTaskDraft() {
    try {
      const draft = localStorage.getItem('taskDraft');
      if (draft) {
        const { taskName, deadline } = JSON.parse(draft);
        if (this.elements.taskNameInput && taskName) {
          this.elements.taskNameInput.value = taskName;
        }
        if (this.elements.taskDeadlineInput && deadline) {
          this.elements.taskDeadlineInput.value = deadline;
        }
      }
    } catch (error) {
      console.error('Failed to load task draft:', error);
    }
  }

  /**
   * Clear task draft
   */
  clearTaskDraft() {
    localStorage.removeItem('taskDraft');
  }

  /**
   * Set loading state for UI elements
   */
  setLoadingState(loading) {
    if (this.elements.getBreakdownBtn) {
      if (loading) {
        this.elements.getBreakdownBtn.classList.add('loading');
        this.elements.getBreakdownBtn.disabled = true;
        this.elements.getBreakdownBtn.textContent = 'Getting Breakdown...';
      } else {
        this.elements.getBreakdownBtn.classList.remove('loading');
        this.elements.getBreakdownBtn.disabled = false;
        this.elements.getBreakdownBtn.textContent = 'Get AI Breakdown';
      }
    }

    // Disable inputs during loading
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.disabled = loading;
    }
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.disabled = loading;
    }
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    if (!this.elements.taskStatus) {
      return;
    }

    this.elements.taskStatus.textContent = message;
    this.elements.taskStatus.className = `task-status ${type}`;
    this.elements.taskStatus.style.display = 'block';

    // Auto-hide after delay (except for loading messages)
    if (type !== 'loading') {
      setTimeout(() => {
        if (this.elements.taskStatus) {
          this.elements.taskStatus.style.display = 'none';
        }
      }, type === 'error' ? 5000 : 3000);
    }
  }

  /**
   * Update UI state
   */
  updateUI() {
    // Load any existing draft
    this.loadTaskDraft();
    
    // Update history display
    this.updateTaskHistoryDisplay();
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get generic task breakdown
   */
  getGenericBreakdown(taskName) {
    return [
      "Research and gather information about the task requirements",
      "Create a detailed plan with timeline and milestones",
      "Identify necessary resources and tools needed",
      "Break down the task into smaller, manageable subtasks",
      "Set up your workspace and organize materials",
      "Begin implementation following your plan",
      "Review progress and adjust approach if needed",
      "Complete final testing and quality checks"
    ];
  }

  /**
   * Format deadline for display
   */
  formatDeadline(deadline) {
    try {
      const date = new Date(deadline);
      const dateStr = date.toLocaleDateString('en-US');
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return dateStr + ' ' + timeStr;
    } catch (error) {
      return deadline;
    }
  }

  /**
   * Format relative date
   */
  formatRelativeDate(dateString) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Save task to storage
   */
  async saveTask(task) {
    if (!this.storageManager) {
      throw new Error('Storage manager not available');
    }
    
    await this.saveTaskToHistory(task);
  }

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    if (!this.elements.taskStatus) {
      this.elements.taskStatus = this.createStatusElement();
    }

    this.elements.taskStatus.textContent = message;
    this.elements.taskStatus.className = `task-status ${type}`;
    this.elements.taskStatus.style.display = 'block';

    // Auto-hide after 3 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (this.elements.taskStatus) {
          this.elements.taskStatus.style.display = 'none';
        }
      }, 3000);
    }
  }

  /**
   * Update UI state
   */
  updateUI() {
    this.updateTaskHistoryDisplay();
    this.loadTaskDraft();
  }

  /**
   * Save current task draft
   */
  saveCurrentTaskDraft() {
    try {
      const draft = {
        taskName: this.elements.taskNameInput?.value || '',
        deadline: this.elements.taskDeadlineInput?.value || '',
        timestamp: Date.now()
      };
      
      localStorage.setItem('taskDraft', JSON.stringify(draft));
    } catch (error) {
      console.warn('Failed to save task draft:', error);
    }
  }

  /**
   * Load task draft
   */
  loadTaskDraft() {
    try {
      const draftStr = localStorage.getItem('taskDraft');
      if (draftStr) {
        const draft = JSON.parse(draftStr);
        
        // Only load if draft is less than 24 hours old
        if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
          if (this.elements.taskNameInput && !this.elements.taskNameInput.value) {
            this.elements.taskNameInput.value = draft.taskName || '';
          }
          if (this.elements.taskDeadlineInput && !this.elements.taskDeadlineInput.value) {
            this.elements.taskDeadlineInput.value = draft.deadline || '';
          }
        } else {
          // Clear old draft
          this.clearTaskDraft();
        }
      }
    } catch (error) {
      console.warn('Failed to load task draft:', error);
    }
  }

  /**
   * Clear task draft
   */
  clearTaskDraft() {
    try {
      localStorage.removeItem('taskDraft');
    } catch (error) {
      console.warn('Failed to clear task draft:', error);
    }
  }

  /**
   * Validate and sanitize task history
   */
  validateAndSanitizeTaskHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    return history.filter(task => {
      return task && 
             typeof task.id === 'string' && 
             typeof task.name === 'string' && 
             task.name.trim().length > 0 &&
             typeof task.createdAt === 'string' &&
             Array.isArray(task.breakdown);
    }).slice(0, 50); // Limit to 50 most recent tasks
  }

  /**
   * Toggle step completion with smooth animations
   */
  toggleStepCompletion(stepElement, stepIndex) {
    try {
      const isCompleted = stepElement.classList.contains('completed');
      
      if (isCompleted) {
        stepElement.classList.remove('completed');
        stepElement.setAttribute('aria-label', `Step ${stepIndex + 1}: Not completed`);
      } else {
        stepElement.classList.add('completed');
        stepElement.setAttribute('aria-label', `Step ${stepIndex + 1}: Completed`);
        
        // Add completion animation
        const stepContent = stepElement.querySelector('.step-content');
        if (stepContent) {
          stepContent.style.animation = 'completionPulse 0.6s ease-out';
          
          setTimeout(() => {
            stepContent.style.animation = '';
          }, 600);
        }
      }
      
      // Update progress
      this.updateTaskProgress();
      
      // Save completion state if task is saved
      if (this.currentTask) {
        this.saveStepCompletion(stepIndex, !isCompleted);
      }
      
    } catch (error) {
      console.error('Error toggling step completion:', error);
    }
  }

  /**
   * Update task progress indicator
   */
  updateTaskProgress() {
    try {
      const progressBar = document.querySelector('.progress-fill');
      const progressText = document.querySelector('.progress-text');
      
      if (!progressBar || !progressText) return;
      
      const totalSteps = document.querySelectorAll('.breakdown-step').length;
      const completedSteps = document.querySelectorAll('.breakdown-step.completed').length;
      
      if (totalSteps === 0) return;
      
      const percentage = Math.round((completedSteps / totalSteps) * 100);
      
      // Animate progress bar
      progressBar.style.width = `${percentage}%`;
      progressText.textContent = `${percentage}%`;
      
      // Add completion celebration if 100%
      if (percentage === 100) {
        this.celebrateTaskCompletion();
      }
      
    } catch (error) {
      console.error('Error updating task progress:', error);
    }
  }

  /**
   * Celebrate task completion with visual feedback
   */
  celebrateTaskCompletion() {
    try {
      const taskBreakdown = this.elements.taskBreakdown;
      if (!taskBreakdown) return;
      
      // Add celebration class for animation
      taskBreakdown.classList.add('task-completed');
      
      // Show completion message
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          '🎉 Congratulations! Task completed!',
          'success',
          { 
            duration: 4000,
            context: 'Task Completion'
          }
        );
      }
      
      // Remove celebration class after animation
      setTimeout(() => {
        taskBreakdown.classList.remove('task-completed');
      }, 2000);
      
    } catch (error) {
      console.error('Error celebrating task completion:', error);
    }
  }

  /**
   * Setup event listeners for breakdown action buttons
   */
  setupBreakdownActionListeners() {
    try {
      const saveBtn = document.getElementById('saveTaskBtn');
      const regenerateBtn = document.getElementById('regenerateTaskBtn');
      const clearBtn = document.getElementById('clearTaskBtn');
      
      if (saveBtn) {
        saveBtn.addEventListener('click', () => this.handleSaveTask());
      }
      
      if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => this.handleRegenerateTask());
      }
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.handleClearTask());
      }
      
    } catch (error) {
      console.error('Error setting up breakdown action listeners:', error);
    }
  }

  /**
   * Setup event listeners for step completion
   */
  setupStepCompletionListeners() {
    try {
      const stepButtons = document.querySelectorAll('.step-complete-btn');
      
      stepButtons.forEach((button, index) => {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          const stepElement = button.closest('.breakdown-step');
          this.toggleStepCompletion(stepElement, index);
        });
      });
      
    } catch (error) {
      console.error('Error setting up step completion listeners:', error);
    }
  }

  /**
   * Handle save task button click
   */
  async handleSaveTask() {
    try {
      if (!this.currentTask) {
        this.showStatus('No task to save', 'warning');
        return;
      }
      
      await this.saveTaskWithErrorHandling(this.currentTask);
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Task saved successfully!',
          'success',
          { duration: 2000 }
        );
      } else {
        this.showStatus('Task saved successfully!', 'success');
      }
      
    } catch (error) {
      console.error('Error saving task:', error);
      this.showStatus('Failed to save task', 'error');
    }
  }

  /**
   * Handle regenerate task button click
   */
  async handleRegenerateTask() {
    try {
      if (!this.currentTask) {
        this.showStatus('No task to regenerate', 'warning');
        return;
      }
      
      const confirmed = confirm('Are you sure you want to regenerate this task breakdown? This will replace the current breakdown.');
      if (!confirmed) return;
      
      // Clear current breakdown
      this.elements.taskBreakdown.style.display = 'none';
      
      // Regenerate with same task data
      await this.handleGetBreakdown();
      
    } catch (error) {
      console.error('Error regenerating task:', error);
      this.showStatus('Failed to regenerate task', 'error');
    }
  }

  /**
   * Handle clear task button click
   */
  handleClearTask() {
    try {
      const confirmed = confirm('Are you sure you want to clear this task breakdown?');
      if (!confirmed) return;
      
      // Clear breakdown display
      this.elements.taskBreakdown.style.display = 'none';
      this.elements.taskBreakdown.innerHTML = '';
      
      // Clear current task
      this.currentTask = null;
      
      // Clear inputs
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.value = '';
      }
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.value = '';
      }
      
      // Clear draft
      this.clearTaskDraft();
      
      if (this.errorHandler) {
        this.errorHandler.showUserFeedback(
          'Task breakdown cleared',
          'info',
          { duration: 2000 }
        );
      } else {
        this.showStatus('Task breakdown cleared', 'info');
      }
      
    } catch (error) {
      console.error('Error clearing task:', error);
    }
  }

  /**
   * Save step completion state
   */
  async saveStepCompletion(stepIndex, isCompleted) {
    try {
      if (!this.currentTask) return;
      
      if (!this.currentTask.completedSteps) {
        this.currentTask.completedSteps = {};
      }
      
      this.currentTask.completedSteps[stepIndex] = isCompleted;
      this.currentTask.updatedAt = new Date().toISOString();
      
      // Save to storage
      await this.saveTaskWithErrorHandling(this.currentTask);
      
    } catch (error) {
      console.error('Error saving step completion:', error);
    }
  }
}

// Export for use in popup
if (typeof window !== 'undefined') {
  window.TaskManager = TaskManager;
}