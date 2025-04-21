import { App, ButtonComponent, Modal, Notice, setIcon, TFile, ToggleComponent } from 'obsidian';
import { checkForBatchConflicts, executeBatchOperation, prepareBatchOperation, processNamePattern } from '../core/batchRename';
import RenameWizardPlugin from '../main';
import { BatchOperationProgress, BatchOperationStatus, BatchRenameOperation, BatchRenameResult } from '../types';
import { calculateSmartDiff } from '../utils/diffUtils';
import { BatchRenameProgress } from './components/BatchRenameProgress';

/**
 * Show a batch rename notification, removing any existing notifications
 * @param message The message to display
 * @param timeout The timeout in milliseconds (0 for no timeout)
 * @returns The Notice instance
 */
function showBatchNotice(message: string, timeout = 0, completed = 0, total = 0, status = BatchOperationStatus.PENDING, latestRenamedFile: BatchRenameResult | null = null): Notice|null {
    let notice: Notice | null = null;

    // If there is already a batch notification, update it
    const existingNotif = document.querySelector('.notice.batch-rename-notification');
    if (existingNotif) {
        existingNotif.textContent = message;

        if (completed > 0 && total > 0) {
            // If we have a progress bar, update it. Else, create it
            const progressBar: HTMLElement | null = existingNotif.querySelector('.batch-rename-progress-bar-inner');
            if (progressBar) {
                progressBar.style.width = `${(completed / total) * 100}%`;
                progressBar.classList.add(status);
            } else {
                // Create a new progress bar
                const progressBarOuter = existingNotif.createEl('div', { cls: 'batch-rename-progress-bar-outer' });
                const progressBarInner = progressBarOuter.createEl('div', { cls: 'batch-rename-progress-bar-inner' });
                progressBarInner.style.width = `${(completed / total) * 100}%`;
                progressBarInner.classList.add(status);
            }

            // Add the latest renamed file to the notice
            if (latestRenamedFile && latestRenamedFile.originalPath && latestRenamedFile.newPath) {
                const latestRenamedFileEl = existingNotif.createEl('div', { cls: 'batch-rename-latest-renamed-file' });
                
                // Calculate the diff between original and new paths
                const diffParts = calculateSmartDiff(latestRenamedFile.originalPath, latestRenamedFile.newPath);
                
                // Create a container for the diff visualization
                const diffContainer = latestRenamedFileEl.createEl('div', { cls: 'preview-diff' });
                
                // Add each diff part with appropriate styling
                diffParts.forEach(part => {
                    diffContainer.createEl('span', {
                        text: part.text,
                        cls: `diff-${part.type}`
                    });
                });
            }
        }
    } else {
        // Create a new notice
        notice = new Notice(message, timeout);
        const noticeEl = notice.messageEl.parentElement;
        
        if (noticeEl) {
            noticeEl.addClass('batch-rename-notification');
        }
    }
    
    return notice;
}

/**
 * Modal for batch renaming files
 */
export class BatchRenameModal extends Modal {
    private plugin: RenameWizardPlugin;
    private filesContainerEl: HTMLElement;
    private previewToggle: ToggleComponent;
    private previewContainerEl: HTMLElement;
    private confirmBtn: ButtonComponent;
    private cancelBtn: ButtonComponent;
    private progressContainerEl: HTMLElement;
    private progressComponent: BatchRenameProgress;
    private operation: BatchRenameOperation;
    private cancelToken: { cancelled: boolean } = { cancelled: false };
    private activeNotice: Notice | null = null;
    private batchResults: BatchRenameResult[] = [];
    private lastNoticeTimestamp: number = 0;

    // Files to be renamed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private files: any[];

    // The batch rename pattern (hardcoded)
    private pattern: string = '${file.folderPath}/${file.basename}.${file.extension}';

    // Custom rename function (for hierarchical rename)
    private customRenameFunction: ((file: TFile) => string) | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(app: App, plugin: RenameWizardPlugin, files: any[]) {
        super(app);
        this.plugin = plugin;
        this.files = files;
    }

    /**
     * Set a pattern to be used for batch renaming (used when called from ComplexRenameModal)
     * @param pattern The pattern to use
     */
    public setPrefilledPattern(pattern: string): void {
        this.pattern = pattern;
    }

    /**
     * Set a custom rename function to override the pattern-based rename
     * @param renameFn Function that takes a file and returns the new path
     */
    public setCustomRenameFunction(renameFn: (file: TFile) => string): void {
        this.customRenameFunction = renameFn;
    }

    onOpen(): void {
        // Always go directly to the batch rename process
        this.confirmBatchRename();
    }

    /**
     * Render the list of files to be renamed
     */
    private renderFilesList(): void {
        this.filesContainerEl.empty();

        if (this.files.length === 0) {
            this.filesContainerEl.createSpan({ text: 'No files selected for renaming.' });
            return;
        }

        // Create a table to display files
        const table = this.filesContainerEl.createEl('table', { cls: 'batch-rename-files-table' });
        const tbody = table.createEl('tbody');

        // Add a row for each file
        this.files.forEach((file, index) => {
            const row = tbody.createEl('tr');

            // File icon
            const iconCell = row.createEl('td');
            const iconSpan = iconCell.createSpan();
            setIcon(iconSpan, 'document');

            // File path
            row.createEl('td', { text: file.path });

            // Remove button
            const removeCell = row.createEl('td');
            const removeBtn = new ButtonComponent(removeCell);
            removeBtn.setIcon('trash');
            removeBtn.setTooltip('Remove from batch');
            removeBtn.onClick(() => {
                this.files.splice(index, 1);
                this.renderFilesList();
                this.updatePreview();
            });
        });

        // Add file count summary
        const summary = this.filesContainerEl.createEl('div', { cls: 'batch-rename-files-summary' });
        summary.createSpan({ text: `${this.files.length} files selected` });
    }

    /**
     * Update the preview based on the current pattern or custom function
     */
    private updatePreview(): void {
        if (!this.previewToggle.getValue()) return;

        this.previewContainerEl.empty();

        if (this.files.length === 0) {
            this.previewContainerEl.createSpan({ text: 'No files to preview.' });
            return;
        }

        // Check if we're using custom rename function
        const usingCustomRename = this.customRenameFunction !== null;

        // If using pattern, create regular preview operation
        let conflicts: string[] = [];
        if (!usingCustomRename) {
            // Create preview operation
            const previewOperation = prepareBatchOperation(this.files, this.pattern);

            // Check for conflicts
            conflicts = checkForBatchConflicts(this.app, previewOperation);
        }

        // Show conflicts if any (only for pattern-based renames)
        if (conflicts.length > 0) {
            const conflictsEl = this.previewContainerEl.createDiv({ cls: 'batch-rename-conflicts' });
            conflictsEl.createEl('h4', { text: 'Potential Conflicts Detected' });

            const conflictsList = conflictsEl.createEl('ul', { cls: 'batch-rename-conflicts-list' });
            conflicts.forEach(conflict => {
                conflictsList.createEl('li', { text: conflict, cls: 'batch-rename-conflict-item' });
            });
        }

        // Create table for preview
        const table = this.previewContainerEl.createEl('table', { cls: 'batch-rename-preview-table' });

        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Original Path' });
        headerRow.createEl('th', { text: 'New Path' });

        // Table body
        const tbody = table.createEl('tbody');

        // Add a row for each file
        this.files.forEach(file => {
            const row = tbody.createEl('tr');

            // Original path
            row.createEl('td', { text: file.path });

            try {
                let newPath: string;

                // Choose between custom function and pattern
                if (usingCustomRename && this.customRenameFunction) {
                    // Use custom rename function
                    newPath = this.customRenameFunction(file);
                } else {
                    // Use pattern-based rename
                    const newName = processNamePattern(this.pattern, file);
                    // Import properly instead of using require
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const { normalizePath } = require('../validators/fileNameValidator');
                    const result = normalizePath(newName, file);
                    newPath = result.newPath;
                }

                row.createEl('td', { text: newPath });
            } catch (error) {
                row.createEl('td', { text: `Error: ${error.message}`, cls: 'batch-rename-error' });
            }
        });
    }

    /**
     * Handle the confirmation of batch rename
     */
    private async confirmBatchRename(): Promise<void> {
        if (this.files.length === 0) {
            new Notice('No files selected for renaming.');
            return;
        }

        // Create the operation
        this.operation = prepareBatchOperation(this.files, this.pattern);

        // Check for conflicts
        const conflicts = checkForBatchConflicts(this.app, this.operation);

        // If conflicts or large operation, confirm with user
        if (conflicts.length > 0 ||
            this.files.length >= this.plugin.settings.batchRenaming.largeOperationThreshold) {

            // Replace main content with confirmation
            const { contentEl } = this;
            contentEl.empty();

            contentEl.createEl('h2', { text: 'Confirm Batch Rename' });

            // Show conflicts if any
            if (conflicts.length > 0) {
                const conflictsEl = contentEl.createDiv({ cls: 'batch-rename-conflicts' });
                conflictsEl.createEl('h3', { text: 'Conflicts Detected', cls: 'batch-rename-conflicts-header' });

                const conflictsList = conflictsEl.createEl('ul', { cls: 'batch-rename-conflicts-list' });
                conflicts.forEach(conflict => {
                    conflictsList.createEl('li', { text: conflict, cls: 'batch-rename-conflict-item' });
                });

                conflictsEl.createEl('p', {
                    text: 'Proceeding may overwrite files or cause other issues. Are you sure?',
                    cls: 'batch-rename-warning'
                });
            } else {
                // Large operation warning
                contentEl.createEl('p', {
                    text: `You are about to rename ${this.files.length} files. This operation cannot be undone.`,
                    cls: 'batch-rename-warning'
                });
            }

            // Buttons for confirmation
            const buttonContainer = contentEl.createDiv({ cls: 'batch-rename-button-container' });

            // Back button
            const backBtn = new ButtonComponent(buttonContainer);
            backBtn.setButtonText('Back');
            backBtn.onClick(() => {
                this.close();
                new BatchRenameModal(this.app, this.plugin, this.files).open();
            });

            // Confirm button
            const proceedBtn = new ButtonComponent(buttonContainer);
            proceedBtn.setButtonText('Proceed with Rename');
            proceedBtn.setCta();
            proceedBtn.onClick(() => this.startBatchRename());
        } else {
            // No confirmation needed, start directly
            this.startBatchRename();
        }
    }

    /**
     * Start the batch rename operation with a notification instead of modal
     */
    private async startBatchRename(): Promise<void> {
        // Reset cancel token
        this.cancelToken = { cancelled: false };

        // Hide the modal instead of closing it to prevent cancellation
        document.querySelector('.modal-container')?.addClass('batch-rename-hidden');


        // Show initial notification
        this.activeNotice = showBatchNotice('Starting batch rename...');
        this.lastNoticeTimestamp = Date.now();

        // Initialize progress but not used directly - used in the callback
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const initialProgress: BatchOperationProgress = {
            total: this.operation.files.length,
            completed: 0,
            successful: 0,
            failed: 0,
            timeElapsed: 0,
            results: [],
            status: BatchOperationStatus.PENDING
        };

        // These variables were intended for throttling updates but not currently used
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const lastProgressUpdate = Date.now();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const minTimeForUpdates = 100; // Minimum ms between progress updates

        // Start the operation
        try {
            // Prepare operation
            if (!this.operation) {
                this.operation = prepareBatchOperation(this.files, this.pattern);
            }


            // Execute the batch operation
            const finalProgress = await executeBatchOperation(
                this.app,
                this.operation,
                (progress) => this.updateNoticeProgress(progress),
                this.cancelToken,
                this.customRenameFunction || undefined
            );

            // Store results for potential details view
            this.batchResults = finalProgress.results;

            // Close the modal now that we're done
            this.close();

            // Final notification is handled in updateNoticeProgress
        } catch (error) {
            console.error('[DEBUG] Error during batch rename:', error);

            // Close the modal
            this.close();

            // No need to hide active notice as showBatchNotice will handle this
            showBatchNotice(`Error during batch rename: ${error.message}`);
        }
    }

    /**
     * Update the notification with current progress
     * Throttle updates to avoid flickering (at most one update every 300ms)
     */
    private updateNoticeProgress(progress: BatchOperationProgress): void {
        // Always update if it's a final status
        const isFinalStatus = [
            BatchOperationStatus.COMPLETED,
            BatchOperationStatus.CANCELLED,
            BatchOperationStatus.FAILED
        ].includes(progress.status);

        // Throttle notifications to avoid flicker
        const now = Date.now();
        const timeSinceLastNotice = now - this.lastNoticeTimestamp;

        // Skip intermediate updates that come too quickly
        if (
            !isFinalStatus &&
            progress.status === BatchOperationStatus.RUNNING &&
            timeSinceLastNotice < 300 &&
            progress.completed < progress.total
        ) {
            return;
        }

        this.lastNoticeTimestamp = now;

        let message = '';

        switch (progress.status) {
            case BatchOperationStatus.RUNNING: {
                // Calculate percentage
                const percent = Math.round((progress.completed / progress.total) * 100);
                message += `Renaming files: ${progress.completed}/${progress.total} (${percent}%) ✓${progress.successful} ✗${progress.failed}`;

                break;
            }

            case BatchOperationStatus.COMPLETED:
                // Display a message in the format matching the second image
                message = `Renaming done: ${progress.completed}/${progress.total} (100%) ✓${progress.successful} ✗${progress.failed}`;
                break;

            case BatchOperationStatus.CANCELLED:
                message = 'Renaming cancelled.';
                break;

            case BatchOperationStatus.FAILED:
                message = 'Renaming failed.';
                break;
        }

        // Get the last file to be renamed
        const latestRenamedFile = progress.results[progress.results.length - 1];

        // Create or update the notification
        this.activeNotice = showBatchNotice(message, 0, progress.completed, progress.total, progress.status, latestRenamedFile);

        // Store the results for potential details view
        this.batchResults = progress.results;
    }

    onClose(): void {
        // Clean up
        const { contentEl } = this;
        contentEl.empty();

        // Only cancel if we're closing explicitly while an operation is in progress

        // Don't set cancelled flag if we're already done
        // (this prevents cancelled flag from being set when we close the modal after starting the operation)
        if (this.cancelToken && !this.cancelToken.cancelled) {
            this.cancelToken.cancelled = true;
        }
    }
} 