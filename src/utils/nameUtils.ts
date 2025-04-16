interface FileComponents {
    folderPath: string;
    basename: string;
    extension: string;
}

/**
 * Parse a file path into its components
 */
export function parseFilePath(path: string): FileComponents {
    const lastSlashIndex = path.lastIndexOf('/');
    const folderPath = lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : '';
    const filename = lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;
    
    const lastDotIndex = filename.lastIndexOf('.');
    const basename = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1) : '';
    
    return {
        folderPath,
        basename,
        extension
    };
}

/**
 * Merge two filenames using a template
 * @param currentPath Current file path
 * @param suggestionPath Suggestion file path
 * @param template Template string for merging
 * @returns Merged filename
 * @throws Error if template is invalid or contains unknown variables
 */
export function mergeFilenames(currentPath: string, suggestionPath: string, template: string): string {
    if (!template) {
        throw new Error('Template is required');
    }

    const current = parseFilePath(currentPath);
    const suggestion = parseFilePath(suggestionPath);
    
    // Check for invalid variables in the template
    const matches = template.match(/\${([^}]+)}/g) || [];
    for (const match of matches) {
        const variable = match.slice(2, -1); // Remove ${ and }
        const [object, property] = variable.split('.');
        
        if (!['current', 'suggestion'].includes(object) || 
            !['folderPath', 'basename', 'extension'].includes(property)) {
            throw new Error(`Invalid template variable: ${variable}`);
        }
    }
    
    // Replace template variables with actual values
    let result = template
        .replace(/\${suggestion\.folderPath}/g, suggestion.folderPath)
        .replace(/\${suggestion\.basename}/g, suggestion.basename)
        .replace(/\${suggestion\.extension}/g, suggestion.extension)
        .replace(/\${current\.folderPath}/g, current.folderPath)
        .replace(/\${current\.basename}/g, current.basename)
        .replace(/\${current\.extension}/g, current.extension);
    
    // If no extension is specified in the template, use the current file's extension
    if (!matches.some(m => m.includes('.extension'))) {
        result = `${result}.${current.extension}`;
    }
    
    return result;
}

/**
 * Validates a template string for merge operations
 * @param template Template string to validate
 * @returns Object containing validation result and any error message
 */
export function validateTemplate(template: string): { isValid: boolean; error?: string } {
    // Check for empty template
    if (!template || !template.trim()) {
        return { isValid: false, error: 'Template cannot be empty' };
    }

    // Check for forbidden characters (newlines, control characters)
    const forbiddenCharsRegex = /[\n\r\x00-\x1F\x7F]/;
    if (forbiddenCharsRegex.test(template)) {
        return { isValid: false, error: 'Template contains forbidden characters (newlines or control characters)' };
    }

    // Check for valid variables
    const matches = template.match(/\${([^}]+)}/g) || [];
    for (const match of matches) {
        const variable = match.slice(2, -1); // Remove ${ and }
        const [object, property] = variable.split('.');
        
        if (!['current', 'suggestion'].includes(object) || 
            !['folderPath', 'basename', 'extension'].includes(property)) {
            return { isValid: false, error: `Invalid template variable: ${variable}` };
        }
    }

    return { isValid: true };
} 