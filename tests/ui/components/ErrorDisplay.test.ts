import { ErrorDisplay } from '../../../src/ui/components/ErrorDisplay';
import { mockElement } from '../../mocks/ElementMocks';

// Mock the setIcon function from Obsidian
jest.mock('obsidian', () => ({
    setIcon: jest.fn((el, iconId) => {
        el.dataset.icon = iconId;
    })
}));

describe('ErrorDisplay', () => {
    // Setup DOM for tests
    let container: HTMLElement;
    let errorDisplay: ErrorDisplay;

    beforeEach(() => {
        // Create a fresh container for each test and mock Obsidian methods
        container = document.createElement('div');
        container.className = 'error-container';
        
        // Mock Obsidian's HTMLElement extensions
        mockElement(container);
        
        document.body.appendChild(container);
        
        // Initialize component
        errorDisplay = new ErrorDisplay(container);
    });

    afterEach(() => {
        // Clean up DOM after each test
        document.body.removeChild(container);
        jest.clearAllMocks();
    });

    test('should hide error message', () => {
        // Setup
        container.addClass('show-error');
        container.innerHTML = 'Test error';
        
        // Execute
        errorDisplay.hideError();
        
        // Verify
        expect(container.hasClass('show-error')).toBe(false);
        expect(container.hasClass('show-warning')).toBe(false);
        expect(container.innerHTML).toBe('');
    });

    test('should show error message', () => {
        // Execute
        errorDisplay.showError('Test error');
        
        // Verify
        expect(container.hasClass('show-error')).toBe(true);
        expect(container.hasClass('show-warning')).toBe(false);
        expect(container.textContent).toContain('Test error');
    });

    test('should show warning message', () => {
        // Execute
        errorDisplay.showError('Test warning', true);
        
        // Verify
        expect(container.hasClass('show-warning')).toBe(true);
        expect(container.hasClass('show-error')).toBe(false);
        expect(container.textContent).toContain('Test warning');
    });

    test('should show multiple warning messages', () => {
        // Execute
        const warnings = ['Warning 1', 'Warning 2', 'Warning 3'];
        errorDisplay.showError('Main warning', true, warnings);
        
        // Verify
        expect(container.hasClass('show-warning')).toBe(true);
        expect(container.hasClass('show-error')).toBe(false);
        
        // Check that all warning messages are displayed
        warnings.forEach((warning, index) => {
            expect(container.textContent).toContain(`${index + 1}. ${warning}`);
        });
    });

    test('should switch from error to warning mode', () => {
        // Setup - first show an error
        errorDisplay.showError('Error message');
        expect(container.hasClass('show-error')).toBe(true);
        
        // Execute - then change to warning
        errorDisplay.showError('Warning message', true);
        
        // Verify
        expect(container.hasClass('show-error')).toBe(false);
        expect(container.hasClass('show-warning')).toBe(true);
        expect(container.textContent).toContain('Warning message');
    });

    test('should switch from warning to error mode', () => {
        // Setup - first show a warning
        errorDisplay.showError('Warning message', true);
        expect(container.hasClass('show-warning')).toBe(true);
        
        // Execute - then change to error
        errorDisplay.showError('Error message');
        
        // Verify
        expect(container.hasClass('show-warning')).toBe(false);
        expect(container.hasClass('show-error')).toBe(true);
        expect(container.textContent).toContain('Error message');
    });
}); 