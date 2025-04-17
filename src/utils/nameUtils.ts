/**
 * Interface representing the components of a file path
 */
export interface FileComponents {
    folderPath: string;
    basename: string;
    extension: string;
}

/**
 * Parse a file path into its components
 * @param path File path to parse
 * @returns Object with folderPath, basename, and extension
 */
export function parseFilePath(path: string): FileComponents {
    // Handle empty path
    if (!path) {
        return {
            folderPath: '',
            basename: '',
            extension: ''
        };
    }

    // Split into folder and filename
    const lastSlashIndex = path.lastIndexOf('/');
    const folderPath = lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : '';
    const filename = lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;

    // Split filename into basename and extension
    const lastDotIndex = filename.lastIndexOf('.');
    const basename = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
    const extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1) : '';

    return { folderPath, basename, extension };
}

/**
 * Merge two filenames based on a template
 * @param currentFileName Current file name
 * @param suggestionFileName Suggestion file name
 * @param template Template to use for merging
 * @returns The merged file name
 * @throws Error if template is invalid
 */
export function mergeFilenames(currentFileName: string, suggestionFileName: string, template: string): string {
    // Validate template
    const validation = validateTemplate(template);
    if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid template');
    }

    // Parse file components
    const current = parseFilePath(currentFileName);
    const suggestion = parseFilePath(suggestionFileName);

    // Replace template variables
    let result = template;
    
    // Replace all occurrences of current and suggestion variables
    result = result.replace(/\${current\.([^}]+)}/g, (match, prop) => {
        if (prop in current) {
            return current[prop as keyof FileComponents];
        }
        throw new Error(`Invalid template variable: current.${prop}`);
    });

    result = result.replace(/\${suggestion\.([^}]+)}/g, (match, prop) => {
        if (prop in suggestion) {
            return suggestion[prop as keyof FileComponents];
        }
        throw new Error(`Invalid template variable: suggestion.${prop}`);
    });

    return result;
}

/**
 * Validate a template string
 * @param template Template string to validate
 * @returns Object with isValid and error message
 */
export function validateTemplate(template: string): { isValid: boolean; error: string } {
    // Check if template is empty
    if (!template) {
        return {
            isValid: false,
            error: 'Template cannot be empty'
        };
    }

    // Check for forbidden characters
    const forbiddenCharsRegex = /[\\:*?"<>|]/g;
    const forbiddenMatches = template.match(forbiddenCharsRegex);
    if (forbiddenMatches) {
        return {
            isValid: false,
            error: `Template contains forbidden characters: ${[...new Set(forbiddenMatches)].join(' ')}`
        };
    }

    // Check for malformed variables
    const variableRegex = /\${([^}]*)}/g;
    let match;
    
    // Check if there are any unclosed variable patterns
    if ((template.match(/\${/g) || []).length !== (template.match(/}/g) || []).length) {
        return {
            isValid: false,
            error: 'Invalid template format: unclosed variable'
        };
    }

    // Validate each variable
    while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1];
        
        // Check if variable is properly formed (should be current.xxx or suggestion.xxx)
        if (!variable.match(/^(current|suggestion)\.(folderPath|basename|extension)$/)) {
            return {
                isValid: false,
                error: `Invalid template variable: ${variable}`
            };
        }
    }

    // All checks passed
    return {
        isValid: true,
        error: ''
    };
} 