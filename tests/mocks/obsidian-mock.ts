// Mock implementation of Obsidian API
// This file contains TypeScript interfaces and mock implementations for testing

// Basic types
export interface TFile {
  path: string;
  name: string;
  basename: string;
  extension: string;
  stat: {
    ctime: number;
    mtime: number;
    size: number;
  };
  parent?: TFolder;
  vault?: Vault;
}

export interface TFolder {
  path: string;
  name: string;
  children: (TFile | TFolder)[];
  parent?: TFolder;
  vault?: Vault;
}

export interface TAbstractFile {
  path: string;
  name: string;
  vault?: Vault;
  parent?: TFolder;
}

export interface Vault {
  getRoot(): TFolder;
  getFiles(): TFile[];
  getMarkdownFiles(): TFile[];
  create(path: string, data: string): Promise<TFile>;
  createFolder(path: string): Promise<void>;
  delete(file: TAbstractFile, force?: boolean): Promise<void>;
  rename(file: TAbstractFile, newPath: string): Promise<void>;
  modify(file: TFile, data: string): Promise<void>;
  read(file: TFile): Promise<string>;
  adapter: DataAdapter;
  getName(): string;
  getConfig(key: string): any;
  setConfig(key: string, value: any): void;
}

export interface DataAdapter {
  exists(path: string): Promise<boolean>;
  read(path: string): Promise<string>;
  write(path: string, data: string): Promise<void>;
  remove(path: string): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  mkdir(path: string): Promise<void>;
  trashSystem(path: string): Promise<boolean>;
}

export interface App {
  vault: Vault;
  workspace: Workspace;
  metadataCache: MetadataCache;
}

export interface Workspace {
  getActiveFile(): TFile | null;
  onLayoutReady(callback: () => any): void;
  trigger(name: string, ...args: any[]): void;
  on(name: string, callback: (...data: any) => any): EventRef;
  off(eventRef: EventRef): void;
}

export interface EventRef {
  id: string;
}

export interface MetadataCache {
  getFileCache(file: TFile): CachedMetadata | null;
  on(name: string, callback: (...data: any) => any): EventRef;
  off(eventRef: EventRef): void;
}

export interface CachedMetadata {
  frontmatter?: Record<string, any>;
  tags?: string[];
  links?: {
    link: string;
    displayText?: string;
    position: {
      start: { line: number; col: number };
      end: { line: number; col: number };
    };
  }[];
}

export class Modal {
  app: App;
  containerEl: HTMLElement;
  
  constructor(app: App) {
    this.app = app;
    this.containerEl = document.createElement('div');
  }

  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Notice {
  constructor(message: string, timeout?: number) {}
  setMessage(message: string): this { return this; }
  hide(): void {}
}

export class Plugin {
  app: App;
  manifest: {
    id: string;
    name: string;
    version: string;
    minAppVersion: string;
    description: string;
    author: string;
    authorUrl: string;
  };
  settings: any;
  
  constructor() {
    this.app = {} as App;
    this.manifest = {
      id: 'mock-plugin',
      name: 'Mock Plugin',
      version: '1.0.0',
      minAppVersion: '0.15.0',
      description: 'Mock plugin for testing',
      author: 'Test Author',
      authorUrl: 'https://example.com',
    };
    this.settings = {};
  }

  loadData(): Promise<any> {
    return Promise.resolve(this.settings);
  }

  saveData(data: any): Promise<void> {
    this.settings = data;
    return Promise.resolve();
  }

  addRibbonIcon(icon: string, title: string, callback: (evt: MouseEvent) => any): HTMLElement {
    return document.createElement('div');
  }

  addStatusBarItem(): HTMLElement {
    return document.createElement('div');
  }

  addCommand(command: {
    id: string;
    name: string;
    callback?: () => any;
    checkCallback?: (checking: boolean) => boolean | void;
    hotkeys?: { modifiers: string[]; key: string }[];
  }): void {}

  registerEvent(eventRef: EventRef): void {}
  
  registerDomEvent(el: Window | Document | HTMLElement, type: string, callback: (evt: any) => any): void {}
  
  registerInterval(id: number): void {}
}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  containerEl: HTMLElement;
  
  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement('div');
  }
  
  display(): void {}
  hide(): void {}
}

export class Setting {
  containerEl: HTMLElement;
  
  constructor(containerEl: HTMLElement) {
    this.containerEl = containerEl;
  }
  
  setName(name: string): this { return this; }
  setDesc(desc: string): this { return this; }
  setTooltip(tooltip: string): this { return this; }
  setHeading(): this { return this; }
  setDisabled(disabled: boolean): this { return this; }
  setClass(cls: string): this { return this; }
  
  addText(cb: (text: TextComponent) => any): this { return this; }
  addTextArea(cb: (text: TextAreaComponent) => any): this { return this; }
  addToggle(cb: (toggle: ToggleComponent) => any): this { return this; }
  addButton(cb: (button: ButtonComponent) => any): this { return this; }
  addSelect(cb: (select: DropdownComponent) => any): this { return this; }
  addSlider(cb: (slider: SliderComponent) => any): this { return this; }
  
  then(cb: (setting: this) => any): this { return this; }
}

export class Component {
  containerEl: HTMLElement;
  
  constructor() {
    this.containerEl = document.createElement('div');
  }
  
  load(): void {}
  onload(): void {}
  unload(): void {}
  onunload(): void {}
}

// UI Components
export class TextComponent extends Component {
  inputEl: HTMLInputElement;
  
  constructor() {
    super();
    this.inputEl = document.createElement('input');
  }
  
  getValue(): string { return ''; }
  setValue(value: string): this { return this; }
  setPlaceholder(placeholder: string): this { return this; }
  onChanged(callback: (value: string) => any): this { return this; }
}

export class TextAreaComponent extends Component {
  inputEl: HTMLTextAreaElement;
  
  constructor() {
    super();
    this.inputEl = document.createElement('textarea');
  }
  
  getValue(): string { return ''; }
  setValue(value: string): this { return this; }
  setPlaceholder(placeholder: string): this { return this; }
  onChanged(callback: (value: string) => any): this { return this; }
}

export class ToggleComponent extends Component {
  toggleEl: HTMLInputElement;
  
  constructor() {
    super();
    this.toggleEl = document.createElement('input');
    this.toggleEl.type = 'checkbox';
  }
  
  getValue(): boolean { return false; }
  setValue(value: boolean): this { return this; }
  onChanged(callback: (value: boolean) => any): this { return this; }
}

export class ButtonComponent extends Component {
  buttonEl: HTMLButtonElement;
  
  constructor() {
    super();
    this.buttonEl = document.createElement('button');
  }
  
  setButtonText(text: string): this { return this; }
  setIcon(icon: string): this { return this; }
  onClick(callback: (evt: MouseEvent) => any): this { return this; }
}

export class DropdownComponent extends Component {
  selectEl: HTMLSelectElement;
  
  constructor() {
    super();
    this.selectEl = document.createElement('select');
  }
  
  addOption(value: string, display: string): this { return this; }
  addOptions(options: Record<string, string>): this { return this; }
  getValue(): string { return ''; }
  setValue(value: string): this { return this; }
  onChanged(callback: (value: string) => any): this { return this; }
}

export class SliderComponent extends Component {
  sliderEl: HTMLInputElement;
  
  constructor() {
    super();
    this.sliderEl = document.createElement('input');
    this.sliderEl.type = 'range';
  }
  
  getValue(): number { return 0; }
  setValue(value: number): this { return this; }
  setLimits(min: number, max: number, step: number): this { return this; }
  onChanged(callback: (value: number) => any): this { return this; }
}

// Create mock functions and objects for export
const mockVault: Vault = {
  getRoot: () => ({
    path: '/',
    name: 'root',
    children: [],
  } as TFolder),
  getFiles: () => [],
  getMarkdownFiles: () => [],
  create: (path, data) => Promise.resolve({
    path,
    name: path.split('/').pop() || '',
    basename: path.split('/').pop()?.split('.')[0] || '',
    extension: path.split('.').pop() || '',
    stat: {
      ctime: Date.now(),
      mtime: Date.now(),
      size: data.length,
    }
  } as TFile),
  createFolder: (path) => Promise.resolve(),
  delete: (file) => Promise.resolve(),
  rename: (file, newPath) => Promise.resolve(),
  modify: (file, data) => Promise.resolve(),
  read: (file) => Promise.resolve(''),
  adapter: {
    exists: (path) => Promise.resolve(false),
    read: (path) => Promise.resolve(''),
    write: (path, data) => Promise.resolve(),
    remove: (path) => Promise.resolve(),
    rename: (from, to) => Promise.resolve(),
    mkdir: (path) => Promise.resolve(),
    trashSystem: (path) => Promise.resolve(false),
  },
  getName: () => 'Mock Vault',
  getConfig: (key) => null,
  setConfig: (key, value) => {},
};

const mockWorkspace: Workspace = {
  getActiveFile: () => null,
  onLayoutReady: (callback) => { callback(); },
  trigger: (name, ...args) => {},
  on: (name, callback) => ({ id: 'mock-event-ref' }),
  off: (eventRef) => {},
};

const mockMetadataCache: MetadataCache = {
  getFileCache: (file) => null,
  on: (name, callback) => ({ id: 'mock-event-ref' }),
  off: (eventRef) => {},
};

const mockApp: App = {
  vault: mockVault,
  workspace: mockWorkspace,
  metadataCache: mockMetadataCache,
};

// Default export for the mock
export default {
  // Export mock implementations, not the interfaces
  Vault: mockVault,
  App: mockApp,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  Component,
  TextComponent,
  TextAreaComponent,
  ToggleComponent,
  ButtonComponent,
  DropdownComponent,
  SliderComponent,
}; 