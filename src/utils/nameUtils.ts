/**
 * Interface representing the components of a file path
 */
export interface FileComponents {
    folderPath: string;
    basename: string;
    extension: string;
    dendronBasename: string;
    dendronLastSegment: string;
}

/**
 * Parse a file path into its components
 * @param path File path to parse
 * @returns Object with folderPath, basename, extension, dendronBasename, and dendronLastSegment
 */
export function parseFilePath(path: string): FileComponents {
    // Handle empty path
    if (!path) {
        return {
            folderPath: '',
            basename: '',
            extension: '',
            dendronBasename: '',
            dendronLastSegment: '',
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

    // Split basename into Dendron segments
    const basenameDots = basename.split('.');
    const dendronBasename =
        basenameDots.length > 1 ? basenameDots.slice(0, -1).join('.') : '';
    const dendronLastSegment =
        basenameDots.length > 1 ? basenameDots[basenameDots.length - 1] : basename;

    return { folderPath, basename, extension, dendronBasename, dendronLastSegment };
}

const validKeys = [
    'folderPath',
    'basename',
    'extension',
    'dendronBasename',
    'dendronLastSegment'
];

function isFileComponentKey(key: string): key is keyof FileComponents {
    return validKeys.includes(key);
}

/**
 * Merge two filenames based on a template
 * @param currentFileName Current file name
 * @param suggestionFileName Suggestion file name
 * @param template Template to use for merging
 * @returns The merged file name
 * @throws Error if template is invalid
 */
export function mergeFilenames(currentFileName: string, suggestionFileName: string, template?: string): string {
    if (template === undefined) {
        throw new Error('Template is undefined');
    }
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
    
    // Special handling for "||" fallback syntax
    result = result.replace(/\${([^}]+)\s*\|\|\s*([^}]+)}/g, (match, left, right) => {
        const leftParts = left.trim().split('.');
        const rightParts = right.trim().split('.');

        if (leftParts.length !== 2 || rightParts.length !== 2) {
            throw new Error(`Invalid template variable: ${match}`);
        }

        const [leftObj, leftProp] = leftParts;
        const [rightObj, rightProp] = rightParts;

        if (
            (leftObj !== 'current' && leftObj !== 'suggestion') ||
            (rightObj !== 'current' && rightObj !== 'suggestion')
        ) {
            throw new Error(`Invalid template variable: ${match}`);
        }

        let leftVal: string = '';
        let rightVal: string = '';
        if (isFileComponentKey(leftProp)) {
            leftVal = leftObj === 'current' ? current[leftProp] : suggestion[leftProp];
        }
        if (isFileComponentKey(rightProp)) {
            rightVal = rightObj === 'current' ? current[rightProp] : suggestion[rightProp];
        }

        return leftVal || rightVal;
    });
    
    // Replace all occurrences of current and suggestion variables
    result = result.replace(/\${current\.([^}]+)}/g, (match, prop) => {
        if (isFileComponentKey(prop)) {
            return current[prop];
        }
        throw new Error(`Invalid template variable: current.${prop}`);
    });

    result = result.replace(/\${suggestion\.([^}]+)}/g, (match, prop) => {
        if (isFileComponentKey(prop)) {
            return suggestion[prop];
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

    // First replace all valid instances of the '||' operator inside ${...} to avoid false positives
    const placeholderText = "__OR_OPERATOR__";
    const replacedTemplate = template.replace(/\${([^}]*\|\|[^}]*)}/g, (match) => {
        return match.replace(/\|\|/g, placeholderText);
    });

    // Now check for forbidden characters
    const forbiddenCharsRegex = /[\\:*?"<>|]/g;
    const forbiddenMatches = replacedTemplate.match(forbiddenCharsRegex);
    if (forbiddenMatches) {
        return {
            isValid: false,
            error: `Template contains forbidden characters: ${[...new Set(forbiddenMatches)].join(' ')}`
        };
    }

    // Check if there are any unclosed variable patterns
    if ((template.match(/\${/g) || []).length !== (template.match(/}/g) || []).length) {
        return {
            isValid: false,
            error: 'Invalid template format: unclosed variable'
        };
    }

    // Check for malformed variables
    const variableRegex = /\${([^}]*)}/g;
    let match;

    // Validate each variable
    while ((match = variableRegex.exec(template)) !== null) {
        const variable = match[1];
        
        // Check for fallback (||) syntax
        if (variable.includes('||')) {
            const parts = variable.split('||').map(part => part.trim());
            if (parts.length !== 2) {
                return {
                    isValid: false,
                    error: `Invalid fallback syntax: ${variable}`
                };
            }
            
            // Validate both sides of the fallback
            for (const part of parts) {
                if (!part.match(/^(current|suggestion)\.(folderPath|basename|extension|dendronBasename|dendronLastSegment)$/)) {
                    return {
                        isValid: false,
                        error: `Invalid template variable: ${part}`
                    };
                }
            }
            
            continue; // Skip the normal validation for this variable
        }
        
        // Check if variable is properly formed (should be current.xxx or suggestion.xxx)
        if (!variable.match(/^(current|suggestion)\.(folderPath|basename|extension|dendronBasename|dendronLastSegment)$/)) {
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