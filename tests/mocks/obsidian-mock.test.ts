import * as ObsidianMock from './obsidian-mock';

describe('Obsidian Mock', () => {
    describe('Plugin', () => {
        test('should initialize with default values', () => {
            const plugin = new ObsidianMock.Plugin();
            
            expect(plugin.app).toBeDefined();
            expect(plugin.manifest).toBeDefined();
            expect(plugin.manifest.id).toBe('mock-plugin');
            expect(plugin.settings).toEqual({});
        });
        
        test('should load and save data', async () => {
            const plugin = new ObsidianMock.Plugin();
            
            // Default settings should be empty
            const loadedData = await plugin.loadData();
            expect(loadedData).toEqual({});
            
            // Save and load new settings
            const newSettings = { testSetting: 'value' };
            await plugin.saveData(newSettings);
            
            const updatedData = await plugin.loadData();
            expect(updatedData).toEqual(newSettings);
        });
        
        test('should create UI elements', () => {
            const plugin = new ObsidianMock.Plugin();
            
            const ribbonIcon = plugin.addRibbonIcon('test-icon', 'Test Icon', () => {});
            expect(ribbonIcon).toBeDefined();
            expect(ribbonIcon instanceof HTMLElement).toBe(true);
            
            const statusBarItem = plugin.addStatusBarItem();
            expect(statusBarItem).toBeDefined();
            expect(statusBarItem instanceof HTMLElement).toBe(true);
        });
    });
    
    describe('Modal', () => {
        test('should initialize with app', () => {
            const app = {} as ObsidianMock.App;
            const modal = new ObsidianMock.Modal(app);
            
            expect(modal.app).toBe(app);
            expect(modal.containerEl).toBeDefined();
            expect(modal.containerEl instanceof HTMLElement).toBe(true);
        });
    });
    
    describe('Notice', () => {
        test('should create notice with message', () => {
            const notice = new ObsidianMock.Notice('Test notice');
            
            // Test fluent interface
            const returnedNotice = notice.setMessage('Updated message');
            expect(returnedNotice).toBe(notice);
            
            // Test hide method
            expect(() => notice.hide()).not.toThrow();
        });
    });
    
    describe('Component', () => {
        test('should initialize with container element', () => {
            const component = new ObsidianMock.Component();
            
            expect(component.containerEl).toBeDefined();
            expect(component.containerEl instanceof HTMLElement).toBe(true);
            
            // Lifecycle methods should not throw
            expect(() => component.load()).not.toThrow();
            expect(() => component.onload()).not.toThrow();
            expect(() => component.unload()).not.toThrow();
            expect(() => component.onunload()).not.toThrow();
        });
    });
    
    describe('Setting', () => {
        test('should initialize with container element', () => {
            const containerEl = document.createElement('div');
            const setting = new ObsidianMock.Setting(containerEl);
            
            expect(setting.containerEl).toBe(containerEl);
            
            // Test fluent interface for setting methods directly
            expect(setting.setName('Test Name')).toBe(setting);
            expect(setting.setDesc('Test description')).toBe(setting);
            expect(setting.setTooltip('Test tooltip')).toBe(setting);
            expect(setting.setHeading()).toBe(setting);
            expect(setting.setDisabled(true)).toBe(setting);
            expect(setting.setClass('test-class')).toBe(setting);
            expect(setting.addText(() => {})).toBe(setting);
            expect(setting.addTextArea(() => {})).toBe(setting);
            expect(setting.addToggle(() => {})).toBe(setting);
            expect(setting.addButton(() => {})).toBe(setting);
            expect(setting.addSelect(() => {})).toBe(setting);
            expect(setting.addSlider(() => {})).toBe(setting);
            expect(setting.then(() => {})).toBe(setting);
        });
    });
    
    describe('UI Components', () => {
        test('TextComponent should have expected methods', () => {
            const textComponent = new ObsidianMock.TextComponent();
            
            expect(textComponent.inputEl).toBeDefined();
            expect(textComponent.inputEl instanceof HTMLInputElement).toBe(true);
            
            expect(textComponent.getValue()).toBe('');
            expect(textComponent.setValue('test')).toBe(textComponent);
            expect(textComponent.setPlaceholder('placeholder')).toBe(textComponent);
            expect(textComponent.onChanged(() => {})).toBe(textComponent);
        });
        
        test('TextAreaComponent should have expected methods', () => {
            const textAreaComponent = new ObsidianMock.TextAreaComponent();
            
            expect(textAreaComponent.inputEl).toBeDefined();
            expect(textAreaComponent.inputEl instanceof HTMLTextAreaElement).toBe(true);
        });
        
        test('ButtonComponent should have expected methods', () => {
            const buttonComponent = new ObsidianMock.ButtonComponent();
            
            expect(buttonComponent.buttonEl).toBeDefined();
            expect(buttonComponent.buttonEl instanceof HTMLButtonElement).toBe(true);
            
            expect(buttonComponent.setButtonText('Click me')).toBe(buttonComponent);
            expect(buttonComponent.setIcon('icon')).toBe(buttonComponent);
            expect(buttonComponent.onClick(() => {})).toBe(buttonComponent);
        });
    });
}); 