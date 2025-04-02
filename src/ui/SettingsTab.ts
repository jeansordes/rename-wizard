import { App, PluginSettingTab, Setting } from 'obsidian';
import RenameWizardPlugin from '../main';

export class RenameWizardSettingTab extends PluginSettingTab {
    plugin: RenameWizardPlugin;

    constructor(app: App, plugin: RenameWizardPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Rename Wizard Settings' });

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
    }
} 