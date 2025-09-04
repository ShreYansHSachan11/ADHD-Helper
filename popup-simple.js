// Simple popup functionality without complex imports
console.log("Simple popup loaded");

// DOM elements
const elements = {
  currentTime: document.getElementById('currentTime'),
  timeLimitInput: document.getElementById('timeLimitInput'),
  takeBreakBtn: document.getElementById('takeBreakBtn'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  setFocusBtn: document.getElementById('setFocusBtn'),
  resetFocusBtn: document.getElementById('resetFocusBtn'),
  focusUrl: document.getElementById('focusUrl'),
  taskNameInput: document.getElementById('taskNameInput'),
  taskDeadlineInput: document.getElementById('taskDeadlineInput'),
  getBreakdownBtn: document.getElementById('getBreakdownBtn'),
  breathingBtn: document.getElementById('breathingBtn'),
  whiteNoiseBtn: document.getElementById('whiteNoiseBtn')
};

// Show status message
function showStatus(elementId, message, type = 'success') {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.style.display = 'block';
    
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }
}

// Send message to background script
async function sendMessage(message) {
  try {
    const response = await chrome.runtime.sendMessage(message);
    return response;
  } catch (error) {
    console.error('Message error:', error);
    return { success: false, error: error.message };
  }
}

// Update current time display
async function updateCurrentTime() {
  try {
    const response = await sendMessage({ type: 'GET_TAB_STATS' });
    if (response.success && response.data) {
      const minutes = Math.floor(response.data.currentSessionTime / (1000 * 60));
      elements.currentTime.textContent = `${minutes}m`;
    }
  } catch (error) {
    console.error('Error updating time:', error);
  }
}

// Update focus display
async function updateFocusDisplay() {
  try {
    const response = await sendMessage({ type: 'GET_FOCUS_INFO' });
    if (response.success && response.data) {
      const url = response.data.url || 'Not set';
      elements.focusUrl.textContent = url.length > 50 ? url.substring(0, 50) + '...' : url;
    } else {
      elements.focusUrl.textContent = 'Not set';
    }
  } catch (error) {
    console.error('Error updating focus display:', error);
  }
}

// Display task breakdown
function displayTaskBreakdown(taskName, breakdown) {
  const breakdownEl = document.getElementById('taskBreakdown');
  const listEl = document.getElementById('breakdownList');
  
  if (breakdownEl && listEl) {
    listEl.innerHTML = '';
    breakdown.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      li.style.marginBottom = '8px';
      listEl.appendChild(li);
    });
    breakdownEl.style.display = 'block';
  }
}

// Event listeners
function setupEventListeners() {
  elements.takeBreakBtn?.addEventListener('click', async () => {
    const response = await sendMessage({ type: 'TRIGGER_MANUAL_BREAK' });
    if (response.success) {
      showStatus('screenTimeStatus', 'Break started! Timer reset.', 'success');
      updateCurrentTime();
    } else {
      showStatus('screenTimeStatus', 'Failed to trigger break', 'error');
    }
  });

  elements.resetDataBtn?.addEventListener('click', async () => {
    const response = await sendMessage({ type: 'CLEAR_TAB_HISTORY' });
    if (response.success) {
      showStatus('screenTimeStatus', 'Data reset successfully!', 'success');
      updateCurrentTime();
    } else {
      showStatus('screenTimeStatus', 'Failed to reset data', 'error');
    }
  });

  elements.setFocusBtn?.addEventListener('click', async () => {
    const response = await sendMessage({ type: 'SET_FOCUS_TAB' });
    if (response.success) {
      showStatus('focusStatus', 'Focus tab set successfully!', 'success');
      updateFocusDisplay();
    } else {
      showStatus('focusStatus', response.error || 'Failed to set focus tab', 'error');
    }
  });

  elements.resetFocusBtn?.addEventListener('click', async () => {
    const response = await sendMessage({ type: 'RESET_FOCUS_TAB' });
    if (response.success) {
      showStatus('focusStatus', 'Focus tab reset!', 'success');
      updateFocusDisplay();
    } else {
      showStatus('focusStatus', 'Failed to reset focus tab', 'error');
    }
  });

  elements.getBreakdownBtn?.addEventListener('click', () => {
    const taskName = elements.taskNameInput?.value?.trim();
    const deadline = elements.taskDeadlineInput?.value;
    
    if (!taskName) {
      showStatus('taskStatus', 'Please enter a task name', 'error');
      return;
    }
    
    if (!deadline) {
      showStatus('taskStatus', 'Please set a deadline', 'error');
      return;
    }
    
    // Simple task breakdown
    const breakdown = [
      `Research and plan for "${taskName}"`,
      'Break down into smaller subtasks',
      'Set up necessary resources',
      'Begin implementation',
      'Review and refine',
      'Complete and finalize'
    ];
    
    displayTaskBreakdown(taskName, breakdown);
    showStatus('taskStatus', 'Task breakdown created!', 'success');
  });

  elements.breathingBtn?.addEventListener('click', () => {
    showStatus('wellnessStatus', 'Breathing exercise feature coming soon!', 'success');
  });

  elements.whiteNoiseBtn?.addEventListener('click', () => {
    showStatus('wellnessStatus', 'White noise feature coming soon!', 'success');
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  updateCurrentTime();
  updateFocusDisplay();
  
  // Update time every 10 seconds
  setInterval(updateCurrentTime, 10000);
});

console.log("Simple popup initialized");