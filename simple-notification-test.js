// Ultra-simple notification test - paste into service worker console

async function simpleTest() {
  try {
    console.log("🔔 Testing ultra-simple notification...");
    
    // Test 1: Absolute minimum notification
    const result1 = await chrome.notifications.create({
      type: "basic",
      title: "SIMPLE TEST",
      message: "Can you see this notification?",
      iconUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    });
    console.log("✅ Simple notification result:", result1);
    
    // Test 2: Even simpler - no icon
    setTimeout(async () => {
      const result2 = await chrome.notifications.create({
        type: "basic", 
        title: "NO ICON TEST",
        message: "This has no icon"
      });
      console.log("✅ No-icon notification result:", result2);
    }, 3000);
    
    // Test 3: Check Windows notification settings
    console.log("📋 Checking notification permission...");
    const permission = await chrome.notifications.getPermissionLevel();
    console.log("📋 Permission:", permission);
    
    if (permission !== "granted") {
      console.error("❌ Notification permission not granted!");
      return;
    }
    
    console.log("🔔 Tests complete. Did you see any notifications appear?");
    console.log("If not, check Windows notification settings:");
    console.log("1. Press Win+I → System → Notifications");
    console.log("2. Make sure Chrome notifications are enabled");
    console.log("3. Check Focus Assist is OFF");
    
  } catch (error) {
    console.error("❌ Error in simple test:", error);
  }
}

simpleTest();