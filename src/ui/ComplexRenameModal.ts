import { App, ButtonComponent, Modal, TFile } from 'obsidian';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { PreviewRenderer } from './preview/PreviewRenderer';
import { SuggestionList } from './components/SuggestionList';
import { ErrorDisplay } from './components/ErrorDisplay';
import { buildModalContent, updateKeyboardInstructions } from './builders/ModalContentBuilder';
import { configureInputAutoExpansion, setInitialSelection, createSuggestionClickHandler, createSelectionChangeHandler } from './handlers/InputHandlers';
import { createKeydownHandler, createCaptureKeydownHandler, createEscapeKeyHandler } from './handlers/KeyboardHandlers';
import { validateFileNameAndUpdateUI } from './handlers/ValidationHandler';
import { performRenameOperation } from './handlers/RenameHandler';
import { updateSuggestions } from './handlers/SuggestionHandler';

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

    // Instructions element
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

        // Create bound method versions of class methods for handlers
        const updateIsNavigatingSuggestions = (value: boolean) => {
            this.isNavigatingSuggestions = value;
        };

        const updateKeyboardInstructionsHandler = (isSelected: boolean) => {
            updateKeyboardInstructions(this.instructionsEl, this.suggestionList, isSelected);
        };

        // Set up DOM and initialize components using our builder
        const { elements, suggestionList, errorDisplay } = buildModalContent({
            modalEl: this.modalEl,
            contentEl: this.contentEl,
            file: this.file,
            plugin: this.plugin, 
            app: this.app,
            handleInput: this.handleInput.bind(this),
            handleSuggestionClick: this.handleSuggestionClick.bind(this),
            handleSelectionChange: this.handleSelectionChange.bind(this),
            configureInputAutoExpansion: (inputEl) => configureInputAutoExpansion(inputEl, this.contentEl),
            setInitialSelection: (inputEl) => setInitialSelection(inputEl, this.file, this.plugin.settings.selectLastPart)
        });

        // Store references to created elements and components
        this.inputEl = elements.inputEl;
        this.submitBtn = elements.submitBtn;
        this.resetBtn = elements.resetBtn;
        this.closeBtn = elements.closeBtn;
        this.errorEl = elements.errorEl;
        this.folderNoticeEl = elements.folderNoticeEl;
        this.previewEl = elements.previewEl;
        this.suggestionsEl = elements.suggestionsEl;
        this.instructionsEl = elements.instructionsEl;
        this.suggestionList = suggestionList;
        this.errorDisplay = errorDisplay;

        // Add click handlers to buttons
        this.resetBtn.onClick(() => {
            this.inputEl.value = this.file.path;
            this.inputEl.dispatchEvent(new Event('input'));
            this.validateAndUpdateUI(this.file.path);
            PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, this.file.path, this.file);
            this.inputEl.focus();
        });

        this.submitBtn.onClick(async () => {
            if (this.validateAndUpdateUI(this.inputEl.value)) {
                await this.performRename();
            }
        });

        this.closeBtn.onClick(() => {
            this.close();
        });

        // Set up keyboard handlers
        const keyHandlerContext = {
            suggestionList: this.suggestionList,
            inputEl: this.inputEl,
            isNavigatingSuggestions: this.isNavigatingSuggestions,
            updateIsNavigatingSuggestions,
            updateKeyboardInstructions: updateKeyboardInstructionsHandler,
            validateAndUpdateUI: this.validateAndUpdateUI.bind(this),
            performRename: this.performRename.bind(this),
            handleSuggestionClick: this.handleSuggestionClick.bind(this)
        };

        // Create and bind event handlers
        this.boundKeydownHandler = createKeydownHandler(keyHandlerContext);
        this.boundCaptureKeydownHandler = createCaptureKeydownHandler(keyHandlerContext);

        // Add event listeners
        this.modalEl.addEventListener('keydown', this.boundKeydownHandler);
        document.addEventListener('keydown', this.boundCaptureKeydownHandler, true);

        // Add focus/blur handlers to input element
        this.inputEl.addEventListener('focus', () => {
            // When input gets focus, clear suggestion selection if any
            if (this.suggestionList.selectedSuggestionIndex !== -1) {
                this.suggestionList.selectSuggestion(-1);
            }
            // Exit navigation mode when input gets focus
            this.isNavigatingSuggestions = false;
            updateKeyboardInstructionsHandler(false);
        });

        // Initialize instructions (default state: no suggestion selected)
        updateKeyboardInstructionsHandler(false);

        // Initialize the preview
        PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, this.file.path, this.file);

        // Set up input handler
        this.inputEl.addEventListener('input', this.handleInput.bind(this));

        // Initialize suggestions with current filename
        this.currentRenameValue = this.file.path;
        this.updateSuggestions();
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
     * Handle suggestion click
     */
    private handleSuggestionClick(suggestion: RenameSuggestion): void {
        const handler = createSuggestionClickHandler(
            this.file,
            this.inputEl,
            this.suggestionList,
            this.plugin,
            (value) => { this.isNavigatingSuggestions = value; },
            this.updateKeyboardInstructions.bind(this)
        );
        
        handler(suggestion);
    }

    /**
     * Update suggestions based on current input
     */
    private async updateSuggestions(): Promise<void> {
        await updateSuggestions(
            this.app,
            this.currentRenameValue,
            this.plugin.settings.maxSuggestions,
            this.plugin.settings.fuzzyMatchThreshold,
            this.suggestionList
        );
    }

    /**
     * Updates UI based on validation result and returns validity
     * @param name The filename to validate
     * @returns True if input is valid
     */
    private validateAndUpdateUI(name: string): boolean {
        return validateFileNameAndUpdateUI(
            name,
            this.app,
            this.file.path,
            this.errorDisplay
        );
    }

    /**
     * Perform the actual rename operation
     */
    private async performRename(): Promise<void> {
        await performRenameOperation(
            this.inputEl.value,
            this.file,
            this.app,
            this.errorDisplay,
            () => this.close()
        );
    }

    /**
     * Update keyboard instructions based on current state
     * @param hasSuggestionSelected Whether a suggestion is currently selected
     */
    private updateKeyboardInstructions(hasSuggestionSelected: boolean): void {
        updateKeyboardInstructions(this.instructionsEl, this.suggestionList, hasSuggestionSelected);
    }

    /**
     * Handle selection change for suggestions
     * @param isSelected Whether a suggestion is selected
     */
    private handleSelectionChange(isSelected: boolean): void {
        const handler = createSelectionChangeHandler(
            (value) => { this.isNavigatingSuggestions = value; },
            this.updateKeyboardInstructions.bind(this)
        );
        
        handler(isSelected);
    }

    /**
     * Override the default Modal ESC key behavior from Obsidian
     */
    onEscapeKey(): boolean {
        const escapeHandler = createEscapeKeyHandler({
            suggestionList: this.suggestionList,
            inputEl: this.inputEl,
            isNavigatingSuggestions: this.isNavigatingSuggestions,
            updateIsNavigatingSuggestions: (value) => { this.isNavigatingSuggestions = value; },
            updateKeyboardInstructions: this.updateKeyboardInstructions.bind(this),
            validateAndUpdateUI: this.validateAndUpdateUI.bind(this),
            performRename: this.performRename.bind(this),
            handleSuggestionClick: this.handleSuggestionClick.bind(this)
        });
        
        // Call the handler to handle ESC
        const result = escapeHandler();
        
        // If still in navigation mode, keep modal open
        if (!result) {
            return false; // Keep modal open
        }
        
        // Not in navigation mode, close the modal
        if (!this.isNavigatingSuggestions && this.suggestionList.selectedSuggestionIndex === -1) {
            this.close();
        }
        
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