import { setIcon } from "obsidian";
import { RenameSuggestion } from "../../types";

export class SuggestionList {
    private suggestionsEl: HTMLElement;
    private suggestionItems: HTMLElement[] = [];
    private selectedIndex: number = -1;
    private suggestions: RenameSuggestion[] = [];
    private onSuggestionClickCallback: (suggestion: RenameSuggestion) => void;

    /**
     * Create a new suggestion list component
     * @param container The HTML element to render the suggestions in
     * @param onSuggestionClick Callback when a suggestion is clicked
     */
    constructor(
        container: HTMLElement,
        onSuggestionClick: (suggestion: RenameSuggestion) => void
    ) {
        this.suggestionsEl = container;
        this.onSuggestionClickCallback = onSuggestionClick;
    }

    /**
     * Update the suggestions list with new suggestions
     * @param suggestions The new suggestions to display
     * @param filterValue Optional filter value to highlight matches
     */
    updateSuggestions(suggestions: RenameSuggestion[], filterValue = ''): void {
        this.suggestions = suggestions;
        this.selectedIndex = -1;
        this.updateSuggestionsList(filterValue);
    }

    /**
     * Select a suggestion by index
     * @param index Index of the suggestion to select
     */
    selectSuggestion(index: number): void {
        // Clear previous selection
        if (this.selectedIndex !== -1 && this.suggestionItems[this.selectedIndex]) {
            this.suggestionItems[this.selectedIndex].removeClass('is-selected');
        }
        
        // Update selection
        this.selectedIndex = index;
        
        // Apply new selection
        if (this.selectedIndex !== -1 && this.suggestionItems[this.selectedIndex]) {
            const item = this.suggestionItems[this.selectedIndex];
            item.addClass('is-selected');
            // Scroll into view if needed
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Get the currently selected suggestion index
     */
    get selectedSuggestionIndex(): number {
        return this.selectedIndex;
    }

    /**
     * Get the suggestion item elements
     */
    get items(): HTMLElement[] {
        return this.suggestionItems;
    }
    
    /**
     * Render the suggestion list
     * @param filterValue Optional filter text to highlight matches
     */
    private updateSuggestionsList(filterValue = ''): void {
        // Clear the container
        this.suggestionsEl.empty();
        this.suggestionItems = [];
        
        // Handle empty suggestions
        if (this.suggestions.length === 0) {
            this.suggestionsEl.createEl('p', {
                cls: 'suggestion-empty',
                text: 'No suggestions found'
            });
            return;
        }
        
        // Create suggestion list
        const listEl = this.suggestionsEl.createEl('ul', { cls: 'suggestion-list' });
        
        // Add each suggestion
        this.suggestions.forEach((suggestion, index) => {
            const item = listEl.createEl('li', { cls: 'suggestion-item' });
            
            // Removed file icon
            
            // Suggestion content with highlighting
            const nameEl = item.createSpan({ cls: 'suggestion-name' });
            const highlightedContent = this.highlightMatches(suggestion.name, filterValue);
            nameEl.appendChild(highlightedContent);
            
            // Handle click
            item.addEventListener('click', () => {
                this.onSuggestionClickCallback(suggestion);
            });
            
            // Store reference to item
            this.suggestionItems.push(item);
        });
    }

    /**
     * Highlight matching parts of text based on input
     * @param text The text to highlight
     * @param input The input text to match against
     */
    private highlightMatches(text: string, input: string): HTMLSpanElement {
        const container = document.createElement('span');
        
        if (!input.trim()) {
            container.textContent = text;
            return container;
        }
        
        // Simple word-level matching for demonstration
        // Could be enhanced with fuzzy matching or other algorithms
        const words = input.toLowerCase().split(/\s+/).filter(Boolean);
        const textLower = text.toLowerCase();
        
        // Find all matches
        let matches: { start: number; end: number }[] = [];
        
        for (const word of words) {
            let pos = 0;
            while ((pos = textLower.indexOf(word, pos)) !== -1) {
                matches.push({ start: pos, end: pos + word.length });
                pos += word.length;
            }
        }
        
        // Sort matches by position
        matches.sort((a, b) => a.start - b.start);
        
        // Merge overlapping matches
        for (let i = 0; i < matches.length - 1; i++) {
            if (matches[i].end >= matches[i + 1].start) {
                matches[i].end = Math.max(matches[i].end, matches[i + 1].end);
                matches.splice(i + 1, 1);
                i--;
            }
        }
        
        // Add text with highlights
        let lastPos = 0;
        for (const match of matches) {
            // Add text before match
            if (match.start > lastPos) {
                container.appendChild(
                    document.createTextNode(text.substring(lastPos, match.start))
                );
            }
            
            // Add highlighted match
            const highlight = document.createElement('span');
            highlight.className = 'highlight-rename';
            highlight.textContent = text.substring(match.start, match.end);
            container.appendChild(highlight);
            
            lastPos = match.end;
        }
        
        // Add remaining text
        if (lastPos < text.length) {
            container.appendChild(
                document.createTextNode(text.substring(lastPos))
            );
        }
        
        return container;
    }
} 