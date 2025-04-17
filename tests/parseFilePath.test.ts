import { parseFilePath } from '../src/utils/nameUtils';

describe('parseFilePath', () => {
    test('should correctly parse a simple filename with extension', () => {
        const result = parseFilePath('file.txt');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
    });

    test('should correctly parse a path with folder structure', () => {
        const result = parseFilePath('folder/file.txt');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
    });

    test('should correctly parse a nested folder structure', () => {
        const result = parseFilePath('folder/subfolder/file.txt');
        expect(result.folderPath).toBe('folder/subfolder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
    });

    test('should handle files without extensions', () => {
        const result = parseFilePath('folder/file');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('');
    });

    test('should handle filenames with multiple dots', () => {
        const result = parseFilePath('folder/file.name.with.dots.txt');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file.name.with.dots');
        expect(result.extension).toBe('txt');
    });

    test('should handle empty paths', () => {
        const result = parseFilePath('');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
    });

    test('should handle paths with special characters', () => {
        const result = parseFilePath('special @folder/file-name_123.txt');
        expect(result.folderPath).toBe('special @folder');
        expect(result.basename).toBe('file-name_123');
        expect(result.extension).toBe('txt');
    });

    test('should handle paths with trailing slash', () => {
        const result = parseFilePath('folder/');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
    });

    test('should handle paths starting with slash', () => {
        const result = parseFilePath('/folder/file.txt');
        expect(result.folderPath).toBe('/folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
    });

    test('should handle undefined input', () => {
        // @ts-ignore - Explicitly testing undefined case
        const result = parseFilePath(undefined);
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
    });
}); 