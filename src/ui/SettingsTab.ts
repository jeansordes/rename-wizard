import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import RenameWizardPlugin from '../main';
import { DEFAULT_SETTINGS, TEMPLATE_VARIABLES } from '../utils/constants';
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

        const setting = new Setting(containerEl)
            .setName('Select last part of filename');
            
        const descEl = setting.descEl;
        descEl.createSpan({ text: 'When renaming, select only the part after the last dot (e.g., "subtopic" in "topic.subtopic.md")' });
        descEl.createEl('br');
        descEl.createSpan({ text: 'If no dot is found, the cursor is placed at the end of the filename.' });
        descEl.createEl('br');
        descEl.createSpan({ text: 'If disabled, the cursor is placed at the end of the filename.' });
        
        setting.addToggle(toggle => toggle
            .setValue(this.plugin.settings.selectLastPart)
            .onChange(async (value) => {
                this.plugin.settings.selectLastPart = value;
                await this.plugin.saveSettings();
            }));

        // Template section
        const templateSection = containerEl.createDiv('template-section');
        
        // Template heading and description
        new Setting(templateSection)
            .setName('Merge template')
            .setDesc('Template for merging suggestions. Click on variables below to insert them into your template.')
            .setClass('setting-item-template');

        // Create a container for the textarea and error message
        const templateInputContainer = templateSection.createDiv('template-input-container');

        // Create textarea directly instead of using Setting
        this.templateTextarea = templateInputContainer.createEl('textarea', {
            attr: {
                spellcheck: 'false',
                placeholder: '${suggestion.folderPath}/${suggestion.basename}.${current.basename}.${current.extension}'
            }
        });
        
        // Set initial value
        this.templateTextarea.value = this.plugin.settings.mergeTemplate || '';

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

        // Add error message div right after the textarea
        this.errorDiv = templateInputContainer.createDiv('template-error');
        this.errorDiv.hide();

        // Variables reference in a Setting
        new Setting(templateSection)
            .setName('Available Variables')
            .setDesc('Click on a variable to insert it into the template')
            .setClass('setting-item-variables');

        const variableList = templateSection.createDiv('template-variables-list');
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

        // Add batch renaming settings
        this.addBatchRenamingSettings(containerEl);
    }

    /**
     * Add batch renaming settings
     * @param containerEl The container element
     */
    private addBatchRenamingSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Batch Renaming' });

        new Setting(containerEl)
            .setName('Enable Batch Renaming')
            .setDesc('Enable the batch renaming feature')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.batchRenaming.enabled)
                .onChange(async (value) => {
                    this.plugin.settings.batchRenaming.enabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Large Operation Threshold')
            .setDesc('Number of files that trigger the confirmation dialog')
            .addSlider(slider => slider
                .setLimits(1, 100, 1)
                .setValue(this.plugin.settings.batchRenaming.largeOperationThreshold)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.batchRenaming.largeOperationThreshold = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Show Preview by Default')
            .setDesc('Show the preview of batch renaming by default')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.batchRenaming.showPreview)
                .onChange(async (value) => {
                    this.plugin.settings.batchRenaming.showPreview = value;
                    await this.plugin.saveSettings();
                }));
    }
} 