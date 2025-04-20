import { setIcon } from 'obsidian';
import { BatchOperationProgress, BatchOperationStatus } from '../../types';

/**
 * Component to display batch rename operation progress
 */
export class BatchRenameProgress {
    private container: HTMLElement;
    private progressBarOuter: HTMLElement;
    private progressBarInner: HTMLElement;
    private statusEl: HTMLElement;
    private statsEl: HTMLElement;
    private cancelButton: HTMLElement;
    private detailsButton: HTMLElement;
    private detailsEl: HTMLElement;
    private detailsVisible: boolean = false;
    
    private onCancelCallback: () => void;
    
    constructor(container: HTMLElement, onCancel: () => void) {
        this.container = container;
        this.onCancelCallback = onCancel;
        this.initialize();
    }
    
    /**
     * Initialize the progress UI
     */
    private initialize(): void {
        // Main container
        this.container.addClass('batch-rename-progress');
        this.container.empty();
        
        // Status element
        this.statusEl = this.container.createEl('div', { cls: 'batch-rename-status' });
        this.statusEl.createSpan({ text: 'Preparing batch operation...' });
        
        // Progress bar container
        const progressContainer = this.container.createEl('div', { cls: 'batch-rename-progress-container' });
        
        // Progress bar
        this.progressBarOuter = progressContainer.createEl('div', { cls: 'batch-rename-progress-bar-outer' });
        this.progressBarInner = this.progressBarOuter.createEl('div', { cls: 'batch-rename-progress-bar-inner' });
        
        // Stats
        this.statsEl = this.container.createEl('div', { cls: 'batch-rename-stats' });
        
        // Buttons container
        const buttonsContainer = this.container.createEl('div', { cls: 'batch-rename-buttons' });
        
        // Cancel button
        this.cancelButton = buttonsContainer.createEl('button', { cls: 'mod-warning', text: 'Cancel' });
        this.cancelButton.addEventListener('click', () => {
            this.onCancelCallback();
        });
        
        // Details button
        this.detailsButton = buttonsContainer.createEl('button', { text: 'Show Details' });
        this.detailsButton.addEventListener('click', () => {
            this.toggleDetails();
        });
        
        // Details container (hidden by default)
        this.detailsEl = this.container.createEl('div', { cls: 'batch-rename-details' });
        this.detailsEl.style.display = 'none';
    }
    
    /**
     * Update the progress display
     * @param progress The current progress
     */
    public updateProgress(progress: BatchOperationProgress): void {
        // Update status
        let statusText = '';
        let statusClass = '';
        
        switch (progress.status) {
            case BatchOperationStatus.PENDING:
                statusText = 'Preparing...';
                statusClass = 'status-pending';
                break;
            case BatchOperationStatus.RUNNING:
                statusText = 'Renaming files...';
                statusClass = 'status-running';
                break;
            case BatchOperationStatus.COMPLETED:
                statusText = 'Operation completed';
                statusClass = 'status-completed';
                break;
            case BatchOperationStatus.CANCELLED:
                statusText = 'Operation cancelled';
                statusClass = 'status-cancelled';
                break;
            case BatchOperationStatus.FAILED:
                statusText = 'Operation failed';
                statusClass = 'status-failed';
                break;
        }
        
        this.statusEl.empty();
        this.statusEl.createSpan({ text: statusText });
        
        // Remove all status classes and add the current one
        ['status-pending', 'status-running', 'status-completed', 'status-cancelled', 'status-failed'].forEach(cls => {
            this.statusEl.removeClass(cls);
        });
        this.statusEl.addClass(statusClass);
        
        // Update progress bar
        const percent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;
        this.progressBarInner.style.width = `${percent}%`;
        
        // Update stats
        this.statsEl.empty();
        
        // Files progress
        const filesProgress = this.statsEl.createEl('div', { cls: 'batch-rename-stat' });
        filesProgress.createSpan({ cls: 'batch-rename-stat-label', text: 'Files: ' });
        filesProgress.createSpan({ 
            text: `${progress.completed}/${progress.total} (${progress.successful} succeeded, ${progress.failed} failed)`
        });
        
        // Time stats
        const timeStats = this.statsEl.createEl('div', { cls: 'batch-rename-stat' });
        timeStats.createSpan({ cls: 'batch-rename-stat-label', text: 'Time: ' });
        
        const elapsedSeconds = Math.floor(progress.timeElapsed / 1000);
        timeStats.createSpan({ text: `${elapsedSeconds}s elapsed` });
        
        if (progress.status === BatchOperationStatus.RUNNING && progress.estimatedTimeRemaining !== undefined) {
            const remainingSeconds = Math.ceil(progress.estimatedTimeRemaining / 1000);
            timeStats.createSpan({ text: `, ~${remainingSeconds}s remaining` });
        }
        
        // Update details if visible
        if (this.detailsVisible) {
            this.updateDetails(progress);
        }
        
        // Update cancel button visibility
        this.cancelButton.style.display = 
            progress.status === BatchOperationStatus.RUNNING ? 'inline-block' : 'none';
        
        // Update show details button text
        this.detailsButton.textContent = this.detailsVisible ? 'Hide Details' : 'Show Details';
    }
    
    /**
     * Update the details section
     * @param progress The current progress
     */
    private updateDetails(progress: BatchOperationProgress): void {
        this.detailsEl.empty();
        
        if (progress.results.length === 0) {
            this.detailsEl.createSpan({ text: 'No files processed yet.' });
            return;
        }
        
        // Create results table
        const table = this.detailsEl.createEl('table', { cls: 'batch-rename-results-table' });
        
        // Table header
        const thead = table.createEl('thead');
        const headerRow = thead.createEl('tr');
        headerRow.createEl('th', { text: 'Status' });
        headerRow.createEl('th', { text: 'Original Path' });
        headerRow.createEl('th', { text: 'New Path' });
        
        // Table body
        const tbody = table.createEl('tbody');
        
        // Add rows for each result
        for (const result of progress.results) {
            const row = tbody.createEl('tr');
            
            // Status cell with icon
            const statusCell = row.createEl('td', { cls: 'batch-rename-result-status' });
            const statusIcon = statusCell.createSpan();
            
            if (result.success) {
                setIcon(statusIcon, 'checkmark');
                statusIcon.addClass('batch-rename-success');
            } else {
                setIcon(statusIcon, 'cross');
                statusIcon.addClass('batch-rename-error');
                
                // Add tooltip with error if available
                if (result.error) {
                    statusIcon.setAttribute('aria-label', result.error);
                    statusIcon.addClass('has-tooltip');
                }
            }
            
            // Original path
            row.createEl('td', { text: result.originalPath });
            
            // New path
            row.createEl('td', { text: result.newPath });
        }
    }
    
    /**
     * Toggle the details section visibility
     */
    private toggleDetails(): void {
        this.detailsVisible = !this.detailsVisible;
        this.detailsEl.style.display = this.detailsVisible ? 'block' : 'none';
        this.detailsButton.textContent = this.detailsVisible ? 'Hide Details' : 'Show Details';
    }
} 