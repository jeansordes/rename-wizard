import { parseFilePath } from '../src/utils/nameUtils';

describe('parseFilePath', () => {
    test('should correctly parse a simple filename with extension', () => {
        const result = parseFilePath('file.txt');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file');
    });

    test('should correctly parse a path with folder structure', () => {
        const result = parseFilePath('folder/file.txt');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file');
    });

    test('should correctly parse a nested folder structure', () => {
        const result = parseFilePath('folder/subfolder/file.txt');
        expect(result.folderPath).toBe('folder/subfolder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file');
    });

    test('should handle files without extensions', () => {
        const result = parseFilePath('folder/file');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file');
    });

    test('should handle filenames with multiple dots', () => {
        const result = parseFilePath('folder/file.name.with.dots.txt');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('file.name.with.dots');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('file.name.with');
        expect(result.dendronLastSegment).toBe('dots');
    });

    test('should handle empty paths', () => {
        const result = parseFilePath('');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('');
    });

    test('should handle paths with special characters', () => {
        const result = parseFilePath('special @folder/file-name_123.txt');
        expect(result.folderPath).toBe('special @folder');
        expect(result.basename).toBe('file-name_123');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file-name_123');
    });

    test('should handle paths with trailing slash', () => {
        const result = parseFilePath('folder/');
        expect(result.folderPath).toBe('folder');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('');
    });

    test('should handle paths starting with slash', () => {
        const result = parseFilePath('/folder/file.txt');
        expect(result.folderPath).toBe('/folder');
        expect(result.basename).toBe('file');
        expect(result.extension).toBe('txt');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('file');
    });

    test('should handle undefined input', () => {
        // @ts-ignore - Explicitly testing undefined case
        const result = parseFilePath(undefined);
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('');
        expect(result.extension).toBe('');
        expect(result.dendronBasename).toBe('');
        expect(result.dendronLastSegment).toBe('');
    });

    // Dendron-style filename tests
    test('should correctly extract Dendron basename with two segments', () => {
        const result = parseFilePath('prj.A.task.md');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('prj.A.task');
        expect(result.extension).toBe('md');
        expect(result.dendronBasename).toBe('prj.A');
        expect(result.dendronLastSegment).toBe('task');
    });

    test('should correctly extract Dendron basename with three segments', () => {
        const result = parseFilePath('project.category.subcategory.task.md');
        expect(result.folderPath).toBe('');
        expect(result.basename).toBe('project.category.subcategory.task');
        expect(result.extension).toBe('md');
        expect(result.dendronBasename).toBe('project.category.subcategory');
        expect(result.dendronLastSegment).toBe('task');
    });

    test('should correctly extract Dendron basename with folder path', () => {
        const result = parseFilePath('notes/prj.A.task.md');
        expect(result.folderPath).toBe('notes');
        expect(result.basename).toBe('prj.A.task');
        expect(result.extension).toBe('md');
        expect(result.dendronBasename).toBe('prj.A');
        expect(result.dendronLastSegment).toBe('task');
    });
}); 