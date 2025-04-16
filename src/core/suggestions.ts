import { App, TFile } from 'obsidian';
import { RenameWizardSettings, RenameSuggestion } from '../types';

/**
 * Calculate similarity score between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns Score between 0 and 1, where 1 is exact match
 */
function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const pairs1 = new Set(getPairs(s1));
    const pairs2 = new Set(getPairs(s2));
    const intersection = new Set([...pairs1].filter(x => pairs2.has(x)));
    
    return (2.0 * intersection.size) / (pairs1.size + pairs2.size);
}

/**
 * Calculate path similarity considering folder structure
 */
function calculatePathSimilarity(file: TFile, input: string): number {
    // Get the parent path components
    const parentPath = file.parent ? file.parent.path : '';
    const pathParts = parentPath.split('/').filter((p: string) => p.length > 0);
    
    // Calculate similarity for each path component
    let maxScore = 0;
    for (const part of pathParts) {
        const score = calculateSimilarity(part, input);
        maxScore = Math.max(maxScore, score);
    }
    
    // Calculate similarity with the filename
    const fileScore = calculateSimilarity(file.basename, input);
    
    // Return the highest score
    return Math.max(maxScore, fileScore);
}

/**
 * Get character pairs from a string
 */
function getPairs(str: string): string[] {
    const pairs = [];
    for (let i = 0; i < str.length - 1; i++) {
        pairs.push(str.slice(i, i + 2));
    }
    return pairs;
}

/**
 * Get suggestions for file rename based on existing files
 */
export async function getSuggestions(
    app: App,
    input: string,
    settings: RenameWizardSettings
): Promise<RenameSuggestion[]> {
    const suggestions: RenameSuggestion[] = [];
    
    // Add suggestions from existing files
    const files = app.vault.getFiles();
    files.forEach(file => {
        // Calculate similarity based on both path and filename
        const score = calculatePathSimilarity(file, input);
        
        if (score >= settings.fuzzyMatchThreshold) {
            // Include extension in name if not .md
            const displayName = file.extension !== 'md' 
                ? `${file.basename}.${file.extension}`
                : file.basename;
            
            // Get relative path for display
            const relativePath = file.parent ? file.parent.path : '';
                
            suggestions.push({
                name: displayName,
                score,
                source: 'existing',
                path: file.path,
                displayPath: relativePath
            });
        }
    });
    
    // Return all suggestions that meet the threshold
    return suggestions;
} 