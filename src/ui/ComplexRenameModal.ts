import { App, ButtonComponent, Modal, setIcon, TFile, TFolder } from 'obsidian';
import { getSuggestions } from '../core/suggestions';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { calculateSmartDiff } from '../utils/diffUtils';
import { mergeFilenames } from '../utils/nameUtils';

export class ComplexRenameModal extends Modal {
    private file: TFile;
    private plugin: RenameWizardPlugin;
    private suggestions: RenameSuggestion[] = [];
    private inputEl: HTMLTextAreaElement;
    private filterEl: HTMLInputElement;
    private suggestionsEl: HTMLElement;
    private submitBtn: ButtonComponent;
    private errorEl: HTMLElement;
    private folderNoticeEl: HTMLElement;
    private previewEl: HTMLElement;
    private currentRenameValue: string = '';
    private currentFilterValue: string = '';
    private selectedSuggestionIndex: number = -1;
    private suggestionItems: HTMLElement[] = [];

    constructor(app: App, plugin: RenameWizardPlugin, file: TFile) {
        super(app);
        this.plugin = plugin;
        this.file = file;
        // Remove title bar and make modal click-outside-to-close
        this.modalEl.addClass('modal-no-title');
        this.modalEl.addClass('modal-click-outside-to-close');
    }

    onOpen(): void {
        // Remove any existing content and header
        this.modalEl.empty();
        this.modalEl.createDiv({ cls: 'modal-content complex-rename-modal' }, (contentEl) => {
            // Create input container first
            const inputContainer = contentEl.createDiv('input-container');
            
            // Main input (create this first)
            this.inputEl = inputContainer.createEl('textarea', {
                type: 'text',
                cls: 'rename-input',
                attr: { rows: '1' }
            });
            // Use full path with extension
            this.inputEl.textContent = this.file.path;

            // Focus and set selection immediately after creating the input
            this.inputEl.focus();
            if (this.plugin.settings.selectLastPart) {
                // Select only the last part of the filename before the extension
                const pathParts = this.file.path.split('/');
                const filename = pathParts[pathParts.length - 1];
                
                // Find the position of the last dot before the extension
                const extensionDotIndex = filename.lastIndexOf('.');
                
                const filenameParts = extensionDotIndex !== -1 
                    ? filename.slice(0, extensionDotIndex).split('.')
                    : filename.split('.');
                
                if (filenameParts.length > 1) {
                    // Calculate positions in the full path
                    const fullPathWithoutExt = this.file.path.slice(0, this.file.path.lastIndexOf('.'));
                    const startPos = fullPathWithoutExt.lastIndexOf('.') + 1;
                    const endPos = this.file.path.lastIndexOf('.');
                    this.inputEl.setSelectionRange(startPos, endPos);
                } else {
                    // If no dots in filename, select the whole filename without extension
                    const startPos = this.file.path.lastIndexOf('/') + 1;
                    const endPos = this.file.path.lastIndexOf('.');
                    this.inputEl.setSelectionRange(startPos, endPos);
                }
            } else {
                // Default behavior: place cursor at the end without selecting
                this.inputEl.setSelectionRange(this.file.path.length, this.file.path.length);
            }

            // Add reset button inside input container (after input)
            const resetButton = new ButtonComponent(inputContainer)
                .setIcon('rotate-ccw')
                .setTooltip('Reset to original filename')
                .onClick(() => {
                    this.inputEl.value = this.file.path;
                    this.inputEl.dispatchEvent(new Event('input'));
                    this.validateFileName(this.file.path);
                    this.updatePreview(this.file.path);
                    this.inputEl.focus();
                });
            resetButton.buttonEl.addClass('reset-button');

            // Add rename button after input
            this.submitBtn = new ButtonComponent(inputContainer)
                .setButtonText('Rename')
                .onClick(async () => {
                    if (this.validateFileName(this.inputEl.value)) {
                        await this.performRename();
                    }
                });
            
            // Add auto-expansion functionality
            const adjustHeight = (): void => {
                const maxHeight = this.contentEl.offsetHeight - 300;
                this.inputEl.style.maxHeight = `${maxHeight}px`;
            };
            
            this.inputEl.addEventListener('input', adjustHeight);
            // Initial height adjustment
            adjustHeight();
            
            // Add Enter key handler
            this.inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault();
                    const value = this.inputEl.value;
                    if (this.validateFileName(value)) {
                        this.performRename();
                    }
                }
            });

            // Error message and folder creation notice between inputs
            const noticesContainer = contentEl.createDiv('notices-container');
            this.errorEl = noticesContainer.createDiv({ cls: 'error' });
            this.folderNoticeEl = noticesContainer.createDiv({ cls: 'preview-folder-creation' });
            this.folderNoticeEl.style.display = 'none';

            // Preview section
            this.previewEl = contentEl.createDiv('preview');

            // Suggestions
            this.suggestionsEl = contentEl.createDiv('suggestions');

            // Now that all elements are created, initialize the preview
            this.updatePreview(this.file.path);
        });
        
        // Input handlers
        this.inputEl.addEventListener('input', async () => {
            const value = this.inputEl.value;
            this.currentRenameValue = value;
            
            // Always validate and show error immediately
            this.validateFileName(value);
            
            // Update suggestions and preview
            await this.updateSuggestions();
            this.updatePreview(value);
        });

        // Add keyboard navigation
        this.inputEl.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter' && !event.isComposing) {
                event.preventDefault();
                const value = this.inputEl.value;
                if (this.validateFileName(value)) {
                    await this.performRename();
                }
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                
                if (this.suggestionItems.length > 0) {
                    const direction = event.key === 'ArrowDown' ? 1 : -1;
                    let newIndex;
                    
                    // If no current selection, select first or last based on direction
                    if (this.selectedSuggestionIndex === -1) {
                        newIndex = direction === 1 ? 0 : this.suggestionItems.length - 1;
                    } else {
                        // Calculate new index with proper wrapping
                        newIndex = this.selectedSuggestionIndex + direction;
                        if (newIndex < 0) {
                            newIndex = this.suggestionItems.length - 1; // Wrap to last item
                        } else if (newIndex >= this.suggestionItems.length) {
                            newIndex = 0; // Wrap to first item
                        }
                    }
                    
                    this.selectSuggestion(newIndex);
                }
            } else if (event.key === 'Enter' && this.selectedSuggestionIndex !== -1) {
                event.preventDefault();
                
                if (this.suggestionItems[this.selectedSuggestionIndex]) {
                    this.suggestionItems[this.selectedSuggestionIndex].click();
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.selectedSuggestionIndex = -1;
                this.updateSuggestionsList();
                this.inputEl.focus();
            }
        });

        // Initialize suggestions with current filename
        this.currentRenameValue = this.file.path;
        this.updateSuggestions();

        // Adjust height based on content
        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = this.inputEl.scrollHeight + 'px';
    }

    private normalizePath(newName: string): { newPath: string; folderPath: string | null } {
        const trimmedName = newName.trim();
        
        // If no slashes, keep in current folder
        if (!trimmedName.includes('/')) {
            const currentFolder = this.file.parent ? this.file.parent.path : '';
            // Special handling for root folder to avoid double slashes
            const newPath = currentFolder === '/' 
                ? `${currentFolder}${trimmedName}`
                : currentFolder
                    ? `${currentFolder}/${trimmedName}`
                    : trimmedName;
            
            return { newPath, folderPath: null };
        }

        // Handle absolute path if slashes are present
        const pathParts = trimmedName.split('/').filter(part => part.length > 0);
        const newBasename = pathParts.pop() || ''; // Get the last part as filename
        const newFolderPath = pathParts.join('/'); // Join the rest as folder path

        // Construct the new path, avoiding double slashes
        const newPath = newFolderPath
            ? `${newFolderPath}/${newBasename}`
            : newBasename;

        return { 
            newPath, 
            folderPath: newFolderPath || null 
        };
    }

    private async performRename(): Promise<void> {
        const newName = this.inputEl.value.trim();
                
        if (!newName) return;

        try {
            const { newPath, folderPath } = this.normalizePath(newName);
            
            // Create folder if needed
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                if (!folder) {
                    await this.app.vault.createFolder(folderPath);
                }
            }

                        await this.app.fileManager.renameFile(this.file, newPath);
            this.close();
        } catch (error) {
            console.error('Error renaming file:', error);
            this.showError('Failed to rename file. Please try again.');
        }
    }

    private async updateSuggestions(): Promise<void> {
        this.suggestions = await getSuggestions(
            this.app,
            this.currentRenameValue,
            this.plugin.settings
        );
        this.updateSuggestionsList();
    }

    private computeCharacterDiff(oldText: string, newText: string): { type: 'same' | 'removed' | 'added', text: string }[] {
        const diff: { type: 'same' | 'removed' | 'added', text: string }[] = [];
        
        // Split into parts: path components and extension
        const oldParts = oldText.split('/');
        const newParts = newText.split('/');
        
        // Handle path components
        for (let i = 0; i < Math.max(oldParts.length - 1, newParts.length - 1); i++) {
            if (i > 0) {
                diff.push({ type: 'same', text: '/' });
            }
            
            const oldPart = oldParts[i] || '';
            const newPart = newParts[i] || '';
            
            if (oldPart === newPart) {
                if (oldPart) diff.push({ type: 'same', text: oldPart });
            } else {
                if (oldPart) diff.push({ type: 'removed', text: oldPart });
                if (newPart) diff.push({ type: 'added', text: newPart });
            }
        }
        
        // Add final separator if needed
        if (oldParts.length > 1 || newParts.length > 1) {
            diff.push({ type: 'same', text: '/' });
        }
        
        // Handle the filename part
        const oldFilename = oldParts[oldParts.length - 1] || '';
        const newFilename = newParts[newParts.length - 1] || '';
        
        // Split filename into name and extension
        const oldMatch = oldFilename.match(/^(.+?)(\.[^.]+)?$/);
        const newMatch = newFilename.match(/^(.+?)(\.[^.]+)?$/);
        
        if (!oldMatch || !newMatch) return diff;
        
        const [, oldName, oldExt = ''] = oldMatch;
        const [, newName, newExt = ''] = newMatch;
        
        // Split names into words (by dots, hyphens, and underscores)
        const oldWords = oldName.split(/([.-_])/);
        const newWords = newName.split(/([.-_])/);
        
        let i = 0, j = 0;
        while (i < oldWords.length || j < newWords.length) {
            const oldWord = oldWords[i] || '';
            const newWord = newWords[j] || '';
            
            if (oldWord === newWord) {
                if (oldWord) diff.push({ type: 'same', text: oldWord });
                i++;
                j++;
            } else if (oldWord === '' || (newWord !== '' && oldWords.indexOf(newWord, i) === -1)) {
                diff.push({ type: 'added', text: newWord });
                j++;
            } else {
                diff.push({ type: 'removed', text: oldWord });
                i++;
            }
        }
        
        // Handle extension
        if (oldExt === newExt) {
            if (oldExt) diff.push({ type: 'same', text: oldExt });
        } else {
            if (oldExt) diff.push({ type: 'removed', text: oldExt });
            if (newExt) diff.push({ type: 'added', text: newExt });
        }
        
        return diff;
    }

    private updatePreview(newName: string): void {
                
        if (!newName.trim()) {
            this.previewEl.setText('Please enter a new name');
            return;
        }

        const { newPath, folderPath } = this.normalizePath(newName);
                
        this.previewEl.empty();
        
        // Create the diff view container
        const diffContainer = this.previewEl.createDiv({ cls: 'preview-diff' });
        
        // Get the paths for comparison
        const oldPath = this.file.path;
        const displayNewPath = newPath.startsWith('/') && !newPath.includes('/', 1) 
            ? newPath.substring(1) 
            : newPath;
        
                    
        // Only show diff if paths are different
        if (oldPath !== displayNewPath) {
            // Use our new smart diff
            const diff = calculateSmartDiff(oldPath, displayNewPath);
                        
            // Create elements for each part of the diff
            diff.forEach(part => {
                const span = diffContainer.createSpan({
                    text: part.text,
                    cls: `diff-${part.type}`
                });
                
                // Add tooltip for moved parts
                if (part.type === 'moved') {
                    span.setAttr('title', 'Moved from another position');
                }
            });
        } else {
            // If no changes, just show the current path
            diffContainer.createSpan({
                text: oldPath,
                cls: 'diff-same'
            });
        }

        // Update folder creation notice
        if (folderPath) {
            const folder = this.app.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                this.folderNoticeEl.empty();
                
                const iconDiv = this.folderNoticeEl.createDiv({
                    cls: 'suggestion-icon'
                });
                setIcon(iconDiv, 'folder-plus');
                
                this.folderNoticeEl.createSpan({
                    text: `Note: The folder "${folderPath}" will be created`
                });
                
                this.folderNoticeEl.style.display = 'flex';
            } else {
                this.folderNoticeEl.style.display = 'none';
            }
        } else {
            this.folderNoticeEl.style.display = 'none';
        }
    }

    private showError(message: string, isWarning: boolean = false): void {
        if (this.errorEl) {
            // Clear previous content
            this.errorEl.empty();
            
            // Add icon
            const iconDiv = this.errorEl.createDiv('suggestion-icon');
            setIcon(iconDiv, isWarning ? 'alert-triangle' : 'alert-circle');
            
            // Add message
            this.errorEl.createSpan().setText(message);
            
            // Show message with appropriate style
            this.errorEl.removeClass('show-error', 'show-warning');
            this.errorEl.addClass(isWarning ? 'show-warning' : 'show-error');
            
            // Only disable submit button for errors, not warnings
            this.submitBtn.setDisabled(!isWarning);
        }
    }

    private hideError(): void {
        if (this.errorEl) {
            this.errorEl.removeClass('show-error', 'show-warning');
            this.errorEl.empty();
            this.submitBtn.setDisabled(false);
        }
    }

    private validateFileName(name: string): boolean {
        const trimmedName = name.trim();

        if (!trimmedName) {
            this.showError('File name cannot be empty');
            return false;
        }

        // Check if the basename (without path) is too long
        const pathParts = trimmedName.split('/');
        const basename = pathParts[pathParts.length - 1];

        if (basename.length > 255) {
            this.showError('File name is too long (maximum 255 characters)');
            return false;
        }

        const { newPath } = this.normalizePath(trimmedName);

        // Check if the full path is too long
        if (newPath.length > 260) {
            this.showError('Full path is too long (maximum 260 characters)');
            return false;
        }

        // Check for file existence, but allow moving to a new path even if a file exists at the old path
        const existingFile = this.app.vault.getAbstractFileByPath(newPath);
        const isFolder = existingFile instanceof TFolder;

        // Only block if:
        // 1. A file exists at the target path AND
        // 2. It's not the current file being renamed AND
        // 3. It's not a folder
        if (existingFile && existingFile !== this.file && !isFolder) {
            // Extract the folder path and filename for a more descriptive error
            const pathParts = newPath.split('/');
            const fileName = pathParts.pop() || '';
            const folderPath = pathParts.join('/') || '/';
            const folderDisplay = folderPath === '/' ? 'root folder' : `folder "${folderPath}"`;
            this.showError(`Cannot rename: A file named "${fileName}" already exists in ${folderDisplay}`);
            return false;
        }

        // Check for invalid characters in the name
        // eslint-disable-next-line no-control-regex
        const invalidChars = /[<>:"|?*\x00-\x1f]/g;
        const hasInvalidChars = invalidChars.test(trimmedName);

        if (hasInvalidChars) {
            this.showError('File name contains invalid characters');
            return false;
        }

        // Show warning if file extension is missing or different
        const hasExtension = basename.includes('.');
        const extension = hasExtension ? basename.split('.').pop()?.toLowerCase() : '';
        if (!hasExtension) {
            this.showError('Warning: No file extension specified. This might cause issues with file handling. You can still proceed with the rename.', true);
            return true;
        } else if (extension !== this.file.extension.toLowerCase()) {
            this.showError('Warning: File extension has been changed. This might cause issues with file handling. You can still proceed with the rename.', true);
            return true;
        }

        this.hideError();
        return true;
    }

    private highlightMatches(text: string, input: string): HTMLSpanElement {
        const container = createSpan({ cls: 'suggestion-name' });
        if (!input) {
            container.setText(text);
            return container;
        }

        const textLower = text.toLowerCase();
        const parts = input.toLowerCase().split(/[\s-_.]+/).filter(Boolean);
        
        // Create a map of positions to highlight
        const highlights: { start: number; end: number }[] = [];

        // Find matches for each part
        for (const part of parts) {
            let pos = 0;
            while ((pos = textLower.indexOf(part, pos)) !== -1) {
                highlights.push({
                    start: pos,
                    end: pos + part.length
                });
                pos += part.length;
            }
        }

        // Sort and merge overlapping highlights
        highlights.sort((a, b) => a.start - b.start);
        const mergedHighlights: typeof highlights = [];
        for (const highlight of highlights) {
            const last = mergedHighlights[mergedHighlights.length - 1];
            if (last && highlight.start <= last.end) {
                last.end = Math.max(last.end, highlight.end);
            } else {
                mergedHighlights.push(highlight);
            }
        }

        // Apply highlights
        let lastEnd = 0;
        for (const { start, end } of mergedHighlights) {
            if (start > lastEnd) {
                container.appendText(text.slice(lastEnd, start));
            }
            container.createSpan({
                text: text.slice(start, end),
                cls: 'highlight-rename'
            });
            lastEnd = end;
        }

        if (lastEnd < text.length) {
            container.appendText(text.slice(lastEnd));
        }

        return container;
    }

    private selectSuggestion(index: number): void {
        // Remove previous selection
        if (this.selectedSuggestionIndex !== -1 && this.suggestionItems[this.selectedSuggestionIndex]) {
            this.suggestionItems[this.selectedSuggestionIndex].removeClass('is-selected');
        }

        this.selectedSuggestionIndex = index;
        
        if (this.suggestionItems[index]) {
            this.suggestionItems[index].addClass('is-selected');
            // Ensure the selected item is visible
            this.suggestionItems[index].scrollIntoView({
                behavior: 'auto',
                block: 'nearest'
            });
        }
    }

    private updateSuggestionsList(): void {
        this.suggestionsEl.empty();
        this.suggestionItems = [];
        
        if (this.suggestions.length === 0) {
            this.suggestionsEl.createEl('div', {
                text: 'No suggestions available',
                cls: 'suggestion-empty'
            });
            return;
        }

        const list = this.suggestionsEl.createEl('ul', { cls: 'suggestion-list' });
        
        // Sort suggestions by match quality first, then by similarity score, then by length
        const sortedSuggestions = [...this.suggestions]
            .sort((a, b) => {
                const matchQualityA = this.calculateMatchQuality(a);
                const matchQualityB = this.calculateMatchQuality(b);
                
                // First sort by match quality
                if (matchQualityA !== matchQualityB) {
                    return matchQualityB - matchQualityA;
                }
                
                // If match quality is the same, sort by similarity score
                if (a.score !== b.score) {
                    return b.score - a.score;
                }
                
                // If scores are equal, sort by length
                return (a.path || a.name).length - (b.path || b.name).length;
            })
            .slice(0, this.plugin.settings.maxSuggestions);
        
        sortedSuggestions.forEach(suggestion => {
            const item = list.createEl('li', { cls: 'suggestion-item' });
            this.suggestionItems.push(item);
            
            // Add highlighted full path, removing .md extension if present
            const displayPath = suggestion.path || suggestion.name;
                
            // Use the smart highlighting from the filter
            item.appendChild(this.highlightMatches(displayPath, this.currentRenameValue));
            
            item.onClickEvent(() => {
                // Get the suggestion's folder path and name
                const suggestionPath = suggestion.path || suggestion.name;
                
                // Use the merge template to combine paths
                const newValue = mergeFilenames(this.file.path, suggestionPath, this.plugin.settings.mergeTemplate);

                // Update the input value and trigger necessary updates
                this.inputEl.value = newValue;
                this.currentRenameValue = newValue;

                // Validate the new filename and show/hide error messages
                this.validateFileName(newValue);

                // Clear selection and update UI
                this.selectedSuggestionIndex = -1;
                this.updateSuggestionsList();
                
                // Set cursor position based on settings
                if (this.plugin.settings.selectLastPart) {
                    const pathParts = newValue.split('/');
                    const filename = pathParts[pathParts.length - 1];
                    // Find the position of the last dot before the extension
                    const extensionDotIndex = filename.lastIndexOf('.');
                    const filenameParts = extensionDotIndex !== -1 
                        ? filename.slice(0, extensionDotIndex).split('.')
                        : filename.split('.');
                    
                    if (filenameParts.length > 1) {
                        // Calculate positions in the full path
                        const fullPathWithoutExt = newValue.slice(0, extensionDotIndex);
                        const startPos = fullPathWithoutExt.lastIndexOf('.') + 1;
                        const endPos = extensionDotIndex !== -1 ? extensionDotIndex : newValue.length;
                        this.inputEl.setSelectionRange(startPos, endPos);
                    } else {
                        // If no dots in filename, select the whole filename without extension
                        const startPos = newValue.lastIndexOf('/') + 1;
                        const endPos = extensionDotIndex !== -1 ? extensionDotIndex : newValue.length;
                        this.inputEl.setSelectionRange(startPos, endPos);
                    }
                } else {
                    this.inputEl.setSelectionRange(newValue.length, newValue.length);
                }

                // Update suggestions and preview
                this.updateSuggestions();
                this.updatePreview(newValue);
                
                // Set focus back to the textarea
                this.inputEl.focus();
            });
        });
    }

    private calculateMatchQuality(suggestion: RenameSuggestion): number {
        const input = this.currentRenameValue.toLowerCase();
        const name = suggestion.name.toLowerCase();
        const path = suggestion.path?.toLowerCase() || '';
        
        // Split input into parts for more granular matching
        const parts = input.split(/[\s-_.]+/).filter(Boolean);
        
        // If all parts match, give highest priority
        if (parts.every(part => name.includes(part) || path.includes(part))) return 4;
        
        // If most parts match at word boundaries, give high priority
        const boundaryMatches = parts.filter(part => 
            name.includes(` ${part}`) || name.includes(`-${part}`) || name.includes(`.${part}`) ||
            path.includes(` ${part}`) || path.includes(`-${part}`) || path.includes(`.${part}`)
        ).length;
        if (boundaryMatches > parts.length / 2) return 3;
        
        // If most parts match anywhere, give medium priority
        const anyMatches = parts.filter(part => name.includes(part) || path.includes(part)).length;
        if (anyMatches > parts.length / 2) return 2;
        
        // If any part matches, give low priority
        if (anyMatches > 0) return 1;
        
        // No matches
        return 0;
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
} 