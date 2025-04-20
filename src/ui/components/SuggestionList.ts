import { RenameSuggestion } from "../../types";

export class SuggestionList {
    private suggestionsEl: HTMLElement;
    private suggestionItems: HTMLElement[] = [];
    private selectedIndex: number = -1;
    private suggestions: RenameSuggestion[] = [];
    private onSuggestionClickCallback: (suggestion: RenameSuggestion) => void;
    private onSelectionChangeCallback?: (isSelected: boolean) => void;

    /**
     * Create a new suggestion list component
     * @param container The HTML element to render the suggestions in
     * @param onSuggestionClick Callback when a suggestion is clicked
     * @param onSelectionChange Optional callback when selection state changes
     */
    constructor(
        container: HTMLElement,
        onSuggestionClick: (suggestion: RenameSuggestion) => void,
        onSelectionChange?: (isSelected: boolean) => void
    ) {
        this.suggestionsEl = container;
        this.onSuggestionClickCallback = onSuggestionClick;
        this.onSelectionChangeCallback = onSelectionChange;
    }

    /**
     * Update the suggestions list with new suggestions
     * @param suggestions The new suggestions to display
     * @param filterValue Optional filter value to highlight matches
     */
    updateSuggestions(suggestions: RenameSuggestion[], filterValue = ''): void {
        const hadSelection = this.selectedIndex !== -1;
        
        this.suggestions = suggestions;
        this.selectedIndex = -1;
        this.updateSuggestionsList(filterValue);
        
        // Notify about selection reset if there was a selection before
        if (hadSelection && this.onSelectionChangeCallback) {
            this.onSelectionChangeCallback(false);
        }
    }

    /**
     * Select a suggestion by index
     * @param index Index of the suggestion to select
     */
    selectSuggestion(index: number): void {
        // Check if this is actually a change in selection state (selected/not selected)
        const wasSelected = this.selectedIndex !== -1;
        const willBeSelected = index !== -1;
        const selectionStateChanged = wasSelected !== willBeSelected;
        
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
        
        // Notify about selection state change if callback is provided and state changed
        if (this.onSelectionChangeCallback && selectionStateChanged) {
            this.onSelectionChangeCallback(willBeSelected);
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
     * Get a suggestion by index
     * @param index Index of the suggestion to retrieve
     * @returns The suggestion at the given index, or undefined if not found
     */
    getSuggestionAt(index: number): RenameSuggestion | undefined {
        return this.suggestions[index];
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
        this.suggestions.forEach((suggestion) => {
            const item = listEl.createEl('li', { cls: 'suggestion-item' });
            
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
        
        // Extract filename and extension from text
        const textLower = text.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const fileName = text.split('/').pop() || '';
        const isFilePart = (start: number): boolean => {
            const fileNameStart = text.lastIndexOf('/') + 1;
            return start >= fileNameStart;
        };
        
        // Find all potential matches
        const allMatches: Array<{start: number; end: number; score: number}> = [];
        
        // Extract search terms from input
        const searchTerms: string[] = [];
        
        // Add the whole input
        searchTerms.push(input.toLowerCase());
        
        // Add filename part if input contains a path
        if (input.includes('/')) {
            const lastPart = input.split('/').pop() || '';
            if (lastPart) searchTerms.push(lastPart.toLowerCase());
        }
        
        // Add file components (split by common separators)
        // Fixed regex escaping
        const fileComponents = input.split(/[/.\-_\s]/).filter(Boolean);
        for (const component of fileComponents) {
            if (component.length >= 2) searchTerms.push(component.toLowerCase());
        }
        
        // Remove duplicates
        const uniqueTerms = [...new Set(searchTerms)];
        
        // Find all matches for each term
        for (const term of uniqueTerms) {
            let pos = 0;
            while ((pos = textLower.indexOf(term, pos)) !== -1) {
                const end = pos + term.length;
                
                // Calculate base score
                let score = term.length; // Longer matches get higher scores
                
                // Boost score for filename matches vs path matches
                if (isFilePart(pos)) score += 10;
                
                // Boost score for matches at word boundaries
                const isWordStart = pos === 0 || !(/[a-zA-Z0-9]/).test(text.charAt(pos - 1));
                if (isWordStart) score += 5;
                
                // Boost score for matches right after a path separator
                const isAfterPathSeparator = pos > 0 && text.charAt(pos - 1) === '/';
                if (isAfterPathSeparator) score += 8;
                
                // Penalize common elements like '.md'
                const isExtension = term === '.md' || term === 'md';
                if (isExtension) score -= 8;
                
                // Penalize very short matches unless they're exact matches for the input
                if (term.length < 3 && term !== input.toLowerCase()) score -= 5;
                
                // Penalize matches that are just common folder names if they're not explicitly in the input
                const isCommonFolder = term === 'notes' && !input.toLowerCase().includes('notes');
                if (isCommonFolder) score -= 10;
                
                allMatches.push({ start: pos, end, score });
                
                pos = end;
            }
        }
        
        // Sort matches by position
        allMatches.sort((a, b) => a.start - b.start);
        
        // Merge overlapping matches, keeping the higher score
        for (let i = 0; i < allMatches.length - 1; i++) {
            if (allMatches[i].end >= allMatches[i + 1].start) {
                allMatches[i].end = Math.max(allMatches[i].end, allMatches[i + 1].end);
                allMatches[i].score = Math.max(allMatches[i].score, allMatches[i + 1].score);
                allMatches.splice(i + 1, 1);
                i--;
            }
        }
        
        // Filter to only keep significant matches
        const significantMatches = allMatches.filter(m => m.score > 5);
        
        // Add text with highlights
        let lastPos = 0;
        for (const match of significantMatches) {
            // Add text before match
            if (match.start > lastPos) {
                container.appendChild(
                    document.createTextNode(text.substring(lastPos, match.start))
                );
            }
            
            // Add highlighted match
            const highlight = document.createElement('span');
            highlight.className = 'suggestion-highlight';
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