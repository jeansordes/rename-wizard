import { Plugin, TFile } from 'obsidian';
import { RenameHistory, RenameWizardSettings } from './types';
import { ComplexRenameModal } from './ui/ComplexRenameModal';
import { RenameWizardSettingTab } from './ui/SettingsTab';
import { DEFAULT_SETTINGS } from './utils/constants';

export default class RenameWizardPlugin extends Plugin {
	settings: RenameWizardSettings;
	recentRenames: RenameHistory[] = [];
	private activeModal: ComplexRenameModal | null = null;

	async onload(): Promise<void> {
		if (process.env.NODE_ENV === 'development') console.clear();
		await this.loadSettings();

		// Main rename command
		this.addCommand({
			id: 'rename-wizard-rename',
			name: 'Rename file',
			callback: (): void => {
				const activeFile = this.app.workspace.getActiveFile();
				if (activeFile) {
					this.activeModal = new ComplexRenameModal(this.app, this, activeFile);
					this.activeModal.open();
				}
			}
		});

		// Add the settings tab
		this.addSettingTab(new RenameWizardSettingTab(this.app, this));

		// Register right-click menu event
		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile) {
					menu.addItem((item) => {
						item
							.setTitle('Rename with Rename Wizard')
							.setIcon('wand')
							.onClick(() => {
								this.activeModal = new ComplexRenameModal(this.app, this, file);
								this.activeModal.open();
							});
					});
				}
			})
		);

		console.log('Rename Wizard plugin loaded');
	}

	onunload(): void {
		if (this.activeModal) {
			this.activeModal.close();
			this.activeModal = null;
		}
		console.log('Rename Wizard plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	addToHistory(oldName: string, newName: string): void {
		this.recentRenames.unshift({
			oldName,
			newName,
			timestamp: Date.now()
		});

		// Keep only the most recent renames based on settings
		this.recentRenames = this.recentRenames.slice(0, this.settings.recentRenamesLimit);
	}
}
