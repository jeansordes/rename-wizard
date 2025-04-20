/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Mocks for DOM elements and Obsidian components
 */
import { RenameSuggestion } from '../../src/types';

// Define the missing types from Obsidian for our mock elements
interface DomElementInfo {
    cls?: string;
    text?: string;
    attr?: Record<string, string>;
    title?: string;
}

/**
 * Add Obsidian's HTMLElement extension methods to a standard HTML element
 * This is required for testing components that use Obsidian's HTMLElement extensions
 * @param element The HTML element to extend with Obsidian methods
 */
export function mockElement(element: HTMLElement): void {
    // Add Obsidian-specific methods to the element
    element.empty = function(): HTMLElement {
        this.innerHTML = '';
        return this;
    };
    
    // Use any for this one since we can't type it properly without Obsidian's full type definitions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element.createDiv = function(options?: string | DomElementInfo): HTMLDivElement {
        const div = document.createElement('div');
        mockElement(div);
        
        if (typeof options === 'string') {
            div.className = options;
        } else if (options) {
            if (options.cls) {
                div.className = options.cls;
            }
            if (options.text) {
                div.textContent = options.text;
            }
        }
        
        this.appendChild(div);
        return div as HTMLDivElement;
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    element.createSpan = function(options?: string | DomElementInfo): HTMLSpanElement {
        const span = document.createElement('span');
        mockElement(span);
        
        if (typeof options === 'string') {
            span.className = options;
        } else if (options) {
            if (options.cls) {
                span.className = options.cls;
            }
            if (options.text) {
                span.textContent = options.text;
            }
        }
        
        this.appendChild(span);
        return span as HTMLSpanElement;
    };
    
    // Use type assertion to bypass TypeScript limitations with HTMLElement extensions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (element as any).createEl = function(tagName: string, options?: string | DomElementInfo): HTMLElement {
        const el = document.createElement(tagName);
        mockElement(el);
        
        if (typeof options === 'string') {
            el.className = options;
        } else if (options) {
            if (options.cls) {
                el.className = options.cls;
            }
            if (options.text) {
                el.textContent = options.text;
            }
        }
        
        this.appendChild(el);
        return el;
    };
    
    element.addClass = function(className: string): HTMLElement {
        this.classList.add(className);
        return this;
    };
    
    element.removeClass = function(className: string): HTMLElement {
        this.classList.remove(className);
        return this;
    };
    
    element.toggleClass = function(className: string, shouldAdd?: boolean): HTMLElement {
        if (shouldAdd === undefined) {
            this.classList.toggle(className);
        } else if (shouldAdd) {
            this.classList.add(className);
        } else {
            this.classList.remove(className);
        }
        return this;
    };
    
    element.hasClass = function(className: string): boolean {
        return this.classList.contains(className);
    };
    
    element.setText = function(text: string): HTMLElement {
        this.textContent = text;
        return this;
    };
    
    // Mock the scrollIntoView method
    element.scrollIntoView = function(_options?: ScrollIntoViewOptions): void {
        // Do nothing in tests, just a mock implementation
        return;
    };
}

export class MockHTMLElement {
    public style: Record<string, string> = {};
    public classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn().mockReturnValue(false),
        toggle: jest.fn()
    };
    public children: MockHTMLElement[] = [];
    public innerHTML = '';
    public innerText = '';
    public value = '';
    public scrollHeight = 100;
    public offsetHeight = 500;
    public textContent = '';
    public dataset: Record<string, string> = {};

    constructor(public tagName: string = 'div') {}

    addEventListener = jest.fn();
    removeEventListener = jest.fn();
    focus = jest.fn();
    blur = jest.fn();
    appendChild = jest.fn().mockImplementation((child: MockHTMLElement) => {
        this.children.push(child);
        return child;
    });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createEl = jest.fn().mockImplementation((tag: string, _options?: string | DomElementInfo) => {
        const el = new MockHTMLElement(tag);
        this.children.push(el);
        return el;
    });
    
    createDiv = jest.fn().mockImplementation((className?: string) => {
        const el = new MockHTMLElement('div');
        if (className) {
            el.classList.add(className);
        }
        this.children.push(el);
        return el;
    });
    
    createSpan = jest.fn().mockImplementation((className?: string) => {
        const el = new MockHTMLElement('span');
        if (className) {
            el.classList.add(className);
        }
        this.children.push(el);
        return el;
    });
    
    setText = jest.fn().mockImplementation((text: string) => {
        this.innerText = text;
        return this;
    });
    
    empty = jest.fn().mockImplementation(() => {
        this.children = [];
        this.innerHTML = '';
    });
    
    setSelectionRange = jest.fn();
    dispatchEvent = jest.fn();
    scrollIntoView = jest.fn();
}

export class MockButtonComponent {
    public buttonEl = new MockHTMLElement('button');
    
    setIcon = jest.fn().mockReturnThis();
    setTooltip = jest.fn().mockReturnThis();
    setButtonText = jest.fn().mockReturnThis();
    setDisabled = jest.fn().mockReturnThis();
    setCta = jest.fn().mockReturnThis();
    removeCta = jest.fn().mockReturnThis();
    onClick = jest.fn().mockReturnThis();
    addClass = jest.fn().mockReturnThis();
    removeClass = jest.fn().mockReturnThis();
}

export class MockErrorDisplay {
    showError = jest.fn();
    hideError = jest.fn();
}

export class MockSuggestionList {
    items: RenameSuggestion[] = [];
    selectedSuggestionIndex = -1;
    
    constructor(
        // Use underscores to mark as private and avoid unused parameter warnings
        private _container: HTMLElement,
        private _onSuggestionClick: (suggestion: RenameSuggestion) => void,
        private _onSelectionChange: (isSelected: boolean) => void
    ) {}
    
    updateSuggestions = jest.fn();
    selectSuggestion = jest.fn();
    getSuggestionAt = jest.fn();
}

export class MockTFile {
    constructor(
        public path: string = 'test/file.md',
        public name: string = 'file.md',
        public extension: string = 'md',
        public basename: string = 'file'
    ) {}
    
    public parent = {
        path: 'test'
    };
}

export class MockApp {
    vault = {
        getAllLoadedFiles: jest.fn().mockReturnValue([]),
        getAbstractFileByPath: jest.fn(),
        createFolder: jest.fn(),
        adapter: {
            exists: jest.fn(),
            stat: jest.fn()
        }
    };
    
    fileManager = {
        renameFile: jest.fn()
    };
}

export class MockPlugin {
    settings = {
        selectLastPart: true,
        mergeTemplate: '{current} - {suggestion}',
        maxSuggestions: 5,
        fuzzyMatchThreshold: 0.3
    };
} 