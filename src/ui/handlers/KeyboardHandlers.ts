import { SuggestionList } from '../components/SuggestionList';
import { RenameSuggestion } from '../../types';
import { handleArrowNavigation } from './InputHandlers';

export interface KeyHandlerContext {
    suggestionList: SuggestionList;
    inputEl: HTMLTextAreaElement;
    isNavigatingSuggestions: boolean;
    updateIsNavigatingSuggestions: (value: boolean) => void;
    updateKeyboardInstructions: (isSelected: boolean) => void;
    validateAndUpdateUI: (value: string) => boolean;
    performRename: () => Promise<void>;
    handleSuggestionClick: (suggestion: RenameSuggestion) => void;
    close: () => void;
}

/**
 * Handle keydown events for the modal
 */
export function createKeydownHandler(context: KeyHandlerContext): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent): void => {
        // Safety check - ensure suggestionList exists
        if (!context.suggestionList) return;

        // Use switch/case for cleaner handling of different keys
        switch (event.key) {
            case 'Tab':
            case 'Enter':
                if (event.isComposing) return;
                event.preventDefault();

                if (context.suggestionList.selectedSuggestionIndex !== -1) {
                    // Apply selected suggestion
                    const selectedIndex = context.suggestionList.selectedSuggestionIndex;
                    const selectedSuggestion = context.suggestionList.getSuggestionAt(selectedIndex);

                    if (selectedSuggestion) {
                        context.handleSuggestionClick(selectedSuggestion);
                    }
                } else if (event.key === 'Enter') {
                    // Perform rename if input is valid
                    const value = context.inputEl.value;
                    if (context.validateAndUpdateUI(value)) {
                        context.performRename();
                    }
                }
                break;

            case 'ArrowDown':
            case 'ArrowUp':
                handleArrowNavigation(
                    event, 
                    context.suggestionList, 
                    context.updateIsNavigatingSuggestions,
                    context.updateKeyboardInstructions
                );
                break;
        }
    };
}

/**
 * Handle keydown events in capture phase (specifically for ESC key)
 */
export function createCaptureKeydownHandler(context: KeyHandlerContext): (event: KeyboardEvent) => void {
    return (event: KeyboardEvent): void => {
        // We'll handle ESC key ONLY in capture phase to intercept it before Obsidian
        if (event.key === 'Escape') {
            // Safety check - ensure suggestionList exists
            if (!context.suggestionList) return;

            if (context.isNavigatingSuggestions || context.suggestionList.selectedSuggestionIndex !== -1) {
                // In navigation mode, prevent default (which would close modal)
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                // Reset suggestion selection and focus input
                context.suggestionList.selectSuggestion(-1);
                context.updateIsNavigatingSuggestions(false);
                context.updateKeyboardInstructions(false);
                context.inputEl.focus();
            }
            // Otherwise, let Obsidian's default behavior close the modal
        }
    };
}

/**
 * Create a handler for the Escape key in the modal
 */
export function createEscapeKeyHandler(context: KeyHandlerContext): () => boolean {
    return (): boolean => {
        // Safety check
        if (!context.suggestionList) {
            context.close();
            return true;
        }

        // If in suggestion navigation, prevent modal from closing
        if (context.isNavigatingSuggestions || context.suggestionList.selectedSuggestionIndex !== -1) {
            // Reset navigation mode and focus the input
            context.suggestionList.selectSuggestion(-1);
            context.updateIsNavigatingSuggestions(false);
            context.updateKeyboardInstructions(false);
            context.inputEl.focus();
            
            // Return false to prevent modal from closing
            return false;
        }

        context.close();
        return true;
    };
} 