/**
 * Accessibility Enhancement Module
 * Provides WCAG 2.1 compliance features and accessibility improvements
 */

class AccessibilityManager {
  constructor() {
    this.announcer = null;
    this.focusTracker = null;
    this.keyboardNavigation = null;
    this.init();
  }

  /**
   * Initialize accessibility features
   */
  init() {
    this.createScreenReaderAnnouncer();
    this.setupKeyboardNavigation();
    this.setupFocusManagement();
    this.setupARIALabels();
    this.setupColorContrastSupport();
    this.setupReducedMotionSupport();
    this.setupScreenReaderSupport();
  }

  /**
   * Create screen reader announcer for dynamic content
   */
  createScreenReaderAnnouncer() {
    this.announcer = document.createElement('div');
    this.announcer.id = 'screen-reader-announcer';
    this.announcer.setAttribute('aria-live', 'polite');
    this.announcer.setAttribute('aria-atomic', 'true');
    this.announcer.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(this.announcer);
  }

  /**
   * Announce message to screen readers
   */
  announce(message, priority = 'polite') {
    if (!this.announcer) return;
    
    this.announcer.setAttribute('aria-live', priority);
    this.announcer.textContent = '';
    
    // Small delay to ensure screen readers pick up the change
    setTimeout(() => {
      this.announcer.textContent = message;
    }, 100);
  }

  /**
   * Setup keyboard navigation
   */
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscapeKey(e);
      }
      
      // Tab navigation enhancement
      if (e.key === 'Tab') {
        this.handleTabNavigation(e);
      }
      
      // Arrow key navigation for custom components
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        this.handleArrowNavigation(e);
      }
      
      // Enter and Space for button activation
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[role="button"]')) {
        e.preventDefault();
        e.target.click();
      }
    });
  }

  /**
   * Handle escape key for modal dismissal
   */
  handleEscapeKey(e) {
    const modal = document.querySelector('.modal[style*="display: block"], .modal:not([style*="display: none"])');
    if (modal) {
      const closeBtn = modal.querySelector('.close-btn');
      if (closeBtn) {
        closeBtn.click();
      }
    }
  }

  /**
   * Enhanced tab navigation
   */
  handleTabNavigation(e) {
    const focusableElements = this.getFocusableElements();
    const currentIndex = focusableElements.indexOf(document.activeElement);
    
    if (e.shiftKey) {
      // Shift+Tab (backward)
      if (currentIndex === 0) {
        e.preventDefault();
        focusableElements[focusableElements.length - 1].focus();
      }
    } else {
      // Tab (forward)
      if (currentIndex === focusableElements.length - 1) {
        e.preventDefault();
        focusableElements[0].focus();
      }
    }
  }

  /**
   * Handle arrow key navigation for lists and grids
   */
  handleArrowNavigation(e) {
    const target = e.target;
    
    // Handle list navigation
    if (target.matches('[role="listitem"], .list-item, .breakdown-step')) {
      e.preventDefault();
      this.navigateList(target, e.key);
    }
    
    // Handle grid navigation
    if (target.matches('[role="gridcell"], .grid-item')) {
      e.preventDefault();
      this.navigateGrid(target, e.key);
    }
  }

  /**
   * Navigate within lists
   */
  navigateList(currentItem, key) {
    const list = currentItem.closest('[role="list"], .list, .breakdown-steps');
    if (!list) return;
    
    const items = Array.from(list.querySelectorAll('[role="listitem"], .list-item, .breakdown-step'));
    const currentIndex = items.indexOf(currentItem);
    
    let nextIndex;
    if (key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % items.length;
    } else if (key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + items.length) % items.length;
    }
    
    if (nextIndex !== undefined) {
      const nextItem = items[nextIndex];
      const focusableChild = nextItem.querySelector('button, input, [tabindex="0"]');
      (focusableChild || nextItem).focus();
    }
  }

  /**
   * Navigate within grids
   */
  navigateGrid(currentCell, key) {
    const grid = currentCell.closest('[role="grid"], .grid');
    if (!grid) return;
    
    const rows = Array.from(grid.querySelectorAll('[role="row"], .grid-row'));
    const currentRow = currentCell.closest('[role="row"], .grid-row');
    const currentRowIndex = rows.indexOf(currentRow);
    const cells = Array.from(currentRow.querySelectorAll('[role="gridcell"], .grid-item'));
    const currentCellIndex = cells.indexOf(currentCell);
    
    let nextCell;
    
    switch (key) {
      case 'ArrowRight':
        nextCell = cells[currentCellIndex + 1];
        break;
      case 'ArrowLeft':
        nextCell = cells[currentCellIndex - 1];
        break;
      case 'ArrowDown':
        if (rows[currentRowIndex + 1]) {
          const nextRowCells = rows[currentRowIndex + 1].querySelectorAll('[role="gridcell"], .grid-item');
          nextCell = nextRowCells[currentCellIndex];
        }
        break;
      case 'ArrowUp':
        if (rows[currentRowIndex - 1]) {
          const prevRowCells = rows[currentRowIndex - 1].querySelectorAll('[role="gridcell"], .grid-item');
          nextCell = prevRowCells[currentCellIndex];
        }
        break;
    }
    
    if (nextCell) {
      nextCell.focus();
    }
  }

  /**
   * Get all focusable elements
   */
  getFocusableElements() {
    const selector = `
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"]),
      [role="button"]:not([disabled]),
      a[href]
    `;
    
    return Array.from(document.querySelectorAll(selector))
      .filter(el => this.isVisible(el));
  }

  /**
   * Check if element is visible
   */
  isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetParent !== null;
  }

  /**
   * Setup focus management
   */
  setupFocusManagement() {
    // Track focus for restoration
    this.focusTracker = {
      lastFocused: null,
      modalStack: []
    };
    
    document.addEventListener('focusin', (e) => {
      if (!e.target.closest('.modal')) {
        this.focusTracker.lastFocused = e.target;
      }
    });
    
    // Focus trap for modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        const modal = document.querySelector('.modal[style*="display: block"], .modal:not([style*="display: none"])');
        if (modal) {
          this.trapFocus(e, modal);
        }
      }
    });
  }

  /**
   * Trap focus within modal
   */
  trapFocus(e, modal) {
    const focusableElements = Array.from(modal.querySelectorAll(`
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"])
    `)).filter(el => this.isVisible(el));
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Setup ARIA labels and descriptions
   */
  setupARIALabels() {
    // Add skip link
    this.addSkipLink();
    
    // Enhance form labels
    this.enhanceFormLabels();
    
    // Add ARIA landmarks
    this.addARIALandmarks();
    
    // Enhance button descriptions
    this.enhanceButtonDescriptions();
    
    // Add live regions for dynamic content
    this.addLiveRegions();
  }

  /**
   * Add skip to content link
   */
  addSkipLink() {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      const mainContent = document.getElementById('main-content') || document.querySelector('main') || document.querySelector('.container');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView();
      }
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
  }

  /**
   * Enhance form labels
   */
  enhanceFormLabels() {
    // Associate labels with inputs
    document.querySelectorAll('input, select, textarea').forEach(input => {
      if (!input.id) {
        input.id = `input-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Find associated label
      let label = document.querySelector(`label[for="${input.id}"]`);
      if (!label) {
        label = input.closest('label');
      }
      
      if (label && !input.getAttribute('aria-labelledby')) {
        if (!label.id) {
          label.id = `label-${input.id}`;
        }
        input.setAttribute('aria-labelledby', label.id);
      }
      
      // Add required indicator
      if (input.required && !input.getAttribute('aria-required')) {
        input.setAttribute('aria-required', 'true');
      }
      
      // Add invalid state
      if (input.validity && !input.validity.valid) {
        input.setAttribute('aria-invalid', 'true');
      }
    });
  }

  /**
   * Add ARIA landmarks
   */
  addARIALandmarks() {
    // Main content area
    const container = document.querySelector('.container');
    if (container && !container.getAttribute('role')) {
      container.setAttribute('role', 'main');
      container.id = 'main-content';
    }
    
    // Navigation areas
    document.querySelectorAll('.header, .navigation').forEach(nav => {
      if (!nav.getAttribute('role')) {
        nav.setAttribute('role', 'navigation');
      }
    });
    
    // Content sections
    document.querySelectorAll('.section').forEach(section => {
      if (!section.getAttribute('role')) {
        section.setAttribute('role', 'region');
      }
      
      const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading && !section.getAttribute('aria-labelledby')) {
        if (!heading.id) {
          heading.id = `heading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        section.setAttribute('aria-labelledby', heading.id);
      }
    });
  }

  /**
   * Enhance button descriptions
   */
  enhanceButtonDescriptions() {
    document.querySelectorAll('button').forEach(button => {
      // Add accessible names for icon-only buttons
      if (!button.textContent.trim() && !button.getAttribute('aria-label')) {
        const icon = button.querySelector('.icon');
        if (icon) {
          const title = button.getAttribute('title');
          if (title) {
            button.setAttribute('aria-label', title);
          }
        }
      }
      
      // Add expanded state for toggle buttons
      if (button.classList.contains('toggle-btn')) {
        const isActive = button.classList.contains('active');
        button.setAttribute('aria-pressed', isActive.toString());
      }
      
      // Add loading state
      if (button.classList.contains('loading')) {
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('aria-disabled', 'true');
      }
    });
  }

  /**
   * Add live regions for dynamic content
   */
  addLiveRegions() {
    // Status messages
    document.querySelectorAll('.status, .task-status, .calendar-status').forEach(status => {
      if (!status.getAttribute('aria-live')) {
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
      }
    });
    
    // Error messages
    document.querySelectorAll('.error, .error-message').forEach(error => {
      if (!error.getAttribute('aria-live')) {
        error.setAttribute('aria-live', 'assertive');
        error.setAttribute('role', 'alert');
      }
    });
  }

  /**
   * Setup color contrast support
   */
  setupColorContrastSupport() {
    // Check for high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      document.body.classList.add('high-contrast');
    }
    
    // Listen for contrast changes
    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('high-contrast');
      } else {
        document.body.classList.remove('high-contrast');
      }
    });
  }

  /**
   * Setup reduced motion support
   */
  setupReducedMotionSupport() {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.body.classList.add('reduced-motion');
    }
    
    // Listen for motion preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      if (e.matches) {
        document.body.classList.add('reduced-motion');
      } else {
        document.body.classList.remove('reduced-motion');
      }
    });
  }

  /**
   * Setup screen reader support
   */
  setupScreenReaderSupport() {
    // Add screen reader only text for context
    document.querySelectorAll('.icon-only, .sr-context').forEach(element => {
      const context = element.getAttribute('data-sr-context');
      if (context) {
        const srText = document.createElement('span');
        srText.className = 'sr-only';
        srText.textContent = context;
        element.appendChild(srText);
      }
    });
    
    // Enhance table accessibility
    document.querySelectorAll('table').forEach(table => {
      if (!table.getAttribute('role')) {
        table.setAttribute('role', 'table');
      }
      
      // Add table caption if missing
      if (!table.querySelector('caption')) {
        const heading = table.previousElementSibling;
        if (heading && heading.matches('h1, h2, h3, h4, h5, h6')) {
          table.setAttribute('aria-labelledby', heading.id || (heading.id = `table-heading-${Date.now()}`));
        }
      }
    });
  }

  /**
   * Update button state
   */
  updateButtonState(button, state) {
    switch (state) {
      case 'loading':
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('aria-disabled', 'true');
        this.announce(`${button.textContent || button.getAttribute('aria-label')} is loading`);
        break;
      case 'success':
        button.removeAttribute('aria-busy');
        button.removeAttribute('aria-disabled');
        this.announce(`${button.textContent || button.getAttribute('aria-label')} completed successfully`);
        break;
      case 'error':
        button.removeAttribute('aria-busy');
        button.removeAttribute('aria-disabled');
        button.setAttribute('aria-invalid', 'true');
        this.announce(`${button.textContent || button.getAttribute('aria-label')} failed`, 'assertive');
        break;
      default:
        button.removeAttribute('aria-busy');
        button.removeAttribute('aria-disabled');
        button.removeAttribute('aria-invalid');
    }
  }

  /**
   * Update form field state
   */
  updateFieldState(field, state, message) {
    switch (state) {
      case 'error':
        field.setAttribute('aria-invalid', 'true');
        field.classList.add('error-state');
        if (message) {
          this.addFieldError(field, message);
        }
        break;
      case 'success':
        field.removeAttribute('aria-invalid');
        field.classList.remove('error-state');
        field.classList.add('success-state');
        this.removeFieldError(field);
        break;
      default:
        field.removeAttribute('aria-invalid');
        field.classList.remove('error-state', 'success-state');
        this.removeFieldError(field);
    }
  }

  /**
   * Add error message to field
   */
  addFieldError(field, message) {
    this.removeFieldError(field);
    
    const errorId = `${field.id}-error`;
    const errorElement = document.createElement('div');
    errorElement.id = errorId;
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    
    field.parentNode.insertBefore(errorElement, field.nextSibling);
    field.setAttribute('aria-describedby', errorId);
    
    this.announce(message, 'assertive');
  }

  /**
   * Remove error message from field
   */
  removeFieldError(field) {
    const errorId = `${field.id}-error`;
    const errorElement = document.getElementById(errorId);
    if (errorElement) {
      errorElement.remove();
      field.removeAttribute('aria-describedby');
    }
  }

  /**
   * Focus management for modals
   */
  openModal(modal) {
    // Store current focus
    this.focusTracker.modalStack.push(document.activeElement);
    
    // Focus first focusable element in modal
    const firstFocusable = modal.querySelector(`
      button:not([disabled]),
      input:not([disabled]),
      select:not([disabled]),
      textarea:not([disabled]),
      [tabindex]:not([tabindex="-1"])
    `);
    
    if (firstFocusable) {
      firstFocusable.focus();
    }
    
    // Announce modal opening
    const modalTitle = modal.querySelector('h1, h2, h3, h4, h5, h6');
    if (modalTitle) {
      this.announce(`${modalTitle.textContent} dialog opened`);
    }
  }

  /**
   * Close modal and restore focus
   */
  closeModal() {
    const previousFocus = this.focusTracker.modalStack.pop();
    if (previousFocus && this.isVisible(previousFocus)) {
      previousFocus.focus();
    } else if (this.focusTracker.lastFocused && this.isVisible(this.focusTracker.lastFocused)) {
      this.focusTracker.lastFocused.focus();
    }
    
    this.announce('Dialog closed');
  }
}

// Initialize accessibility manager
if (typeof window !== 'undefined') {
  window.accessibilityManager = new AccessibilityManager();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AccessibilityManager;
}