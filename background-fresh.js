/**
 * Fresh Minimal Background Service Worker
 * No imports, no external dependencies
 */

console.log("Fresh background service worker starting...");

// Session tracking
let sessionData = {
  startTime: Date.now(),
  currentSessionTime: 0,
  focusTab: null,
};

/**
 * Extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed:", details.reason);

  if (details.reason === "install") {
    // Set default settings
    chrome.storage.local.set({
      screenTimeSettings: {
        limitMinutes: 30,
        enabled: true,
      },
      focusSettings: {
        trackingEnabled: true,
      },
    });
  }
});

/**
 * Handle messages from popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message.type);

  switch (message.type) {
    case "GET_TAB_STATS":
      const currentTime = Date.now() - sessionData.startTime;
      sendResponse({
        success: true,
        data: {
          currentSessionTime: currentTime,
          breakRemindersShown: 0,
        },
      });
      break;

    case "TRIGGER_MANUAL_BREAK":
      sessionData.startTime = Date.now();
      sendResponse({ success: true });
      break;

    case "SET_FOCUS_TAB":
      chrome.tabs
        .query({ active: true, currentWindow: true })
        .then((tabs) => {
          if (tabs.length > 0) {
            sessionData.focusTab = {
              id: tabs[0].id,
              url: tabs[0].url,
              title: tabs[0].title,
            };
            chrome.storage.local.set({ focusTab: sessionData.focusTab });
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: "No active tab" });
          }
        })
        .catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
      break;

    case "GET_FOCUS_INFO":
      sendResponse({ success: true, data: sessionData.focusTab });
      break;

    case "RESET_FOCUS_TAB":
      sessionData.focusTab = null;
      chrome.storage.local.remove("focusTab");
      sendResponse({ success: true });
      break;

    case "CLEAR_TAB_HISTORY":
      sessionData.startTime = Date.now();
      sendResponse({ success: true });
      break;

    case "toggleWhiteNoise":
    case "TOGGLE_WHITE_NOISE":
      // Handle white noise toggle - both message formats
      const isActive =
        message.active !== undefined
          ? !message.active
          : !(message.enabled || false);
      sendResponse({
        success: true,
        active: isActive,
        enabled: isActive,
        sound: "Ocean Waves",
        soundIndex: 1,
      });
      break;

    case "SET_AUDIO_VOLUME":
      // Handle audio volume setting
      sendResponse({ success: true, volume: message.volume || 50 });
      break;

    case "CHANGE_SOUND":
      // Handle sound change
      sendResponse({ success: true, soundIndex: message.soundIndex || 0 });
      break;

    case "GET_AUDIO_STATUS":
    case "getWhiteNoiseStatus":
      // Handle audio status request
      sendResponse({
        success: true,
        data: {
          enabled: false,
          volume: 50,
          currentSound: 0,
        },
      });
      break;

    case "SET_AUDIO_VOLUME":
    case "setWhiteNoiseVolume":
      // Handle audio volume setting
      sendResponse({ success: true, volume: message.volume || 50 });
      break;

    case "CHANGE_SOUND":
    case "nextWhiteNoiseSound":
      // Handle sound change
      sendResponse({ success: true, soundIndex: message.soundIndex || 0 });
      break;

    case "GET_FOCUS_SESSION_STATS":
      // Handle focus session stats request
      sendResponse({
        success: true,
        data: {
          sessionTime: Date.now() - sessionData.startTime,
          deviationCount: 0,
          lastReminder: null,
        },
      });
      break;

    case "GET_FOCUS_DEVIATION_HISTORY":
      // Handle focus deviation history request
      sendResponse({
        success: true,
        data: {
          deviations: [],
        },
      });
      break;

    case "TRACK_WELLNESS_EVENT":
      // Handle wellness event tracking
      console.log("Wellness event tracked:", message.event, message.data);
      sendResponse({ success: true });
      break;

    default:
      console.warn("Unknown message type:", message.type);
      sendResponse({
        success: false,
        error: "Unknown message type: " + message.type,
      });
  }

  return true; // Keep message channel open
});

console.log("Fresh background service worker ready!");
