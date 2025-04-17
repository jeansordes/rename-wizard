import { App, ButtonComponent, Modal, TFile, setIcon } from 'obsidian';
import { getSuggestions } from '../core/suggestions';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { SuggestionList } from './components/SuggestionList';
import { ErrorDisplay } from './components/ErrorDisplay';
import { PreviewRenderer } from './preview/PreviewRenderer';
import { normalizePath, validateFileName } from '../validators/fileNameValidator';
import { mergeFilenames } from '../utils/nameUtils';

export class ComplexRenameModal extends Modal {
    private file: TFile;
    private plugin: RenameWizardPlugin;
    private inputEl: HTMLTextAreaElement;
    private submitBtn: ButtonComponent;
    private resetBtn: ButtonComponent;
    private closeBtn: ButtonComponent;
    private errorEl: HTMLElement;
    private folderNoticeEl: HTMLElement;
    private previewEl: HTMLElement;
    private currentRenameValue: string = '';
    private suggestionsEl: HTMLElement;
    
    // Components
    private suggestionList: SuggestionList;
    private errorDisplay: ErrorDisplay;

    constructor(app: App, plugin: RenameWizardPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        // Remove title bar and make modal click-outside-to-close
        this.modalEl.addClass('modal-no-title');
        this.modalEl.addClass('modal-click-outside-to-close');
    }

    onOpen(): void {
        // Remove any existing content and header
        this.modalEl.empty();
        this.modalEl.createDiv({ cls: 'modal-content complex-rename-modal' }, (contentEl) => {
            // Create input container first
            const inputContainer = contentEl.createDiv('input-container');
            
            // Main input (create this first)
            this.inputEl = inputContainer.createEl('textarea', {
                cls: 'rename-input',
                attr: {
                    placeholder: 'Enter the new filename, including path',
                    rows: '1',
                }
            });
            // Use full path with extension
            this.inputEl.value = this.file.path;

            // Focus and set selection immediately after creating the input
            this.inputEl.focus();
            this.setInitialSelection();

            // Add reset button inside input container (after input)
            this.resetBtn = new ButtonComponent(inputContainer)
                .setIcon('rotate-ccw')
                .setTooltip('Reset to original filename')
                .onClick(() => {
                    this.inputEl.value = this.file.path;
                    this.inputEl.dispatchEvent(new Event('input'));
                    this.validateInput(this.file.path);
                    PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, this.file.path, this.file);
                    this.inputEl.focus();
                });
            this.resetBtn.buttonEl.addClass('reset-button');
            // Initially hide the reset button
            this.resetBtn.buttonEl.style.display = 'none';

            // Add rename button after input
            this.submitBtn = new ButtonComponent(inputContainer)
                .setIcon('checkmark')
                .setTooltip('Rename file')
                .onClick(async () => {
                    if (this.validateInput(this.inputEl.value)) {
                        await this.performRename();
                    }
                });

            // Add close button after rename button
            this.closeBtn = new ButtonComponent(inputContainer)
                .setIcon('x')
                .setTooltip('Close')
                .onClick(() => {
                    this.close();
                });
            
            // Set up auto-expansion functionality
            this.configureInputAutoExpansion();
            
            // Add Enter key handler
            this.inputEl.addEventListener('keydown', this.handleKeydown.bind(this));

            // Error message and folder creation notice between inputs
            const noticesContainer = contentEl.createDiv('notices-container');
            this.errorEl = noticesContainer.createDiv({ cls: 'error' });
            this.folderNoticeEl = noticesContainer.createDiv({ cls: 'preview-folder-creation' });
            this.folderNoticeEl.style.display = 'none';
            
            // Initialize error display
            this.errorDisplay = new ErrorDisplay(this.errorEl);

            // Preview section
            this.previewEl = contentEl.createDiv('preview');

            // Suggestions section
            this.suggestionsEl = contentEl.createDiv('suggestions');
            
            // Initialize suggestion list
            this.suggestionList = new SuggestionList(
                this.suggestionsEl, 
                this.handleSuggestionClick.bind(this)
            );

            // Initialize the preview
            PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, this.file.path, this.file);
        });
        
        // Set up input handler
        this.inputEl.addEventListener('input', this.handleInput.bind(this));

        // Initialize suggestions with current filename
        this.currentRenameValue = this.file.path;
        this.updateSuggestions();

        // Adjust height based on content
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = this.inputEl.scrollHeight + 'px';
    }

    /**
     * Handle input changes
     */
    private async handleInput(): Promise<void> {
        const value = this.inputEl.value;
        this.currentRenameValue = value;
        
        // Toggle reset button visibility based on whether input differs from original
        if (value !== this.file.path) {
            this.resetBtn.buttonEl.style.display = 'flex';
        } else {
            this.resetBtn.buttonEl.style.display = 'none';
        }
        
        // Always validate and show error immediately
        this.validateInput(value);
        
        // Update suggestions and preview
        await this.updateSuggestions();
        PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, value, this.file);
    }

    /**
     * Handle keyboard events
     */
    private handleKeydown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.isComposing) {
            event.preventDefault();
            const value = this.inputEl.value;
            if (this.validateInput(value)) {
                this.performRename();
            }
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            
            const items = this.suggestionList.items;
            if (items.length > 0) {
                const direction = event.key === 'ArrowDown' ? 1 : -1;
                let newIndex;
                
                // If no current selection, select first or last based on direction
                if (this.suggestionList.selectedSuggestionIndex === -1) {
                    newIndex = direction === 1 ? 0 : items.length - 1;
                } else {
                    // Calculate new index with proper wrapping
                    newIndex = this.suggestionList.selectedSuggestionIndex + direction;
                    if (newIndex < 0) {
                        newIndex = items.length - 1; // Wrap to last item
                    } else if (newIndex >= items.length) {
                        newIndex = 0; // Wrap to first item
                    }
                }
                
                this.suggestionList.selectSuggestion(newIndex);
            }
        } else if (event.key === 'Enter' && this.suggestionList.selectedSuggestionIndex !== -1) {
            event.preventDefault();
            
            const items = this.suggestionList.items;
            if (items[this.suggestionList.selectedSuggestionIndex]) {
                items[this.suggestionList.selectedSuggestionIndex].click();
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.suggestionList.selectSuggestion(-1);
            this.inputEl.focus();
        }
    }

    /**
     * Handle suggestion click
     */
    private handleSuggestionClick(suggestion: RenameSuggestion): void {
        // Use mergeFilenames with the template from settings
        const mergedName = mergeFilenames(this.file.path, suggestion.name, this.plugin.settings.mergeTemplate);
        this.inputEl.value = mergedName;
        this.inputEl.dispatchEvent(new Event('input'));
        this.inputEl.focus();
    }

    /**
     * Set initial selection in the input field
     */
    private setInitialSelection(): void {
        if (this.plugin.settings.selectLastPart) {
            // Select only the last part of the filename before the extension
            const pathParts = this.file.path.split('/');
            const filename = pathParts[pathParts.length - 1];
            
            // Find the position of the last dot before the extension
            const extensionDotIndex = filename.lastIndexOf('.');
            
            const filenameParts = extensionDotIndex !== -1 
                ? filename.slice(0, extensionDotIndex).split('.')
                : filename.split('.');
            
            if (filenameParts.length > 1) {
                // Calculate positions in the full path
                const fullPathWithoutExt = this.file.path.slice(0, this.file.path.lastIndexOf('.'));
                const startPos = fullPathWithoutExt.lastIndexOf('.') + 1;
                const endPos = this.file.path.lastIndexOf('.');
                this.inputEl.setSelectionRange(startPos, endPos);
            } else {
                // If no dots in filename, select the whole filename without extension
                const startPos = this.file.path.lastIndexOf('/') + 1;
                const endPos = this.file.path.lastIndexOf('.');
                this.inputEl.setSelectionRange(startPos, endPos);
            }
        } else {
            // Default behavior: place cursor at the end without selecting
            this.inputEl.setSelectionRange(this.file.path.length, this.file.path.length);
        }
    }

    /**
     * Configure input auto-expansion
     */
    private configureInputAutoExpansion(): void {
        const adjustHeight = (): void => {
            const maxHeight = this.contentEl.offsetHeight - 300;
            this.inputEl.style.maxHeight = `${maxHeight}px`;
            
            // Reset height to auto and then set to scrollHeight to adjust to content
            this.inputEl.style.height = 'auto';
            this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;
        };
        
        this.inputEl.addEventListener('input', adjustHeight);
        // Initial height adjustment
        adjustHeight();
    }

    /**
     * Update suggestions based on current input
     */
    private async updateSuggestions(): Promise<void> {
        const suggestions = await getSuggestions(
            this.app,
            this.currentRenameValue,
            this.plugin.settings.maxSuggestions,
            this.plugin.settings.fuzzyMatchThreshold
        );
        
        this.suggestionList.updateSuggestions(suggestions, this.currentRenameValue);
    }

    /**
     * Validate the input and show appropriate error messages
     * @returns True if input is valid
     */
    private validateInput(name: string): boolean {
        const result = validateFileName(name, this.app, this.file);
        
        if (!result.isValid) {
            this.errorDisplay.showError(result.errorMessage, result.isWarning);
            return false;
        } else if (result.errorMessage) {
            // Valid with warning
            this.errorDisplay.showError(result.errorMessage, true);
            return true;
        } else {
            this.errorDisplay.hideError();
            return true;
        }
    }

    /**
     * Perform the actual rename operation
     */
    private async performRename(): Promise<void> {
        const newName = this.inputEl.value.trim();
                
        if (!newName) return;

        try {
            const { newPath, folderPath } = normalizePath(newName, this.file);
            
            // Create folder if needed
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    await this.app.vault.createFolder(folderPath);
                }
            }
            
            // Perform the rename
            await this.app.fileManager.renameFile(this.file, newPath);
            
            // Close the modal after successful rename
            this.close();
        } catch (error) {
            this.errorDisplay.showError(`Error renaming file: ${error.message}`, false);
        }
    }

    onClose(): void {
        // Clean up
        this.contentEl.empty();
    }
} 