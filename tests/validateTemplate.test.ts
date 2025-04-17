import { validateTemplate } from '../src/utils/nameUtils';

describe('validateTemplate', () => {
    // Valid template tests
    test('should validate a simple template with current variables', () => {
        const result = validateTemplate('${current.basename}.${current.extension}');
        expect(result.isValid).toBe(true);
        expect(result.error).toBe('');
    });

    test('should validate a template with suggestion variables', () => {
        const result = validateTemplate('${suggestion.folderPath}/${suggestion.basename}.${current.extension}');
        expect(result.isValid).toBe(true);
        expect(result.error).toBe('');
    });

    test('should validate a template with mixed variables', () => {
        const result = validateTemplate('${current.folderPath}/${suggestion.basename}_${current.basename}.${current.extension}');
        expect(result.isValid).toBe(true);
        expect(result.error).toBe('');
    });

    test('should validate a template with text and variables', () => {
        const result = validateTemplate('prefix_${current.basename}_suffix.${current.extension}');
        expect(result.isValid).toBe(true);
        expect(result.error).toBe('');
    });

    // Invalid template tests
    test('should reject empty templates', () => {
        const result = validateTemplate('');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Template cannot be empty');
    });

    test('should reject templates with invalid variable names', () => {
        const result = validateTemplate('${invalid.variable}');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid template variable');
    });

    test('should reject templates with incomplete variable syntax', () => {
        const result = validateTemplate('${current.basename');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid template format');
    });

    test('should reject templates with missing variable part', () => {
        const result = validateTemplate('${current}');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid template variable');
    });

    test('should reject templates with forbidden characters', () => {
        const result = validateTemplate('${current.basename}*${current.extension}');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Template contains forbidden characters');
    });

    test('should reject undefined templates', () => {
        // @ts-ignore - Deliberately testing undefined
        const result = validateTemplate(undefined);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Template cannot be empty');
    });
}); 