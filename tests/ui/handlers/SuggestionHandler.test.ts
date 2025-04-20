/* eslint-disable @typescript-eslint/no-explicit-any */
import { updateSuggestions } from '../../../src/ui/handlers/SuggestionHandler';
import { MockApp, MockSuggestionList } from '../../mocks/ElementMocks';
import { RenameSuggestion } from '../../../src/types';

// Mock the getSuggestions function
jest.mock('../../../src/core/suggestions', () => ({
    getSuggestions: jest.fn()
}));

import { getSuggestions } from '../../../src/core/suggestions';

describe('SuggestionHandler', () => {
    describe('updateSuggestions', () => {
        let app: MockApp;
        let suggestionList: MockSuggestionList;
        let currentValue: string;
        let maxSuggestions: number;
        let fuzzyMatchThreshold: number;
        
        beforeEach(() => {
            app = new MockApp();
            // Pass empty functions for required callback parameters
            suggestionList = new MockSuggestionList(
                null, 
                () => {}, // Mock suggestion click handler
                () => {}  // Mock selection change handler
            );
            currentValue = 'test/file.md';
            maxSuggestions = 5;
            fuzzyMatchThreshold = 0.3;
            
            // Reset the getSuggestions mock
            jest.mocked(getSuggestions).mockReset();
        });
        
        it('calls getSuggestions with the correct parameters', async () => {
            // Set up getSuggestions to return empty array
            const mockSuggestions: RenameSuggestion[] = [];
            jest.mocked(getSuggestions).mockResolvedValue(mockSuggestions);
            
            await updateSuggestions(
                app as any,
                currentValue,
                maxSuggestions,
                fuzzyMatchThreshold,
                suggestionList as any
            );
            
            expect(getSuggestions).toHaveBeenCalledWith(
                app,
                currentValue,
                maxSuggestions,
                fuzzyMatchThreshold
            );
        });
        
        it('updates the suggestion list with the results', async () => {
            // Set up getSuggestions to return mock suggestions with required properties
            const mockSuggestions: RenameSuggestion[] = [
                { name: 'suggestion1', score: 0.9, source: 'existing' },
                { name: 'suggestion2', score: 0.8, source: 'deadLink' }
            ];
            jest.mocked(getSuggestions).mockResolvedValue(mockSuggestions);
            
            await updateSuggestions(
                app as any,
                currentValue,
                maxSuggestions,
                fuzzyMatchThreshold,
                suggestionList as any
            );
            
            expect(suggestionList.updateSuggestions).toHaveBeenCalledWith(
                mockSuggestions,
                currentValue
            );
        });
        
        it('handles empty suggestions', async () => {
            // Set up getSuggestions to return empty array
            const mockSuggestions: RenameSuggestion[] = [];
            jest.mocked(getSuggestions).mockResolvedValue(mockSuggestions);
            
            await updateSuggestions(
                app as any,
                currentValue,
                maxSuggestions,
                fuzzyMatchThreshold,
                suggestionList as any
            );
            
            expect(suggestionList.updateSuggestions).toHaveBeenCalledWith(
                mockSuggestions,
                currentValue
            );
        });
    });
}); 