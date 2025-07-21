import { MessageResponse, MessageType } from "@shared/types";

export class ChromeApiService {
  async getCurrentTab(): Promise<chrome.tabs.Tab> {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      throw new Error("No active tab found");
    }
    return tabs[0];
  }

  async sendMessage<T>(message: MessageType): Promise<MessageResponse<T>> {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response: MessageResponse<T>) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError);
            resolve({
              success: false,
              error: chrome.runtime.lastError.message || "Could not establish connection. Receiving end does not exist.",
            });
          } else if (!response) {
            console.error('No response received from background script');
            resolve({
              success: false,
              error: "No response received from background script",
            });
          } else {
            resolve(response);
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        resolve({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }

  async getStorageData<T>(keys: (keyof T)[]): Promise<T> {
    return chrome.storage.local.get(keys) as Promise<T>;
  }

  async setStorageData(data: Record<string, unknown>): Promise<void> {
    return chrome.storage.local.set(data);
  }
}
