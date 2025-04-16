export interface RenameWizardSettings {
    maxSuggestions: number;
    fuzzyMatchThreshold: number;
    selectLastPart: boolean;
    mergeTemplate: string;
}

export interface RenameSuggestion {
    name: string;
    score: number;
    source: 'existing' | 'deadLink';
    path?: string;
    displayPath?: string;
} 