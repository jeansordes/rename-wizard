import { App, TFile } from 'obsidian';
import { RenameSuggestion } from '../types';

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
// Keeping this function for potential future use but marking it as not used
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
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
 * Calculate weighted relevance score for a file based on the input
 * Prioritizes matches in filenames and distinct parts over common elements
 */
function calculateWeightedScore(file: TFile, input: string): number {
    const path = file.path.toLowerCase();
    const fileName = file.basename.toLowerCase();
    // File extension is captured but not used in the current implementation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const extension = file.extension.toLowerCase();
    const inputLower = input.toLowerCase();
    
    // Start with a base score
    let score = 0;
    
    // Extract search terms from input
    const searchTerms: string[] = [];
    
    // Add the whole input
    searchTerms.push(inputLower);
    
    // Add filename part if input contains a path
    if (input.includes('/')) {
        const lastPart = input.split('/').pop() || '';
        if (lastPart) searchTerms.push(lastPart.toLowerCase());
    }
    
    // Add file components (split by common separators)
    const fileComponents = input.split(/[/.\-_\s]/).filter(Boolean);
    for (const component of fileComponents) {
        if (component.length >= 2) searchTerms.push(component.toLowerCase());
    }
    
    // Remove duplicates
    const uniqueTerms = [...new Set(searchTerms)];
    
    // Score each search term
    for (const term of uniqueTerms) {
        // Skip very short terms unless they're the complete input
        if (term.length < 2 && term !== inputLower) continue;
        
        // Check if file path contains the term
        if (path.includes(term)) {
            // Base points for any match
            let termScore = term.length * 2;
            
            // Significant boost if the filename contains the term
            if (fileName.includes(term)) {
                termScore += 20;
                
                // Extra boost if it's an exact match for the filename
                if (fileName === term) {
                    termScore += 30;
                }
                
                // Boost for matches at the beginning of filename
                if (fileName.startsWith(term)) {
                    termScore += 15;
                }
            }
            
            // Penalize common elements
            if (term === 'md' || term === '.md') {
                termScore -= 15;
            }
            
            // Penalize matches that are just common folder names
            if (term === 'notes' && !inputLower.includes('notes')) {
                termScore -= 10;
            }
            
            // Add to total score
            score += termScore;
        }
    }
    
    // Normalize score to a value between 0 and 1 for compatibility
    // with the existing threshold mechanism
    return Math.min(score / 100, 1);
}

/**
 * Get suggestions for file rename based on existing files
 */
export async function getSuggestions(
    app: App,
    input: string,
    maxSuggestions: number,
    fuzzyMatchThreshold: number
): Promise<RenameSuggestion[]> {
    const suggestions: RenameSuggestion[] = [];
    
    // Skip if input is too short
    if (input.trim().length < 2) {
        return suggestions;
    }
    
    // Add suggestions from existing files
    const files = app.vault.getFiles();
    files.forEach(file => {
        // Calculate weighted score based on our new algorithm
        const score = calculateWeightedScore(file, input);
        
        // Higher threshold to reduce irrelevant matches
        if (score >= fuzzyMatchThreshold) {
            // Use full path for name
            const displayName = file.path;
            
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
    
    // Return top suggestions that meet the threshold
    // First sort by score (descending), then by path length (ascending) for equal scores
    return suggestions
        .sort((a, b) => {
            // First sort by score (higher score first)
            const scoreDiff = b.score - a.score;
            
            // If scores are equal, sort by path length (shortest first)
            if (scoreDiff === 0) {
                const aPathLength = a.path?.length ?? Number.MAX_SAFE_INTEGER;
                const bPathLength = b.path?.length ?? Number.MAX_SAFE_INTEGER;
                return aPathLength - bPathLength;
            }
            
            return scoreDiff;
        })
        .slice(0, maxSuggestions);
} 