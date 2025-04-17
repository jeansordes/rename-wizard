import { SuggestionList } from '../../../src/ui/components/SuggestionList';
import { RenameSuggestion } from '../../../src/types';
import { mockElement } from '../../mocks/ElementMocks';

// Mock the setIcon function from Obsidian
jest.mock('obsidian', () => ({
    setIcon: jest.fn((el, iconId) => {
        el.dataset.icon = iconId;
    })
}));

describe('SuggestionList', () => {
    // Setup DOM for tests
    let container: HTMLElement;
    let suggestionList: SuggestionList;
    let clickedSuggestion: RenameSuggestion | null = null;
    let selectionStateChanged: boolean | null = null;
    
    // Mock suggestions for testing
    const mockSuggestions: RenameSuggestion[] = [
        { name: 'suggestion-1.md', path: 'folder/suggestion-1.md', score: 10, source: 'existing' },
        { name: 'suggestion-2.md', path: 'folder/suggestion-2.md', score: 8, source: 'existing' },
        { name: 'other-suggestion.md', path: 'folder/other-suggestion.md', score: 5, source: 'existing' },
    ];
    
    beforeEach(() => {
        // Reset tracking variables
        clickedSuggestion = null;
        selectionStateChanged = null;
        
        // Create a fresh container for each test
        container = document.createElement('div');
        
        // Mock Obsidian's HTMLElement extensions
        mockElement(container);
        
        document.body.appendChild(container);
        
        // Initialize component with callbacks
        suggestionList = new SuggestionList(
            container,
            (suggestion) => { clickedSuggestion = suggestion; },
            (isSelected) => { selectionStateChanged = isSelected; }
        );
    });
    
    afterEach(() => {
        // Clean up DOM after each test
        document.body.removeChild(container);
        jest.clearAllMocks();
    });
    
    test('should render empty message when no suggestions', () => {
        // Execute
        suggestionList.updateSuggestions([]);
        
        // Verify
        const emptyEl = container.querySelector('.suggestion-empty');
        expect(emptyEl).not.toBeNull();
        expect(emptyEl?.textContent).toBe('No suggestions found');
    });
    
    test('should render suggestions list', () => {
        // Execute
        suggestionList.updateSuggestions(mockSuggestions);
        
        // Verify
        const items = container.querySelectorAll('.suggestion-item');
        expect(items.length).toBe(mockSuggestions.length);
        
        // Check content of items
        mockSuggestions.forEach((suggestion, index) => {
            expect(items[index].textContent).toContain(suggestion.name);
        });
    });
    
    test('should trigger callback when suggestion is clicked', () => {
        // Setup
        suggestionList.updateSuggestions(mockSuggestions);
        const items = container.querySelectorAll('.suggestion-item');
        
        // Execute - click the first suggestion
        items[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        // Verify
        expect(clickedSuggestion).not.toBeNull();
        expect(clickedSuggestion).toEqual(mockSuggestions[0]);
    });
    
    test('should highlight matches in suggestion names', () => {
        // Execute
        suggestionList.updateSuggestions(mockSuggestions, 'suggestion-1');
        
        // Verify
        const nameElements = container.querySelectorAll('.suggestion-name');
        
        // Check that the first item has highlighted text in its content
        const firstNameEl = nameElements[0];
        const highlightedContent = firstNameEl.innerHTML;
        
        // The first suggestion name should contain the search term and have highlighting
        expect(highlightedContent).toContain('suggestion-1');
        expect(highlightedContent).toContain('highlight');
    });
    
    test('should set selected suggestion', () => {
        // Setup
        suggestionList.updateSuggestions(mockSuggestions);
        
        // Execute - select the second suggestion
        suggestionList.selectSuggestion(1);
        
        // Verify
        const items = container.querySelectorAll('.suggestion-item');
        expect(items[1].classList.contains('is-selected')).toBe(true);
        expect(suggestionList.selectedSuggestionIndex).toBe(1);
        
        // Selection state change callback should have been called
        expect(selectionStateChanged).toBe(true);
    });
    
    test('should clear selection when new suggestions are loaded', () => {
        // Setup - first select an item
        suggestionList.updateSuggestions(mockSuggestions);
        suggestionList.selectSuggestion(0);
        expect(suggestionList.selectedSuggestionIndex).toBe(0);
        
        // Reset the selection state change tracker
        selectionStateChanged = null;
        
        // Execute - update with new suggestions
        suggestionList.updateSuggestions([
            { name: 'new-suggestion.md', path: 'new-suggestion.md', score: 10, source: 'existing' }
        ]);
        
        // Verify
        expect(suggestionList.selectedSuggestionIndex).toBe(-1);
        expect(selectionStateChanged).toBe(false);
    });
    
    test('should get suggestion at index', () => {
        // Setup
        suggestionList.updateSuggestions(mockSuggestions);
        
        // Execute & Verify
        expect(suggestionList.getSuggestionAt(1)).toEqual(mockSuggestions[1]);
        expect(suggestionList.getSuggestionAt(999)).toBeUndefined();
    });
    
    test('should get suggestion items', () => {
        // Setup
        suggestionList.updateSuggestions(mockSuggestions);
        
        // Execute & Verify
        expect(suggestionList.items.length).toBe(mockSuggestions.length);
    });
    
    test('should not trigger selection change when same state', () => {
        // Setup
        suggestionList.updateSuggestions(mockSuggestions);
        
        // Execute - select then deselect
        suggestionList.selectSuggestion(1);
        expect(selectionStateChanged).toBe(true);
        
        // Reset tracker and select another item (should not change selection state)
        selectionStateChanged = null;
        suggestionList.selectSuggestion(2);
        
        // Verify - selection changed but state (selected/not selected) remained the same
        expect(selectionStateChanged).toBeNull();
    });
}); 