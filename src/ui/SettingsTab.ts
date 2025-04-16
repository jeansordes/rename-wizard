import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import RenameWizardPlugin from '../main';
import { TEMPLATE_VARIABLES, DEFAULT_SETTINGS } from '../utils/constants';
import { validateTemplate } from '../utils/nameUtils';

export class RenameWizardSettingTab extends PluginSettingTab {
    plugin: RenameWizardPlugin;
    private templateTextarea: HTMLTextAreaElement;
    private errorDiv: HTMLDivElement;

    constructor(app: App, plugin: RenameWizardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.addClass('rename-wizard-settings');

        containerEl.createEl('h2', { text: 'Rename Wizard Settings' });

        // Regular settings
        new Setting(containerEl)
            .setName('Maximum suggestions')
            .setDesc('Maximum number of suggestions to show')
            .addText(text => text
                .setPlaceholder('20')
                .setValue(this.plugin.settings.maxSuggestions.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value) || 20;
                    this.plugin.settings.maxSuggestions = numValue;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Fuzzy match threshold')
            .setDesc('Minimum similarity score for suggestions (0.0 to 1.0)')
            .addText(text => text
                .setPlaceholder('0.4')
                .setValue(this.plugin.settings.fuzzyMatchThreshold.toString())
                .onChange(async (value) => {
                    const numValue = parseFloat(value) || 0.4;
                    this.plugin.settings.fuzzyMatchThreshold = Math.max(0, Math.min(1, numValue));
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Select last part of filename')
            .setDesc('When renaming, select only the part after the last dot (e.g., "subtopic" in "topic.subtopic"). If disabled, the cursor is placed at the end of the filename.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.selectLastPart)
                .onChange(async (value) => {
                    this.plugin.settings.selectLastPart = value;
                    await this.plugin.saveSettings();
                }));

        // Template section
        const templateSection = containerEl.createDiv('template-section');
        
        // Template heading and description
        templateSection.createEl('h3', { text: 'Merge template', cls: 'setting-item-name' });
        templateSection.createEl('div', { 
            text: 'Template for merging suggestions. Click on variables below to insert them into your template.',
            cls: 'setting-item-description'
        });

        // Add error message div
        this.errorDiv = templateSection.createDiv('template-error');
        this.errorDiv.style.color = 'var(--text-error)';
        this.errorDiv.style.marginBottom = '8px';
        this.errorDiv.hide();

        // Template textarea
        const textareaContainer = templateSection.createDiv('template-textarea-container');
        this.templateTextarea = textareaContainer.createEl('textarea');
        
        // Set value after creation
        this.templateTextarea.value = this.plugin.settings.mergeTemplate || '';
        this.templateTextarea.placeholder = '${suggestion.folderPath}/${suggestion.basename}.${current.basename}.${current.extension}';

        // Set initial styles
        this.templateTextarea.style.width = '100%';
        this.templateTextarea.style.minHeight = '100px';
        this.templateTextarea.style.resize = 'vertical';

        // Add input event listener to handle changes while typing
        this.templateTextarea.addEventListener('input', async () => {
            const value = this.templateTextarea.value;
            const validation = validateTemplate(value);
            
            if (!validation.isValid) {
                this.errorDiv.setText(validation.error || 'Invalid template');
                this.errorDiv.show();
                this.templateTextarea.addClass('is-invalid');
            } else {
                this.errorDiv.hide();
                this.templateTextarea.removeClass('is-invalid');
                this.plugin.settings.mergeTemplate = value;
                await this.plugin.saveSettings();
            }
        });

        // Also keep the change event for when textarea loses focus
        this.templateTextarea.addEventListener('change', async () => {
            const value = this.templateTextarea.value;
            const validation = validateTemplate(value);
            
            if (!validation.isValid) {
                // If invalid on blur, reset to last valid value
                this.templateTextarea.value = this.plugin.settings.mergeTemplate;
                this.errorDiv.hide();
                this.templateTextarea.removeClass('is-invalid');
                new Notice(validation.error || 'Invalid template');
            }
        });

        // Variables reference
        const variableList = templateSection.createDiv('template-variables-list');
        variableList.createEl('h4', { text: 'Available Variables (click to insert)' });
        const list = variableList.createEl('ul');
        
        // Add reset to default option
        const resetItem = list.createEl('li');
        const resetCode = resetItem.createEl('code', { 
            text: 'Reset to default template',
            cls: 'clickable-variable reset-template'
        });
        resetItem.createSpan({ text: ` - Restore to: ` });
        resetItem.createEl('code', { 
            text: DEFAULT_SETTINGS.mergeTemplate,
            cls: 'default-template-preview'
        });

        // Make reset option clickable
        resetCode.addEventListener('click', async () => {
            this.templateTextarea.value = DEFAULT_SETTINGS.mergeTemplate;
            this.templateTextarea.focus();
            this.plugin.settings.mergeTemplate = DEFAULT_SETTINGS.mergeTemplate;
            await this.plugin.saveSettings();
        });

        // Add separator
        list.createEl('li', { cls: 'variable-separator' });

        // Add variables
        TEMPLATE_VARIABLES.forEach(variable => {
            const item = list.createEl('li');
            const codeEl = item.createEl('code', { 
                text: variable.value,
                cls: 'clickable-variable'
            });
            item.createSpan({ text: ` - ${variable.description}` });

            // Make the variable clickable
            codeEl.addEventListener('click', () => {
                const textarea = this.templateTextarea;
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const content = textarea.value;
                
                textarea.value = content.substring(0, start) + variable.value + content.substring(end);
                
                const newCursorPos = start + variable.value.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                textarea.focus();
                
                this.plugin.settings.mergeTemplate = textarea.value;
                this.plugin.saveSettings();
            });
        });
    }
} 