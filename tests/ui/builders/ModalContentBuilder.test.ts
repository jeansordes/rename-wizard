import { buildModalContent, createInstructionElement, updateKeyboardInstructions } from '../../../src/ui/builders/ModalContentBuilder';
import { MockHTMLElement, MockTFile, MockApp, MockPlugin, MockSuggestionList, MockButtonComponent } from '../../mocks/ElementMocks';
import { RenameSuggestion } from '../../../src/types';
import { ButtonComponent } from 'obsidian';

// Mock ButtonComponent constructor
jest.mock('obsidian', () => {
    return {
        ButtonComponent: jest.fn().mockImplementation(() => {
            return {
                setIcon: jest.fn().mockReturnThis(),
                setTooltip: jest.fn().mockReturnThis(),
                onClick: jest.fn().mockReturnThis(),
                buttonEl: {
                    addClass: jest.fn(),
                    style: {}
                }
            };
        }),
        // Add other obsidian components as needed
        // App and TFile are already being mocked elsewhere
    };
}, { virtual: true });

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
            
            // Reset ButtonComponent mock
            (ButtonComponent as jest.Mock).mockClear();
        });
        
        it('creates all required elements and components', () => {
            const { elements, suggestionList, errorDisplay } = buildModalContent({
                modalEl: modalEl as any,
                contentEl: contentEl as any,
                file: file as any,
                plugin: plugin as any,
                app: app as any,
                handleInput,
                handleSuggestionClick,
                handleSelectionChange,
                configureInputAutoExpansion,
                setInitialSelection
            });
            
            // Test that modalEl was emptied
            expect(modalEl.empty).toHaveBeenCalled();
            
            // Test that a modal content div was created
            expect(modalEl.createDiv).toHaveBeenCalledWith({ cls: 'modal-content complex-rename-modal' });
            
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
            
            // Check ButtonComponent was constructed
            expect(ButtonComponent).toHaveBeenCalledTimes(3); // reset, submit, close buttons
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
                container as any, 
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
            suggestionList = new MockSuggestionList(null, jest.fn(), jest.fn());
        });
        
        it('clears existing instructions', () => {
            updateKeyboardInstructions(
                instructionsEl as any, 
                suggestionList as any, 
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
                instructionsEl as any, 
                suggestionList as any, 
                false
            );
            
            // Check that appropriate instructions were created
            expect(instructionsEl.createDiv).toHaveBeenCalledTimes(3); // Navigate + Enter + Escape
            
            // Check first instruction is for navigation
            expect(instructionsEl.children[0].children[0].setText).toHaveBeenCalledWith('↑↓');
            expect(instructionsEl.children[0].children[1].setText).toHaveBeenCalledWith('to navigate');
        });
        
        it('shows "merge suggestion" instruction when suggestion is selected', () => {
            // Set up suggestion list with items and selection
            const mockSuggestions: RenameSuggestion[] = [
                { name: 'item1', score: 0.9, source: 'existing' },
                { name: 'item2', score: 0.8, source: 'deadLink' }
            ];
            suggestionList.items = mockSuggestions;
            
            updateKeyboardInstructions(
                instructionsEl as any, 
                suggestionList as any, 
                true // suggestion selected
            );
            
            // Check instructions for suggestion selection
            expect(instructionsEl.children[1].children[0].setText).toHaveBeenCalledWith('↵');
            expect(instructionsEl.children[1].children[1].setText).toHaveBeenCalledWith('to merge suggestion with current filename');
            
            // Check escape instruction for suggestion mode
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
                instructionsEl as any, 
                suggestionList as any, 
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