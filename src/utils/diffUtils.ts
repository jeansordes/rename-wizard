import { TokenRecognizer } from './tokenRecognizer';

export interface DiffPart {
    type: 'same' | 'removed' | 'added' | 'moved';
    text: string;
    originalPosition?: number;
    newPosition?: number;
}

/**
 * Calculate smart diff between two filenames
 */
export function calculateSmartDiff(oldName: string, newName: string): DiffPart[] {
    // First split into path and filename
    const oldParts = oldName.split('/');
    const newParts = newName.split('/');
    
    const oldFilename = oldParts.pop() || '';
    const newFilename = newParts.pop() || '';
    
    // Handle path differences
    const pathDiff = diffPaths(oldParts, newParts);
    
    // Handle filename differences using token-based approach
    const filenameDiff = diffFilenames(oldFilename, newFilename);
    
    return [...pathDiff, { type: 'same', text: '/' }, ...filenameDiff];
}

/**
 * Calculate diff between two paths
 */
function diffPaths(oldPath: string[], newPath: string[]): DiffPart[] {
    const diff: DiffPart[] = [];
    const maxLen = Math.max(oldPath.length, newPath.length);
    
    for (let i = 0; i < maxLen; i++) {
        if (i > 0) {
            diff.push({ type: 'same', text: '/' });
        }
        
        const oldPart = oldPath[i];
        const newPart = newPath[i];
        
        if (oldPart === newPart) {
            if (oldPart) diff.push({ type: 'same', text: oldPart });
        } else {
            if (oldPart) diff.push({ type: 'removed', text: oldPart });
            if (newPart) diff.push({ type: 'added', text: newPart });
        }
    }
    
    return diff;
}

/**
 * Calculate diff between two filenames using token-based approach
 */
function diffFilenames(oldName: string, newName: string): DiffPart[] {
        
    // Tokenize both filenames
    const oldTokens = TokenRecognizer.tokenize(oldName);
    const newTokens = TokenRecognizer.tokenize(newName);
        
    const diff: DiffPart[] = [];
    const usedOldTokens = new Set<number>();
    const usedNewTokens = new Set<number>();
    
    // First pass: find exact matches
    for (let i = 0; i < newTokens.length; i++) {
        const newToken = newTokens[i];
        for (let j = 0; j < oldTokens.length; j++) {
            const oldToken = oldTokens[j];
            if (!usedOldTokens.has(j) && 
                !usedNewTokens.has(i) && 
                oldToken.value === newToken.value && 
                oldToken.type === newToken.type) {
                if (i === j) {
                    diff[i] = { type: 'same', text: newToken.value };
                } else {
                    diff[i] = { 
                        type: 'moved', 
                        text: newToken.value,
                        originalPosition: oldToken.position,
                        newPosition: newToken.position
                    };
                }
                usedOldTokens.add(j);
                usedNewTokens.add(i);
                break;
            }
        }
    }
    
    // Second pass: handle remaining tokens
    for (let i = 0; i < newTokens.length; i++) {
        if (!usedNewTokens.has(i)) {
            diff[i] = { 
                type: 'added', 
                text: newTokens[i].value 
            };
        }
    }
    
    // Fill in any gaps with removed tokens
    for (let i = 0; i < oldTokens.length; i++) {
        if (!usedOldTokens.has(i)) {
            diff.splice(i, 0, { 
                type: 'removed', 
                text: oldTokens[i].value 
            });
        }
    }
    
    const result = diff.filter(Boolean); // Remove any undefined entries
        return result;
} 