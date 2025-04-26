import { buildModalContent, createInstructionElement, updateKeyboardInstructions } from '../../../src/ui/builders/ModalContentBuilder';
import { MockHTMLElement, MockTFile, MockApp, MockPlugin, MockSuggestionList } from '../../mocks/ElementMocks';
import { RenameSuggestion } from '../../../src/types';

// Mock ButtonComponent with a class that has the methods used in the component
jest.mock('obsidian', () => ({
    ButtonComponent: jest.fn().mockImplementation(() => ({
        setIcon: jest.fn().mockReturnThis(),
        setTooltip: jest.fn().mockReturnThis(),
        buttonEl: {
            addClass: jest.fn()
        }
    }))
}));

describe('ModalContentBuilder', () => {
    describe('buildModalContent', () => {
        let modalEl: MockHTMLElement;
        let contentEl: MockHTMLElement;
        let file: MockTFile;
        let plugin: MockPlugin;
        let app: MockApp;
        let handleInput: jest.Mock;
        let handleSuggestionClick: jest.Mock;
        let handleSelectionChange: jest.Mock;
        let configureInputAutoExpansion: jest.Mock;
        let setInitialSelection: jest.Mock;
        
        beforeEach(() => {
            modalEl = new MockHTMLElement('div');
            contentEl = new MockHTMLElement('div');
            file = new MockTFile('test/file.md');
            plugin = new MockPlugin();
            app = new MockApp();
            handleInput = jest.fn().mockResolvedValue(undefined);
            handleSuggestionClick = jest.fn();
            handleSelectionChange = jest.fn();
            configureInputAutoExpansion = jest.fn();
            setInitialSelection = jest.fn();
        });
        
        it('creates all required elements and components', () => {
            // No need to test ButtonComponent directly, it's being tested via buildModalContent
            const { elements, suggestionList, errorDisplay } = buildModalContent({
                modalEl: modalEl as unknown as HTMLElement,
                contentEl: contentEl as unknown as HTMLElement,
                file: file as unknown as import('obsidian').TFile,
                plugin: plugin as unknown as import('../../../src/main').default,
                app: app as unknown as import('obsidian').App,
                handleInput,
                handleSuggestionClick,
                handleSelectionChange,
                configureInputAutoExpansion,
                setInitialSelection
            });
            
            // Test that contentEl was emptied, not modalEl
            expect(contentEl.empty).toHaveBeenCalled();
            
            // Test that a modal content div was created on contentEl, not modalEl
            expect(contentEl.createDiv).toHaveBeenCalledWith({ cls: 'modal-content complex-rename-modal' });
            
            // Check that all elements are returned
            expect(elements.inputEl).toBeDefined();
            expect(elements.submitBtn).toBeDefined();
            expect(elements.resetBtn).toBeDefined();
            expect(elements.closeBtn).toBeDefined();
            expect(elements.errorEl).toBeDefined();
            expect(elements.folderNoticeEl).toBeDefined();
            expect(elements.previewEl).toBeDefined();
            expect(elements.suggestionsEl).toBeDefined();
            expect(elements.instructionsEl).toBeDefined();
            
            // Check that components are created and returned
            expect(suggestionList).toBeDefined();
            expect(errorDisplay).toBeDefined();
            
            // Verify input is set up correctly
            expect(elements.inputEl.value).toBe('test/file.md');
            
            // Verify focus was called
            expect(elements.inputEl.focus).toHaveBeenCalled();
            
            // Verify setInitialSelection was called with the input element
            expect(setInitialSelection).toHaveBeenCalledWith(elements.inputEl);
            
            // Verify configureInputAutoExpansion was called with the input element
            expect(configureInputAutoExpansion).toHaveBeenCalledWith(elements.inputEl);
        });
    });
    
    describe('createInstructionElement', () => {
        let container: MockHTMLElement;
        
        beforeEach(() => {
            container = new MockHTMLElement('div');
        });
        
        it('creates instruction element with command and description', () => {
            const command = '↵';
            const description = 'to rename file';
            
            const instructionEl = createInstructionElement(
                container as unknown as HTMLElement, 
                command, 
                description
            );
            
            // Check that a prompt-instruction div was created
            expect(container.createDiv).toHaveBeenCalledWith('prompt-instruction');
            
            // Check that a command span was created
            expect(instructionEl.createSpan).toHaveBeenCalledWith('prompt-instruction-command');
            
            // Check that a description span was created
            expect(instructionEl.createSpan).toHaveBeenCalled();
            
            // Check text was set for command and description
            expect(instructionEl.children[0].setText).toHaveBeenCalledWith(command);
            expect(instructionEl.children[1].setText).toHaveBeenCalledWith(description);
        });
    });
    
    describe('updateKeyboardInstructions', () => {
        let instructionsEl: MockHTMLElement;
        let suggestionList: MockSuggestionList;
        
        beforeEach(() => {
            instructionsEl = new MockHTMLElement('div');
            const containerEl = new MockHTMLElement('div');
            suggestionList = new MockSuggestionList(containerEl as unknown as HTMLElement, jest.fn(), jest.fn());
        });
        
        it('clears existing instructions', () => {
            updateKeyboardInstructions(
                instructionsEl as unknown as HTMLElement, 
                suggestionList as unknown as import('../../../src/ui/components/SuggestionList').SuggestionList, 
                false
            );
            
            expect(instructionsEl.empty).toHaveBeenCalled();
        });
        
        it('shows navigation instructions when suggestions exist', () => {
            // Set up suggestion list with items
            const mockSuggestions: RenameSuggestion[] = [
                { name: 'item1', score: 0.9, source: 'existing' },
                { name: 'item2', score: 0.8, source: 'deadLink' }
            ];
            suggestionList.items = mockSuggestions;
            
            updateKeyboardInstructions(
                instructionsEl as unknown as HTMLElement, 
                suggestionList as unknown as import('../../../src/ui/components/SuggestionList').SuggestionList, 
                false
            );
            
            // Check that appropriate instructions were created
            expect(instructionsEl.createDiv).toHaveBeenCalledTimes(3); // Navigate + Enter + Escape
            
            // Check first instruction is for navigation
            expect(instructionsEl.children[0].children[0].setText).toHaveBeenCalledWith('↑↓');
            expect(instructionsEl.children[0].children[1].setText).toHaveBeenCalledWith('to navigate');
        });
        
        it('shows correct instructions when suggestion is selected', () => {
            // Set up suggestion list with items and selected suggestion
            const mockSuggestions: RenameSuggestion[] = [
                { name: 'item1', score: 0.9, source: 'existing' },
                { name: 'item2', score: 0.8, source: 'deadLink' }
            ];
            suggestionList.items = mockSuggestions;
            
            updateKeyboardInstructions(
                instructionsEl as unknown as HTMLElement, 
                suggestionList as unknown as import('../../../src/ui/components/SuggestionList').SuggestionList, 
                true
            );
            
            // Check that appropriate instructions were created
            expect(instructionsEl.createDiv).toHaveBeenCalledTimes(3); // Navigate + Enter/Tab + Escape
            
            // Check instructions
            expect(instructionsEl.children[0].children[0].setText).toHaveBeenCalledWith('↑↓');
            expect(instructionsEl.children[0].children[1].setText).toHaveBeenCalledWith('to navigate');
            expect(instructionsEl.children[1].children[0].setText).toHaveBeenCalledWith('↵/tab');
            expect(instructionsEl.children[1].children[1].setText).toHaveBeenCalledWith('to merge suggestion with current filename');
            expect(instructionsEl.children[2].children[0].setText).toHaveBeenCalledWith('esc');
            expect(instructionsEl.children[2].children[1].setText).toHaveBeenCalledWith('to return to input');
        });
        
        it('shows "rename file" instruction when no suggestion is selected', () => {
            // Set up suggestion list with items but no selection
            const mockSuggestions: RenameSuggestion[] = [
                { name: 'item1', score: 0.9, source: 'existing' },
                { name: 'item2', score: 0.8, source: 'deadLink' }
            ];
            suggestionList.items = mockSuggestions;
            
            updateKeyboardInstructions(
                instructionsEl as unknown as HTMLElement, 
                suggestionList as unknown as import('../../../src/ui/components/SuggestionList').SuggestionList, 
                false // no suggestion selected
            );
            
            // Check instructions for rename
            expect(instructionsEl.children[1].children[0].setText).toHaveBeenCalledWith('↵');
            expect(instructionsEl.children[1].children[1].setText).toHaveBeenCalledWith('to rename file');
            
            // Check escape instruction for normal mode
            expect(instructionsEl.children[2].children[0].setText).toHaveBeenCalledWith('esc');
            expect(instructionsEl.children[2].children[1].setText).toHaveBeenCalledWith('to close modal');
        });
    });
}); 