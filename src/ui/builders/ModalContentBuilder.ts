import { App, ButtonComponent, TFile } from 'obsidian';
import RenameWizardPlugin from '../../main';
import { SuggestionList } from '../components/SuggestionList';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { RenameSuggestion } from '../../types';

export interface ModalElements {
    inputEl: HTMLTextAreaElement;
    submitBtn: ButtonComponent;
    resetBtn: ButtonComponent;
    closeBtn: ButtonComponent;
    errorEl: HTMLElement;
    folderNoticeEl: HTMLElement;
    previewEl: HTMLElement;
    suggestionsEl: HTMLElement;
    instructionsEl: HTMLElement;
}

export interface ModalBuilderParams {
    modalEl: HTMLElement;
    contentEl: HTMLElement;
    file: TFile;
    plugin: RenameWizardPlugin;
    app: App;
    handleInput: () => Promise<void>;
    handleSuggestionClick: (suggestion: RenameSuggestion) => void;
    handleSelectionChange: (isSelected: boolean) => void;
    configureInputAutoExpansion: (inputEl: HTMLTextAreaElement) => void;
    setInitialSelection: (inputEl: HTMLTextAreaElement) => void;
}

/**
 * Creates the main modal content structure and components
 */
export function buildModalContent(params: ModalBuilderParams): {
    elements: ModalElements; 
    suggestionList: SuggestionList;
    errorDisplay: ErrorDisplay;
} {
    const {
        contentEl,
        file,
        handleSuggestionClick,
        handleSelectionChange,
        configureInputAutoExpansion,
        setInitialSelection
    } = params;

    // Reset content
    contentEl.empty();
    
    // Create modal content container - directly on contentEl
    const modalContentEl = contentEl.createDiv({ cls: 'modal-content complex-rename-modal' });
    
    // Create input container
    const inputContainer = modalContentEl.createDiv('input-container');
    
    // Create main input
    const inputEl = inputContainer.createEl('textarea', {
        cls: 'rename-input',
        attr: {
            placeholder: 'Enter the new filename, including path',
            rows: '1',
        }
    });
    
    // Set initial value
    inputEl.value = file.path;
    
    // Focus and set selection
    inputEl.focus();
    setInitialSelection(inputEl);
    
    // Create button container for better mobile layout
    const buttonContainer = inputContainer.createDiv('button-container');
    
    // Create reset button (placed first on desktop, middle on mobile)
    const resetBtn = new ButtonComponent(buttonContainer)
        .setIcon('rotate-ccw')
        .setTooltip('Reset to original filename');
    resetBtn.buttonEl.addClass('reset-button');
    resetBtn.buttonEl.style.display = 'none';
    
    // Create submit button (placed second on desktop, last on mobile)
    const submitBtn = new ButtonComponent(buttonContainer)
        .setIcon('checkmark')
        .setTooltip('Rename file');
    
    // Create close button (placed last on desktop, first on mobile)
    const closeBtn = new ButtonComponent(buttonContainer)
        .setIcon('x')
        .setTooltip('Close');
    closeBtn.buttonEl.addClass('close-button');
    
    // Configure input auto-expansion
    configureInputAutoExpansion(inputEl);
    
    // Create preview section
    const previewEl = modalContentEl.createDiv('preview');
    
    // Create notices container
    const noticesContainer = modalContentEl.createDiv('notices-container');
    const errorEl = noticesContainer.createDiv({ cls: 'error' });
    const folderNoticeEl = noticesContainer.createDiv({ cls: 'preview-folder-creation' });
    folderNoticeEl.style.display = 'none';
    
    // Create error display
    const errorDisplay = new ErrorDisplay(errorEl);
    
    // Create suggestions section
    const suggestionsEl = modalContentEl.createDiv('suggestions');
    
    // Create suggestion list
    const suggestionList = new SuggestionList(
        suggestionsEl,
        handleSuggestionClick,
        handleSelectionChange
    );
    
    // Create keyboard instruction footer
    const instructionsEl = modalContentEl.createDiv('prompt-instructions');

    // Create return object with all elements and components
    const elements: ModalElements = {
        inputEl,
        submitBtn,
        resetBtn,
        closeBtn,
        errorEl,
        folderNoticeEl,
        previewEl,
        suggestionsEl,
        instructionsEl
    };
    
    return {
        elements,
        suggestionList,
        errorDisplay
    };
}

/**
 * Creates a keyboard instruction element
 */
export function createInstructionElement(
    container: HTMLElement, 
    command: string, 
    description: string
): HTMLElement {
    const instructionEl = container.createDiv('prompt-instruction');

    const commandEl = instructionEl.createSpan('prompt-instruction-command');
    commandEl.setText(command);

    const descEl = instructionEl.createSpan();
    descEl.setText(description);

    return instructionEl;
}

/**
 * Updates keyboard instructions based on current state
 */
export function updateKeyboardInstructions(
    instructionsEl: HTMLElement,
    suggestionList: SuggestionList,
    hasSuggestionSelected: boolean
): void {
    // Clear existing instructions
    instructionsEl.empty();

    // Always show navigation instructions
    createInstructionElement(instructionsEl, '↑↓', 'to navigate');

    if (hasSuggestionSelected) {
        // When a suggestion is highlighted
        createInstructionElement(instructionsEl, '↵', 'to merge suggestion with current filename');
    } else {
        // When no suggestion is highlighted (regular input mode)
        createInstructionElement(instructionsEl, '↵', 'to rename file');
    }

    // Always show escape instruction, but with context-sensitive text
    if (hasSuggestionSelected) {
        createInstructionElement(instructionsEl, 'esc', 'to return to input');
    } else {
        createInstructionElement(instructionsEl, 'esc', 'to close modal');
    }
} 