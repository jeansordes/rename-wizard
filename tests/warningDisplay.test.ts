import { validateFileNamePure } from '../src/validators/fileNameValidator';

describe('Warning Display Tests', () => {
    test('Should return multiple warnings when both folder does not exist and extension changes', () => {
        // Setup test data
        const existingFiles = {
            'notes/test.md': true,
            'notes': true
        };
        const currentFilePath = 'notes/test.md';
        const newPath = 'notes/new-folder/test.txt';
        
        // Execute
        const result = validateFileNamePure(newPath, existingFiles, currentFilePath);
        
        // Verify
        expect(result.isValid).toBe(true);
        expect(result.isWarning).toBe(true);
        expect(result.warningMessages).toBeDefined();
        expect(result.warningMessages?.length).toBe(2);
        expect(result.warningMessages?.[0]).toContain("Folder doesn't exist");
        expect(result.warningMessages?.[1]).toContain("File extension will change");
    });
    
    test('Should return a single warning when only the folder does not exist', () => {
        // Setup
        const existingFiles = {
            'notes/test.md': true,
            'notes': true
        };
        const currentFilePath = 'notes/test.md';
        const newPath = 'notes/new-folder/test.md';
        
        // Execute
        const result = validateFileNamePure(newPath, existingFiles, currentFilePath);
        
        // Verify
        expect(result.isValid).toBe(true);
        expect(result.isWarning).toBe(true);
        expect(result.warningMessages).toBeDefined();
        expect(result.warningMessages?.length).toBe(1);
        expect(result.warningMessages?.[0]).toContain("Folder doesn't exist");
    });
    
    test('Should return a single warning when only the extension changes', () => {
        // Setup
        const existingFiles = {
            'notes/test.md': true,
            'notes': true
        };
        const currentFilePath = 'notes/test.md';
        const newPath = 'notes/test.txt';
        
        // Execute
        const result = validateFileNamePure(newPath, existingFiles, currentFilePath);
        
        // Verify
        expect(result.isValid).toBe(true);
        expect(result.isWarning).toBe(true);
        expect(result.warningMessages).toBeDefined();
        expect(result.warningMessages?.length).toBe(1);
        expect(result.warningMessages?.[0]).toContain("File extension will change");
    });
    
    test('Should have no warnings when path is valid with no changes', () => {
        // Setup
        const existingFiles = {
            'notes/test.md': true,
            'notes': true
        };
        const currentFilePath = 'notes/test.md';
        const newPath = 'notes/renamed.md';
        
        // Execute
        const result = validateFileNamePure(newPath, existingFiles, currentFilePath);
        
        // Verify
        expect(result.isValid).toBe(true);
        expect(result.isWarning).toBe(false);
        expect(result.warningMessages).toBeUndefined();
    });
}); 