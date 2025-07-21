import { SessionData, StoredSession } from "@shared/types";
import { ExtensionError } from "@shared/utils/errorHandling";
import { CookieHandler } from "./cookie.handler";
import { StorageHandler } from "./storage.handler";

export class SessionHandler {
  private cookieHandler = new CookieHandler();
  private storageHandler = new StorageHandler();

  async getCurrentSession(domain: string, tabId: number): Promise<StoredSession> {
    try {
      const [cookies, storageData] = await Promise.all([
        this.cookieHandler.getCookiesForDomain(domain),
        this.storageHandler.getStorageData(tabId),
      ]);

      return {
        cookies,
        localStorage: storageData.localStorage,
        sessionStorage: storageData.sessionStorage,
      };
    } catch (error) {
      throw new ExtensionError(`Failed to get current session: ${error}`);
    }
  }

  async switchToSession(sessionData: SessionData, tabId: number): Promise<void> {
    if (!sessionData || !tabId) {
      console.error('Invalid session data or tab ID:', { sessionData, tabId });
      throw new ExtensionError('Invalid session data or tab ID');
    }

    const { domain, cookies, localStorage, sessionStorage } = sessionData;
    
    if (!domain) {
      console.error('Missing domain in session data:', sessionData);
      throw new ExtensionError('Missing domain in session data');
    }

    console.log(`Switching to session for domain: ${domain}, tab: ${tabId}`);

    try {
      // Step 1: Clear existing cookies
      console.log('Clearing cookies for domain:', domain);
      await this.cookieHandler.clearCookiesForDomain(domain);

      // Step 2: Restore session data (cookies and storage)
      console.log('Restoring session data...');
      const results = await Promise.allSettled([
        this.cookieHandler.restoreCookies(cookies, domain),
        this.storageHandler.restoreStorageData(tabId, {
          localStorage,
          sessionStorage,
        }),
      ]);
      
      // Check for any failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some operations failed during session switch:', 
          failures.map(f => (f as PromiseRejectedResult).reason));
      }

      // Step 3: Reload the tab to apply changes
      console.log('Reloading tab:', tabId);
      await chrome.tabs.reload(tabId);
      console.log('Session switch completed successfully');
    } catch (error) {
      console.error('Failed to switch session:', error);
      throw new ExtensionError(`Failed to switch session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async clearSession(domain: string, tabId: number): Promise<void> {
    try {
      await Promise.all([
        this.cookieHandler.clearCookiesForDomain(domain),
        this.storageHandler.clearStorageData(tabId),
      ]);

      await chrome.tabs.reload(tabId);
    } catch (error) {
      throw new ExtensionError(`Failed to clear session: ${error}`);
    }
  }
}
