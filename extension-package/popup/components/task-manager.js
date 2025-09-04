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
  initializeGeminiService() {
    if (typeof GeminiService !== 'undefined') {
      this.geminiService = new GeminiService();
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
   * Set up event listeners
   */
  setupEventListeners() {
    // Task breakdown button
    if (this.elements.getBreakdownBtn) {
      this.elements.getBreakdownBtn.addEventListener('click', () => this.handleGetBreakdown());
    }
    // Enter key on task name input
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.handleGetBreakdown();
        }
      });
    }
    // Task history toggle
    const toggleHistoryBtn = document.getElementById('toggleTaskHistoryBtn');
    if (toggleHistoryBtn) {
      toggleHistoryBtn.addEventListener('click', () => this.toggleTaskHistory());
    }
    // Auto-save task inputs
    if (this.elements.taskNameInput) {
      this.elements.taskNameInput.addEventListener('input', () => this.saveCurrentTaskDraft());
    }
    if (this.elements.taskDeadlineInput) {
      this.elements.taskDeadlineInput.addEventListener('change', () => this.saveCurrentTaskDraft());
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
    // Check deadline
    if (!deadline) {
      return {
        valid: false,
        error: 'Deadline is required',
        field: 'deadline',
        element: this.elements.taskDeadlineInput
      };
    }
    // Validate deadline is in the future
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
    return {
      valid: true,
      taskName,
      deadline
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
   * Set loading state with visual feedback
   */
  setLoadingState(isLoading) {
    if (!this.elements.getBreakdownBtn) return;
    if (isLoading) {
      this.elements.getBreakdownBtn.classList.add('loading');
      this.elements.getBreakdownBtn.disabled = true;
      this.elements.getBreakdownBtn.textContent = 'Generating...';
      // Disable inputs during loading
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.disabled = true;
      }
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.disabled = true;
      }
    } else {
      this.elements.getBreakdownBtn.classList.remove('loading');
      this.elements.getBreakdownBtn.disabled = false;
      this.elements.getBreakdownBtn.textContent = 'Get AI Breakdown';
      // Re-enable inputs
      if (this.elements.taskNameInput) {
        this.elements.taskNameInput.disabled = false;
      }
      if (this.elements.taskDeadlineInput) {
        this.elements.taskDeadlineInput.disabled = false;
      }
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
   * Display task breakdown in the UI
   */
  displayTaskBreakdown(task) {
    if (!this.elements.breakdownList || !this.elements.taskBreakdown) {
      return;
    }
    // Clear existing breakdown
    this.elements.breakdownList.innerHTML = '';
    // Add task header
    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-breakdown-header';
    taskHeader.innerHTML = `
      <h3>Task: ${this.escapeHtml(task.name)}</h3>
      <div class="task-meta">
        <span class="task-deadline">Due: ${this.formatDeadline(task.deadline)}</span>
        ${task.isPlaceholder ? '<span class="task-placeholder-badge">Generic Breakdown</span>' : '<span class="task-ai-badge">AI Generated</span>'}
      </div>
    `;
    // Create breakdown list
    const breakdownSteps = document.createElement('ol');
    breakdownSteps.className = 'breakdown-steps';
    if (Array.isArray(task.breakdown)) {
      task.breakdown.forEach((step, index) => {
        const stepItem = document.createElement('li');
        stepItem.className = 'breakdown-step';
        stepItem.innerHTML = `
          <div class="step-content">
            <span class="step-text">${this.escapeHtml(step)}</span>
            <div class="step-actions">
              <button class="btn btn-small step-complete-btn" data-step="${index}" title="Mark as complete">
                ✓
              </button>
            </div>
          </div>
        `;
        breakdownSteps.appendChild(stepItem);
      });
    }
    // Add action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'task-actions';
    actionButtons.innerHTML = `
      <button class="btn btn-secondary" id="saveTaskBtn">Save Task</button>
      <button class="btn btn-small" id="regenerateTaskBtn">Regenerate</button>
      <button class="btn btn-small btn-text" id="clearTaskBtn">Clear</button>
    `;
    // Assemble the breakdown display
    this.elements.taskBreakdown.innerHTML = '';
    this.elements.taskBreakdown.appendChild(taskHeader);
    this.elements.taskBreakdown.appendChild(breakdownSteps);
    this.elements.taskBreakdown.appendChild(actionButtons);
    this.elements.taskBreakdown.style.display = 'block';
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
   * Toggle step completion status
   */
  toggleStepCompletion(stepIndex) {
    const stepItem = document.querySelector(`.step-complete-btn[data-step="${stepIndex}"]`).closest('.breakdown-step');
    if (stepItem) {
      stepItem.classList.toggle('completed');
      // Update current task completion status
      if (this.currentTask) {
        if (!this.currentTask.completedSteps) {
          this.currentTask.completedSteps = [];
        }
        const isCompleted = stepItem.classList.contains('completed');
        if (isCompleted && !this.currentTask.completedSteps.includes(stepIndex)) {
          this.currentTask.completedSteps.push(stepIndex);
        } else if (!isCompleted) {
          this.currentTask.completedSteps = this.currentTask.completedSteps.filter(i => i !== stepIndex);
        }
      }
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
}
// Export for use in popup
if (typeof window !== 'undefined') {
  window.TaskManager = TaskManager;
}