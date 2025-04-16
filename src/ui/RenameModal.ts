import { App, Modal, Setting, TFile, ButtonComponent } from 'obsidian';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { getSuggestions } from '../core/suggestions';
import { mergeFilenames } from '../utils/nameUtils';

export class RenameModal extends Modal {
    private file: TFile;
    private plugin: RenameWizardPlugin;
    private suggestions: RenameSuggestion[] = [];
    private inputEl: HTMLInputElement;
    private suggestionsEl: HTMLElement;
    private submitBtn: ButtonComponent;
    private errorEl: HTMLElement;

    constructor(app: App, plugin: RenameWizardPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
    }

    onOpen(): void {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Rename File' });

        // Create input field
        const inputContainer = new Setting(contentEl)
            .setName('New name')
            .addText((text) => {
                this.inputEl = text.inputEl;
                text.setValue(this.file.basename)
                    .onChange(async (value) => {
                        // Update suggestions as user types
                        this.suggestions = await getSuggestions(
                            this.app,
                            value,
                            this.plugin.settings,
                            this.plugin.recentRenames
                        );
                        this.updateSuggestionsList();
                        
                        // Enable/disable submit button based on input
                        this.submitBtn.setDisabled(!value.trim());
                        
                        // Show error if name already exists
                        this.validateFileName(value);
                    });
            });

        // Add submit button to the same line as input
        this.submitBtn = new ButtonComponent(inputContainer.controlEl)
            .setButtonText('Rename')
            .onClick(async () => {
                const newName = this.inputEl.value.trim();
                if (!newName) return;

                try {
                    const oldPath = this.file.path;
                    const newPath = oldPath.replace(this.file.basename, newName);
                    
                    await this.app.fileManager.renameFile(this.file, newPath);
                    
                    // Add to rename history
                    this.plugin.addToHistory(this.file.basename, newName);
                    
                    this.close();
                } catch (error) {
                    console.error('Error renaming file:', error);
                    this.showError('Failed to rename file. Please try again.');
                }
            });

        // Error message container
        this.errorEl = contentEl.createDiv('rename-error');
        this.errorEl.style.color = 'var(--text-error)';
        this.errorEl.style.marginTop = '8px';
        this.errorEl.hide();

        // Create suggestions container
        this.suggestionsEl = contentEl.createDiv('suggestion-container');
        
        // Add initial suggestions
        this.updateSuggestions(this.file.basename);
    }

    private async updateSuggestions(input: string): Promise<void> {
        this.suggestions = await getSuggestions(
            this.app,
            input,
            this.plugin.settings,
            this.plugin.recentRenames
        );
        this.updateSuggestionsList();
    }

    private validateFileName(name: string): boolean {
        const trimmedName = name.trim();
        if (!trimmedName) {
            this.showError('File name cannot be empty');
            return false;
        }

        const newPath = this.file.parent 
            ? `${this.file.parent.path}/${trimmedName}${this.file.extension}`
            : `${trimmedName}${this.file.extension}`;

        const exists = this.app.vault.getAbstractFileByPath(newPath);
        if (exists && exists !== this.file) {
            this.showError('A file with this name already exists');
            return false;
        }

        this.hideError();
        return true;
    }

    private showError(message: string): void {
        this.errorEl.setText(message);
        this.errorEl.show();
        this.submitBtn.setDisabled(true);
    }

    private hideError(): void {
        this.errorEl.hide();
        this.submitBtn.setDisabled(false);
    }

    private updateSuggestionsList(): void {
        this.suggestionsEl.empty();
        
        if (this.suggestions.length === 0) {
            this.suggestionsEl.createEl('div', {
                text: 'No suggestions available',
                cls: 'suggestion-empty'
            });
            return;
        }

        const list = this.suggestionsEl.createEl('ul', { cls: 'suggestion-list' });
        
        this.suggestions.forEach(suggestion => {
            const item = list.createEl('li', { cls: 'suggestion-item' });
            
            item.createEl('span', {
                text: suggestion.name,
                cls: 'suggestion-name'
            });
            
            const sourceEl = item.createEl('span', {
                text: suggestion.source,
                cls: 'suggestion-source'
            });

            if (suggestion.path) {
                sourceEl.setAttr('title', suggestion.path);
            }
            
            item.onClickEvent(() => {
                const suggestionPath = suggestion.path || suggestion.name;
                let newValue: string;
                
                if (this.plugin.settings.mergeSuggestions) {
                    // Use the merge template
                    newValue = mergeFilenames(this.file.path, suggestionPath, this.plugin.settings.mergeTemplate);
                } else {
                    // Use the original behavior
                    newValue = suggestion.name;
                }
                
                this.inputEl.value = newValue;
                this.inputEl.dispatchEvent(new Event('input'));
                this.validateFileName(newValue);
            });
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
} 