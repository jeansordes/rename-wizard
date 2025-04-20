import { TFile } from 'obsidian';
import { RenameSuggestion } from '../../types';
import { mergeFilenames } from '../../utils/nameUtils';
import { SuggestionList } from '../components/SuggestionList';
import RenameWizardPlugin from '../../main';

/**
 * Set initial selection in the input field based on plugin settings
 */
export function setInitialSelection(
    inputEl: HTMLTextAreaElement, 
    file: TFile, 
    selectLastPart: boolean
): void {
    if (selectLastPart) {
        // Select only the last part of the filename before the extension
        const pathParts = file.path.split('/');
        const filename = pathParts[pathParts.length - 1];

        // Find the position of the last dot before the extension
        const extensionDotIndex = filename.lastIndexOf('.');

        const filenameParts = extensionDotIndex !== -1
            ? filename.slice(0, extensionDotIndex).split('.')
            : filename.split('.');

        if (filenameParts.length > 1) {
            // Calculate positions in the full path
            const fullPathWithoutExt = file.path.slice(0, file.path.lastIndexOf('.'));
            const startPos = fullPathWithoutExt.lastIndexOf('.') + 1;
            const endPos = file.path.lastIndexOf('.');
            inputEl.setSelectionRange(startPos, endPos);
        } else {
            // If no dots in filename, select the whole filename without extension
            const startPos = file.path.lastIndexOf('/') + 1;
            const endPos = file.path.lastIndexOf('.');
            inputEl.setSelectionRange(startPos, endPos);
        }
    } else {
        // Default behavior: place cursor at the end without selecting
        inputEl.setSelectionRange(file.path.length, file.path.length);
    }
}

/**
 * Configure input auto-expansion
 */
export function configureInputAutoExpansion(
    inputEl: HTMLTextAreaElement, 
    contentEl: HTMLElement
): () => void {
    const adjustHeight = (): void => {
        const maxHeight = contentEl.offsetHeight - 300;
        inputEl.style.maxHeight = `${maxHeight}px`;

        // Reset height to auto and then set to scrollHeight to adjust to content
        inputEl.style.height = 'auto';
        inputEl.style.height = `${inputEl.scrollHeight}px`;
    };

    inputEl.addEventListener('input', adjustHeight);
    
    // Initial height adjustment
    adjustHeight();
    
    // Return the adjustment function for direct calls
    return adjustHeight;
}

/**
 * Create a suggestion click handler
 */
export function createSuggestionClickHandler(
    file: TFile,
    inputEl: HTMLTextAreaElement,
    suggestionList: SuggestionList,
    plugin: RenameWizardPlugin,
    updateIsNavigatingSuggestions: (value: boolean) => void,
    updateKeyboardInstructions: (isSelected: boolean) => void
): (suggestion: RenameSuggestion) => void {
    return (suggestion: RenameSuggestion): void => {
        // Use mergeFilenames with the template from settings
        const mergedName = mergeFilenames(file.path, suggestion.name, plugin.settings.mergeTemplate);
        inputEl.value = mergedName;
        inputEl.dispatchEvent(new Event('input'));

        // Reset selection and navigation state
        suggestionList.selectSuggestion(-1);
        updateIsNavigatingSuggestions(false);
        updateKeyboardInstructions(false);

        // Return focus to the input
        inputEl.focus();
    };
}

/**
 * Create a selection change handler
 */
export function createSelectionChangeHandler(
    updateIsNavigatingSuggestions: (value: boolean) => void,
    updateKeyboardInstructions: (isSelected: boolean) => void
): (isSelected: boolean) => void {
    return (isSelected: boolean): void => {
        // Update keyboard instructions based on selection state
        updateIsNavigatingSuggestions(isSelected);
        updateKeyboardInstructions(isSelected);
    };
}

/**
 * Handle key navigation within suggestions
 */
export function handleArrowNavigation(
    event: KeyboardEvent,
    suggestionList: SuggestionList,
    updateIsNavigatingSuggestions: (value: boolean) => void,
    updateKeyboardInstructions: (isSelected: boolean) => void
): void {
    if (suggestionList.items.length === 0) return;
    
    event.preventDefault();
    event.stopPropagation();

    const direction = event.key === 'ArrowDown' ? 1 : -1;
    let newIndex;

    // Calculate new index with proper wrapping
    if (suggestionList.selectedSuggestionIndex === -1) {
        newIndex = direction === 1 ? 0 : suggestionList.items.length - 1;
    } else {
        newIndex = suggestionList.selectedSuggestionIndex + direction;
        if (newIndex < 0) {
            newIndex = suggestionList.items.length - 1;
        } else if (newIndex >= suggestionList.items.length) {
            newIndex = 0;
        }
    }

    // Set navigation mode and update UI
    updateIsNavigatingSuggestions(true);
    suggestionList.selectSuggestion(newIndex);
    updateKeyboardInstructions(true);
} 