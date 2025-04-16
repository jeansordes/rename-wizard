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

export enum TokenType {
    WORD = 'WORD',
    SEPARATOR = 'SEPARATOR',
    NUMBER = 'NUMBER',
    SPECIAL = 'SPECIAL',
    VERSION = 'VERSION',
    OTHER = 'OTHER',
    DATE = 'DATE',
    TAG = 'TAG',
    STATUS = 'STATUS'
}

export interface Token {
    type: TokenType;
    value: string;
    position: number;
} 