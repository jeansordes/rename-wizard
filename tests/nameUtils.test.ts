import { mergeFilenames } from '../src/utils/nameUtils';

describe('nameUtils', () => {
    describe('mergeFilenames', () => {
        // Basic merge tests
        test('should merge two filenames in the same folder', () => {
            const result = mergeFilenames('file1.txt', 'file2.txt', '${current.basename}-${suggestion.basename}.${current.extension}');
            expect(result).toBe('file1-file2.txt');
        });

        test('should merge files with different extensions', () => {
            const result = mergeFilenames('doc.pdf', 'image.jpg', '${current.basename}_${suggestion.basename}.${suggestion.extension}');
            expect(result).toBe('doc_image.jpg');
        });

        // Folder structure tests
        test('should handle files in different folders', () => {
            const result = mergeFilenames('folder1/file1.txt', 'folder2/file2.txt', '${current.folderPath}/${current.basename}-${suggestion.basename}.${current.extension}');
            expect(result).toBe('folder1/file1-file2.txt');
        });

        test('should handle complex folder structures', () => {
            const result = mergeFilenames('deep/path/to/file1.txt', 'another/path/file2.txt', '${current.folderPath}/${current.basename}_${suggestion.basename}.${current.extension}');
            expect(result).toBe('deep/path/to/file1_file2.txt');
        });

        test('should handle files with spaces in paths', () => {
            const result = mergeFilenames('My Documents/file 1.txt', 'Other Files/file 2.txt', '${current.folderPath}/${current.basename}-${suggestion.basename}.${current.extension}');
            expect(result).toBe('My Documents/file 1-file 2.txt');
        });

        // Edge cases
        test('should handle empty paths', () => {
            const result = mergeFilenames('', 'file2.txt', '${current.basename}-${suggestion.basename}.${suggestion.extension}');
            expect(result).toBe('-file2.txt');
        });

        test('should handle special characters in filenames', () => {
            const result = mergeFilenames('file#1.txt', 'file@2.txt', '${current.basename}_${suggestion.basename}.${current.extension}');
            expect(result).toBe('file#1_file@2.txt');
        });

        test('should handle template with no variables', () => {
            const result = mergeFilenames('file1.txt', 'file2.txt', 'merged.${current.extension}');
            expect(result).toBe('merged.txt');
        });

        // Error cases
        test('should throw error for invalid template variables', () => {
            expect(() => {
                mergeFilenames('file1.txt', 'file2.txt', '${nonexistent.variable}');
            }).toThrow('Invalid template variable: nonexistent.variable');
        });

        test('should throw error for undefined template', () => {
            expect(() => {
                mergeFilenames('file1.txt', 'file2.txt', undefined as any);
            }).toThrow();
        });
    });
}); 