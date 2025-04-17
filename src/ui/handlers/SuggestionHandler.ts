import { App } from 'obsidian';
import { getSuggestions } from '../../core/suggestions';
import { SuggestionList } from '../components/SuggestionList';

/**
 * Update suggestions based on current input
 * @param app The Obsidian app
 * @param currentValue The current input value
 * @param maxSuggestions Maximum number of suggestions to display
 * @param fuzzyMatchThreshold Threshold for fuzzy matching
 * @param suggestionList The suggestion list component
 */
export async function updateSuggestions(
    app: App,
    currentValue: string,
    maxSuggestions: number,
    fuzzyMatchThreshold: number,
    suggestionList: SuggestionList
): Promise<void> {
    const suggestions = await getSuggestions(
        app,
        currentValue,
        maxSuggestions,
        fuzzyMatchThreshold
    );

    suggestionList.updateSuggestions(suggestions, currentValue);
} 