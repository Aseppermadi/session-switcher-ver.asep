import { getDomainFromUrl } from "@shared/utils/domain";
import { handleError } from "@shared/utils/errorHandling";
import { LoadingManager } from "./components/loadingManager";
import { ModalManager } from "./components/modalManager";
import { SessionList } from "./components/sessionList";
import { PopupService } from "./services/popup.service";
import { getElementByIdSafe } from "./utils/dom";

class PopupController {
  private loadingManager = new LoadingManager();
  private modalManager = new ModalManager();
  private sessionList: SessionList;
  private popupService = new PopupService();

  private currentSiteElement: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private newSessionBtn: HTMLButtonElement;
  private clearSessionBtn: HTMLButtonElement;
  private exportImportBtn: HTMLButtonElement;
  private viewModeBtn: HTMLButtonElement;
  private menuBtn: HTMLButtonElement;
  private menuDropdown: HTMLElement;
  private aboutBtn: HTMLButtonElement;
  private sessionsListElement: HTMLElement;
  state: any;

  constructor() {
    // Get DOM elements
    this.currentSiteElement = getElementByIdSafe("currentSite");
    this.saveBtn = getElementByIdSafe("saveBtn");
    this.newSessionBtn = getElementByIdSafe("newSessionBtn");
    this.clearSessionBtn = getElementByIdSafe("clearSessionBtn");
    this.exportImportBtn = getElementByIdSafe("exportImportBtn");
    this.viewModeBtn = getElementByIdSafe("viewModeBtn");
    this.menuBtn = getElementByIdSafe("menuBtn");
    this.menuDropdown = getElementByIdSafe("menuDropdown");
    this.aboutBtn = getElementByIdSafe("aboutBtn");
    this.sessionsListElement = getElementByIdSafe("sessionsList");

    // Initialize session list
    this.sessionList = new SessionList(this.sessionsListElement);
    this.setupSessionListHandlers();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      this.modalManager.hideAllModals();
      this.state = await this.loadingManager.withLoading(async () => {
        return await this.popupService.initialize();
      });

      this.currentSiteElement.textContent = this.state.currentDomain;
      
      // Apply saved view mode
      if (this.state.viewMode === 'grid') {
        this.switchToGridView(false);
      } else {
        this.switchToListView(false);
      }
      
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "PopupController.initialize"));
    }
  }

  getServiceInstance(): PopupService {
    return this.popupService;
  }

  private setupEventListeners(): void {
    this.saveBtn.addEventListener("click", () => this.handleSaveClick());
    this.newSessionBtn.addEventListener("click", () => this.handleNewSessionConfirmClick());
    this.clearSessionBtn.addEventListener("click", () => this.handleClearSessionClick());
    this.exportImportBtn.addEventListener("click", () => this.handleExportImportClick());
    this.viewModeBtn.addEventListener("click", () => this.toggleViewMode());
    this.menuBtn.addEventListener("click", () => this.toggleMenu());
    this.aboutBtn.addEventListener("click", () => this.handleAboutClick());
    
    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!this.menuBtn.contains(e.target as Node) && !this.menuDropdown.contains(e.target as Node)) {
        this.menuDropdown.classList.remove("show");
      }
    });

    // Modal event listeners
    getElementByIdSafe("confirmSave").addEventListener("click", () => this.handleConfirmSave());
    getElementByIdSafe("confirmRename").addEventListener("click", () => this.handleConfirmRename());
    getElementByIdSafe("confirmDelete").addEventListener("click", () => this.handleConfirmDelete());
    getElementByIdSafe("replaceSessionBtn").addEventListener("click", () => this.handleReplaceSessionClick());
    getElementByIdSafe("confirmReplaceSession").addEventListener("click", () => this.handleReplaceSession());
    getElementByIdSafe("confirmNewSession").addEventListener("click", () => this.handleNewSessionClick());
    getElementByIdSafe("confirmClearSession").addEventListener("click", () => this.handleConfirmClearSession());
    getElementByIdSafe("exportBtn").addEventListener("click", () => this.handleExport());
    getElementByIdSafe("importBtn").addEventListener("click", () => this.handleImport());
  }

  private setupSessionListHandlers(): void {
    this.sessionList.setEventHandlers({
      onSessionClick: (sessionId) => this.handleSessionSwitch(sessionId),
      onRenameClick: (sessionId) => this.handleRenameClick(sessionId),
      onDeleteClick: (sessionId) => this.handleDeleteClick(sessionId),
    });
  }

  private async handleSaveClick(): Promise<void> {
    const state = this.popupService.getState();
    const currentDomain = state.currentDomain;
    
    // Filter sessions by current domain
    const domainSessions = state.sessions.filter(s => s.domain === currentDomain);
    
    // Calculate next order based on domain-specific sessions
    const nextOrder = domainSessions.length > 0 ? Math.max(...domainSessions.map(s => s.order || 0)) + 1 : 1;
    
    this.modalManager.showSaveModal("", nextOrder);
  }

  private async handleConfirmSave(): Promise<void> {
    try {
      const { name, order } = this.modalManager.getSaveModalInput();

      await this.loadingManager.withLoading(async () => {
        const orderNum = order ? parseInt(order, 10) : undefined;
        await this.popupService.saveCurrentSession(name, orderNum);
      });

      this.modalManager.hideSaveModal();
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "save session"));
    }
  }

  private async handleNewSessionClick(): Promise<void> {
    try {
      await this.loadingManager.withLoading(async () => {
        await this.popupService.createNewSession();
      });

      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "create new session"));
    }
  }

  private async handleSessionSwitch(sessionId: string): Promise<void> {
    if (!sessionId) {
      this.showError('Invalid session ID');
      return;
    }

    try {
      console.log('Switching to session:', sessionId);
      
      await this.loadingManager.withLoading(async () => {
        await this.popupService.switchToSession(sessionId);
      });

      console.log('Session switch completed successfully');
      this.renderSessionsList();
    } catch (error) {
      console.error('Error switching session:', error);
      const errorMessage = handleError(error, "switch session");
      
      // Show a more user-friendly error message
      if (errorMessage.includes('Receiving end does not exist')) {
        this.showError('Connection to background service failed. Please try reloading the extension.');
      } else {
        this.showError(errorMessage);
      }
    }
  }

  private handleRenameClick(sessionId: string): void {
    const session = this.popupService.getSession(sessionId);
    if (session) {
      this.popupService.setState({ currentRenameSessionId: sessionId });
      this.modalManager.showRenameModal(session.name, session.order);
    }
  }

  private async handleConfirmRename(): Promise<void> {
    try {
      const { name, order } = this.modalManager.getRenameModalInput();
      const sessionId = this.popupService.getState().currentRenameSessionId;

      if (name && order && sessionId) {
        const orderNum = parseInt(order, 10);
        await this.popupService.renameSession(sessionId, name, orderNum);
        this.renderSessionsList();
      }

      this.modalManager.hideRenameModal();
    } catch (error) {
      this.showError(handleError(error, "rename session"));
    }
  }

  private handleReplaceSessionClick(): Promise<void> {
    try {
        const sessionId = this.popupService.getState().currentRenameSessionId;
        if (sessionId) {
            const session = this.popupService.getSession(sessionId);
            if (session) {
                this.modalManager.showReplaceConfirmModal(session.name);
            }
        }
        return Promise.resolve();
    } catch (error) {
        this.showError(handleError(error, "prepare replace session"));
        return Promise.resolve();
    }
  }

  private async handleReplaceSession(): Promise<void> {
    try {
        const sessionId = this.popupService.getState().currentRenameSessionId;
        if (sessionId) {
            await this.loadingManager.withLoading(async () => {
                await this.popupService.replaceSession(sessionId);
            });
            this.renderSessionsList();
        }
        this.modalManager.hideReplaceConfirmModal();
        this.modalManager.hideRenameModal();
    } catch (error) {
        this.showError(handleError(error, "replace session"));
    }
  }

  private handleDeleteClick(sessionId: string): void {
    const session = this.popupService.getSession(sessionId);
    if (session) {
      this.popupService.setState({ currentDeleteSessionId: sessionId });
      this.modalManager.showDeleteModal(session.name);
    }
  }

  private async handleConfirmDelete(): Promise<void> {
    try {
      const sessionId = this.popupService.getState().currentDeleteSessionId;

      if (sessionId) {
        await this.popupService.deleteSession(sessionId);
        this.renderSessionsList();
      }

      this.modalManager.hideDeleteModal();
    } catch (error) {
      this.showError(handleError(error, "delete session"));
    }
  }

  private switchToListView(savePreference: boolean = true): void {
    this.sessionsListElement.classList.remove("grid-view");
    this.viewModeBtn.textContent = "Grid";
    
    if (savePreference) {
      this.popupService.setViewMode('list');
    }
    
    this.renderSessionsList();
  }

  private switchToGridView(savePreference: boolean = true): void {
    this.sessionsListElement.classList.add("grid-view");

    this.viewModeBtn.textContent = "List";
    
    if (savePreference) {
      this.popupService.setViewMode('grid');
    }
    
    this.renderSessionsList();
  }
  
  private toggleViewMode(): void {
    const isGridView = this.sessionsListElement.classList.contains("grid-view");
    if (isGridView) {
      this.switchToListView();
    } else {
      this.switchToGridView();
    }
  }
  
  private toggleMenu(): void {
    this.menuDropdown.classList.toggle("show");
  }
  
  private handleAboutClick(): void {
    this.modalManager.showAboutModal();
    this.menuDropdown.classList.remove("show");
  }
  
  private handleNewSessionConfirmClick(): void {
    this.modalManager.showNewSessionConfirmModal();
    this.menuDropdown.classList.remove("show");
  }

  private renderSessionsList(): void {
    const state = this.popupService.getState();
    this.sessionList.render(state.sessions, state.activeSessions, state.currentDomain);
  }

  private showError(message: string): void {
    console.error("Popup error:", message);

    this.modalManager.showErrorModal(message);
  }

  private handleClearSessionClick(): void {
    // Show the clear session modal instead of opening a new page
    this.modalManager.showClearSessionModal();
    this.menuDropdown.classList.remove("show");
  }

  private async handleConfirmClearSession(): Promise<void> {
    try {
      const clearOption = this.modalManager.getClearSessionOption();
      
      await this.loadingManager.withLoading(async () => {
        await this.popupService.clearSessions(clearOption);
      });

      this.modalManager.hideClearSessionModal();
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, "clear sessions"));
    }
  }

  private handleExportImportClick(): void {
    // Show the export/import modal instead of opening a new page
    this.modalManager.showExportImportModal();
    this.menuDropdown.classList.remove("show");
  }

  private handleExport(): void {
    try {
      const exportOption = this.modalManager.getExportOption();
      const jsonData = this.popupService.exportSessions(exportOption);
      
      // Create a blob and download link
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-switcher-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (error) {
      this.showError(handleError(error, "export sessions"));
    }
  }

  private async handleImport(): Promise<void> {
    try {
      const file = this.modalManager.getImportFile();
      if (!file) {
        this.showError("No file selected");
        return;
      }
      
      // Read the file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonData = e.target?.result as string;
          
          await this.loadingManager.withLoading(async () => {
            await this.popupService.importSessions(jsonData);
          });
          
          this.modalManager.hideExportImportModal();
          this.renderSessionsList();
        } catch (error) {
          this.showError(handleError(error, "import sessions"));
        }
      };
      
      reader.onerror = () => {
        this.showError("Error reading file");
      };
      
      reader.readAsText(file);
    } catch (error) {
      this.showError(handleError(error, "import sessions"));
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Session Switcher popup loaded");
  const controller = new PopupController();
  await controller.initialize();

  const service = controller.getServiceInstance();
  const state = service.getState();

  let currentDomain = state.currentDomain;

  const tabActivatedListener = async (activeInfo: { tabId: number }) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab.url) {
      const newDomain = getDomainFromUrl(tab.url);
      if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        await controller.initialize();
      }
    }
  };

  const tabUpdatedListener = async (_: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      const newDomain = getDomainFromUrl(tab.url);
      if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        await controller.initialize();
      }
    }
  };

  chrome.tabs.onActivated.addListener(tabActivatedListener);
  chrome.tabs.onUpdated.addListener(tabUpdatedListener);

  const cleanup = () => {
    chrome.tabs.onActivated.removeListener(tabActivatedListener);
    chrome.tabs.onUpdated.removeListener(tabUpdatedListener);
  };

  window.addEventListener("beforeunload", cleanup);
  window.addEventListener("unload", cleanup);
});
