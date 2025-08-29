// Background service worker - to be implemented in later tasks
console.log('Focus Productivity Extension background service worker loaded');

// Basic service worker setup
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Tab tracking and other background functionality will be implemented in later tasks