import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { MessageService } from "./services/message.service";

const messageService = new MessageService();

// Initialize message service
const initializeExtension = () => {
  console.log("Session Switcher extension initializing...");
  
  // Ensure the message service is ready
  if (!messageService) {
    console.error("Message service not initialized!");
  } else {
    console.log("Message service ready");
  }
};

// Extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Session Switcher extension started");
  initializeExtension();
});

// Extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Session Switcher extension installed/updated", details);

  if (details.reason === "install") {
    chrome.storage.local.set({
      [STORAGE_KEYS.SESSIONS]: [],
      [STORAGE_KEYS.ACTIVE_SESSIONS]: {},
    });
  }
  
  initializeExtension();
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message?.action || "unknown");
  
  try {
    return messageService.handleMessage(message, sender, sendResponse);
  } catch (error) {
    console.error("Error in message listener:", error);
    sendResponse({ success: false, error: String(error) });
    return true;
  }
});
