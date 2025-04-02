import { App, Modal, TFile, ButtonComponent, setIcon, TFolder } from 'obsidian';
import RenameWizardPlugin from '../main';
import { RenameSuggestion } from '../types';
import { getSuggestions } from '../core/suggestions';

export class ComplexRenameModal extends Modal {
    private file: TFile;
    private plugin: RenameWizardPlugin;
    private suggestions: RenameSuggestion[] = [];
    private inputEl: HTMLInputElement;
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
            // Create all elements first
            this.previewEl = contentEl.createDiv('preview');
            
            // Main input and rename button
            const inputContainer = contentEl.createDiv('input-container');
            this.inputEl = inputContainer.createEl('input', {
                type: 'text',
                value: this.file.basename,
                cls: 'rename-input'
            });
            
            // Add rename button
            this.submitBtn = new ButtonComponent(inputContainer)
                .setButtonText('Rename')
                .onClick(async () => {
                    if (this.validateFileName(this.inputEl.value)) {
                        await this.performRename();
                    }
                });

            // Error message and folder creation notice between inputs
            const noticesContainer = contentEl.createDiv('notices-container');
            this.errorEl = noticesContainer.createDiv({ cls: 'error' });
            this.folderNoticeEl = noticesContainer.createDiv({ cls: 'preview-folder-creation' });
            this.folderNoticeEl.style.display = 'none';

            // Filter input
            this.filterEl = contentEl.createEl('input', {
                type: 'text',
                placeholder: 'Filter suggestions...',
                cls: 'filter-input'
            });

            // Suggestions
            this.suggestionsEl = contentEl.createDiv('suggestions');

            // Now that all elements are created, initialize the preview
            this.updatePreview(this.file.basename);
        });
        
        // Input handlers
        this.inputEl.addEventListener('input', async () => {
            const value = this.inputEl.value;
            this.currentRenameValue = value;
            
            // Always validate and show error immediately
            this.validateFileName(value);
            
            // Update suggestions and preview
            await this.updateSuggestions(this.currentFilterValue || value);
            this.updatePreview(value);
        });

        // Add Enter key handler
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
                    const targetIndex = event.key === 'ArrowDown' ? 0 : this.suggestionItems.length - 1;
                    this.selectSuggestion(targetIndex);
                    // Move focus to filter after selection
                    this.filterEl.focus();
                }
            }
        });

        this.filterEl.addEventListener('input', async () => {
            this.currentFilterValue = this.filterEl.value;
            await this.updateSuggestions(this.currentFilterValue);
        });

        // Add keyboard navigation for filter field
        this.filterEl.addEventListener('keydown', async (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
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
                    this.selectedSuggestionIndex = -1;
                    this.inputEl.focus();
                }
            } else if (event.key === 'Escape') {
                event.preventDefault();
                this.selectedSuggestionIndex = -1;
                this.updateSuggestionsList(); // Refresh to clear selection
                this.inputEl.focus();
            }
        });

        // Initialize suggestions with current filename
        this.currentRenameValue = this.file.basename;
        this.updateSuggestions(this.file.basename);

        // Focus input
        this.inputEl.focus();
        this.inputEl.select();
    }

    private normalizePath(newName: string): { newPath: string; folderPath: string | null } {
        const trimmedName = newName.trim();
        
        console.log('[normalizePath] Input:', {
            trimmedName,
            currentFile: this.file.path,
            hasParent: !!this.file.parent,
            parentPath: this.file.parent?.path
        });
        
        // If no slashes, keep in current folder
        if (!trimmedName.includes('/')) {
            const currentFolder = this.file.parent ? this.file.parent.path : '';
            // Special handling for root folder to avoid double slashes
            const newPath = currentFolder === '/' 
                ? `${currentFolder}${trimmedName}.${this.file.extension}`
                : currentFolder
                    ? `${currentFolder}/${trimmedName}.${this.file.extension}`
                    : `${trimmedName}.${this.file.extension}`;
            
            console.log('[normalizePath] No slashes case:', {
                currentFolder,
                newPath
            });
            
            return { newPath, folderPath: null };
        }

        // Handle absolute path if slashes are present
        const pathParts = trimmedName.split('/').filter(part => part.length > 0);
        const newBasename = pathParts.pop() || ''; // Get the last part as filename
        const newFolderPath = pathParts.join('/'); // Join the rest as folder path

        // Construct the new path, avoiding double slashes
        const newPath = newFolderPath
            ? `${newFolderPath}/${newBasename}.${this.file.extension}`
            : `${newBasename}.${this.file.extension}`;

        console.log('[normalizePath] With slashes case:', {
            pathParts,
            newBasename,
            newFolderPath,
            newPath
        });

        return { 
            newPath, 
            folderPath: newFolderPath || null 
        };
    }

    private async performRename(): Promise<void> {
        const newName = this.inputEl.value.trim();
        if (!newName) return;

        console.log('[performRename] Starting rename:', {
            newName,
            currentPath: this.file.path
        });

        try {
            const { newPath, folderPath } = this.normalizePath(newName);
            console.log('[performRename] Normalized path:', {
                newPath,
                folderPath,
                fileExists: !!this.app.vault.getAbstractFileByPath(newPath)
            });

            // Create folder if needed
            if (folderPath) {
                const folder = this.app.vault.getAbstractFileByPath(folderPath);
                console.log('[performRename] Folder check:', {
                    folderPath,
                    folderExists: !!folder
                });
                if (!folder) {
                    console.log('[performRename] Creating folder:', folderPath);
                    await this.app.vault.createFolder(folderPath);
                }
            }

            console.log('[performRename] Renaming file:', {
                from: this.file.path,
                to: newPath,
                fileExists: !!this.app.vault.getAbstractFileByPath(newPath)
            });

            await this.app.fileManager.renameFile(this.file, newPath);
            
            const newBasename = newPath.split('/').pop()?.replace(`.${this.file.extension}`, '') || '';
            console.log('[performRename] Adding to history:', {
                oldName: this.file.basename,
                newName: newBasename
            });
            
            this.plugin.addToHistory(this.file.basename, newBasename);
            this.close();
        } catch (error) {
            console.error('[performRename] Error:', error);
            this.showError('Failed to rename file. Please try again.');
        }
    }

    private async updateSuggestions(input: string): Promise<void> {
        this.suggestions = await getSuggestions(
            this.app,
            input,
            this.plugin.settings,
            this.plugin.recentRenames
        );
        this.updateSuggestionsList();
    }

    private updatePreview(newName: string): void {
        if (!newName.trim()) {
            this.previewEl.setText('Please enter a new name');
            return;
        }

        const { newPath, folderPath } = this.normalizePath(newName);
        
        console.log('[updatePreview] Paths:', {
            originalPath: this.file.path,
            newPath,
            folderPath
        });
        
        this.previewEl.empty();
        
        // Show the path transformation with full paths (including extension)
        const displayNewPath = newPath.startsWith('/') && !newPath.includes('/', 1) 
            ? newPath.substring(1) 
            : newPath;
            
        const displayText = this.file.path + (this.file.path === displayNewPath ? '' : ` → ${displayNewPath}`);
        console.log('[updatePreview] Display:', { displayText });
        
        this.previewEl.createEl('div', { 
            text: displayText,
            cls: 'preview-path'
        });

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

    private showError(message: string): void {
        if (this.errorEl) {
            // Clear previous content
            this.errorEl.empty();
            
            // Add error icon
            const iconDiv = this.errorEl.createDiv('suggestion-icon');
            setIcon(iconDiv, 'alert-circle');
            
            // Add error message
            this.errorEl.createSpan().setText(message);
            
            // Show error
            this.errorEl.addClass('show');
            this.submitBtn.setDisabled(true);
        }
    }

    private hideError(): void {
        if (this.errorEl) {
            this.errorEl.removeClass('show');
            this.errorEl.empty();
            this.submitBtn.setDisabled(false);
        }
    }

    private validateFileName(name: string): boolean {
        const trimmedName = name.trim();
        console.log('[validateFileName] Starting validation:', {
            trimmedName,
            currentPath: this.file.path
        });

        if (!trimmedName) {
            this.showError('File name cannot be empty');
            return false;
        }

        // Check if the basename (without path) is too long
        const pathParts = trimmedName.split('/');
        const basename = pathParts[pathParts.length - 1];
        console.log('[validateFileName] Basename check:', {
            pathParts,
            basename,
            length: basename.length
        });

        if (basename.length > 255) {
            this.showError('File name is too long (maximum 255 characters)');
            return false;
        }

        const { newPath } = this.normalizePath(trimmedName);
        console.log('[validateFileName] Path check:', {
            newPath,
            length: newPath.length
        });

        // Check if the full path is too long
        if (newPath.length > 260) {
            this.showError('Full path is too long (maximum 260 characters)');
            return false;
        }

        // Check for file existence, but allow moving to a new path even if a file exists at the old path
        const existingFile = this.app.vault.getAbstractFileByPath(newPath);
        const isFolder = existingFile instanceof TFolder;
        console.log('[validateFileName] Existence check:', {
            newPath,
            exists: !!existingFile,
            isCurrentFile: existingFile === this.file,
            currentPath: this.file.path,
            pathMatch: existingFile?.path === this.file.path,
            existingType: existingFile?.constructor.name,
            isFolder
        });

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
        const invalidChars = /[<>:"|?*\u0000-\u001F]/g;
        const hasInvalidChars = invalidChars.test(trimmedName);
        console.log('[validateFileName] Character check:', {
            hasInvalidChars,
            trimmedName
        });

        if (hasInvalidChars) {
            this.showError('File name contains invalid characters');
            return false;
        }

        console.log('[validateFileName] Validation passed');
        this.hideError();
        return true;
    }

    private highlightMatches(text: string, searchValue: string, filterValue: string): HTMLSpanElement {
        const container = createSpan({ cls: 'suggestion-name' });
        if (!searchValue && !filterValue) {
            container.setText(text);
            return container;
        }

        let currentPos = 0;
        const textLower = text.toLowerCase();
        const searchLower = searchValue.toLowerCase();
        const filterLower = filterValue.toLowerCase();
        
        // Create a map of positions to highlight
        const highlights: { start: number; end: number; type: 'rename' | 'filter' }[] = [];

        // Find rename matches (if any)
        if (searchValue) {
            let pos = 0;
            while ((pos = textLower.indexOf(searchLower, pos)) !== -1) {
                highlights.push({
                    start: pos,
                    end: pos + searchLower.length,
                    type: 'rename'
                });
                pos += searchLower.length;  // Move past the current match
            }
        }

        // Find filter matches (if any)
        if (filterValue) {
            // Split the filter value into parts for more granular matching
            const parts = filterLower.split(/[\s-_.]+/).filter(Boolean);
            for (const part of parts) {
                let pos = 0;
                while ((pos = textLower.indexOf(part, pos)) !== -1) {
                    highlights.push({
                        start: pos,
                        end: pos + part.length,
                        type: 'filter'
                    });
                    pos += part.length;  // Move past the current match
                }
            }
        }

        // Sort highlights by start position
        highlights.sort((a, b) => a.start - b.start);

        // Merge overlapping highlights
        const mergedHighlights: typeof highlights = [];
        for (const highlight of highlights) {
            const last = mergedHighlights[mergedHighlights.length - 1];
            if (last && highlight.start <= last.end) {
                last.end = Math.max(last.end, highlight.end);
                // If we're merging different types, prefer filter
                if (highlight.type === 'filter') {
                    last.type = 'filter';
                }
            } else {
                mergedHighlights.push(highlight);
            }
        }

        // Apply highlights
        let lastEnd = 0;
        for (const { start, end, type } of mergedHighlights) {
            // Add non-highlighted text before this highlight
            if (start > lastEnd) {
                container.appendText(text.slice(lastEnd, start));
            }
            
            // Add highlighted text
            container.createSpan({
                text: text.slice(start, end),
                cls: `highlight-${type}`
            });
            
            lastEnd = end;
        }

        // Add remaining non-highlighted text
        if (lastEnd < text.length) {
            container.appendText(text.slice(lastEnd));
        }

        return container;
    }

    private selectSuggestion(index: number) {
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
        
        // Helper function to calculate how well a suggestion matches the input
        const calculateMatchQuality = (suggestion: RenameSuggestion) => {
            const input = this.currentRenameValue.toLowerCase();
            const name = suggestion.name.toLowerCase();
            const path = suggestion.path?.toLowerCase() || '';
            
            // Exact match gets highest priority
            if (name === input || path.endsWith('/' + input)) return 4;
            // Starts with input gets high priority
            if (name.startsWith(input) || path.includes('/' + input)) return 3;
            // Contains input as a whole word gets medium priority
            if (name.includes(' ' + input) || name.includes('-' + input) || name.includes('.' + input) ||
                path.includes(' ' + input) || path.includes('-' + input) || path.includes('.' + input)) return 2;
            // Contains input anywhere gets lower priority
            if (name.includes(input) || path.includes(input)) return 1;
            // No direct match, fall back to similarity score
            return 0;
        };
        
        // Sort suggestions by match quality first, then by similarity score, then by length
        const sortedSuggestions = [...this.suggestions]
            .sort((a, b) => {
                const matchQualityA = calculateMatchQuality(a);
                const matchQualityB = calculateMatchQuality(b);
                
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
            const displayPath = (suggestion.path || suggestion.name).endsWith('.md')
                ? (suggestion.path || suggestion.name).slice(0, -3)
                : (suggestion.path || suggestion.name);
                
            item.appendChild(
                this.highlightMatches(
                    displayPath,
                    this.currentRenameValue,
                    this.currentFilterValue
                )
            );
            
            // Add history icon for recent suggestions
            if (suggestion.source === 'recent') {
                const iconDiv = item.createDiv({
                    cls: 'suggestion-icon',
                    attr: {
                        'aria-label': 'Recent rename'
                    }
                });
                setIcon(iconDiv, 'history');
            }
            
            item.onClickEvent(() => {
                // Get the current file's parent path
                const currentFolder = this.file.parent ? this.file.parent.path : '';
                
                // Get the suggestion's folder path and name, removing .md extension if present
                let suggestionFolder = '';
                let suggestionName = suggestion.name;
                if (suggestion.path) {
                    const lastSlashIndex = suggestion.path.lastIndexOf('/');
                    if (lastSlashIndex !== -1) {
                        suggestionFolder = suggestion.path.substring(0, lastSlashIndex);
                        suggestionName = suggestion.path.substring(lastSlashIndex + 1);
                    }
                }
                
                // Remove .md extension if present
                if (suggestionName.endsWith('.md')) {
                    suggestionName = suggestionName.slice(0, -3);
                }

                // If the folders are different, include the suggestion's folder in the new name
                if (suggestionFolder && suggestionFolder !== currentFolder) {
                    this.inputEl.value = suggestionFolder + '/' + suggestionName;
                } else {
                    this.inputEl.value = suggestionName;
                }

                // Clear selection and update UI
                this.selectedSuggestionIndex = -1;
                this.inputEl.dispatchEvent(new Event('input'));
                this.validateFileName(this.inputEl.value);
                this.updatePreview(this.inputEl.value);
                this.inputEl.focus();
            });
        });
    }

    onClose(): void {
        const { contentEl } = this;
        contentEl.empty();
    }
} 