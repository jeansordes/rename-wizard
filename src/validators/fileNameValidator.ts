import { App, TFile } from 'obsidian';

/**
 * Validate file name for errors and display appropriate messages
 * @param name New file name to validate
 * @param app Obsidian app instance
 * @param file Current file being renamed
 * @returns True if valid, false if invalid
 */
export function validateFileName(name: string, app: App, file: TFile): { 
    isValid: boolean; 
    errorMessage: string; 
    isWarning: boolean; 
} {
    // Empty name check
    if (!name.trim()) {
        return {
            isValid: false,
            errorMessage: 'Filename cannot be empty',
            isWarning: false
        };
    }

    // Reserved characters check
    const reservedCharsRegex = /[\\:*?"<>|]/g;
    const reservedCharMatches = name.match(reservedCharsRegex);
    if (reservedCharMatches) {
        const uniqueChars = [...new Set(reservedCharMatches)].join(' ');
        return {
            isValid: false,
            errorMessage: `Filename contains invalid characters: ${uniqueChars}`,
            isWarning: false
        };
    }

    // Normalize path (handle slashes correctly)
    const { newPath, folderPath } = normalizePath(name, file);

    // Existing file check
    const existingFile = app.vault.getAbstractFileByPath(newPath);
    if (existingFile && existingFile.path !== file.path) {
        return {
            isValid: false,
            errorMessage: `A file with this name already exists at: ${newPath}`,
            isWarning: true
        };
    }

    // Check for empty segments in path
    const pathSegments = newPath.split('/').filter(Boolean);
    if (pathSegments.some(segment => !segment.trim())) {
        return {
            isValid: false,
            errorMessage: 'Path cannot contain empty segments',
            isWarning: false
        };
    }

    // Check if the folder exists and should be created
    if (folderPath) {
        const folder = app.vault.getAbstractFileByPath(folderPath);
        if (!folder) {
            return {
                isValid: true,
                errorMessage: `Folder doesn't exist: ${folderPath}`,
                isWarning: true
            };
        }
    }

    return {
        isValid: true,
        errorMessage: '',
        isWarning: false
    };
}

/**
 * Normalize path to handle slashes correctly
 * @param newName New file name or path
 * @param file Current file being renamed
 * @returns Normalized path and folder path
 */
export function normalizePath(newName: string, file: TFile): { 
    newPath: string; 
    folderPath: string | null;
} {
    const trimmedName = newName.trim();
    
    // If no slashes, keep in current folder
    if (!trimmedName.includes('/')) {
        const currentFolder = file.parent ? file.parent.path : '';
        // Special handling for root folder to avoid double slashes
        const newPath = currentFolder === '/' 
            ? `${currentFolder}${trimmedName}`
            : currentFolder
                ? `${currentFolder}/${trimmedName}`
                : trimmedName;
        
        return { newPath, folderPath: null };
    }

    // Handle absolute path if slashes are present
    const pathParts = trimmedName.split('/').filter(part => part.length > 0);
    const newBasename = pathParts.pop() || ''; // Get the last part as filename
    const newFolderPath = pathParts.join('/'); // Join the rest as folder path

    // Construct the new path, avoiding double slashes
    const newPath = newFolderPath
        ? `${newFolderPath}/${newBasename}`
        : newBasename;

    return { 
        newPath, 
        folderPath: newFolderPath || null 
    };
} 