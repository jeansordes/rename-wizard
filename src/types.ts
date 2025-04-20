import { TFile } from 'obsidian';

export interface RenameWizardSettings {
    maxSuggestions: number;
    fuzzyMatchThreshold: number;
    selectLastPart: boolean;
    mergeTemplate: string;
    batchRenaming: {
        enabled: boolean;
        largeOperationThreshold: number;
        showPreview: boolean;
    };
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

export interface BatchRenameOperation {
    files: TFile[];
    newNamePattern: string;
    estimatedTime?: number;
}

export interface BatchRenameResult {
    file: TFile;
    originalPath: string;
    newPath?: string;
    success: boolean;
    error?: string;
}

export interface BatchOperationProgress {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    results: BatchRenameResult[];
    status: BatchOperationStatus;
}

export enum BatchOperationStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed'
} 