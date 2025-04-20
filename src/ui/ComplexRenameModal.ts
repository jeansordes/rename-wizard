import { App, ButtonComponent, Modal, TFile, ToggleComponent, setIcon } from 'obsidian';
import { processHierarchicalRename } from '../core/batchRename';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { buildModalContent, updateKeyboardInstructions } from './builders/ModalContentBuilder';
import { ErrorDisplay } from './components/ErrorDisplay';
import { SuggestionList } from './components/SuggestionList';
import { configureInputAutoExpansion, createSelectionChangeHandler, createSuggestionClickHandler, setInitialSelection } from './handlers/InputHandlers';
import { createCaptureKeydownHandler, createEscapeKeyHandler, createKeydownHandler } from './handlers/KeyboardHandlers';
import { performRenameOperation } from './handlers/RenameHandler';
import { updateSuggestions } from './handlers/SuggestionHandler';
import { validateFileNameAndUpdateUI } from './handlers/ValidationHandler';
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

    // Instructions element
    private instructionsEl: HTMLElement;

    // Track if we're in suggestion navigation mode
    private isNavigatingSuggestions: boolean = false;

    // Bound event handlers for proper cleanup
    private boundKeydownHandler: (event: KeyboardEvent) => void;
    private boundCaptureKeydownHandler: (event: KeyboardEvent) => void;

    // Batch rename elements
    private isBatchMode: boolean = false;
    private batchModeToggle: ToggleComponent;
    private batchModeContainer: HTMLElement;
    private batchModePreviewContainer: HTMLElement;
    private similarFilesCount: number = 0;

    constructor(app: App, plugin: RenameWizardPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        
        // Remove title bar and make modal click-outside-to-close
        this.modalEl.addClass('modal-no-title');
        this.modalEl.addClass('modal-click-outside-to-close');

        // Initialize navigation state
        this.isNavigatingSuggestions = false;
        
        // Check if there are similar files in the same folder (for batch operations)
        this.countSimilarFiles();
    }
    
    /**
     * Count files in the same folder for potential batch operations
     */
    private countSimilarFiles(): void {
        const currentFolder = this.file.parent;
        
        if (currentFolder) {
            const filesInFolder = this.app.vault.getFiles().filter(f => f.parent === currentFolder);
            this.similarFilesCount = filesInFolder.length;
        } else {
            this.similarFilesCount = 1; // Just this file
        }
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
            handleSuggestionClick: this.handleSuggestionClick.bind(this),
            close: this.close.bind(this)
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

        // Initialize the preview
        PreviewRenderer.updatePreview(this.previewEl, this.folderNoticeEl, this.file.path, this.file);

        // Set up input handler
        this.inputEl.addEventListener('input', this.handleInput.bind(this));

        // Initialize suggestions with current filename
        this.currentRenameValue = this.file.path;
        
        // Initialize suggestions and then update keyboard instructions after
        this.updateSuggestions().then(() => {
            // Initialize instructions after suggestions are loaded
            updateKeyboardInstructionsHandler(false);
        });

        // Add batch renaming controls if enabled and multiple files are in the folder
        if (this.plugin.settings.batchRenaming?.enabled && this.similarFilesCount > 1) {
            this.addBatchRenameControls();
            
            // Move batch toggle button next to submit button
            this.repositionBatchToggle();
        }
    }

    /**
     * Move the batch toggle button next to the submit button
     */
    private repositionBatchToggle(): void {
        // Find the button container that has the submit button
        const buttonContainer = this.submitBtn.buttonEl.parentElement;
        if (!buttonContainer) return;

        // Create a new button for batch toggle to place near submit
        const batchToggleButton = document.createElement('div');
        batchToggleButton.className = 'batch-toggle-button';
        
        // Insert the batch toggle button before the submit button
        buttonContainer.insertBefore(batchToggleButton, this.submitBtn.buttonEl);
        
        // Create icon
        const batchToggleIcon = document.createElement('span');
        batchToggleIcon.className = 'batch-toggle-icon';
        batchToggleButton.appendChild(batchToggleIcon);
        setIcon(batchToggleIcon, 'files');
        
        // Function to update tooltip based on current batch mode state
        const updateTooltip = () => {
            if (this.isBatchMode) {
                batchToggleButton.setAttribute('aria-label', `Changes will apply to ${this.similarFilesCount} files`);
            } else {
                batchToggleButton.setAttribute('aria-label', `Apply changes to ${this.similarFilesCount} files`);
            }
        };
        
        // Set initial tooltip
        updateTooltip();
        batchToggleButton.classList.add('has-tooltip');
        
        // Update toggle style (active/inactive)
        this.updateBatchToggleStyle(batchToggleIcon, this.isBatchMode);
        
        // Add click handler
        batchToggleButton.addEventListener('click', () => {
            this.isBatchMode = !this.isBatchMode;
            this.batchModeToggle.setValue(this.isBatchMode);
            this.updateBatchToggleStyle(batchToggleIcon, this.isBatchMode);
            this.updateBatchModeUI();
            
            // Update tooltip text when toggled
            updateTooltip();
        });
    }

    /**
     * Update the batch toggle icon style based on state
     */
    private updateBatchToggleStyle(iconEl: HTMLElement, isActive: boolean): void {
        if (isActive) {
            iconEl.addClass('is-active');
            iconEl.removeClass('is-inactive');
        } else {
            iconEl.addClass('is-inactive');
            iconEl.removeClass('is-active');
        }
    }

    /**
     * Generate preview content for batch rename
     */
    private generatePreviewContent(container: HTMLElement): void {
        console.log('[DEBUG] generatePreviewContent called');
        container.empty();
        
        // Get the original and new names for the current file
        const originalPath = this.file.path;
        const newPath = this.inputEl.value;
        
        console.log('[DEBUG] Preview paths:', { originalPath, newPath });
        
        // Get files from the same folder
        const currentFolder = this.file.parent;
        if (!currentFolder) {
            container.createSpan({ text: 'No folder found.' });
            return;
        }
        
        const filesInFolder = this.app.vault.getFiles().filter(f => 
            f.parent === currentFolder && 
            f.path !== originalPath // Exclude the current file
        );
        
        console.log('[DEBUG] Files in folder:', filesInFolder.map(f => f.path));
        
        // Create table for preview
        const table = container.createEl('table', { cls: 'batch-rename-preview-table' });
        
        // Table body
        const tableBody = table.createEl('tbody');
        
        // Add preview for each file
        filesInFolder.forEach(file => {
            const row = tableBody.createEl('tr');
            
            try {
                // Process hierarchical rename for this file
                const newName = processHierarchicalRename(originalPath, newPath, file);
                
                console.log('[DEBUG] Processing file for preview:', { 
                    file: file.path, 
                    newName 
                });
                
                // Skip if no change is needed
                if (newName === file.path) {
                    console.log('[DEBUG] No change needed for', file.path);
                    return;
                }
                
                // Create diff-style preview
                const diffCell = row.createEl('td');
                
                // Create diff element similar to the single file preview
                const diffEl = diffCell.createDiv({ cls: 'rename-diff' });
                
                // Show original path in muted color
                const originalPathEl = diffEl.createDiv({ cls: 'diff-old' });
                originalPathEl.createSpan({ 
                    text: file.path,
                    cls: 'diff-text'
                });
                
                // Show arrow
                diffEl.createSpan({ text: '→', cls: 'diff-arrow' });
                
                // Show new path with highlighting
                const newPathEl = diffEl.createDiv({ cls: 'diff-new' });
                newPathEl.createSpan({ 
                    text: newName,
                    cls: 'diff-text'
                });
                
            } catch (error) {
                console.error('[DEBUG] Error in preview generation:', error);
                row.createEl('td', { text: `Error: ${error.message}`, cls: 'batch-rename-error' });
            }
        });
        
        // Show message if no files to preview
        if (tableBody.childElementCount === 0) {
            console.log('[DEBUG] No files to preview');
            const messageRow = tableBody.createEl('tr');
            messageRow.createEl('td', { 
                text: 'No files will be affected by this rename operation.',
                cls: 'batch-rename-message' 
            });
        }
    }

    /**
     * Update UI based on batch mode state
     */
    private updateBatchModeUI(): void {
        console.log('[DEBUG] updateBatchModeUI called, isBatchMode:', this.isBatchMode);
        
        // Show/hide the entire batch controls container based on batch mode
        this.batchModeContainer.style.display = this.isBatchMode ? 'block' : 'none';
        
        // If batch mode is enabled, then manage the preview header visibility
        if (this.isBatchMode) {
            // Show/hide preview header based on settings
            const headerDisplayValue = this.plugin.settings.batchRenaming.showPreview ? 'flex' : 'none';
            
            // Get the preview header element
            const previewHeader = this.batchModeContainer.querySelector('.batch-preview-header') as HTMLElement;
            if (previewHeader) {
                previewHeader.style.display = headerDisplayValue;
                console.log('[DEBUG] Preview header display:', headerDisplayValue);
            }
            
            // Always keep preview container hidden by default (when collapsed)
            this.batchModePreviewContainer.style.display = 'none';
        }
        
        // Keep the button icon consistent, just update the tooltip
        if (this.isBatchMode) {
            this.submitBtn.setTooltip('Rename file(s)');
        } else {
            this.submitBtn.setTooltip('Rename file');
        }
        this.submitBtn.setClass('submit-button');
        
        console.log('[DEBUG] Batch mode UI updated');
    }

    /**
     * Handle input changes
     */
    private async handleInput(): Promise<void> {
        console.log('[DEBUG] handleInput called');
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
        
        // If batch mode is active and preview is expanded, update batch preview
        if (this.isBatchMode) {
            console.log('[DEBUG] Batch mode is active during input change');
            
            // Find the preview content element
            const previewContent = this.batchModePreviewContainer.querySelector('.batch-preview-content') as HTMLElement;
            
            // Check if preview is currently visible
            const isPreviewVisible = this.batchModePreviewContainer.style.display === 'block';
            console.log('[DEBUG] Is batch preview visible?', isPreviewVisible);
            
            if (isPreviewVisible && previewContent) {
                console.log('[DEBUG] Updating batch preview content after input change');
                this.generatePreviewContent(previewContent);
            }
        }
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
        
        // Update keyboard instructions after suggestions are loaded
        this.updateKeyboardInstructions(this.isNavigatingSuggestions);
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
     * Perform the rename operation - single file or batch depending on mode
     */
    private async performRename(): Promise<void> {
        if (this.isBatchMode) {
            await this.performBatchRename();
        } else {
            await this.performSingleRename();
        }
    }
    
    /**
     * Perform a single file rename
     */
    private async performSingleRename(): Promise<void> {
        await performRenameOperation(
            this.inputEl.value,
            this.file,
            this.app,
            this.errorDisplay,
            () => this.close()
        );
    }
    
    /**
     * Perform a batch rename operation
     */
    private async performBatchRename(): Promise<void> {
        console.log('[DEBUG] performBatchRename called');
        
        // Get files from the same folder
        const currentFolder = this.file.parent;
        if (!currentFolder) {
            this.errorDisplay.showError('No folder found for batch operation.', false);
            return;
        }
        
        // Get original and new paths for the current file
        const originalPath = this.file.path;
        const newPath = this.inputEl.value;
        
        console.log('[DEBUG] Batch rename paths:', { originalPath, newPath });
        
        // Gather files that will be affected (exclude the current file)
        const filesInFolder = this.app.vault.getFiles().filter(f => 
            f.parent === currentFolder && 
            f.path !== originalPath
        );
        
        console.log('[DEBUG] Files in folder for batch rename:', filesInFolder.map(f => f.path));
        
        // Filter to only files that will actually be renamed (children in hierarchy)
        const filesToRename = filesInFolder.filter(file => {
            const newFilePath = processHierarchicalRename(originalPath, newPath, file);
            console.log('[DEBUG] Checking if file needs rename:', { 
                file: file.path, 
                newFilePath, 
                willBeRenamed: newFilePath !== file.path 
            });
            return newFilePath !== file.path; // Only include files that will be renamed
        });
        
        console.log('[DEBUG] Files that will be renamed:', filesToRename.map(f => f.path));
        
        // If no files would be renamed, just do a single rename
        if (filesToRename.length === 0) {
            console.log('[DEBUG] No files to rename in batch, performing single rename');
            await this.performSingleRename();
            return;
        }
        
        // Close this modal
        this.close();
        
        // Custom batch rename operation
        const batchOperationFiles = [...filesToRename, this.file]; // Include the current file
        
        console.log('[DEBUG] All files for batch operation:', batchOperationFiles.map(f => f.path));
        
        // Create a custom batch operation with specific rename logic
        const { BatchRenameModal } = require('./BatchRenameModal');
        const batchModal = new BatchRenameModal(this.app, this.plugin, batchOperationFiles);
        
        // Set custom pattern generator function
        batchModal.setCustomRenameFunction((file: TFile) => {
            console.log('[DEBUG] Custom rename function called for:', file.path);
            if (file.path === originalPath) {
                // For the parent file, use the new path directly
                console.log('[DEBUG] Using new path directly for parent file:', newPath);
                return newPath;
            } else {
                // For children, use hierarchical rename
                const result = processHierarchicalRename(originalPath, newPath, file);
                console.log('[DEBUG] Using hierarchical rename for child file:', { 
                    original: file.path, 
                    result 
                });
                return result;
            }
        });
        
        console.log('[DEBUG] Opening batch rename modal');
        batchModal.open();
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
            handleSuggestionClick: this.handleSuggestionClick.bind(this),
            close: this.close.bind(this)
        });
        
        // Call the handler to handle ESC and return its result
        // If false, it means we're in navigation mode and should keep the modal open
        // If true, it means we should let Obsidian handle the ESC key (which will close the modal)
        return escapeHandler();
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

    /**
     * Add batch rename controls to the modal
     */
    private addBatchRenameControls(): void {
        console.log('[DEBUG] addBatchRenameControls called');
        // Find the appropriate container in the modal to add the batch controls
        // Add between the input and the preview sections
        const modalContentEl = this.contentEl.querySelector('.modal-content.complex-rename-modal');
        if (!modalContentEl) {
            console.error('Modal content element not found');
            return;
        }
        
        const inputContainer = modalContentEl.querySelector('.input-container');
        if (!inputContainer) {
            console.error('Input container not found');
            return;
        }
        
        // Create batch controls and insert them after the input container
        this.batchModeContainer = document.createElement('div');
        this.batchModeContainer.className = 'batch-controls-container';
        
        // Insert the container after the input container
        this.suggestionsEl.before(this.batchModeContainer);
        
        console.log('[DEBUG] Batch mode container created and inserted');
        
        // Create hidden toggle component (functional but not visible)
        const hiddenToggleContainer = this.batchModeContainer.createDiv({ cls: 'hidden-batch-toggle' });
        hiddenToggleContainer.style.display = 'none';
        
        // Add toggle component (hidden but functional)
        this.batchModeToggle = new ToggleComponent(hiddenToggleContainer);
        
        // Set initial state from settings (default to false if not specified)
        this.isBatchMode = this.plugin.settings.batchRenaming?.enabled || false;
        this.batchModeToggle.setValue(this.isBatchMode);
        
        console.log('[DEBUG] Initial batch mode state:', this.isBatchMode);
        
        // Handle toggle changes
        this.batchModeToggle.onChange((value) => {
            console.log('[DEBUG] Batch mode toggle changed to:', value);
            this.isBatchMode = value;
            this.updateBatchModeUI();
        });
        
        // Create preview header with triangle
        const previewHeader = this.batchModeContainer.createDiv({ cls: 'batch-preview-header' });
        previewHeader.style.display = 'none'; // Hide preview header by default
        const previewTriangle = previewHeader.createSpan({ cls: ['batch-preview-triangle','button-icon-container'] });
        setIcon(previewTriangle, 'right-triangle');
        
        // Create collapsible preview section with dropdown
        this.batchModePreviewContainer = this.batchModeContainer.createDiv({ cls: 'batch-rename-preview-container' });
        this.batchModePreviewContainer.style.display = 'none'; // Hide preview container by default

        const previewText = previewHeader.createSpan({ 
            cls: 'batch-preview-text',
            text: `Preview changes for ${this.similarFilesCount} files`
        });
        
        // Create collapsible preview content (initially collapsed)
        const previewContent = this.batchModePreviewContainer.createDiv({ cls: 'batch-preview-content' });
        
        // Toggle preview on click
        let previewExpanded = false;
        previewHeader.addEventListener('click', () => {
            console.log('[DEBUG] Preview header clicked, expanded:', !previewExpanded);
            previewExpanded = !previewExpanded;
            this.batchModePreviewContainer.style.display = previewExpanded ? 'block' : 'none';
            
            // Toggle expanded class for CSS-based rotation
            if (previewExpanded) {
                previewTriangle.addClass('expanded');
            } else {
                previewTriangle.removeClass('expanded');
            }
            
            // Regenerate preview content when expanding
            if (previewExpanded) {
                this.generatePreviewContent(previewContent);
            }
        });
        
        // Show/hide elements based on initial state
        this.updateBatchModeUI();
        console.log('[DEBUG] Batch rename controls setup complete');
    }
} 