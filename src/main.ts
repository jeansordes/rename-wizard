// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Notice, Plugin, TFile } from 'obsidian';
import { RenameWizardSettings } from './types';
import { ComplexRenameModal } from './ui/ComplexRenameModal';
import { RenameWizardSettingTab } from './ui/SettingsTab';
import { DEFAULT_SETTINGS } from './utils/constants';
import { logger } from './utils/logger';

export default class RenameWizardPlugin extends Plugin {
	settings: RenameWizardSettings;

	async onload(): Promise<void> {
        logger.enable();
		await this.loadSettings();

		// Add the rename command
		this.addCommand({
			id: 'rename-file',
			name: 'Rename file',
			callback: () => this.handleRename()
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
								this.handleRename();
							});
					});
				}
			})
		);
	}

	onunload(): void {
		// No actions needed on unload
	}

	async loadSettings(): Promise<void> {
		const loadedData = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private handleRename(): void {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice('No file is currently active');
			return;
		}

		new ComplexRenameModal(this.app, this, activeFile).open();
	}
}
