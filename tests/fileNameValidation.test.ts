import { validateFileNamePure } from '../src/validators/fileNameValidator';

describe('File Name Validation', () => {
    describe('validateFileNamePure', () => {
        
        test('should reject empty filenames', () => {
            const result = validateFileNamePure('', {}, 'original.txt');
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Filename cannot be empty');
            expect(result.isWarning).toBe(false);
        });

        test('should reject filenames with invalid characters', () => {
            const result = validateFileNamePure('file?.txt', {}, 'original.txt');
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Filename contains invalid characters: ?');
            expect(result.isWarning).toBe(false);
        });

        test('should detect multiple invalid characters', () => {
            const result = validateFileNamePure('file*:?<>.txt', {}, 'original.txt');
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('invalid characters');
            // Check that it includes all the invalid characters
            expect(result.errorMessage).toContain('*');
            expect(result.errorMessage).toContain(':');
            expect(result.errorMessage).toContain('?');
            expect(result.errorMessage).toContain('<');
            expect(result.errorMessage).toContain('>');
        });

        test('should detect existing files', () => {
            const existingFiles = {
                'existing.txt': true
            };
            
            const result = validateFileNamePure('existing.txt', existingFiles, 'original.txt');
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('A file with this name already exists at: existing.txt');
            expect(result.isWarning).toBe(true);
        });

        test('should allow renaming to the same path', () => {
            const existingFiles = {
                'original.txt': true
            };
            
            const result = validateFileNamePure('original.txt', existingFiles, 'original.txt');
            
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBe('');
        });

        test('should reject paths with empty segments', () => {
            const result = validateFileNamePure('folder//file.txt', {}, 'original.txt');
            
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toBe('Path cannot contain empty segments');
            expect(result.isWarning).toBe(false);
        });

        test('should warn about non-existent folders', () => {
            const existingFiles = {}; // No folders exist
            
            const result = validateFileNamePure('new-folder/file.txt', existingFiles, 'original.txt');
            
            expect(result.isValid).toBe(true); // Valid but with warning
            expect(result.errorMessage).toBe("Folder doesn't exist: new-folder");
            expect(result.isWarning).toBe(true);
        });

        test('should accept valid filenames', () => {
            const result = validateFileNamePure('valid-name.txt', {}, 'original.txt');
            
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBe('');
        });

        test('should preserve path when normalizing', () => {
            const result = validateFileNamePure('folder/valid-name.txt', {
                'folder': true  // Folder exists
            }, 'original.txt');
            
            expect(result.isValid).toBe(true);
            expect(result.newPath).toBe('folder/valid-name.txt');
        });

        test('should handle relative paths properly', () => {
            const result = validateFileNamePure('../sibling-folder/file.txt', {
                'sibling-folder': true
            }, 'current-folder/original.txt');
            
            expect(result.isValid).toBe(true);
            // Check that the path is normalized correctly
            expect(result.newPath).toBe('sibling-folder/file.txt');
        });

        test('should handle mixed backslashes and forward slashes', () => {
            const result = validateFileNamePure('folder\\file.txt', {}, 'original.txt');
            
            // This should be treated as invalid with special characters
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('invalid characters');
            expect(result.errorMessage).toContain('\\');
        });

        test('should warn when file extension is changed', () => {
            const result = validateFileNamePure('document.md', {}, 'document.txt');
            
            expect(result.isValid).toBe(true); // Valid but with warning
            expect(result.errorMessage).toBe('File extension will change from .txt to .md');
            expect(result.isWarning).toBe(true);
            expect(result.newPath).toBe('document.md');
        });

        test('should not warn when file extension stays the same', () => {
            const result = validateFileNamePure('new-document.txt', {}, 'old-document.txt');
            
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBe('');
            expect(result.isWarning).toBe(false);
        });

        test('should warn when adding an extension to a file without extension', () => {
            const result = validateFileNamePure('document.md', {}, 'document');
            
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBe('File extension will change from no extension to .md');
            expect(result.isWarning).toBe(true);
        });

        test('should warn when removing an extension', () => {
            const result = validateFileNamePure('document', {}, 'document.txt');
            
            expect(result.isValid).toBe(true);
            expect(result.errorMessage).toBe('File extension will change from .txt to no extension');
            expect(result.isWarning).toBe(true);
        });
    });
}); 