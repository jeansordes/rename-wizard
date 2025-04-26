/* eslint-disable @typescript-eslint/no-unused-vars */
// Mock implementation of Obsidian API
// This file contains TypeScript interfaces and mock implementations for testing

// Define a type to replace 'any' where possible
type ObsidianCallbackReturnType = unknown;
type EventCallback = (...data: unknown[]) => unknown;

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
    getConfig(key: string): unknown;
    setConfig(key: string, value: unknown): void;
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
    onLayoutReady(callback: () => ObsidianCallbackReturnType): void;
    trigger(name: string, ...args: unknown[]): void;
    on(name: string, callback: EventCallback): EventRef;
    off(eventRef: EventRef): void;
}

export interface EventRef {
    id: string;
}

export interface MetadataCache {
    getFileCache(file: TFile): CachedMetadata | null;
    on(name: string, callback: EventCallback): EventRef;
    off(eventRef: EventRef): void;
}

export interface CachedMetadata {
    frontmatter?: Record<string, unknown>;
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

    open(): void { /* intentionally empty */ }
    close(): void { /* intentionally empty */ }
    onOpen(): void { /* intentionally empty */ }
    onClose(): void { /* intentionally empty */ }
}

export class Notice {
    constructor(_message: string, _timeout?: number) { /* intentionally empty */ }
    setMessage(_message: string): this { /* intentionally empty */ return this; }
    hide(): void { /* intentionally empty */ }
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
    settings: unknown;

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

    loadData(): Promise<unknown> {
        return Promise.resolve(this.settings);
    }

    saveData(data: unknown): Promise<void> {
        this.settings = data;
        return Promise.resolve();
    }

    addRibbonIcon(_icon: string, _title: string, _callback: (evt: MouseEvent) => ObsidianCallbackReturnType): HTMLElement {
        return document.createElement('div');
    }

    addStatusBarItem(): HTMLElement {
        return document.createElement('div');
    }

    addCommand(_command: {
        id: string;
        name: string;
        callback?: () => ObsidianCallbackReturnType;
        checkCallback?: (checking: boolean) => boolean | void;
        hotkeys?: { modifiers: string[]; key: string }[];
    }): void { /* intentionally empty */ }

    registerEvent(_eventRef: EventRef): void { /* intentionally empty */ }

    registerDomEvent(_el: Window | Document | HTMLElement, _type: string, _callback: (evt: unknown) => ObsidianCallbackReturnType): void { /* intentionally empty */ }

    registerInterval(_id: number): void { /* intentionally empty */ }
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

    display(): void { /* intentionally empty */ }
    hide(): void { /* intentionally empty */ }
}

export class Setting {
    containerEl: HTMLElement;

    constructor(containerEl: HTMLElement) {
        this.containerEl = containerEl;
    }

    setName(_name: string): this { return this; }
    setDesc(_desc: string): this { return this; }
    setTooltip(_tooltip: string): this { return this; }
    setHeading(): this { return this; }
    setDisabled(_disabled: boolean): this { return this; }
    setClass(_cls: string): this { return this; }

    addText(cb: (text: TextComponent) => ObsidianCallbackReturnType): this {
        const component = new TextComponent();
        cb(component);
        return this;
    }
    addTextArea(cb: (text: TextAreaComponent) => ObsidianCallbackReturnType): this {
        const component = new TextAreaComponent();
        cb(component);
        return this;
    }
    addToggle(cb: (toggle: ToggleComponent) => ObsidianCallbackReturnType): this {
        const component = new ToggleComponent();
        cb(component);
        return this;
    }
    addButton(cb: (button: ButtonComponent) => ObsidianCallbackReturnType): this {
        const component = new ButtonComponent();
        cb(component);
        return this;
    }
    addSelect(cb: (select: DropdownComponent) => ObsidianCallbackReturnType): this {
        const component = new DropdownComponent();
        cb(component);
        return this;
    }
    addSlider(cb: (slider: SliderComponent) => ObsidianCallbackReturnType): this {
        const component = new SliderComponent();
        cb(component);
        return this;
    }

    then(cb: (setting: this) => ObsidianCallbackReturnType): this {
        cb(this);
        return this;
    }
}

export class Component {
    containerEl: HTMLElement;

    constructor() {
        this.containerEl = document.createElement('div');
    }

    load(): void { /* intentionally empty */ }
    onload(): void { /* intentionally empty */ }
    unload(): void { /* intentionally empty */ }
    onunload(): void { /* intentionally empty */ }
}

// UI Components
export class TextComponent extends Component {
    inputEl: HTMLInputElement;

    constructor() {
        super();
        this.inputEl = document.createElement('input');
    }

    getValue(): string { return ''; }
    setValue(_value: string): this { return this; }
    setPlaceholder(_placeholder: string): this { return this; }
    onChanged(_callback: (value: string) => ObsidianCallbackReturnType): this { return this; }
}

export class TextAreaComponent extends Component {
    inputEl: HTMLTextAreaElement;

    constructor() {
        super();
        this.inputEl = document.createElement('textarea');
    }

    getValue(): string { return ''; }
    setValue(_value: string): this { return this; }
    setPlaceholder(_placeholder: string): this { return this; }
    onChanged(_callback: (value: string) => ObsidianCallbackReturnType): this { return this; }
}

export class ToggleComponent extends Component {
    toggleEl: HTMLInputElement;

    constructor() {
        super();
        this.toggleEl = document.createElement('input');
        this.toggleEl.type = 'checkbox';
    }

    getValue(): boolean { return false; }
    setValue(_value: boolean): this { return this; }
    onChanged(_callback: (value: boolean) => ObsidianCallbackReturnType): this { return this; }
}

export class ButtonComponent extends Component {
    buttonEl: HTMLButtonElement;

    constructor() {
        super();
        this.buttonEl = document.createElement('button');
    }

    setButtonText(_text: string): this { return this; }
    setIcon(icon: string): this {
        this.buttonEl.classList.add(`icon-${icon}`);
        return this;
    }
    setTooltip(_tooltip: string): this { return this; }
    onClick(_callback: (evt: MouseEvent) => ObsidianCallbackReturnType): this { return this; }
}

export class DropdownComponent extends Component {
    selectEl: HTMLSelectElement;

    constructor() {
        super();
        this.selectEl = document.createElement('select');
    }

    addOption(_value: string, _display: string): this { return this; }
    addOptions(_options: Record<string, string>): this { return this; }
    getValue(): string { return ''; }
    setValue(_value: string): this { return this; }
    onChanged(_callback: (value: string) => ObsidianCallbackReturnType): this { return this; }
}

export class SliderComponent extends Component {
    sliderEl: HTMLInputElement;

    constructor() {
        super();
        this.sliderEl = document.createElement('input');
        this.sliderEl.type = 'range';
    }

    getValue(): number { return 0; }
    setValue(_value: number): this { return this; }
    setLimits(_min: number, _max: number, _step: number): this { return this; }
    onChanged(_callback: (value: number) => ObsidianCallbackReturnType): this { return this; }
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
    setConfig: (key, value) => { /* intentionally empty */ },
};

const mockWorkspace: Workspace = {
    getActiveFile: () => null,
    onLayoutReady: (callback) => { callback(); },
    trigger: (name, ...args) => { /* intentionally empty */ },
    on: (name, callback) => ({ id: 'mock-event-ref' }),
    off: (eventRef) => { /* intentionally empty */ },
};

const mockMetadataCache: MetadataCache = {
    getFileCache: (file) => null,
    on: (name, callback) => ({ id: 'mock-event-ref' }),
    off: (eventRef) => { /* intentionally empty */ },
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

export const Vault = mockVault; 