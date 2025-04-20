/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
    setInitialSelection, 
    configureInputAutoExpansion,
    createSuggestionClickHandler,
    createSelectionChangeHandler,
    handleArrowNavigation
} from '../../../src/ui/handlers/InputHandlers';
import { MockHTMLElement, MockTFile, MockApp, MockPlugin } from '../../mocks/ElementMocks';

// Create a generic type for context info in tests
interface SuggestionContextInfo {
    prefix: string;
}

// Mock the mergeFilenames function
jest.mock('../../../src/utils/nameUtils', () => ({
    mergeFilenames: jest.fn().mockImplementation((current, suggestion, template) => {
        // Simple mock implementation that returns the expected result
        return 'test/file.md - suggestion';
    })
}));

describe('InputHandlers', () => {
    describe('setInitialSelection', () => {
        let inputEl: any;
        let file: MockTFile;

        beforeEach(() => {
            inputEl = { setSelectionRange: jest.fn() };
            file = new MockTFile('test/file.md');
        });

        it('selects the last part when selectLastPart is true and filename has multiple parts', () => {
            file = new MockTFile('test/file.some.name.md');
            setInitialSelection(inputEl, file as any, true);
            expect(inputEl.setSelectionRange).toHaveBeenCalledWith(15, 19); // 'test/file.some.name'.lastIndexOf('.') + 1 to 'test/file.some.name.md'.lastIndexOf('.')
        });

        it('selects the whole filename when selectLastPart is true but filename has no parts', () => {
            setInitialSelection(inputEl, file as any, true);
            expect(inputEl.setSelectionRange).toHaveBeenCalledWith(5, 9); // 'test/file.md'.lastIndexOf('/') + 1 to 'test/file.md'.lastIndexOf('.')
        });

        it('places cursor at the end when selectLastPart is false', () => {
            setInitialSelection(inputEl, file as any, false);
            expect(inputEl.setSelectionRange).toHaveBeenCalledWith(12, 12); // Length of 'test/file.md'
        });
    });

    describe('configureInputAutoExpansion', () => {
        let inputEl: any;
        let contentEl: any;

        beforeEach(() => {
            inputEl = new MockHTMLElement('textarea');
            contentEl = new MockHTMLElement('div');
            contentEl.offsetHeight = 800;
            inputEl.scrollHeight = 100;
        });

        it('sets up auto-expansion and returns an adjustment function', () => {
            const adjustHeight = configureInputAutoExpansion(inputEl as any, contentEl as any);
            
            // Should set max-height and initial height
            expect(inputEl.style.maxHeight).toBe('500px'); // 800 - 300
            expect(inputEl.style.height).toBe('100px');
            
            // Should add an event listener
            expect(inputEl.addEventListener).toHaveBeenCalledWith('input', expect.any(Function));
            
            // Call the returned function and check it adjusts height
            inputEl.scrollHeight = 150;
            adjustHeight();
            expect(inputEl.style.height).toBe('150px');
        });
    });

    describe('createSuggestionClickHandler', () => {
        let file: MockTFile;
        let inputEl: any;
        let suggestionList: any;
        let plugin: any;
        let updateIsNavigatingSuggestions: jest.Mock;
        let updateKeyboardInstructions: jest.Mock;
        let handler: (suggestion: any) => void;

        beforeEach(() => {
            file = new MockTFile('test/file.md');
            inputEl = { 
                value: 'test/file.md',
                dispatchEvent: jest.fn(),
                focus: jest.fn()
            };
            suggestionList = { selectSuggestion: jest.fn() };
            plugin = new MockPlugin();
            updateIsNavigatingSuggestions = jest.fn();
            updateKeyboardInstructions = jest.fn();
            
            handler = createSuggestionClickHandler(
                file as any,
                inputEl as any,
                suggestionList as any,
                plugin as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
        });

        it('merges the suggestion with the current filename and updates state', () => {
            const suggestion = { name: 'suggestion' };
            
            handler(suggestion);
            
            // Check that the input value was updated
            expect(inputEl.value).toBe('test/file.md - suggestion');
            
            // Check that input event was dispatched
            expect(inputEl.dispatchEvent).toHaveBeenCalled();
            
            // Check that selection was reset
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(-1);
            
            // Check that navigation state was updated
            expect(updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(updateKeyboardInstructions).toHaveBeenCalledWith(false);
            
            // Check that focus was returned to the input
            expect(inputEl.focus).toHaveBeenCalled();
        });
    });

    describe('createSelectionChangeHandler', () => {
        let updateIsNavigatingSuggestions: jest.Mock;
        let updateKeyboardInstructions: jest.Mock;
        let handler: (isSelected: boolean) => void;

        beforeEach(() => {
            updateIsNavigatingSuggestions = jest.fn();
            updateKeyboardInstructions = jest.fn();
            
            handler = createSelectionChangeHandler(
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
        });

        it('updates navigation state and keyboard instructions', () => {
            handler(true);
            
            expect(updateIsNavigatingSuggestions).toHaveBeenCalledWith(true);
            expect(updateKeyboardInstructions).toHaveBeenCalledWith(true);
            
            handler(false);
            
            expect(updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(updateKeyboardInstructions).toHaveBeenCalledWith(false);
        });
    });

    describe('handleArrowNavigation', () => {
        let event: any;
        let suggestionList: any;
        let updateIsNavigatingSuggestions: jest.Mock;
        let updateKeyboardInstructions: jest.Mock;

        beforeEach(() => {
            event = {
                key: 'ArrowDown',
                preventDefault: jest.fn(),
                stopPropagation: jest.fn()
            };
            suggestionList = {
                items: ['item1', 'item2', 'item3'],
                selectedSuggestionIndex: -1,
                selectSuggestion: jest.fn()
            };
            updateIsNavigatingSuggestions = jest.fn();
            updateKeyboardInstructions = jest.fn();
        });

        it('does nothing if there are no suggestions', () => {
            suggestionList.items = [];
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(suggestionList.selectSuggestion).not.toHaveBeenCalled();
        });

        it('selects the first item when pressing ArrowDown with no selection', () => {
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(updateIsNavigatingSuggestions).toHaveBeenCalledWith(true);
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(0);
            expect(updateKeyboardInstructions).toHaveBeenCalledWith(true);
        });

        it('selects the last item when pressing ArrowUp with no selection', () => {
            event.key = 'ArrowUp';
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(2);
        });

        it('moves to the next item when pressing ArrowDown with a selection', () => {
            suggestionList.selectedSuggestionIndex = 0;
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(1);
        });

        it('wraps to the first item when pressing ArrowDown at the end', () => {
            suggestionList.selectedSuggestionIndex = 2;
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(0);
        });

        it('moves to the previous item when pressing ArrowUp with a selection', () => {
            event.key = 'ArrowUp';
            suggestionList.selectedSuggestionIndex = 1;
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(0);
        });

        it('wraps to the last item when pressing ArrowUp at the beginning', () => {
            event.key = 'ArrowUp';
            suggestionList.selectedSuggestionIndex = 0;
            
            handleArrowNavigation(
                event,
                suggestionList as any,
                updateIsNavigatingSuggestions,
                updateKeyboardInstructions
            );
            
            expect(suggestionList.selectSuggestion).toHaveBeenCalledWith(2);
        });
    });
}); 