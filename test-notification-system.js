/**
 * Test script for notification system functionality
 * Run this in the browser console to test notifications
 */

async function testNotificationSystem() {
  console.log("=== NOTIFICATION SYSTEM TEST ===");
  
  try {
    // Check notification permission
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      const permission = await chrome.notifications.getPermissionLevel();
      console.log("Notification permission:", permission);
      
      if (permission !== 'granted') {
        console.log("⚠️ Notifications not permitted - this will prevent break reminders");
        return false;
      }
    } else {
      console.log("❌ Chrome notifications API not available");
      return false;
    }
    
    // Test creating a simple notification
    const testId = `test-notification-${Date.now()}`;
    
    try {
      await chrome.notifications.create(testId, {
        type: "basic",
        iconUrl: "/assets/icons/icon48.png",
        title: "Test Notification",
        message: "This is a test notification to verify the system is working.",
        requireInteraction: true
      });
      
      console.log("✅ Test notification created successfully");
      
      // Clear the test notification after 5 seconds
      setTimeout(async () => {
        try {
          await chrome.notifications.clear(testId);
          console.log("✅ Test notification cleared");
        } catch (error) {
          console.log("⚠️ Could not clear test notification:", error);
        }
      }, 5000);
      
      return true;
    } catch (error) {
      console.log("❌ Failed to create test notification:", error);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error testing notification system:", error);
    return false;
  }
}

async function testBreakReminderFlow() {
  console.log("=== BREAK REMINDER FLOW TEST ===");
  
  try {
    // First test the notification system
    const notificationWorking = await testNotificationSystem();
    if (!notificationWorking) {
      console.log("❌ Notification system not working, break reminders will fail");
      return false;
    }
    
    // Get current timer status
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
        console.log(`Threshold: ${thresholdMinutes} minutes (should be 5 minutes now)`);
        console.log(`Timer active: ${status.breakTimer.isWorkTimerActive}`);
        console.log(`On break: ${status.breakTimer.isOnBreak}`);
        console.log(`Threshold exceeded: ${status.breakTimer.isThresholdExceeded}`);
        
        if (thresholdMinutes !== 5) {
          console.log("⚠️ Threshold is not 5 minutes as expected");
        }
        
        if (status.breakTimer.isThresholdExceeded) {
          console.log("✅ Work time threshold exceeded - should show notification");
          
          // Force check for break reminder
          const checkResponse = await chrome.runtime.sendMessage({
            type: "CHECK_BREAK_TIMER_THRESHOLD"
          });
          
          if (checkResponse && checkResponse.success) {
            console.log("✅ Break timer threshold check triggered");
          } else {
            console.log("❌ Failed to trigger break timer check:", checkResponse?.error);
          }
        } else {
          console.log(`⏳ Need ${thresholdMinutes - workTimeMinutes} more minutes to trigger notification`);
          console.log("💡 You can wait or use forceBreakReminder() to test immediately");
        }
      } else {
        console.log("❌ Break timer not available");
      }
    } else {
      console.log("❌ Failed to get timer status:", response?.error);
    }
    
  } catch (error) {
    console.error("❌ Error testing break reminder flow:", error);
  }
  
  console.log("=== END BREAK REMINDER FLOW TEST ===");
}

async function forceBreakReminder() {
  console.log("=== FORCING BREAK REMINDER ===");
  
  try {
    // Force a break timer notification
    const response = await chrome.runtime.sendMessage({
      type: "SHOW_BREAK_TIMER_NOTIFICATION",
      workMinutes: 5
    });
    
    if (response && response.success) {
      console.log("✅ Break reminder notification forced successfully");
    } else {
      console.log("❌ Failed to force break reminder:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error forcing break reminder:", error);
  }
  
  console.log("=== END FORCE BREAK REMINDER ===");
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
Notification System Test Functions Loaded!

To test the complete break reminder system:

1. testNotificationSystem() - Test basic notification functionality
2. testBreakReminderFlow() - Test the complete break reminder flow
3. ensureWorkTimerStarted() - Ensure work timer is running
4. forceBreakReminder() - Force a break reminder notification for testing

Example usage:
testNotificationSystem()      // Test notifications work
ensureWorkTimerStarted()      // Start the work timer
testBreakReminderFlow()       // Check the complete flow
forceBreakReminder()          // Force a notification for testing

The break reminder threshold is now set to 5 minutes by default.
After starting the work timer, you should get a notification after 5 minutes of work.
`);