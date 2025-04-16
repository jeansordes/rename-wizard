import { RenameWizardSettings } from './types';

export const DEFAULT_SETTINGS: RenameWizardSettings = {
    mergeTemplate: '{{title}}',
    maxSuggestions: 10,
    recentRenamesLimit: 20,
    fuzzyMatchThreshold: 0.3,
    selectLastPart: true,
    mergeSuggestions: false
}; 