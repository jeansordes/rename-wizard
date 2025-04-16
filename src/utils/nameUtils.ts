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
 */
export function mergeFilenames(currentPath: string, suggestionPath: string, template: string): string {
    const current = parseFilePath(currentPath);
    const suggestion = parseFilePath(suggestionPath);
    
    // Replace template variables with actual values
    return template
        .replace(/\${suggestion\.folderPath}/g, suggestion.folderPath)
        .replace(/\${suggestion\.basename}/g, suggestion.basename)
        .replace(/\${suggestion\.extension}/g, suggestion.extension)
        .replace(/\${current\.folderPath}/g, current.folderPath)
        .replace(/\${current\.basename}/g, current.basename)
        .replace(/\${current\.extension}/g, current.extension);
} 