import { setIcon } from 'obsidian';

/**
 * Component for displaying error messages
 */
export class ErrorDisplay {
    private errorEl: HTMLElement;

    /**
     * Create a new error display component
     * @param container The HTML element to use for displaying errors
     */
    constructor(container: HTMLElement) {
        this.errorEl = container;
    }

    /**
     * Show an error message
     * @param message Error message to display
     * @param isWarning Whether this is a warning (yellow) or error (red)
     * @param warningMessages Optional array of additional warning messages
     */
    showError(message: string, isWarning = false, warningMessages?: string[]): void {
        this.errorEl.empty();
        
        // Set the appropriate class based on type
        if (isWarning) {
            this.errorEl.removeClass('show-error');
            this.errorEl.addClass('show-warning');
        } else {
            this.errorEl.removeClass('show-warning');
            this.errorEl.addClass('show-error');
        }
        
        // Add the icon
        const iconSpan = this.errorEl.createSpan({ cls: 'suggestion-icon' });
        setIcon(iconSpan, isWarning ? 'alert-triangle' : 'alert-circle');
        
        // Check if there are multiple warnings
        if (isWarning && warningMessages && warningMessages.length > 0) {
            // Create a container for all warnings
            const warningsContainer = this.errorEl.createDiv({ cls: 'warnings-container' });
            
            // Create the numbered list for all warnings
            const warningsList = warningsContainer.createDiv({ cls: 'warnings-list' });
            
            // Add each warning as a numbered item
            warningMessages.forEach((warning, index) => {
                const warningItem = warningsList.createDiv({ cls: 'warning-item' });
                
                // Add number prefix for each warning
                if (warningMessages.length > 1) {
                    warningItem.createSpan({
                        cls: 'warning-number',
                        text: `${index + 1}. `
                    });
                }
                
                warningItem.createSpan({
                    cls: 'warning-text',
                    text: warning
                });
            });
        } else {
            // Single message - display normally
            this.errorEl.createSpan({
                text: message
            });
        }
    }

    /**
     * Hide the error message
     */
    hideError(): void {
        this.errorEl.removeClass('show-warning');
        this.errorEl.removeClass('show-error');
        this.errorEl.empty();
    }
} 