import { App, PluginSettingTab, Setting, DropdownComponent } from 'obsidian';
import RenameWizardPlugin from '../main';
import { TEMPLATE_VARIABLES, DEFAULT_SETTINGS } from '../utils/constants';

export class RenameWizardSettingTab extends PluginSettingTab {
    plugin: RenameWizardPlugin;
    private templateTextarea: HTMLTextAreaElement;

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
            .setName('Recent renames limit')
            .setDesc('Number of recent renames to keep in history')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(this.plugin.settings.recentRenamesLimit.toString())
                .onChange(async (value) => {
                    const numValue = parseInt(value) || 50;
                    this.plugin.settings.recentRenamesLimit = numValue;
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
            .setDesc('When renaming, select only the part after the last dot (e.g., "subtopic" in "topic.subtopic"). By default, the cursor is placed at the end of the filename.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.selectLastPart)
                .onChange(async (value) => {
                    this.plugin.settings.selectLastPart = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Merge suggestions')
            .setDesc('When enabled, clicking a suggestion will merge it with the current filename instead of replacing it')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.mergeSuggestions)
                .onChange(async (value) => {
                    this.plugin.settings.mergeSuggestions = value;
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
            this.plugin.settings.mergeTemplate = this.templateTextarea.value;
            await this.plugin.saveSettings();
        });

        // Also keep the change event for when textarea loses focus
        this.templateTextarea.addEventListener('change', async () => {
            this.plugin.settings.mergeTemplate = this.templateTextarea.value;
            await this.plugin.saveSettings();
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