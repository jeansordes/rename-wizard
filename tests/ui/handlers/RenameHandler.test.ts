import { performRenameOperation } from '../../../src/ui/handlers/RenameHandler';
import { MockApp, MockErrorDisplay, MockTFile } from '../../mocks/ElementMocks';

// Mock the normalizePath function
jest.mock('../../../src/validators/fileNameValidator', () => ({
    normalizePath: jest.fn()
}));

import { normalizePath } from '../../../src/validators/fileNameValidator';

describe('RenameHandler', () => {
    describe('performRenameOperation', () => {
        let app: MockApp;
        let file: MockTFile;
        let errorDisplay: MockErrorDisplay;
        let onSuccess: jest.Mock;
        
        beforeEach(() => {
            app = new MockApp();
            file = new MockTFile('test/file.md');
            errorDisplay = new MockErrorDisplay();
            onSuccess = jest.fn();
            
            // Reset the normalizePath mock
            jest.mocked(normalizePath).mockReset();
        });
        
        it('returns false for empty filenames', async () => {
            const result = await performRenameOperation(
                '  ',
                file as any,
                app as any,
                errorDisplay as any,
                onSuccess
            );
            
            expect(result).toBe(false);
            expect(normalizePath).not.toHaveBeenCalled();
            expect(app.fileManager.renameFile).not.toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });
        
        it('creates folders if needed and renames the file', async () => {
            // Set up normalizePath to return path with new folder
            jest.mocked(normalizePath).mockReturnValue({
                newPath: 'new/path/file.md',
                folderPath: 'new/path'
            });
            
            // Set up getAbstractFileByPath to return null (folder doesn't exist)
            app.vault.getAbstractFileByPath.mockReturnValue(null);
            
            const result = await performRenameOperation(
                'new/path/file.md',
                file as any,
                app as any,
                errorDisplay as any,
                onSuccess
            );
            
            expect(result).toBe(true);
            expect(normalizePath).toHaveBeenCalledWith('new/path/file.md', file);
            expect(app.vault.getAbstractFileByPath).toHaveBeenCalledWith('new/path');
            expect(app.vault.createFolder).toHaveBeenCalledWith('new/path');
            expect(app.fileManager.renameFile).toHaveBeenCalledWith(file, 'new/path/file.md');
            expect(onSuccess).toHaveBeenCalled();
            expect(errorDisplay.showError).not.toHaveBeenCalled();
        });
        
        it('skips folder creation if folder already exists', async () => {
            // Set up normalizePath to return path with existing folder
            jest.mocked(normalizePath).mockReturnValue({
                newPath: 'existing/path/file.md',
                folderPath: 'existing/path'
            });
            
            // Set up getAbstractFileByPath to return a folder (folder exists)
            app.vault.getAbstractFileByPath.mockReturnValue({ path: 'existing/path' });
            
            const result = await performRenameOperation(
                'existing/path/file.md',
                file as any,
                app as any,
                errorDisplay as any,
                onSuccess
            );
            
            expect(result).toBe(true);
            expect(app.vault.getAbstractFileByPath).toHaveBeenCalledWith('existing/path');
            expect(app.vault.createFolder).not.toHaveBeenCalled();
            expect(app.fileManager.renameFile).toHaveBeenCalledWith(file, 'existing/path/file.md');
            expect(onSuccess).toHaveBeenCalled();
        });
        
        it('renames the file without folder changes if no folder path', async () => {
            // Set up normalizePath to return path without folder
            jest.mocked(normalizePath).mockReturnValue({
                newPath: 'new-name.md',
                folderPath: null
            });
            
            const result = await performRenameOperation(
                'new-name.md',
                file as any,
                app as any,
                errorDisplay as any,
                onSuccess
            );
            
            expect(result).toBe(true);
            expect(app.vault.getAbstractFileByPath).not.toHaveBeenCalled();
            expect(app.vault.createFolder).not.toHaveBeenCalled();
            expect(app.fileManager.renameFile).toHaveBeenCalledWith(file, 'new-name.md');
            expect(onSuccess).toHaveBeenCalled();
        });
        
        it('handles errors and returns false', async () => {
            // Set up normalizePath to return valid path
            jest.mocked(normalizePath).mockReturnValue({
                newPath: 'new-name.md',
                folderPath: null
            });
            
            // Set up renameFile to throw an error
            const errorMessage = 'Error renaming file';
            app.fileManager.renameFile.mockRejectedValue(new Error(errorMessage));
            
            const result = await performRenameOperation(
                'new-name.md',
                file as any,
                app as any,
                errorDisplay as any,
                onSuccess
            );
            
            expect(result).toBe(false);
            expect(app.fileManager.renameFile).toHaveBeenCalledWith(file, 'new-name.md');
            expect(onSuccess).not.toHaveBeenCalled();
            expect(errorDisplay.showError).toHaveBeenCalledWith(
                `Error renaming file: ${errorMessage}`,
                false
            );
        });
    });
}); 