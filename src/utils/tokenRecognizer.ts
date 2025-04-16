import { Token, TokenType } from '../types';

/**
 * Recognizes and extracts tokens from filenames
 */
export class TokenRecognizer {
    private static readonly PATTERNS = {
        // Matches ISO dates: YYYY-MM-DD
        DATE_ISO: /\b(\d{4}-\d{2}-\d{2})\b/,
        // Matches version numbers: v1.2.3 or 1.2.3
        VERSION: /\b(v\d+(\.\d+)*|\d+(\.\d+)+)\b/,
        // Matches tags: #tag or [tag]
        TAG: /(?:#[\w-]+|\[[\w-]+\])/,
        // Matches common status indicators
        STATUS: /\b(draft|final|wip|todo|done|archived)\b/i,
        // Matches common separators
        SEPARATOR: /[-_.]/,
        // Matches words (including CamelCase splitting)
        WORD: /[A-Z]?[a-z]+|[A-Z]{2,}(?=[A-Z][a-z]|\d|\W|$)|\d+/,
        // Matches numbers
        NUMBER: /\d+/,
        // Matches special characters
        SPECIAL: /[^a-zA-Z0-9._\-\s]/
    };

    /**
     * Tokenize a filename into meaningful parts
     * @param filename The filename to tokenize (without path)
     * @returns Array of tokens
     */
    public static tokenize(filename: string): Token[] {
                
        const tokens: Token[] = [];
        let remaining = filename;
        let position = 0;

        while (remaining.length > 0) {
            const token = this.findNextToken(remaining, position);
            if (!token) {
                // Handle unmatched character
                tokens.push({
                    type: TokenType.OTHER,
                    value: remaining[0],
                    position: position
                });
                remaining = remaining.slice(1);
                position += 1;
                continue;
            }

            tokens.push(token);
            remaining = remaining.slice(token.value.length);
            position += token.value.length;
        }

        const result = this.mergeAdjacentTokens(tokens);
                return result;
    }

    /**
     * Find the next token in the remaining text
     */
    private static findNextToken(text: string, startPosition: number): Token | null {
        // Try to match each pattern
        for (const [patternName, pattern] of Object.entries(this.PATTERNS)) {
            const match = text.match(pattern);
            if (match && match.index === 0) {
                return {
                    type: this.getTokenType(patternName),
                    value: match[0],
                    position: startPosition
                };
            }
        }

        return null;
    }

    /**
     * Convert pattern name to token type
     */
    private static getTokenType(patternName: string): TokenType {
        switch (patternName) {
            case 'DATE_ISO': return TokenType.DATE;
            case 'VERSION': return TokenType.VERSION;
            case 'TAG': return TokenType.TAG;
            case 'STATUS': return TokenType.STATUS;
            case 'SEPARATOR': return TokenType.SEPARATOR;
            case 'WORD': return TokenType.WORD;
            case 'NUMBER': return TokenType.NUMBER;
            case 'SPECIAL': return TokenType.SPECIAL;
            default: return TokenType.OTHER;
        }
    }

    /**
     * Merge adjacent tokens that should be treated as one
     */
    private static mergeAdjacentTokens(tokens: Token[]): Token[] {
        const merged: Token[] = [];
        let current: Token | null = null;

        for (const token of tokens) {
            if (!current) {
                current = token;
                continue;
            }

            // Merge rules
            if (this.shouldMergeTokens(current, token)) {
                current = {
                    type: current.type,
                    value: current.value + token.value,
                    position: current.position
                };
            } else {
                merged.push(current);
                current = token;
            }
        }

        if (current) {
            merged.push(current);
        }

        return merged;
    }

    /**
     * Determine if two tokens should be merged
     */
    private static shouldMergeTokens(token1: Token, token2: Token): boolean {
        // Merge adjacent separators
        if (token1.type === TokenType.SEPARATOR && token2.type === TokenType.SEPARATOR) {
            return true;
        }

        // Merge numbers and dots in version numbers
        if (token1.type === TokenType.VERSION && 
            (token2.type === TokenType.SEPARATOR || token2.type === TokenType.VERSION)) {
            return true;
        }

        return false;
    }
} 