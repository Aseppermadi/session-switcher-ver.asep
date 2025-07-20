import { storedSessionDefaultValue } from "@popup/utils/defaultValue";
import { MESSAGE_ACTIONS } from "@shared/constants/messages";
import { STORAGE_KEYS } from "@shared/constants/storageKeys";
import { ExtensionStorage, PopupState, SessionData, StoredSession } from "@shared/types";
import { getDomainFromUrl } from "@shared/utils/domain";
import { ExtensionError, handleError } from "@shared/utils/errorHandling";
import { generateId } from "@shared/utils/idGenerator";
import { validateSessionName } from "@shared/utils/validation";
import { ChromeApiService } from "./chromeApi.service";

export class PopupService {
  private chromeApi = new ChromeApiService();
  private state: PopupState = {
    currentDomain: "",
    currentTab: {} as chrome.tabs.Tab,
    sessions: [],
    activeSessions: {},
    currentRenameSessionId: "",
    currentDeleteSessionId: "",
    viewMode: 'list',
  };

  async initialize(): Promise<PopupState> {
    try {
      this.state.currentTab = await this.chromeApi.getCurrentTab();
      if (!this.state.currentTab.url) {
        throw new ExtensionError("Unable to get current tab URL");
      }

      this.state.currentDomain = getDomainFromUrl(this.state.currentTab.url);
      await this.loadStorageData();

      return { ...this.state };
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.initialize"));
    }
  }

  async saveCurrentSession(name: string, order?: number): Promise<SessionData> {
    try {
      const validatedName = validateSessionName(name);

      const response = await this.chromeApi.sendMessage<StoredSession | null>({
        action: MESSAGE_ACTIONS.GET_CURRENT_SESSION,
        domain: this.state.currentDomain,
        tabId: this.state.currentTab.id!,
      });

      if (!response.success) {
        throw new ExtensionError(response.error || "Failed to get current session");
      }

      const storedSession = response.data ?? storedSessionDefaultValue;
      
      // Get domain-specific sessions
      const domainSessions = this.state.sessions.filter(s => s.domain === this.state.currentDomain);
      
      // If no order is provided, calculate the next order value
      if (order === undefined) {
        order = domainSessions.length > 0 ? Math.max(...domainSessions.map(s => s.order || 0)) + 1 : 1;
      }

      // Adjust order of existing sessions if necessary
      // Always shift sessions with equal or higher order values
      this.state.sessions.forEach(s => {
        if (s.domain === this.state.currentDomain && typeof order === 'number' && s.order >= order) {
          s.order++;
        }
      });

      const newSession: SessionData = {
        ...storedSession,
        id: generateId(),
        name: validatedName,
        order,
        domain: this.state.currentDomain,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      this.state.sessions.push(newSession);
      this.state.activeSessions[this.state.currentDomain] = newSession.id;
      await this.saveStorageData();

      return newSession;
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.saveCurrentSession"));
    }
  }

  async switchToSession(sessionId: string): Promise<void> {
    try {
      const session = this.state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new ExtensionError("Session not found");
      }

      const response = await this.chromeApi.sendMessage({
        action: MESSAGE_ACTIONS.SWITCH_SESSION,
        sessionData: session,
        tabId: this.state.currentTab.id!,
      });

      if (!response.success) {
        throw new ExtensionError(response.error || "Failed to switch session");
      }

      this.state.activeSessions[this.state.currentDomain] = sessionId;
      session.lastUsed = Date.now();

      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.switchToSession"));
    }
  }

  async createNewSession(): Promise<void> {
    try {
      const response = await this.chromeApi.sendMessage({
        action: MESSAGE_ACTIONS.CLEAR_SESSION,
        domain: this.state.currentDomain,
        tabId: this.state.currentTab.id!,
      });

      if (!response.success) {
        throw new ExtensionError(response.error || "Failed to clear session");
      }

      delete this.state.activeSessions[this.state.currentDomain];
      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.createNewSession"));
    }
  }

  async renameSession(sessionId: string, newName: string, newOrder?: number): Promise<void> {
    try {
      const session = this.state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new ExtensionError("Session not found");
      }

      const oldOrder = session.order;
      session.name = validateSessionName(newName);
      
      // Only adjust orders if newOrder is provided and different from current order
      if (newOrder !== undefined && oldOrder !== newOrder) {
        // If moving to a lower order (e.g., from 3 to 1)
        if (newOrder < oldOrder) {
          this.state.sessions.forEach(s => {
            if (s.id !== sessionId && s.domain === this.state.currentDomain && s.order >= newOrder && s.order < oldOrder) {
              s.order++;
            }
          });
        }
        // If moving to a higher order (e.g., from 1 to 3)
        else if (newOrder > oldOrder) {
          this.state.sessions.forEach(s => {
            if (s.id !== sessionId && s.domain === this.state.currentDomain && s.order <= newOrder && s.order > oldOrder) {
              s.order--;
            }
          });
        }
        
        session.order = newOrder;
      }

      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.renameSession"));
    }
  }

  async replaceSession(sessionId: string): Promise<void> {
    try {
      const session = this.state.sessions.find((s) => s.id === sessionId);
      if (!session) {
        throw new ExtensionError("Session not found");
      }

      const response = await this.chromeApi.sendMessage<StoredSession | null>({
        action: MESSAGE_ACTIONS.GET_CURRENT_SESSION,
        domain: this.state.currentDomain,
        tabId: this.state.currentTab.id!,
      });

      if (!response.success) {
        throw new ExtensionError(response.error || "Failed to get current session");
      }

      const storedSession = response.data ?? storedSessionDefaultValue;

      session.cookies = storedSession.cookies;
      session.localStorage = storedSession.localStorage;
      session.sessionStorage = storedSession.sessionStorage;
      session.lastUsed = Date.now();

      this.state.activeSessions[this.state.currentDomain] = sessionId;
      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.replaceSession"));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      // Find the session to be deleted
      const sessionToDelete = this.state.sessions.find(s => s.id === sessionId);
      if (!sessionToDelete) {
        throw new ExtensionError("Session not found");
      }

      const deletedOrder = sessionToDelete.order;
      const deletedDomain = sessionToDelete.domain;

      // Remove the session
      this.state.sessions = this.state.sessions.filter((s) => s.id !== sessionId);

      // Adjust order of remaining sessions
      this.state.sessions.forEach(s => {
        if (s.domain === deletedDomain && s.order > deletedOrder) {
          s.order--;
        }
      });

      if (this.state.activeSessions[this.state.currentDomain] === sessionId) {
        delete this.state.activeSessions[this.state.currentDomain];
      }

      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.deleteSession"));
    }
  }

  getSession(sessionId: string): SessionData | undefined {
    return this.state.sessions.find((s) => s.id === sessionId);
  }

  getState(): PopupState {
    return { ...this.state };
  }

  setState(newState: Partial<PopupState>): void {
    this.state = { ...this.state, ...newState };
  }

  private async loadStorageData(): Promise<void> {
    try {
      const result = await this.chromeApi.getStorageData<ExtensionStorage>([
        STORAGE_KEYS.SESSIONS,
        STORAGE_KEYS.ACTIVE_SESSIONS,
        STORAGE_KEYS.VIEW_MODE,
      ]);

      this.state.sessions = result[STORAGE_KEYS.SESSIONS] || [];
      this.state.activeSessions = result[STORAGE_KEYS.ACTIVE_SESSIONS] || {};
      this.state.viewMode = result[STORAGE_KEYS.VIEW_MODE] || 'list';
    } catch (error) {
      console.error("Error loading storage data:", error);
      this.state.sessions = [];
      this.state.activeSessions = {};
      this.state.viewMode = 'list';
    }
  }

  private async saveStorageData(): Promise<void> {
    await this.chromeApi.setStorageData({
      [STORAGE_KEYS.SESSIONS]: this.state.sessions,
      [STORAGE_KEYS.ACTIVE_SESSIONS]: this.state.activeSessions,
      [STORAGE_KEYS.VIEW_MODE]: this.state.viewMode,
    });
  }
  
  async setViewMode(mode: 'list' | 'grid'): Promise<void> {
    this.state.viewMode = mode;
    await this.saveStorageData();
  }

  async clearSessions(clearOption: string): Promise<void> {
    try {
      if (clearOption === 'current') {
        // Clear sessions for current website only
        this.state.sessions = this.state.sessions.filter(s => s.domain !== this.state.currentDomain);
        delete this.state.activeSessions[this.state.currentDomain];

        // Clear current session in the browser
        const response = await this.chromeApi.sendMessage({
          action: MESSAGE_ACTIONS.CLEAR_SESSION,
          domain: this.state.currentDomain,
          tabId: this.state.currentTab.id!,
        });

        if (!response.success) {
          throw new ExtensionError(response.error || "Failed to clear current session");
        }
      } else if (clearOption === 'all') {
        // Clear all sessions
        this.state.sessions = [];
        this.state.activeSessions = {};

        // Clear current session in the browser
        const response = await this.chromeApi.sendMessage({
          action: MESSAGE_ACTIONS.CLEAR_SESSION,
          domain: this.state.currentDomain,
          tabId: this.state.currentTab.id!,
        });

        if (!response.success) {
          throw new ExtensionError(response.error || "Failed to clear current session");
        }
      }

      await this.saveStorageData();
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.clearSessions"));
    }
  }

  exportSessions(exportOption: string): string {
    try {
      let sessionsToExport: SessionData[] = [];
      
      if (exportOption === 'current') {
        // Export sessions for current website only
        sessionsToExport = this.state.sessions.filter(s => s.domain === this.state.currentDomain);
      } else if (exportOption === 'all') {
        // Export all sessions
        sessionsToExport = [...this.state.sessions];
      }

      const exportData = {
        sessions: sessionsToExport,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.exportSessions"));
    }
  }

  async importSessions(jsonData: string): Promise<void> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData || !Array.isArray(importData.sessions)) {
        throw new ExtensionError("Invalid import data format");
      }

      const importedSessions: SessionData[] = importData.sessions;
      
      // Validate imported sessions
      for (const session of importedSessions) {
        if (!session.id || !session.domain || !session.name) {
          throw new ExtensionError("Invalid session data in import file");
        }
      }

      // Check for duplicate IDs and generate new IDs if needed
      const existingIds = new Set(this.state.sessions.map(s => s.id));
      importedSessions.forEach(session => {
        if (existingIds.has(session.id)) {
          session.id = generateId();
        }
        existingIds.add(session.id);
      });

      // Add imported sessions to existing sessions
      this.state.sessions = [...this.state.sessions, ...importedSessions];
      
      await this.saveStorageData();
      
      return;
    } catch (error) {
      throw new ExtensionError(handleError(error, "PopupService.importSessions"));
    }
  }
}
