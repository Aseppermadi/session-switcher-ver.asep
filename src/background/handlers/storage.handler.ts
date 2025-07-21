import { clearStorage, extractStorageData, injectStorageData } from "@background/services/storageData.service";
import { StorageData } from "@shared/types";
import { ExtensionError } from "@shared/utils/errorHandling";

export class StorageHandler {
  async getStorageData(tabId: number): Promise<StorageData> {
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: extractStorageData,
      });

      return results?.[0]?.result || { localStorage: {}, sessionStorage: {} };
    } catch (error) {
      console.error("Error getting storage data:", error);
      return { localStorage: {}, sessionStorage: {} };
    }
  }

  async restoreStorageData(tabId: number, data: StorageData): Promise<void> {
    if (!tabId) {
      console.error('Invalid tab ID for restoring storage data:', tabId);
      throw new ExtensionError('Invalid tab ID for restoring storage data');
    }

    if (!data || (!data.localStorage && !data.sessionStorage)) {
      console.warn('Empty storage data provided for restoration');
      // Continue with empty data rather than throwing an error
    }

    console.log(`Restoring storage data for tab ${tabId}:`, {
      localStorageKeys: data.localStorage ? Object.keys(data.localStorage).length : 0,
      sessionStorageKeys: data.sessionStorage ? Object.keys(data.sessionStorage).length : 0
    });

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: injectStorageData,
        args: [data.localStorage || {}, data.sessionStorage || {}],
      });

      // Check if the script execution was successful
      if (!results || results.length === 0 || results[0].result !== true) {
        console.error('Storage data injection failed:', results);
        throw new ExtensionError('Failed to inject storage data into the page');
      }

      console.log('Storage data successfully restored');
    } catch (error) {
      console.error('Error restoring storage data:', error);
      throw new ExtensionError(`Failed to restore storage data: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clearStorageData(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: clearStorage,
      });
    } catch (error) {
      throw new ExtensionError(`Failed to clear storage data: ${error}`);
    }
  }
}
