import { TFile } from 'obsidian';
import { calculateSmartDiff } from '../../utils/diffUtils';
import { normalizePath } from '../../validators/fileNameValidator';

/**
 * Renders a preview of the rename operation showing the diff between old and new names
 */
export class PreviewRenderer {
    /**
     * Create a preview of the rename operation
     * @param previewEl The HTML element to render the preview in
     * @param folderNoticeEl The HTML element to show folder creation notices
     * @param newName The new file name
     * @param file The file being renamed
     */
    static updatePreview(
        previewEl: HTMLElement, 
        folderNoticeEl: HTMLElement, 
        newName: string, 
        file: TFile
    ): void {
        previewEl.empty();
        
        // Handle empty preview
        if (!newName.trim()) {
            previewEl.addClass('hidden');
            return;
        } else {
            previewEl.removeClass('hidden');
        }
        
        // Get the normalized path
        const { newPath, folderPath } = normalizePath(newName, file);
        
        // Show folder creation notice if needed
        if (folderPath) {
            const folder = file.vault.getAbstractFileByPath(folderPath);
            if (!folder) {
                folderNoticeEl.empty();
                folderNoticeEl.removeClass('hidden');
                
                folderNoticeEl.createSpan({
                    text: `Folder will be created: ${folderPath}`
                });
            } else {
                folderNoticeEl.addClass('hidden');
            }
        } else {
            folderNoticeEl.addClass('hidden');
        }
        
        // Hide preview if filename is unchanged
        if (file.path === newPath) {
            previewEl.addClass('hidden');
            return;
        } else {
            previewEl.removeClass('hidden');
        }
        
        // Create diff view
        const diffContainer = previewEl.createDiv({
            cls: 'preview-diff'
        });
        
        // Generate smart diff between original and new filename
        const diff = calculateSmartDiff(file.path, newPath);
        
        // Check if diff is empty
        if (diff.length === 0) {
            diffContainer.createSpan({
                text: 'Unable to calculate changes',
                cls: 'diff-error'
            });
            return;
        }
        
        // Create diff elements
        diff.forEach(segment => {
            diffContainer.createSpan({
                text: segment.text,
                cls: `diff-${segment.type}`
            });
        });
    }
} 