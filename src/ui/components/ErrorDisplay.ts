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
     */
    showError(message: string, isWarning = false): void {
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
        
        // Add the message
        this.errorEl.createSpan({
            text: message
        });
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