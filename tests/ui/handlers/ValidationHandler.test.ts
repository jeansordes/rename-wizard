import { validateFileNameAndUpdateUI } from '../../../src/ui/handlers/ValidationHandler';
import { MockApp, MockErrorDisplay } from '../../mocks/ElementMocks';
import { App } from 'obsidian';
import * as fileNameValidator from '../../../src/validators/fileNameValidator';
import { ErrorDisplay } from '../../../src/ui/components/ErrorDisplay';

// Define a more specific type for our mock files
interface MockFile {
    path: string;
    parent: { path: string } | null;
}

describe('ValidationHandler', () => {
    describe('validateFileNameAndUpdateUI', () => {
        let app: MockApp;
        let errorDisplay: MockErrorDisplay;
        let currentFilePath: string;
        let validateFileNamePureSpy: jest.SpyInstance;
        
        beforeEach(() => {
            app = new MockApp();
            errorDisplay = new MockErrorDisplay();
            currentFilePath = 'test/file.md';
            
            // Set up app.vault.getAllLoadedFiles mock
            const mockFiles: MockFile[] = [
                { path: 'test/file.md', parent: { path: 'test' } },
                { path: 'test/other.md', parent: { path: 'test' } },
                { path: 'another/doc.md', parent: { path: 'another' } }
            ];
            app.vault.getAllLoadedFiles.mockReturnValue(mockFiles);
            
            // Spy on validateFileNamePure
            validateFileNamePureSpy = jest.spyOn(fileNameValidator, 'validateFileNamePure');
        });
        
        afterEach(() => {
            validateFileNamePureSpy.mockRestore();
        });
        
        it('builds a map of existing files and folders', () => {
            // Set up validateFileNamePure to return valid result
            validateFileNamePureSpy.mockReturnValue({
                isValid: true,
                errorMessage: '',
                isWarning: false
            });
            
            validateFileNameAndUpdateUI(
                'test/new-name.md',
                app as unknown as App,
                currentFilePath,
                errorDisplay as unknown as ErrorDisplay
            );
            
            // Check that validateFileNamePure was called with the correct arguments
            expect(validateFileNamePureSpy).toHaveBeenCalledWith(
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
            validateFileNamePureSpy.mockReturnValue({
                isValid: false,
                errorMessage: 'Invalid filename',
                isWarning: false
            });
            
            const result = validateFileNameAndUpdateUI(
                'invalid-name',
                app as unknown as App,
                currentFilePath,
                errorDisplay as unknown as ErrorDisplay
            );
            
            expect(result).toBe(false);
            expect(errorDisplay.showError).toHaveBeenCalledWith('Invalid filename', false);
            expect(errorDisplay.hideError).not.toHaveBeenCalled();
        });
        
        it('returns true but shows warning for valid filenames with warnings', () => {
            // Set up validateFileNamePure to return valid result with warning
            validateFileNamePureSpy.mockReturnValue({
                isValid: true,
                errorMessage: 'Warning message',
                isWarning: true,
                warningMessages: ['Detailed warning']
            });
            
            const result = validateFileNameAndUpdateUI(
                'valid-with-warning',
                app as unknown as App,
                currentFilePath,
                errorDisplay as unknown as ErrorDisplay
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
            validateFileNamePureSpy.mockReturnValue({
                isValid: true,
                errorMessage: '',
                isWarning: false
            });
            
            const result = validateFileNameAndUpdateUI(
                'valid-name',
                app as unknown as App,
                currentFilePath,
                errorDisplay as unknown as ErrorDisplay
            );
            
            expect(result).toBe(true);
            expect(errorDisplay.showError).not.toHaveBeenCalled();
            expect(errorDisplay.hideError).toHaveBeenCalled();
        });
    });
}); 