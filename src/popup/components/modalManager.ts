import { CSS_CLASSES } from "@popup/utils/constants";
import { getElementByIdSafe } from "@popup/utils/dom";
import { ModalList, ModalInputs } from "@shared/types/modal.types";

export class ModalManager {
  private modals: ModalList;
  private inputs: ModalInputs;

  constructor() {
    this.modals = {
      save: getElementByIdSafe("saveModal"),
      rename: getElementByIdSafe("renameModal"),
      delete: getElementByIdSafe("deleteModal"),
      error: getElementByIdSafe("errorModal"),
      about: getElementByIdSafe("aboutModal"),
      newSessionConfirm: getElementByIdSafe("newSessionConfirmModal"),
      clearSession: getElementByIdSafe("clearSessionModal"),
      exportImport: getElementByIdSafe("exportImportModal"),
      replaceConfirm: getElementByIdSafe("replaceConfirmModal")
    };

    this.inputs = {
      sessionName: getElementByIdSafe("sessionName"),
      sessionOrder: getElementByIdSafe("sessionOrder"),
      newSessionName: getElementByIdSafe("newSessionName"),
      newSessionOrder: getElementByIdSafe("newSessionOrder"),
      importFileInput: getElementByIdSafe("importFileInput"),
    };

    this.setupEventListeners();
    this.setupTabSystem();
  }

  private setupEventListeners(): void {
    const closeButtons = [
      { id: "closeSaveModal", modal: "save" },
      { id: "cancelSave", modal: "save" },
      { id: "closeRenameModal", modal: "rename" },
      { id: "cancelRename", modal: "rename" },
      { id: "closeDeleteModal", modal: "delete" },
      { id: "cancelDelete", modal: "delete" },
      { id: "closeErrorModal", modal: "error" },
      { id: "closeErrorModalBtn", modal: "error" },
      { id: "closeAboutModal", modal: "about" },
      { id: "closeAboutModalBtn", modal: "about" },
      { id: "closeNewSessionConfirmModal", modal: "newSessionConfirm" },
      { id: "cancelNewSession", modal: "newSessionConfirm" },
      { id: "closeClearSessionModal", modal: "clearSession" },
      { id: "cancelClearSession", modal: "clearSession" },
      { id: "closeExportImportModal", modal: "exportImport" },
      { id: "closeExportImportModalBtn", modal: "exportImport" },
      { id: "closeReplaceConfirmModal", modal: "replaceConfirm" },
      { id: "cancelReplaceConfirm", modal: "replaceConfirm" }
    ];

    closeButtons.forEach(({ id, modal }) => {
      getElementByIdSafe(id).addEventListener("click", () => this.hide(modal as keyof ModalList));
    });
    
    // Setup import file input listener
    this.inputs.importFileInput.addEventListener("change", () => {
      const importBtn = getElementByIdSafe("importBtn");
      (importBtn as HTMLButtonElement).disabled = !this.inputs.importFileInput.files || this.inputs.importFileInput.files.length === 0;
    });

    // Enter key handlers
    this.inputs.sessionName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        getElementByIdSafe("confirmSave").click();
      }
    });

    this.inputs.newSessionName.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        getElementByIdSafe("confirmRename").click();
      }
    });

    // Global event handlers
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideVisible();
      }
      if (e.key === "Enter") {
        if (this.isVisible("delete")) {
          e.preventDefault();
          getElementByIdSafe("confirmDelete").click();
        }
        if (this.isVisible("error")) {
          e.preventDefault();
          getElementByIdSafe("closeErrorModal").click();
        }
      }
    });

    // Backdrop click handlers
    Object.entries(this.modals).forEach(([key, modal]) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) this.hide(key as keyof ModalList);
      });
    });
  }

  showSaveModal(defaultName: string = "Unnamed Session", order: number): void {
    this.inputs.sessionName.value = defaultName;
    this.inputs.sessionOrder.value = order.toString();
    this.show("save");
    this.inputs.sessionName.focus();
    this.inputs.sessionName.select();
  }

  showRenameModal(currentName: string, currentOrder: number): void {
    this.inputs.newSessionName.value = currentName;
    this.inputs.newSessionOrder.value = currentOrder.toString();
    this.show("rename");
    this.inputs.newSessionName.focus();
    this.inputs.newSessionName.select();
  }

  showDeleteModal(sessionName: string): void {
    const deleteSessionNameEl = document.getElementById("deleteSessionName");
    if (deleteSessionNameEl) {
      deleteSessionNameEl.textContent = sessionName;
    }
    this.show("delete");
    this.modals.delete.focus();
  }

  showErrorModal(message: string): void {
    const errorMessageEl = document.getElementById("errorMessage");
    if (errorMessageEl) {
      errorMessageEl.textContent = message;
    }
    this.show("error");
    this.modals.error.focus();
  }
  
  showAboutModal(): void {
    this.show("about");
    this.modals.about.focus();
  }
  
  showNewSessionConfirmModal(): void {
    this.show("newSessionConfirm");
    this.modals.newSessionConfirm.focus();
  }

  getSaveModalInput(): { name: string; order: string } {
    return {
      name: this.inputs.sessionName.value.trim(),
      order: this.inputs.sessionOrder.value,
    };
  }

  getRenameModalInput(): { name: string; order: string } {
    return {
      name: this.inputs.newSessionName.value.trim(),
      order: this.inputs.newSessionOrder.value,
    };
  }

  hideSaveModal(): void { this.hide("save"); }
  hideRenameModal(): void { this.hide("rename"); }
  hideDeleteModal(): void { this.hide("delete"); }
  hideErrorModal(): void { this.hide("error"); }
  hideAboutModal(): void { this.hide("about"); }
  hideNewSessionConfirmModal(): void { this.hide("newSessionConfirm"); }
  hideClearSessionModal(): void { this.hide("clearSession"); }
  hideExportImportModal(): void { this.hide("exportImport"); }
  hideReplaceConfirmModal(): void { this.hide("replaceConfirm"); }

  showClearSessionModal(): void {
    this.show("clearSession");
    this.modals.clearSession.focus();
  }

  showExportImportModal(): void {
    this.show("exportImport");
    this.modals.exportImport.focus();
    // Reset the import file input
    this.inputs.importFileInput.value = "";
(getElementByIdSafe("importBtn") as HTMLButtonElement).disabled = true;
  }
  
  showReplaceConfirmModal(sessionName: string): void {
    const replaceSessionNameEl = document.getElementById("replaceSessionName");
    if (replaceSessionNameEl) {
      replaceSessionNameEl.textContent = sessionName;
    }
    this.show("replaceConfirm");
    this.modals.replaceConfirm.focus();
  }

  getClearSessionOption(): string {
    const selectElement = document.getElementById('clearOptionSelect') as HTMLSelectElement;
    return selectElement ? selectElement.value : "current"; // Default to current website only
  }

  getExportOption(): string {
    const selectElement = document.getElementById('exportOptionSelect') as HTMLSelectElement;
    return selectElement ? selectElement.value : "current"; // Default to current website only
  }

  setupTabSystem(): void {
    // Get tab elements
    const exportTabBtn = document.getElementById('exportTabBtn');
    const importTabBtn = document.getElementById('importTabBtn');
    const exportTab = document.getElementById('exportTab');
    const importTab = document.getElementById('importTab');

    if (exportTabBtn && importTabBtn && exportTab && importTab) {
      // Add click event listeners to tab buttons
      exportTabBtn.addEventListener('click', () => {
        // Activate export tab
        exportTabBtn.classList.add('active');
        importTabBtn.classList.remove('active');
        exportTab.classList.add('active');
        importTab.classList.remove('active');
      });

      importTabBtn.addEventListener('click', () => {
        // Activate import tab
        importTabBtn.classList.add('active');
        exportTabBtn.classList.remove('active');
        importTab.classList.add('active');
        exportTab.classList.remove('active');
      });
    }
  }

  getImportFile(): File | null {
    return this.inputs.importFileInput.files && this.inputs.importFileInput.files.length > 0
      ? this.inputs.importFileInput.files[0]
      : null;
  }

  hideAllModals(): void {
    this.hideVisible();
    this.inputs.sessionName.value = "";
    this.inputs.sessionOrder.value = "";
    this.inputs.newSessionName.value = "";
    this.inputs.newSessionOrder.value = "";
    this.inputs.importFileInput.value = "";
  }

  private isVisible(modalKey: keyof ModalList): boolean {
    return this.modals[modalKey]?.classList.contains(CSS_CLASSES.SHOW) || false;
  }

  private hideVisible(): void {
    Object.entries(this.modals).forEach(([key, modal]) => {
      if (modal.classList.contains(CSS_CLASSES.SHOW)) {
        this.hide(key as keyof ModalList);
      }
    });
  }

  private show(modalKey: keyof ModalList): void {
    this.modals[modalKey].classList.add(CSS_CLASSES.SHOW);
  }

  private hide(modalKey: keyof ModalList): void {
    this.modals[modalKey].classList.remove(CSS_CLASSES.SHOW);
  }
}
