import { getElementByIdSafe } from './utils/dom-utils';
import { LoadingManager } from './components/loading-manager';
import { ModalManager } from './components/modal-manager';
import { SessionList } from './components/session-list';
import { PopupService } from './services/popup-service';
import { handleError } from '../shared/utils/error-handling';

class PopupController {
  private loadingManager = new LoadingManager();
  private modalManager = new ModalManager();
  private sessionList: SessionList;
  private popupService = new PopupService();

  private currentSiteElement: HTMLElement;
  private saveBtn: HTMLButtonElement;
  private newSessionBtn: HTMLButtonElement;

  constructor() {
    // Get DOM elements
    this.currentSiteElement = getElementByIdSafe('currentSite');
    this.saveBtn = getElementByIdSafe('saveBtn');
    this.newSessionBtn = getElementByIdSafe('newSessionBtn');

    // Initialize session list
    this.sessionList = new SessionList(getElementByIdSafe('sessionsList'));
    this.setupSessionListHandlers();
    this.setupEventListeners();
  }

  async initialize(): Promise<void> {
    try {
      const state = await this.loadingManager.withLoading(async () => {
        return await this.popupService.initialize();
      });

      this.currentSiteElement.textContent = state.currentDomain;
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, 'PopupController.initialize'));
    }
  }

  private setupEventListeners(): void {
    this.saveBtn.addEventListener('click', () => this.handleSaveClick());
    this.newSessionBtn.addEventListener('click', () => this.handleNewSessionClick());

    // Modal event listeners
    getElementByIdSafe('confirmSave').addEventListener('click', () => this.handleConfirmSave());
    getElementByIdSafe('confirmRename').addEventListener('click', () => this.handleConfirmRename());
    getElementByIdSafe('confirmDelete').addEventListener('click', () => this.handleConfirmDelete());
  }

  private setupSessionListHandlers(): void {
    this.sessionList.setEventHandlers({
      onSessionClick: (sessionId) => this.handleSessionSwitch(sessionId),
      onRenameClick: (sessionId) => this.handleRenameClick(sessionId),
      onDeleteClick: (sessionId) => this.handleDeleteClick(sessionId)
    });
  }

  private async handleSaveClick(): Promise<void> {
    this.modalManager.showSaveModal();
  }

  private async handleConfirmSave(): Promise<void> {
    try {
      const name = this.modalManager.getSaveModalInput();
      
      await this.loadingManager.withLoading(async () => {
        await this.popupService.saveCurrentSession(name);
      });

      this.modalManager.hideSaveModal();
      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, 'save session'));
    }
  }

  private async handleNewSessionClick(): Promise<void> {
    try {
      await this.loadingManager.withLoading(async () => {
        await this.popupService.createNewSession();
      });

      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, 'create new session'));
    }
  }

  private async handleSessionSwitch(sessionId: string): Promise<void> {
    try {
      await this.loadingManager.withLoading(async () => {
        await this.popupService.switchToSession(sessionId);
      });

      this.renderSessionsList();
    } catch (error) {
      this.showError(handleError(error, 'switch session'));
    }
  }

  private handleRenameClick(sessionId: string): void {
    const session = this.popupService.getSession(sessionId);
    if (session) {
      this.popupService.setState({ currentRenameSessionId: sessionId });
      this.modalManager.showRenameModal(session.name);
    }
  }

  private async handleConfirmRename(): Promise<void> {
    try {
      const newName = this.modalManager.getRenameModalInput();
      const sessionId = this.popupService.getState().currentRenameSessionId;

      if (newName && sessionId) {
        await this.popupService.renameSession(sessionId, newName);
        this.renderSessionsList();
      }

      this.modalManager.hideRenameModal();
    } catch (error) {
      this.showError(handleError(error, 'rename session'));
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
      this.showError(handleError(error, 'delete session'));
    }
  }

  private renderSessionsList(): void {
    const state = this.popupService.getState();
    this.sessionList.render(state.sessions, state.activeSessions, state.currentDomain);
  }

  private showError(message: string): void {
    console.error('Popup error:', message);
    alert(`Error: ${message}`);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Session Switcher popup loaded');
  
  const popup = new PopupController();
  await popup.initialize();
});