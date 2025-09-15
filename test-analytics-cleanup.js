/**
 * Test script to clean analytics data and verify functionality
 * This can be run in the browser console to test the analytics cleanup
 */

async function testAnalyticsCleanup() {
  console.log("Testing analytics cleanup functionality...");
  
  try {
    // Send message to background script to clean analytics data
    const response = await chrome.runtime.sendMessage({
      type: "CLEAN_ANALYTICS_DATA",
    });
    
    if (response && response.success) {
      console.log("✅ Analytics data cleaned successfully!");
      console.log("Message:", response.message);
    } else {
      console.error("❌ Failed to clean analytics data:", response?.error);
    }
  } catch (error) {
    console.error("❌ Error during cleanup test:", error);
  }
}

// Instructions for use
console.log(`
Analytics Cleanup Test Script Loaded!

To test the analytics cleanup functionality:
1. Open the extension popup
2. Go to the Break Reminder tab
3. Look for the 🗑️ button in the analytics section
4. Click it to clean all analytics data

Or run this in the console:
testAnalyticsCleanup()

Note: This will permanently delete all break analytics data!
`);