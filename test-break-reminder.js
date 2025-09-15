/**
 * Test script for break reminder functionality
 * Run this in the browser console to test break reminders
 */

async function testBreakReminder() {
  console.log("=== BREAK REMINDER TEST ===");
  
  try {
    // Get timer status from background script
    const response = await chrome.runtime.sendMessage({
      type: "GET_INTEGRATED_TIMER_STATUS"
    });
    
    if (response && response.success) {
      const status = response.data;
      console.log("Current timer status:", status);
      
      if (status.breakTimer) {
        const workTimeMinutes = Math.floor(status.breakTimer.currentWorkTime / (1000 * 60));
        const thresholdMinutes = Math.floor(status.breakTimer.workTimeThreshold / (1000 * 60));
        
        console.log(`Work time: ${workTimeMinutes} minutes`);
        console.log(`Threshold: ${thresholdMinutes} minutes (should be 5 minutes)`);
        console.log(`Timer active: ${status.breakTimer.isWorkTimerActive}`);
        console.log(`On break: ${status.breakTimer.isOnBreak}`);
        console.log(`Threshold exceeded: ${status.breakTimer.isThresholdExceeded}`);
        
        if (thresholdMinutes !== 5) {
          console.log("⚠️ Threshold is not 5 minutes as expected!");
        }
        
        if (status.breakTimer.isThresholdExceeded) {
          console.log("✅ Work time threshold exceeded - should show notification");
        } else {
          console.log(`⏳ Need ${thresholdMinutes - workTimeMinutes} more minutes to trigger notification`);
        }
      } else {
        console.log("❌ Break timer not available");
      }
    } else {
      console.log("❌ Failed to get timer status:", response?.error);
    }
    
    // Test notification permission
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      const permission = await chrome.notifications.getPermissionLevel();
      console.log("Notification permission:", permission);
      
      if (permission !== 'granted') {
        console.log("⚠️ Notifications not permitted - this may prevent break reminders");
      }
    }
    
  } catch (error) {
    console.error("❌ Error testing break reminder:", error);
  }
  
  console.log("=== END BREAK REMINDER TEST ===");
}

async function forceBreakReminder() {
  console.log("=== FORCING BREAK REMINDER TEST ===");
  
  try {
    // Force a break timer notification by sending a message
    const response = await chrome.runtime.sendMessage({
      type: "SHOW_BREAK_TIMER_NOTIFICATION",
      workMinutes: 30
    });
    
    if (response && response.success) {
      console.log("✅ Break reminder notification forced successfully");
    } else {
      console.log("❌ Failed to force break reminder:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error forcing break reminder:", error);
  }
  
  console.log("=== END FORCE BREAK REMINDER TEST ===");
}

async function startWorkTimer() {
  console.log("=== STARTING WORK TIMER ===");
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: "START_WORK_TIMER"
    });
    
    if (response && response.success) {
      console.log("✅ Work timer started successfully");
      console.log("Now wait for the break reminder after the configured time period");
    } else {
      console.log("❌ Failed to start work timer:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error starting work timer:", error);
  }
  
  console.log("=== END START WORK TIMER ===");
}

async function ensureWorkTimerStarted() {
  console.log("=== ENSURING WORK TIMER STARTED ===");
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: "ENSURE_WORK_TIMER_STARTED"
    });
    
    if (response && response.success) {
      console.log("✅ Work timer ensured to be running");
      console.log("Timer will now track work time automatically");
    } else {
      console.log("❌ Failed to ensure work timer:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error ensuring work timer started:", error);
  }
  
  console.log("=== END ENSURE WORK TIMER ===");
}

// Instructions
console.log(`
Break Reminder Test Functions Loaded!

To test break reminder functionality:

1. testBreakReminder() - Check current timer status and settings
2. ensureWorkTimerStarted() - Ensure work timer is running (recommended first step)
3. startWorkTimer() - Manually start the work timer (if ensure doesn't work)
4. forceBreakReminder() - Force a break reminder notification for testing

Example usage:
testBreakReminder()
ensureWorkTimerStarted()  // Try this first
startWorkTimer()          // If ensure doesn't work
forceBreakReminder()

Troubleshooting steps:
1. Run testBreakReminder() to check if timer is active
2. If timer is not active, run ensureWorkTimerStarted()
3. If still not working, try startWorkTimer()
4. Wait for the configured time period (now default 5 minutes)
5. Or use forceBreakReminder() to test notification immediately

Note: Make sure you have been actively using the browser for the break reminder to trigger naturally.
`);