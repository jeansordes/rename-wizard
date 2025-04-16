export interface RenameWizardSettings {
    maxSuggestions: number;
    recentRenamesLimit: number;
    fuzzyMatchThreshold: number;
    selectLastPart: boolean;
    mergeSuggestions: boolean;
    mergeTemplate: string;
}

export interface RenameSuggestion {
    name: string;
    score: number;
    source: 'existing' | 'deadLink' | 'recent';
    path?: string;
    displayPath?: string;
}

export interface RenameHistory {
    oldName: string;
    newName: string;
    timestamp: number;
} 