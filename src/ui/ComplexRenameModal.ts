import { App, ButtonComponent, Modal, TFile } from 'obsidian';
import { getSuggestions } from '../core/suggestions';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { mergeFilenames } from '../utils/nameUtils';
import { normalizePath, validateFileName, validateFileNamePure } from '../validators/fileNameValidator';
import { ErrorDisplay } from './components/ErrorDisplay';
import { SuggestionList } from './components/SuggestionList';
import { PreviewRenderer } from './preview/PreviewRenderer';

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

    // New member for instructions
    private instructionsEl: HTMLElement;

    // Track if we're in suggestion navigation mode
    private isNavigatingSuggestions: boolean = false;

    // Bound event handlers for proper cleanup
    private boundKeydownHandler: (event: KeyboardEvent) => void;
    private boundCaptureKeydownHandler: (event: KeyboardEvent) => void;

    constructor(app: App, plugin: RenameWizardPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        // Remove title bar and make modal click-outside-to-close
        this.modalEl.addClass('modal-no-title');
        this.modalEl.addClass('modal-click-outside-to-close');

        // Initialize navigation state
        this.isNavigatingSuggestions = false;
    }

    onOpen(): void {
        // Reset navigation state whenever modal opens
        this.isNavigatingSuggestions = false;

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
                    this.validateAndUpdateUI(this.file.path);
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
                    if (this.validateAndUpdateUI(this.inputEl.value)) {
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

            // Add keydown event listener to the entire modal
            // We'll handle all keyboard events at the modal level
            this.boundKeydownHandler = this.handleKeydown.bind(this);
            this.modalEl.addEventListener('keydown', this.boundKeydownHandler);

            // Add a capture phase keydown handler for ESC key to ensure we catch it
            // before Obsidian processes it
            this.boundCaptureKeydownHandler = this.handleCaptureKeydown.bind(this);
            document.addEventListener('keydown', this.boundCaptureKeydownHandler, true);

            // Add focus/blur handlers to input element
            this.inputEl.addEventListener('focus', () => {
                // When input gets focus, clear suggestion selection if any
                if (this.suggestionList.selectedSuggestionIndex !== -1) {
                    this.suggestionList.selectSuggestion(-1);
                }
                // Exit navigation mode when input gets focus
                this.isNavigatingSuggestions = false;
                this.updateKeyboardInstructions(false);
            });

            // Preview section
            this.previewEl = contentEl.createDiv('preview');

            // Error message and folder creation notice between inputs
            const noticesContainer = contentEl.createDiv('notices-container');
            this.errorEl = noticesContainer.createDiv({ cls: 'error' });
            this.folderNoticeEl = noticesContainer.createDiv({ cls: 'preview-folder-creation' });
            this.folderNoticeEl.style.display = 'none';

            // Initialize error display
            this.errorDisplay = new ErrorDisplay(this.errorEl);

            // Suggestions section
            this.suggestionsEl = contentEl.createDiv('suggestions');

            // Initialize suggestion list
            this.suggestionList = new SuggestionList(
                this.suggestionsEl,
                this.handleSuggestionClick.bind(this),
                this.handleSelectionChange.bind(this)
            );

            // Add keyboard instruction footer
            const instructionsEl = contentEl.createDiv('prompt-instructions');

            // Store reference to instructions elements we'll need to update
            this.instructionsEl = instructionsEl;

            // Initialize instructions (default state: no suggestion selected)
            this.updateKeyboardInstructions(false);

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
        this.validateAndUpdateUI(value);

        // Update suggestions and preview
        await this.updateSuggestions();
        PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, value, this.file);
    }

    /**
     * Handle keyboard events
     */
    private handleKeydown(event: KeyboardEvent): void {

        // Safety check - ensure suggestionList exists
        if (!this.suggestionList) return;

        // Use switch/case for cleaner handling of different keys
        switch (event.key) {
            case 'Enter':
                if (event.isComposing) return;
                event.preventDefault();

                if (this.suggestionList.selectedSuggestionIndex !== -1) {
                    // Apply selected suggestion
                    const selectedIndex = this.suggestionList.selectedSuggestionIndex;
                    const selectedSuggestion = this.suggestionList.getSuggestionAt(selectedIndex);

                    if (selectedSuggestion) {
                        this.handleSuggestionClick(selectedSuggestion);
                    }
                } else {
                    // Perform rename if input is valid
                    const value = this.inputEl.value;
                    if (this.validateAndUpdateUI(value)) {
                        this.performRename();
                    }
                }
                break;

            case 'ArrowDown':
            case 'ArrowUp':
                if (this.suggestionList.items.length === 0) return;
                event.preventDefault();
                event.stopPropagation();

                const direction = event.key === 'ArrowDown' ? 1 : -1;
                let newIndex;

                // Calculate new index with proper wrapping
                if (this.suggestionList.selectedSuggestionIndex === -1) {
                    newIndex = direction === 1 ? 0 : this.suggestionList.items.length - 1;
                } else {
                    newIndex = this.suggestionList.selectedSuggestionIndex + direction;
                    if (newIndex < 0) {
                        newIndex = this.suggestionList.items.length - 1;
                    } else if (newIndex >= this.suggestionList.items.length) {
                        newIndex = 0;
                    }
                }

                // Set navigation mode and update UI
                this.isNavigatingSuggestions = true;
                this.suggestionList.selectSuggestion(newIndex);
                this.updateKeyboardInstructions(true);

                break;
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

        // Reset selection and navigation state
        this.suggestionList.selectSuggestion(-1);
        this.isNavigatingSuggestions = false;
        this.updateKeyboardInstructions(false);

        // Return focus to the input
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
     * Updates UI based on validation result and returns validity
     * @param name The filename to validate
     * @returns True if input is valid
     */
    private validateAndUpdateUI(name: string): boolean {
        const existingFiles: Record<string, boolean> = {};

        // Build a map of existing files and folders
        this.app.vault.getAllLoadedFiles().forEach(file => {
            existingFiles[file.path] = true;

            // Add folder paths
            if (file.parent) {
                existingFiles[file.parent.path] = true;
            }
        });

        const result = validateFileNamePure(name, existingFiles, this.file.path);

        if (!result.isValid) {
            this.errorDisplay.showError(result.errorMessage, result.isWarning);
            return false;
        } else if (result.errorMessage) {
            // Valid with warning
            this.errorDisplay.showError(
                result.errorMessage, 
                true, 
                result.warningMessages
            );
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

    /**
     * Create instruction element for keyboard shortcuts
     */
    private createInstructionElement(container: HTMLElement, command: string, description: string): HTMLElement {
        const instructionEl = container.createDiv('prompt-instruction');

        const commandEl = instructionEl.createSpan('prompt-instruction-command');
        commandEl.setText(command);

        const descEl = instructionEl.createSpan();
        descEl.setText(description);

        return instructionEl;
    }

    /**
     * Update keyboard instructions based on current state
     * @param hasSuggestionSelected Whether a suggestion is currently selected
     */
    private updateKeyboardInstructions(hasSuggestionSelected: boolean): void {
        // Clear existing instructions
        this.instructionsEl.empty();

        // Only show navigation instructions if we have suggestions
        const hasSuggestions = this.suggestionList.items.length > 0;
        if (hasSuggestions) {
            this.createInstructionElement(this.instructionsEl, '↑↓', 'to navigate');
        }

        if (hasSuggestionSelected) {
            // When a suggestion is highlighted
            this.createInstructionElement(this.instructionsEl, '↵', 'to merge suggestion with current filename');
        } else {
            // When no suggestion is highlighted (regular input mode)
            this.createInstructionElement(this.instructionsEl, '↵', 'to rename file');
        }

        // Always show escape instruction, but with context-sensitive text
        if (hasSuggestionSelected) {
            this.createInstructionElement(this.instructionsEl, 'esc', 'to return to input');
        } else {
            this.createInstructionElement(this.instructionsEl, 'esc', 'to close modal');
        }
    }

    /**
     * Handle selection change for suggestions
     * @param isSelected Whether a suggestion is selected
     */
    private handleSelectionChange(isSelected: boolean): void {
        // Update keyboard instructions based on selection state
        this.isNavigatingSuggestions = isSelected;
        this.updateKeyboardInstructions(isSelected);
    }

    /**
     * Handle keydown events in capture phase
     * This is specifically to catch ESC key before Obsidian processes it
     */
    private handleCaptureKeydown(event: KeyboardEvent): void {
        // We'll now handle ESC key ONLY in capture phase to intercept it before Obsidian
        if (event.key === 'Escape') {

            // Safety check - ensure suggestionList exists
            if (!this.suggestionList) return;

            if (this.isNavigatingSuggestions || this.suggestionList.selectedSuggestionIndex !== -1) {
                // In navigation mode, prevent default (which would close modal)
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                // Reset suggestion selection and focus input
                this.suggestionList.selectSuggestion(-1);
                this.isNavigatingSuggestions = false;
                this.updateKeyboardInstructions(false);
                this.inputEl.focus();

            } else {
                // Not in navigation mode - let Obsidian's default behavior close the modal
            }
        }
    }

    /**
     * Override the default Modal ESC key behavior from Obsidian
     */
    onEscapeKey(): boolean {

        // Safety check
        if (!this.suggestionList) {
            this.close();
            // Tell Obsidian we handled it
            return true;
        }

        // If in suggestion navigation, prevent modal from closing
        if (this.isNavigatingSuggestions || this.suggestionList.selectedSuggestionIndex !== -1) {

            // Reset navigation mode and focus the input
            this.suggestionList.selectSuggestion(-1);
            this.isNavigatingSuggestions = false;
            this.updateKeyboardInstructions(false);
            this.inputEl.focus();

            // Tell Obsidian we handled it (don't close)
            // Even if we didn't close it, we handled it
            return true;
        }

        // Not in navigation mode, let Obsidian know we handled it
        this.close();
        return true;
    }

    onClose(): void {

        // Reset all navigation state
        this.isNavigatingSuggestions = false;
        if (this.suggestionList) {
            this.suggestionList.selectSuggestion(-1);
        }

        // Remove all event listeners
        this.modalEl.removeEventListener('keydown', this.boundKeydownHandler);
        document.removeEventListener('keydown', this.boundCaptureKeydownHandler, true);

        // Clean up content
        this.contentEl.empty();
    }
} 