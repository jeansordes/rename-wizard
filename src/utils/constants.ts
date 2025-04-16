import { RenameWizardSettings } from '../types';

export const TEMPLATE_VARIABLES = [
    { value: '${suggestion.folderPath}', description: 'Folder path of the suggestion' },
    { value: '${suggestion.basename}', description: 'Base name of the suggestion (without extension)' },
    { value: '${suggestion.extension}', description: 'File extension of the suggestion' },
    { value: '${current.folderPath}', description: 'Current file\'s folder path' },
    { value: '${current.basename}', description: 'Current file\'s base name (without extension)' },
    { value: '${current.extension}', description: 'Current file\'s extension' }
] as const;

export const DEFAULT_SETTINGS: RenameWizardSettings = {
    maxSuggestions: 50,
    fuzzyMatchThreshold: 0.4,
    selectLastPart: true,
    mergeTemplate: '${suggestion.folderPath}/${suggestion.basename}.${current.basename}'
}; 