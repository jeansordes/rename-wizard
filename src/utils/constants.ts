import { RenameWizardSettings } from '../types';

export const TEMPLATE_VARIABLES = [
    { value: '${suggestion.folderPath}', description: 'Folder path of the suggestion' },
    { value: '${suggestion.basename}', description: 'Base name of the suggestion (without extension)' },
    { value: '${suggestion.extension}', description: 'File extension of the suggestion' },
    { value: '${suggestion.dendronBasename}', description: 'Dendron base name of the suggestion (all parts except the last one, e.g. "prj.A" in "prj.A.task")' },
    { value: '${suggestion.dendronLastSegment}', description: 'Last segment of the suggestion\'s Dendron base name (e.g. "B" in "prj.B")' },
    { value: '${current.folderPath}', description: 'Current file\'s folder path' },
    { value: '${current.basename}', description: 'Current file\'s base name (without extension)' },
    { value: '${current.extension}', description: 'Current file\'s extension' },
    { value: '${current.dendronBasename}', description: 'Current file\'s Dendron base name (all parts except the last one, e.g. "prj.A" in "prj.A.task")' },
    { value: '${current.dendronLastSegment}', description: 'Last segment of the current file\'s Dendron base name (e.g. "task" in "prj.A.task")' }
] as const;

export const DEFAULT_SETTINGS: RenameWizardSettings = {
    maxSuggestions: 50,
    fuzzyMatchThreshold: 0.4,
    selectLastPart: true,
    mergeTemplate: '${suggestion.folderPath}/${suggestion.basename}.${current.dendronLastSegment}.${current.extension}'
}; 