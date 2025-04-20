import { App, TFile } from 'obsidian';
import { BatchOperationProgress, BatchOperationStatus, BatchRenameOperation, BatchRenameResult } from '../types';
import { normalizePath } from '../validators/fileNameValidator';

/**
 * Estimate the time for a batch rename operation
 * This is a very basic estimation based on the number of files
 * @param operation The batch rename operation
 * @returns Estimated time in milliseconds
 */
export function estimateBatchOperationTime(operation: BatchRenameOperation): number {
    // Base time per file (milliseconds)
    const baseTimePerFile = 50;
    return operation.files.length * baseTimePerFile;
}

/**
 * Prepare a batch rename operation
 * @param files The files to rename
 * @param newNamePattern The pattern for new names
 * @returns A batch rename operation object
 */
export function prepareBatchOperation(files: TFile[], newNamePattern: string): BatchRenameOperation {
    const operation: BatchRenameOperation = {
        files,
        newNamePattern
    };

    operation.estimatedTime = estimateBatchOperationTime(operation);
    return operation;
}

/**
 * Check if there will be any conflicts in the batch rename operation
 * @param app The Obsidian app
 * @param operation The batch rename operation
 * @returns An array of conflicts (empty if no conflicts)
 */
export function checkForBatchConflicts(app: App, operation: BatchRenameOperation): string[] {
    const conflicts: string[] = [];
    const newPaths = new Set<string>();

    // Process each file
    for (const file of operation.files) {
        try {
            // Get the new path for this file using the pattern
            const newName = processNamePattern(operation.newNamePattern, file);
            const { newPath } = normalizePath(newName, file);

            // Check for duplicates within the batch operation
            if (newPaths.has(newPath)) {
                conflicts.push(`Duplicate new path: ${newPath}`);
            }

            // Check if the target already exists and is not in our batch
            const existingFile = app.vault.getAbstractFileByPath(newPath);
            if (existingFile && !operation.files.some(f => f.path === existingFile.path)) {
                conflicts.push(`Path already exists: ${newPath}`);
            }

            newPaths.add(newPath);
        } catch (error) {
            conflicts.push(`Error processing ${file.path}: ${error.message}`);
        }
    }

    return conflicts;
}

/**
 * Process a name pattern for a specific file
 * @param pattern The pattern string
 * @param file The file to process
 * @returns The processed name
 */
export function processNamePattern(pattern: string, file: TFile): string {
    // Replace file-specific variables
    const basename = file.basename;
    const extension = file.extension;
    const folderPath = file.parent ? file.parent.path : '';

    // Simple pattern processing for now
    let newName = pattern;

    // Replace basic variables
    newName = newName.replace(/\$\{file\.basename\}/g, basename);
    newName = newName.replace(/\$\{file\.extension\}/g, extension);
    newName = newName.replace(/\$\{file\.folderPath\}/g, folderPath);
    newName = newName.replace(/\$\{file\.name\}/g, file.name);

    return newName;
}

/**
 * Execute a batch rename operation
 * @param app The Obsidian app instance
 * @param operation The batch operation to execute
 * @param progressCallback Callback to report progress
 * @param cancelToken Token to check for cancellation
 * @param customRenameFunction Optional custom function to generate new names
 * @returns The final progress of the operation
 */
export async function executeBatchOperation(
    app: App,
    operation: BatchRenameOperation,
    progressCallback: (progress: BatchOperationProgress) => void,
    cancelToken: { cancelled: boolean },
    customRenameFunction?: (file: TFile) => string
): Promise<BatchOperationProgress> {
    const progress: BatchOperationProgress = {
        total: operation.files.length,
        completed: 0,
        successful: 0,
        failed: 0,
        timeElapsed: 0,
        results: [],
        status: BatchOperationStatus.RUNNING
    };

    const startTime = Date.now();
    progressCallback(progress);

    // Process files one at a time
    for (const file of operation.files) {

        if (cancelToken.cancelled) {
            progress.status = BatchOperationStatus.CANCELLED;
            progressCallback(progress);
            return progress;
        }

        const result: BatchRenameResult = {
            file,
            originalPath: file.path,
            success: false
        };

        try {
            // Get the new name for the file
            let newName: string;

            if (customRenameFunction) {
                // Use custom function if provided
                newName = customRenameFunction(file);
            } else {
                // Use pattern-based naming
                newName = processNamePattern(operation.newNamePattern, file);
            }


            // Validate and normalize the path
            const validationResult = normalizePath(newName, file);
            const newPath = validationResult.newPath;

            // Rename the file
            await app.fileManager.renameFile(file, newPath);

            // Update result
            result.success = true;
            result.newPath = newPath;
            progress.successful++;

        } catch (error) {
            // Handle rename errors
            console.error('[DEBUG] Error renaming file:', error);
            result.success = false;
            result.error = error.message;
            progress.failed++;
        }

        // Add result to progress
        progress.results.push(result);

        // Update completed count and time
        progress.completed++;
        progress.timeElapsed = Date.now() - startTime;
        progressCallback(progress);
    }

    progress.status = BatchOperationStatus.COMPLETED;
    progress.timeElapsed = Date.now() - startTime;
    progressCallback(progress);

    return progress;
}

/**
 * Process hierarchical rename for Dendron-style notes
 * @param originalParentPath The original path of the parent file being renamed
 * @param newParentPath The new path of the parent file being renamed
 * @param file The child file to be renamed
 * @returns The new path for the child file
 */
export function processHierarchicalRename(originalParentPath: string, newParentPath: string, file: TFile): string {
    // Extract filename without path
    const getFilename = (path: string): string => {
        const lastSlashIndex = path.lastIndexOf('/');
        return lastSlashIndex >= 0 ? path.substring(lastSlashIndex + 1) : path;
    };

    // Get basename without extension
    const getBasename = (filename: string): string => {
        const lastDotIndex = filename.lastIndexOf('.');
        const result = lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
        return result;
    };

    // Process the original and new parent files
    const originalParentFilename = getFilename(originalParentPath);
    const newParentFilename = getFilename(newParentPath);
    const originalParentBasename = getBasename(originalParentFilename);
    const newParentBasename = getBasename(newParentFilename);

    // Get file extension of child file
    const childExtension = `.${file.extension}`;

    // Get basename of child file without extension
    const childBasename = file.basename;

    // Check if child file is actually a descendant of the parent in the hierarchy
    const isDescendant = childBasename.startsWith(originalParentBasename + '.');

    if (!isDescendant) {
        // Not a child in the hierarchy, don't rename
        return file.path;
    }


    // Replace the parent part of the hierarchy with the new parent name
    const childSuffix = childBasename.substring(originalParentBasename.length);
    const newChildBasename = newParentBasename + childSuffix;

    // Get the folder path
    const folderPath = file.parent ? file.parent.path : '';

    // Construct the new path
    const newPath = folderPath ? `${folderPath}/${newChildBasename}${childExtension}` : `${newChildBasename}${childExtension}`;

    return newPath;
} 