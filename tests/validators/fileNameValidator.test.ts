import { normalizePath } from '../../src/validators/fileNameValidator';
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
}); 