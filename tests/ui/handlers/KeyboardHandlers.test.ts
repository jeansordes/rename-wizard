/* eslint-disable @typescript-eslint/no-explicit-any */
import { 
    createKeydownHandler, 
    createCaptureKeydownHandler,
    createEscapeKeyHandler,
} from '../../../src/ui/handlers/KeyboardHandlers';

// Mock the handleArrowNavigation function from InputHandlers
jest.mock('../../../src/ui/handlers/InputHandlers', () => ({
    handleArrowNavigation: jest.fn()
}));

import { handleArrowNavigation } from '../../../src/ui/handlers/InputHandlers';

describe('KeyboardHandlers', () => {
    describe('createKeydownHandler', () => {
        let context: any;
        let handler: (event: any) => void;
        
        beforeEach(() => {
            context = {
                suggestionList: {
                    selectedSuggestionIndex: -1,
                    getSuggestionAt: jest.fn(),
                    items: []
                },
                inputEl: { value: 'test/file.md' },
                isNavigatingSuggestions: false,
                updateIsNavigatingSuggestions: jest.fn(),
                updateKeyboardInstructions: jest.fn(),
                validateAndUpdateUI: jest.fn().mockReturnValue(true),
                performRename: jest.fn().mockResolvedValue(undefined),
                handleSuggestionClick: jest.fn()
            };
            
            handler = createKeydownHandler(context);
            
            // Reset the mock for handleArrowNavigation
            jest.mocked(handleArrowNavigation).mockReset();
        });

        it('does nothing if suggestionList is not defined', () => {
            // Save the original context for later restoration
            const originalContext = {...context};
            
            // Set suggestionList to undefined
            context.suggestionList = undefined;
            
            // Create a new event mock
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            // Reset the mocks before calling the handler
            context.validateAndUpdateUI.mockClear();
            context.performRename.mockClear();
            
            // Call the handler with the event
            handler(event);
            
            // With suggestionList undefined, the handler should return early
            // and not call any of these functions
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(context.validateAndUpdateUI).not.toHaveBeenCalled();
            expect(context.performRename).not.toHaveBeenCalled();
            
            // Restore original context for other tests
            Object.assign(context, originalContext);
        });

        it('handles Enter key when no suggestion is selected and input is valid', () => {
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            handler(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(context.validateAndUpdateUI).toHaveBeenCalledWith('test/file.md');
            expect(context.performRename).toHaveBeenCalled();
        });

        it('does not perform rename if input is invalid', () => {
            context.validateAndUpdateUI.mockReturnValue(false);
            
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            handler(event);
            
            expect(context.validateAndUpdateUI).toHaveBeenCalledWith('test/file.md');
            expect(context.performRename).not.toHaveBeenCalled();
        });

        it('does not handle Enter key when in composition mode', () => {
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                isComposing: true
            };
            
            handler(event);
            
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(context.performRename).not.toHaveBeenCalled();
        });

        it('applies selected suggestion when Enter is pressed with suggestion selected', () => {
            context.suggestionList.selectedSuggestionIndex = 0;
            const mockSuggestion = { name: 'suggestion' };
            context.suggestionList.getSuggestionAt.mockReturnValue(mockSuggestion);
            
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            handler(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(context.suggestionList.getSuggestionAt).toHaveBeenCalledWith(0);
            expect(context.handleSuggestionClick).toHaveBeenCalledWith(mockSuggestion);
            expect(context.performRename).not.toHaveBeenCalled();
        });

        it('applies selected suggestion when Tab is pressed with suggestion selected', () => {
            context.suggestionList.selectedSuggestionIndex = 0;
            const mockSuggestion = { name: 'suggestion' };
            context.suggestionList.getSuggestionAt.mockReturnValue(mockSuggestion);
            
            const event = { 
                key: 'Tab', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            handler(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(context.suggestionList.getSuggestionAt).toHaveBeenCalledWith(0);
            expect(context.handleSuggestionClick).toHaveBeenCalledWith(mockSuggestion);
            expect(context.performRename).not.toHaveBeenCalled();
        });

        it('does not perform rename when Tab is pressed with no suggestion selected', () => {
            context.suggestionList.selectedSuggestionIndex = -1;
            
            const event = { 
                key: 'Tab', 
                preventDefault: jest.fn(),
                isComposing: false
            };
            
            handler(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(context.performRename).not.toHaveBeenCalled();
        });

        it('delegates to handleArrowNavigation for arrow keys', () => {
            const event = { 
                key: 'ArrowDown', 
                preventDefault: jest.fn()
            };
            
            handler(event);
            
            expect(handleArrowNavigation).toHaveBeenCalledWith(
                event,
                context.suggestionList,
                context.updateIsNavigatingSuggestions,
                context.updateKeyboardInstructions
            );
            
            jest.mocked(handleArrowNavigation).mockReset();
            
            const upEvent = { 
                key: 'ArrowUp', 
                preventDefault: jest.fn()
            };
            
            handler(upEvent);
            
            expect(handleArrowNavigation).toHaveBeenCalledWith(
                upEvent,
                context.suggestionList,
                context.updateIsNavigatingSuggestions,
                context.updateKeyboardInstructions
            );
        });
    });

    describe('createCaptureKeydownHandler', () => {
        let context: any;
        let handler: (event: any) => void;
        
        beforeEach(() => {
            context = {
                suggestionList: {
                    selectedSuggestionIndex: -1,
                    selectSuggestion: jest.fn()
                },
                inputEl: { focus: jest.fn() },
                isNavigatingSuggestions: false,
                updateIsNavigatingSuggestions: jest.fn(),
                updateKeyboardInstructions: jest.fn()
            };
            
            handler = createCaptureKeydownHandler(context);
        });

        it('does nothing for non-Escape keys', () => {
            const event = { 
                key: 'Enter', 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            
            handler(event);
            
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(context.suggestionList.selectSuggestion).not.toHaveBeenCalled();
        });

        it('does nothing if suggestionList is not defined', () => {
            context.suggestionList = undefined;
            
            const event = { 
                key: 'Escape', 
                preventDefault: jest.fn()
            };
            
            handler(event);
            
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('handles Escape when in navigation mode', () => {
            // Set isNavigatingSuggestions to true
            context.isNavigatingSuggestions = true;
            
            const event = { 
                key: 'Escape', 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            
            handler(event);
            
            // Now confirm expected behavior with the navigation mode set
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(event.stopImmediatePropagation).toHaveBeenCalled();
            expect(context.suggestionList.selectSuggestion).toHaveBeenCalledWith(-1);
            expect(context.updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(context.updateKeyboardInstructions).toHaveBeenCalledWith(false);
            expect(context.inputEl.focus).toHaveBeenCalled();
        });

        it('handles Escape when a suggestion is selected', () => {
            context.suggestionList.selectedSuggestionIndex = 0;
            
            const event = { 
                key: 'Escape', 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            
            handler(event);
            
            expect(event.preventDefault).toHaveBeenCalled();
            expect(context.suggestionList.selectSuggestion).toHaveBeenCalledWith(-1);
            expect(context.updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(context.updateKeyboardInstructions).toHaveBeenCalledWith(false);
            expect(context.inputEl.focus).toHaveBeenCalled();
        });

        it('does nothing when not in navigation mode and no suggestion selected', () => {
            const event = { 
                key: 'Escape', 
                preventDefault: jest.fn(),
                stopPropagation: jest.fn(),
                stopImmediatePropagation: jest.fn()
            };
            
            handler(event);
            
            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(context.suggestionList.selectSuggestion).not.toHaveBeenCalled();
            expect(context.updateIsNavigatingSuggestions).not.toHaveBeenCalled();
            expect(context.updateKeyboardInstructions).not.toHaveBeenCalled();
            expect(context.inputEl.focus).not.toHaveBeenCalled();
        });
    });

    describe('createEscapeKeyHandler', () => {
        let context: any;
        let handler: () => boolean;
        
        beforeEach(() => {
            context = {
                suggestionList: {
                    selectedSuggestionIndex: -1,
                    selectSuggestion: jest.fn()
                },
                inputEl: { focus: jest.fn() },
                isNavigatingSuggestions: false,
                updateIsNavigatingSuggestions: jest.fn(),
                updateKeyboardInstructions: jest.fn(),
                close: jest.fn()
            };
            
            handler = createEscapeKeyHandler(context);
        });

        it('returns true if suggestionList is not defined', () => {
            context.suggestionList = undefined;
            
            const result = handler();
            
            expect(result).toBe(true);
            expect(context.close).toHaveBeenCalled();
        });

        it('resets navigation state and returns false when in navigation mode', () => {
            // Set isNavigatingSuggestions to true
            context.isNavigatingSuggestions = true;
            
            const result = handler();
            
            expect(result).toBe(false);
            expect(context.suggestionList.selectSuggestion).toHaveBeenCalledWith(-1);
            expect(context.updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(context.updateKeyboardInstructions).toHaveBeenCalledWith(false);
            expect(context.inputEl.focus).toHaveBeenCalled();
            expect(context.close).not.toHaveBeenCalled();
        });

        it('resets navigation state and returns false when a suggestion is selected', () => {
            context.suggestionList.selectedSuggestionIndex = 0;
            
            const result = handler();
            
            expect(result).toBe(false);
            expect(context.suggestionList.selectSuggestion).toHaveBeenCalledWith(-1);
            expect(context.updateIsNavigatingSuggestions).toHaveBeenCalledWith(false);
            expect(context.updateKeyboardInstructions).toHaveBeenCalledWith(false);
            expect(context.inputEl.focus).toHaveBeenCalled();
            expect(context.close).not.toHaveBeenCalled();
        });

        it('calls close and returns true when not in navigation mode and no suggestion selected', () => {
            const result = handler();
            
            expect(result).toBe(true);
            expect(context.suggestionList.selectSuggestion).not.toHaveBeenCalled();
            expect(context.updateIsNavigatingSuggestions).not.toHaveBeenCalled();
            expect(context.updateKeyboardInstructions).not.toHaveBeenCalled();
            expect(context.inputEl.focus).not.toHaveBeenCalled();
            expect(context.close).toHaveBeenCalled();
        });
        
        it('should never close the modal if in navigation mode regardless of other state', () => {
            // Arrange - navigation mode + suggestion selected
            context.isNavigatingSuggestions = true;
            context.suggestionList.selectedSuggestionIndex = 1;
            
            // Act
            const result = handler();
            
            // Assert
            expect(result).toBe(false);
            expect(context.close).not.toHaveBeenCalled();
        });
    });
}); 