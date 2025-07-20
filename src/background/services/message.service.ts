import { SessionHandler } from "@background/handlers/session.handler";
import { MESSAGE_ACTIONS } from "@shared/constants/messages";
import { REQUIRED_PERMISSIONS } from "@shared/constants/requiredPermission";
import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { MessageType, SendResponseType, StoredSession } from "@shared/types";
import { handleError } from "@shared/utils/errorHandling";

export class MessageService {
  private sessionHandler = new SessionHandler();

  handleMessage(message: MessageType, _: chrome.runtime.MessageSender, sendResponse: SendResponseType): boolean {
    this.checkPermissions()
      .then(() => {
        return this.processMessage(message, sendResponse);
      })
      .catch((error) => {
        const errorMessage = handleError(error, "MessageService.handleMessage");
        sendResponse({ success: false, error: errorMessage });
      });

    return true;
  }

  private async checkPermissions(): Promise<void> {
    try {
      const permissions = await chrome.permissions.getAll();

      this.validateRequiredPermissions(permissions);
      this.validateOriginPermissions(permissions);
    } catch (error) {
      throw error;
    }
  }

  private validateRequiredPermissions(permissions: chrome.permissions.Permissions): void {
    for (const permission of REQUIRED_PERMISSIONS) {
      if (!permissions.permissions?.includes(permission)) {
        throw new Error("Data access permission is required.");
      }
    }
  }

  private validateOriginPermissions(permissions: chrome.permissions.Permissions): void {
    const origins = permissions.origins || [];

    if (origins.length === 0) {
      throw new Error("Data access permission is required.");
    }

    const hasBroadAccess = origins.some(
      (origin) => origin === "<all_urls>" || origin === "*://*/*" || origin === "http://*/*" || origin === "https://*/*"
    );

    if (!hasBroadAccess) {
      throw new Error("Data access permission is required.");
    }
  }

  private async processMessage(message: MessageType, sendResponse: SendResponseType): Promise<void> {
    switch (message.action) {
      case MESSAGE_ACTIONS.GET_CURRENT_SESSION:
        await this.handleGetCurrentSession(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.SWITCH_SESSION:
        await this.handleSwitchSession(message, sendResponse);
        break;

      case MESSAGE_ACTIONS.CLEAR_SESSION:
        await this.handleClearSession(message, sendResponse);
        break;
        
      // GET_CURRENT_DOMAIN handler removed - now using URL parameters
        
      case MESSAGE_ACTIONS.CLEAR_SESSIONS:
        await this.handleClearSessions(message, sendResponse);
        break;
        
      case MESSAGE_ACTIONS.EXPORT_SESSIONS:
        await this.handleExportSessions(message, sendResponse);
        break;
        
      case MESSAGE_ACTIONS.IMPORT_SESSIONS:
        await this.handleImportSessions(message, sendResponse);
        break;

      default:
        sendResponse({ success: false, error: "Unknown action" });
    }
  }

  private async handleGetCurrentSession(
    message: Extract<MessageType, { action: "getCurrentSession" }>,
    sendResponse: SendResponseType<StoredSession | null>
  ): Promise<void> {
    const sessionData = await this.sessionHandler.getCurrentSession(message.domain, message.tabId);
    sendResponse({ success: true, data: sessionData });
  }

  private async handleSwitchSession(
    message: Extract<MessageType, { action: "switchSession" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    await this.sessionHandler.switchToSession(message.sessionData, message.tabId);
    sendResponse({ success: true });
  }

  private async handleClearSession(
    message: Extract<MessageType, { action: "clearSession" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    await this.sessionHandler.clearSession(message.domain, message.tabId);
    sendResponse({ success: true });
  }
  
  // handleGetCurrentDomain method removed - now using URL parameters
  
  private async handleClearSessions(
    message: Extract<MessageType, { action: "clearSessions" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      const { clearOption, domain } = message;
      
      if (clearOption === "current") {
        // Clear sessions for current domain only
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await this.sessionHandler.clearSession(domain, tab.id);
          
          // Also remove from storage
          const sessions = await this.getStoredSessions();
          const updatedSessions = sessions.filter(s => s.domain !== domain);
          await this.saveStoredSessions(updatedSessions);
        }
      } else if (clearOption === "all") {
        // Clear all sessions from storage
        await this.saveStoredSessions([]);
        await this.saveActiveSessionsMap({});
      }
      
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
  }
  
  private async handleExportSessions(
    message: Extract<MessageType, { action: "exportSessions" }>,
    sendResponse: SendResponseType<string>
  ): Promise<void> {
    try {
      const { exportOption, domain } = message;
      const sessions = await this.getStoredSessions();
      
      let sessionsToExport = sessions;
      if (exportOption === "current") {
        sessionsToExport = sessions.filter(s => s.domain === domain);
      }
      
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        sessions: sessionsToExport
      };
      
      sendResponse({ success: true, data: JSON.stringify(exportData, null, 2) });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
  }
  
  private async handleImportSessions(
    message: Extract<MessageType, { action: "importSessions" }>,
    sendResponse: SendResponseType
  ): Promise<void> {
    try {
      const { data } = message;
      let importData;
      
      try {
        importData = JSON.parse(data);
      } catch (e) {
        sendResponse({ success: false, error: "Invalid JSON format" });
        return;
      }
      
      // Validate import data structure
      if (!importData || !importData.sessions || !Array.isArray(importData.sessions)) {
        sendResponse({ success: false, error: "Invalid import data format" });
        return;
      }
      
      const currentSessions = await this.getStoredSessions();
      const importedSessions = importData.sessions;
      
      // Generate new IDs for imported sessions to avoid conflicts
      const sessionsWithNewIds = importedSessions.map((session: any) => ({
        ...session,
        id: crypto.randomUUID()
      }));
      
      // Merge with existing sessions
      const mergedSessions = [...currentSessions, ...sessionsWithNewIds];
      
      // Save merged sessions
      await this.saveStoredSessions(mergedSessions);
      
      sendResponse({ success: true });
    } catch (error) {
      sendResponse({ success: false, error: String(error) });
    }
  }
  
  private async getStoredSessions(): Promise<any[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SESSIONS);
    return result[STORAGE_KEYS.SESSIONS] || [];
  }
  
  private async saveStoredSessions(sessions: any[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.SESSIONS]: sessions });
  }
  
  private async getActiveSessionsMap(): Promise<Record<string, string>> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVE_SESSIONS);
    return result[STORAGE_KEYS.ACTIVE_SESSIONS] || {};
  }
  
  private async saveActiveSessionsMap(activeSessions: Record<string, string>): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_SESSIONS]: activeSessions });
  }
}
