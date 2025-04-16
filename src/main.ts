// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { App, Plugin, Notice, TFile } from 'obsidian';
import { RenameWizardSettings } from './types';
import { ComplexRenameModal } from './ui/ComplexRenameModal';
import { RenameWizardSettingTab } from './ui/SettingsTab';
import { DEFAULT_SETTINGS } from './utils/constants';

export default class RenameWizardPlugin extends Plugin {
	settings: RenameWizardSettings;

	async onload(): Promise<void> {
		if (process.env.NODE_ENV === 'development') console.clear();
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

		console.log('Rename Wizard plugin loaded');
	}

	onunload(): void {
		console.log('Rename Wizard plugin unloaded');
	}

	async loadSettings(): Promise<void> {
		console.log('Loading settings...');
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		console.log('Settings loaded successfully');
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		console.log('Settings saved successfully');
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
