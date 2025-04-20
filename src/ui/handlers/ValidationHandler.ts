import { App } from 'obsidian';
import { validateFileNamePure } from '../../validators/fileNameValidator';
import { ErrorDisplay } from '../components/ErrorDisplay';

/**
 * Validates a filename and updates the error display
 * @param name The filename to validate
 * @param app The Obsidian app
 * @param currentFilePath The current file path (to exclude from collision detection)
 * @param errorDisplay The error display component
 * @returns True if input is valid
 */
export function validateFileNameAndUpdateUI(
    name: string, 
    app: App,
    currentFilePath: string,
    errorDisplay: ErrorDisplay
): boolean {
    const existingFiles: Record<string, boolean> = {};

    // Build a map of existing files and folders
    app.vault.getAllLoadedFiles().forEach(file => {
        existingFiles[file.path] = true;

        // Add folder paths
        if (file.parent) {
            existingFiles[file.parent.path] = true;
        }
    });

    const result = validateFileNamePure(name, existingFiles, currentFilePath);

    if (!result.isValid) {
        errorDisplay.showError(result.errorMessage, result.isWarning);
        return false;
    } else if (result.errorMessage) {
        // Valid with warning
        errorDisplay.showError(
            result.errorMessage, 
            true, 
            result.warningMessages
        );
        return true;
    } else {
        errorDisplay.hideError();
        return true;
    }
} 