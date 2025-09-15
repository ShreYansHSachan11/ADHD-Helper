/**
 * Debug script for break reminder system
 * This script helps debug why break reminders might not be working
 */

async function debugBreakReminderSystem() {
  console.log("🔍 === DEBUGGING BREAK REMINDER SYSTEM ===");
  
  const results = {
    notificationPermission: null,
    timerStatus: null,
    workTimerActive: false,
    thresholdMinutes: null,
    currentWorkMinutes: null,
    thresholdExceeded: false,
    issues: []
  };
  
  try {
    // 1. Check notification permission
    console.log("1️⃣ Checking notification permission...");
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      const permission = await chrome.notifications.getPermissionLevel();
      results.notificationPermission = permission;
      console.log(`   Permission: ${permission}`);
      
      if (permission !== 'granted') {
        results.issues.push("❌ Notification permission not granted");
      } else {
        console.log("   ✅ Notification permission granted");
      }
    } else {
      results.issues.push("❌ Chrome notifications API not available");
    }
    
    // 2. Check timer status
    console.log("2️⃣ Checking timer status...");
    const response = await chrome.runtime.sendMessage({
      type: "GET_INTEGRATED_TIMER_STATUS"
    });
    
    if (response && response.success) {
      results.timerStatus = response.data;
      
      if (response.data.breakTimer) {
        const bt = response.data.breakTimer;
        results.workTimerActive = bt.isWorkTimerActive;
        results.thresholdMinutes = Math.floor(bt.workTimeThreshold / (1000 * 60));
        results.currentWorkMinutes = Math.floor(bt.currentWorkTime / (1000 * 60));
        results.thresholdExceeded = bt.isThresholdExceeded;
        
        console.log(`   Work timer active: ${bt.isWorkTimerActive}`);
        console.log(`   On break: ${bt.isOnBreak}`);
        console.log(`   Current work time: ${results.currentWorkMinutes} minutes`);
        console.log(`   Threshold: ${results.thresholdMinutes} minutes`);
        console.log(`   Threshold exceeded: ${bt.isThresholdExceeded}`);
        
        if (!bt.isWorkTimerActive && !bt.isOnBreak) {
          results.issues.push("⚠️ Work timer is not active");
        }
        
        if (results.thresholdMinutes !== 5) {
          results.issues.push(`⚠️ Threshold is ${results.thresholdMinutes} minutes, expected 5 minutes`);
        }
        
        if (bt.isWorkTimerActive) {
          console.log("   ✅ Work timer is running");
        }
        
        if (results.thresholdMinutes === 5) {
          console.log("   ✅ Threshold correctly set to 5 minutes");
        }
      } else {
        results.issues.push("❌ Break timer not available in status");
      }
    } else {
      results.issues.push("❌ Failed to get timer status");
    }
    
    // 3. Test notification creation
    console.log("3️⃣ Testing notification creation...");
    if (results.notificationPermission === 'granted') {
      try {
        const testId = `debug-test-${Date.now()}`;
        await chrome.notifications.create(testId, {
          type: "basic",
          iconUrl: "/assets/icons/icon48.png",
          title: "Debug Test",
          message: "This is a test notification",
          requireInteraction: false
        });
        
        console.log("   ✅ Test notification created successfully");
        
        // Clear it after 3 seconds
        setTimeout(async () => {
          try {
            await chrome.notifications.clear(testId);
          } catch (e) {
            // Ignore errors when clearing
          }
        }, 3000);
        
      } catch (error) {
        results.issues.push(`❌ Failed to create test notification: ${error.message}`);
      }
    }
    
    // 4. Check if work timer can be started
    console.log("4️⃣ Checking if work timer can be started...");
    if (!results.workTimerActive) {
      try {
        const startResponse = await chrome.runtime.sendMessage({
          type: "START_WORK_TIMER"
        });
        
        if (startResponse && startResponse.success) {
          console.log("   ✅ Work timer started successfully");
        } else {
          results.issues.push(`❌ Failed to start work timer: ${startResponse?.error || 'Unknown error'}`);
        }
      } catch (error) {
        results.issues.push(`❌ Error starting work timer: ${error.message}`);
      }
    }
    
    // 5. Summary
    console.log("📋 === SUMMARY ===");
    if (results.issues.length === 0) {
      console.log("🎉 No issues found! Break reminder system should be working.");
      console.log(`⏰ You should get a notification after ${results.thresholdMinutes || 5} minutes of work.`);
    } else {
      console.log("⚠️ Issues found:");
      results.issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    return results;
    
  } catch (error) {
    console.error("❌ Error during debugging:", error);
    results.issues.push(`❌ Debug error: ${error.message}`);
    return results;
  }
}

async function forceBreakReminderTest() {
  console.log("🚀 === FORCING BREAK REMINDER TEST ===");
  
  try {
    // Force a break timer notification
    const response = await chrome.runtime.sendMessage({
      type: "SHOW_BREAK_TIMER_NOTIFICATION",
      workMinutes: 5
    });
    
    if (response && response.success) {
      console.log("✅ Break reminder notification forced successfully");
      console.log("   You should see a notification with break options now");
    } else {
      console.log("❌ Failed to force break reminder:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error forcing break reminder:", error);
  }
}

async function startWorkTimerAndWait() {
  console.log("⏱️ === STARTING WORK TIMER AND MONITORING ===");
  
  try {
    // Start the work timer
    const startResponse = await chrome.runtime.sendMessage({
      type: "START_WORK_TIMER"
    });
    
    if (startResponse && startResponse.success) {
      console.log("✅ Work timer started");
      console.log("⏰ Monitoring for 5 minutes... (you can close this and continue working)");
      
      // Monitor every 30 seconds for 5 minutes
      let elapsed = 0;
      const maxTime = 5 * 60; // 5 minutes in seconds
      
      const monitor = setInterval(async () => {
        elapsed += 30;
        
        try {
          const statusResponse = await chrome.runtime.sendMessage({
            type: "GET_INTEGRATED_TIMER_STATUS"
          });
          
          if (statusResponse && statusResponse.success && statusResponse.data.breakTimer) {
            const bt = statusResponse.data.breakTimer;
            const workMinutes = Math.floor(bt.currentWorkTime / (1000 * 60));
            const workSeconds = Math.floor((bt.currentWorkTime % (1000 * 60)) / 1000);
            
            console.log(`⏰ Work time: ${workMinutes}:${workSeconds.toString().padStart(2, '0')} | Threshold exceeded: ${bt.isThresholdExceeded}`);
            
            if (bt.isThresholdExceeded) {
              console.log("🎯 Threshold exceeded! Notification should appear soon.");
              clearInterval(monitor);
              return;
            }
          }
        } catch (error) {
          console.log("Error checking status:", error.message);
        }
        
        if (elapsed >= maxTime) {
          console.log("⏰ 5 minutes elapsed. If no notification appeared, there may be an issue.");
          clearInterval(monitor);
        }
      }, 30000); // Check every 30 seconds
      
    } else {
      console.log("❌ Failed to start work timer:", startResponse?.error);
    }
  } catch (error) {
    console.error("❌ Error starting work timer:", error);
  }
}

// Instructions
console.log(`
🔧 Break Reminder Debug Tools Loaded!

Available functions:

1. debugBreakReminderSystem() - Complete system diagnosis
2. forceBreakReminderTest() - Force a break reminder notification
3. startWorkTimerAndWait() - Start timer and monitor for 5 minutes

Recommended workflow:
1. Run debugBreakReminderSystem() first to check for issues
2. If no issues, run startWorkTimerAndWait() to test the full flow
3. Or use forceBreakReminderTest() to immediately test notifications

Example:
debugBreakReminderSystem()
`);