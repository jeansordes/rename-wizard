import { App, TFile } from 'obsidian';
import { normalizePath } from '../../validators/fileNameValidator';
import { ErrorDisplay } from '../components/ErrorDisplay';

/**
 * Perform the actual rename operation
 * @param newName The new file name
 * @param file The file to rename
 * @param app The Obsidian app
 * @param errorDisplay The error display component
 * @param onSuccess Callback to execute on successful rename
 * @returns A Promise resolving to true if rename was successful
 */
export async function performRenameOperation(
    newName: string,
    file: TFile,
    app: App,
    errorDisplay: ErrorDisplay,
    onSuccess: () => void
): Promise<boolean> {
    const trimmedName = newName.trim();

    if (!trimmedName) return false;

    try {
        const { newPath, folderPath } = normalizePath(trimmedName, file);

        // Create folder if needed
        if (folderPath) {
            const folder = app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                await app.vault.createFolder(folderPath);
            }
        }

        // Perform the rename
        await app.fileManager.renameFile(file, newPath);

        // Call success callback (typically closes the modal)
        onSuccess();
        return true;
    } catch (error) {
        errorDisplay.showError(`Error renaming file: ${error.message}`, false);
        return false;
    }
} 