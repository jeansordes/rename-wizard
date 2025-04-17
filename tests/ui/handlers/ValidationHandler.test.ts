import { validateFileNameAndUpdateUI } from '../../../src/ui/handlers/ValidationHandler';
import { MockApp, MockErrorDisplay, MockTFile } from '../../mocks/ElementMocks';

// Mock the validateFileNamePure function
jest.mock('../../../src/validators/fileNameValidator', () => ({
    validateFileNamePure: jest.fn()
}));

import { validateFileNamePure } from '../../../src/validators/fileNameValidator';

describe('ValidationHandler', () => {
    describe('validateFileNameAndUpdateUI', () => {
        let app: MockApp;
        let errorDisplay: MockErrorDisplay;
        let currentFilePath: string;
        
        beforeEach(() => {
            app = new MockApp();
            errorDisplay = new MockErrorDisplay();
            currentFilePath = 'test/file.md';
            
            // Set up app.vault.getAllLoadedFiles mock
            const mockFiles = [
                { path: 'test/file.md', parent: { path: 'test' } },
                { path: 'test/other.md', parent: { path: 'test' } },
                { path: 'another/doc.md', parent: { path: 'another' } }
            ];
            app.vault.getAllLoadedFiles.mockReturnValue(mockFiles);
            
            // Reset the validateFileNamePure mock
            jest.mocked(validateFileNamePure).mockReset();
        });
        
        it('builds a map of existing files and folders', () => {
            // Set up validateFileNamePure to return valid result
            jest.mocked(validateFileNamePure).mockReturnValue({
                isValid: true,
                errorMessage: '',
                isWarning: false
            });
            
            validateFileNameAndUpdateUI(
                'test/new-name.md',
                app as any,
                currentFilePath,
                errorDisplay as any
            );
            
            // Check that validateFileNamePure was called with the correct arguments
            expect(validateFileNamePure).toHaveBeenCalledWith(
                'test/new-name.md', 
                {
                    'test/file.md': true,
                    'test/other.md': true,
                    'another/doc.md': true,
                    'test': true,
                    'another': true
                },
                'test/file.md'
            );
        });
        
        it('returns false and shows error for invalid filenames', () => {
            // Set up validateFileNamePure to return invalid result
            jest.mocked(validateFileNamePure).mockReturnValue({
                isValid: false,
                errorMessage: 'Invalid filename',
                isWarning: false
            });
            
            const result = validateFileNameAndUpdateUI(
                'invalid-name',
                app as any,
                currentFilePath,
                errorDisplay as any
            );
            
            expect(result).toBe(false);
            expect(errorDisplay.showError).toHaveBeenCalledWith('Invalid filename', false);
            expect(errorDisplay.hideError).not.toHaveBeenCalled();
        });
        
        it('returns true but shows warning for valid filenames with warnings', () => {
            // Set up validateFileNamePure to return valid result with warning
            jest.mocked(validateFileNamePure).mockReturnValue({
                isValid: true,
                errorMessage: 'Warning message',
                isWarning: true,
                warningMessages: ['Detailed warning']
            });
            
            const result = validateFileNameAndUpdateUI(
                'valid-with-warning',
                app as any,
                currentFilePath,
                errorDisplay as any
            );
            
            expect(result).toBe(true);
            expect(errorDisplay.showError).toHaveBeenCalledWith(
                'Warning message', 
                true, 
                ['Detailed warning']
            );
            expect(errorDisplay.hideError).not.toHaveBeenCalled();
        });
        
        it('returns true and hides error for valid filenames without warnings', () => {
            // Set up validateFileNamePure to return valid result without warning
            jest.mocked(validateFileNamePure).mockReturnValue({
                isValid: true,
                errorMessage: '',
                isWarning: false
            });
            
            const result = validateFileNameAndUpdateUI(
                'valid-name',
                app as any,
                currentFilePath,
                errorDisplay as any
            );
            
            expect(result).toBe(true);
            expect(errorDisplay.showError).not.toHaveBeenCalled();
            expect(errorDisplay.hideError).toHaveBeenCalled();
        });
    });
}); 