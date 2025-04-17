import { 
    normalizePath, 
    validateEmptyName,
    validateReservedCharacters,
    validateEmptyPathSegments,
    checkExtensionChange,
    checkFileExistsPure,
    checkFolderExistsPure,
    FILE_VALIDATION
} from '../../src/validators/fileNameValidator';
import { TFile } from 'obsidian';

describe('fileNameValidator', () => {
    describe('normalizePath', () => {
        // Create mock files for testing
        const createMockFile = (path: string): TFile => {
            const folderPath = path.includes('/') 
                ? path.substring(0, path.lastIndexOf('/'))
                : '';
                
            return {
                path: path,
                name: path.split('/').pop() || '',
                parent: folderPath ? { path: folderPath } as any : null
            } as TFile;
        };
        
        test('should keep file in current folder when no slashes', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('newFile.md', file);
            
            expect(result.newPath).toBe('folder/newFile.md');
            expect(result.folderPath).toBeNull();
        });
        
        test('should handle files in root folder', () => {
            const file = createMockFile('originalFile.md');
            file.parent = { path: '/' } as any;
            const result = normalizePath('newFile.md', file);
            
            expect(result.newPath).toBe('/newFile.md');
            expect(result.folderPath).toBeNull();
        });
        
        test('should handle file without parent folder', () => {
            const file = createMockFile('originalFile.md');
            file.parent = null;
            const result = normalizePath('newFile.md', file);
            
            expect(result.newPath).toBe('newFile.md');
            expect(result.folderPath).toBeNull();
        });
        
        test('should handle empty parent path', () => {
            const file = createMockFile('originalFile.md');
            file.parent = { path: '' } as any;
            const result = normalizePath('newFile.md', file);
            
            expect(result.newPath).toBe('newFile.md');
            expect(result.folderPath).toBeNull();
        });
        
        test('should create path with new folder', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('newFolder/newFile.md', file);
            
            expect(result.newPath).toBe('newFolder/newFile.md');
            expect(result.folderPath).toBe('newFolder');
        });
        
        test('should handle multiple folders in path', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('level1/level2/level3/newFile.md', file);
            
            expect(result.newPath).toBe('level1/level2/level3/newFile.md');
            expect(result.folderPath).toBe('level1/level2/level3');
        });
        
        test('should handle parent directory references', () => {
            const file = createMockFile('folder/subfolder/originalFile.md');
            const result = normalizePath('../newFile.md', file);
            
            // Expected behavior for parent directory is to parse it literally in this function
            // The actual directory resolution happens elsewhere
            expect(result.newPath).toBe('../newFile.md');
            expect(result.folderPath).toBe('..');
        });
        
        test('should handle absolute paths', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('/absolute/path/newFile.md', file);
            
            expect(result.newPath).toBe('absolute/path/newFile.md');
            expect(result.folderPath).toBe('absolute/path');
        });
        
        test('should handle paths with trailing slash', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('newFolder/', file);
            
            // When a trailing slash is provided, the function treats the input as a folder path
            // The parts filtering removes empty parts, so there's no filename component
            expect(result.newPath).toBe('newFolder');
            expect(result.folderPath).toBeNull();
        });
        
        test('should handle complex paths with special characters', () => {
            const file = createMockFile('folder/originalFile.md');
            const result = normalizePath('new folder/file with spaces.md', file);
            
            expect(result.newPath).toBe('new folder/file with spaces.md');
            expect(result.folderPath).toBe('new folder');
        });
    });

    describe('validateEmptyName', () => {
        test('should detect empty filenames', () => {
            expect(validateEmptyName('')).toEqual({
                isValid: false,
                errorMessage: 'Filename cannot be empty',
                isWarning: false
            });

            expect(validateEmptyName('   ')).toEqual({
                isValid: false,
                errorMessage: 'Filename cannot be empty',
                isWarning: false
            });
        });

        test('should return null for non-empty filenames', () => {
            expect(validateEmptyName('file.txt')).toBeNull();
            expect(validateEmptyName('  file.txt  ')).toBeNull();
        });
    });

    describe('validateReservedCharacters', () => {
        test('should detect invalid characters', () => {
            expect(validateReservedCharacters('file?.txt')).toEqual({
                isValid: false,
                errorMessage: 'Filename contains invalid characters: ?',
                isWarning: false
            });
        });

        test('should detect multiple invalid characters', () => {
            const input = 'file*:?<>.txt';
            const result = validateReservedCharacters(input);
            expect(result?.isValid).toBe(false);
            expect(result?.errorMessage).toContain('invalid characters');
            
            // Verify that all characters in the regex are being matched correctly
            const matches = input.match(FILE_VALIDATION.RESERVED_CHARS_REGEX);
            const uniqueChars = [...new Set(matches)].join(' ');
            expect(result?.errorMessage).toBe(`Filename contains invalid characters: ${uniqueChars}`);
        });

        test('should return null for valid filenames', () => {
            expect(validateReservedCharacters('valid-file.txt')).toBeNull();
            expect(validateReservedCharacters('valid file with spaces.txt')).toBeNull();
        });
    });

    describe('validateEmptyPathSegments', () => {
        test('should detect empty segments with double slashes', () => {
            expect(validateEmptyPathSegments('folder//file.txt')).toEqual({
                isValid: false,
                errorMessage: 'Path cannot contain empty segments',
                isWarning: false
            });
        });

        test('should detect empty segments with spaces', () => {
            expect(validateEmptyPathSegments('folder/ /file.txt')).toEqual({
                isValid: false,
                errorMessage: 'Path cannot contain empty segments',
                isWarning: false
            });
        });

        test('should return null for valid paths', () => {
            expect(validateEmptyPathSegments('folder/file.txt')).toBeNull();
            expect(validateEmptyPathSegments('multiple/folders/file.txt')).toBeNull();
        });
    });

    describe('checkExtensionChange', () => {
        test('should detect extension change', () => {
            expect(checkExtensionChange('file.txt', 'file.md'))
                .toBe('File extension will change from .txt to .md');
        });

        test('should detect adding extension', () => {
            expect(checkExtensionChange('file', 'file.md'))
                .toBe('File extension will change from no extension to .md');
        });

        test('should detect removing extension', () => {
            expect(checkExtensionChange('file.txt', 'file'))
                .toBe('File extension will change from .txt to no extension');
        });

        test('should return null when extension doesn\'t change', () => {
            expect(checkExtensionChange('file.txt', 'renamed.txt')).toBeNull();
            expect(checkExtensionChange('file', 'renamed')).toBeNull();
        });
    });

    describe('checkFileExistsPure', () => {
        test('should detect existing files', () => {
            const existingFiles = {
                'existing.txt': true
            };
            
            expect(checkFileExistsPure('existing.txt', existingFiles, 'original.txt')).toEqual({
                isValid: false,
                errorMessage: 'A file with this name already exists at: existing.txt',
                isWarning: true
            });
        });

        test('should allow renaming to current path', () => {
            const existingFiles = {
                'current.txt': true
            };
            
            expect(checkFileExistsPure('current.txt', existingFiles, 'current.txt')).toBeNull();
        });

        test('should return null for non-existing files', () => {
            const existingFiles = {
                'existing.txt': true
            };
            
            expect(checkFileExistsPure('new.txt', existingFiles, 'original.txt')).toBeNull();
        });
    });

    describe('checkFolderExistsPure', () => {
        test('should detect non-existent folders', () => {
            const existingFiles = {
                'existing-folder': true
            };
            
            expect(checkFolderExistsPure('new-folder', existingFiles, 'parent-folder'))
                .toBe("Folder doesn't exist: new-folder");
        });

        test('should return null for existing folders', () => {
            const existingFiles = {
                'existing-folder': true
            };
            
            expect(checkFolderExistsPure('existing-folder', existingFiles, 'parent-folder')).toBeNull();
        });

        test('should return null when using current parent folder', () => {
            const existingFiles = {
                'parent-folder': true
            };
            
            expect(checkFolderExistsPure('parent-folder', existingFiles, 'parent-folder')).toBeNull();
        });

        test('should return null for null folder path', () => {
            expect(checkFolderExistsPure(null, {}, 'parent-folder')).toBeNull();
        });
    });
}); 