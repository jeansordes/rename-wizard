#!/usr/bin/env node

import { parse, Declaration } from 'css';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import * as readline from 'readline';
import * as process from 'node:process';
import * as console from 'node:console';
import { resolve } from 'path';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query: string): Promise<string> => new Promise((resolve) => rl.question(query, resolve));

const SEPARATOR = '─'.repeat(80);

// Type for a CSS Rule node (from 'css' package)
type CssRule = {
    type: 'rule';
    selectors: string[];
    declarations: Declaration[];
};

// Type guard for CSS Rule nodes
function isCssRule(node: unknown): node is CssRule {
    if (typeof node !== 'object' || node === null) return false;
    const maybeRule:Partial<CssRule> = node;
    if (
        maybeRule.type !== 'rule' ||
        !Array.isArray(maybeRule.selectors) ||
        !Array.isArray(maybeRule.declarations)
    ) {
        return false;
    }
    // Optionally, check that selectors are strings and declarations are objects
    return maybeRule.selectors.every(s => typeof s === 'string') &&
        maybeRule.declarations.every(d => typeof d === 'object' && d !== null);
}

function isClassUsedForSelection(content: string, className: string): boolean {
    const normalizedClassName = normalizeClassName(className);
    const selectionPatterns = [
        `querySelector\\(['"]\\.${normalizedClassName}['"]\\)`,
        `querySelectorAll\\(['"]\\.${normalizedClassName}['"]\\)`,
        `getElementsByClassName\\(['"]${normalizedClassName}['"]\\)`,
        `classList\\.(contains|add|remove|toggle)\\(['"]${normalizedClassName}['"]\\)`
    ];

    return selectionPatterns.some(pattern =>
        new RegExp(pattern).test(content)
    );
}

function isActualClassUsage(line: string, className: string): boolean {
    // Skip comments
    if (line.trim().startsWith('//')) return false;

    // Normalize the class name to handle nested selectors
    const normalizedClassName = normalizeClassName(className);

    // Look for actual class usage patterns
    const classUsagePatterns = [
        `class\\s*=\\s*['"][^'"]*${normalizedClassName}[^'"]*['"]`,
        `className\\s*=\\s*['"][^'"]*${normalizedClassName}[^'"]*['"]`,
        `cls:\\s*\\[[^\\]]*['"]${normalizedClassName}['"][^\\]]*\\]`,
        `cls:\\s*['"]${normalizedClassName}['"]`,
        `querySelector\\(['"]\\.${normalizedClassName}['"]\\)`,
        `querySelectorAll\\(['"]\\.${normalizedClassName}['"]\\)`,
        `getElementsByClassName\\(['"]${normalizedClassName}['"]\\)`,
        `classList\\.(contains|add|remove|toggle)\\(['"]${normalizedClassName}['"]\\)`
    ];

    return classUsagePatterns.some(pattern => new RegExp(pattern).test(line));
}

function normalizeClassName(className: string): string {
    // Handle nested selectors (e.g., "notice.batch-rename-notification")
    return className.split(/[.#\s]/)[0];
}

async function main(): Promise<void> {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: npm run refactor-css-to-utility -- <class-css-file> <utility-css-file> [project-code-dir] [--batch]');
        console.error('Options:');
        console.error('  --batch, -b    Automatically accept all refactoring suggestions');
        process.exit(1);
    }

    // Parse arguments
    let batchMode = false;
    const filteredArgs = args.filter((arg: string) => {
        if (arg === '--batch' || arg === '-b') {
            batchMode = true;
            return false;
        }
        return true;
    });

    const [classCssFile, utilityCssFile, projectCodeDir = 'src'] = filteredArgs;

    // Read and parse CSS files
    const classCss = readFileSync(classCssFile, 'utf8');
    const utilityCss = readFileSync(utilityCssFile, 'utf8');

    const classAst = parse(classCss);
    const utilityAst = parse(utilityCss);

    // Count total number of classes to process
    const totalClasses = classAst.stylesheet
        ? classAst.stylesheet.rules.filter(isCssRule).length
        : 0;
    let processedClasses = 0;

    // Extract utility classes
    const utilityClasses = new Map<string, Declaration[]>();
    if (utilityAst.stylesheet) {
        for (const rule of utilityAst.stylesheet.rules) {
            if (isCssRule(rule)) {
                for (const selector of rule.selectors) {
                    if (selector.startsWith('.')) {
                        const className = selector.slice(1);
                        utilityClasses.set(className, rule.declarations);
                    }
                }
            }
        }
    }

    // Keep track of refactored classes to remove from CSS
    const refactoredClasses = new Set<string>();

    // Process each class block
    if (classAst.stylesheet) {
        for (const rule of classAst.stylesheet.rules) {
            if (!isCssRule(rule)) continue;

            processedClasses++;
            const className = rule.selectors[0].slice(1); // Remove the dot
            const progress = Math.round((processedClasses / totalClasses) * 100);
            console.log(`\n${SEPARATOR}`);
            console.log(`Processing class ${processedClasses}/${totalClasses} (${progress}%): ${className}`);
            console.log(SEPARATOR);

            // Find matching utility classes
            const matchingUtilities: string[] = [];
            for (const [utilClass, declarations] of utilityClasses.entries()) {
                if (declarations.some((decl) =>
                    rule.declarations.some((classDecl) =>
                        classDecl.property === decl.property &&
                        classDecl.value === decl.value
                    )
                )) {
                    matchingUtilities.push(utilClass);
                }
            }

            if (matchingUtilities.length > 0) {
                console.log(`Found matching utility classes: ${matchingUtilities.join(', ')}`);

                // Find usages in project code
                const files = await glob(`${projectCodeDir}/**/*.{js,jsx,ts,tsx,html}`);
                const usages: { file: string, line: number, content: string }[] = [];

                for (const file of files) {
                    const content = readFileSync(file, 'utf8');
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        if (isActualClassUsage(line, className)) {
                            usages.push({
                                file,
                                line: index + 1,
                                content: line.trim()
                            });
                        }
                    });
                }

                if (usages.length > 0) {
                    console.log('\nFound usages:');
                    usages.forEach(usage => {
                        console.log(`${usage.file}:${usage.line}`);
                        console.log(`  ${usage.content}`);
                    });

                    // Skip if the matching utility is the same as the original class
                    if (matchingUtilities.length === 1 && matchingUtilities[0] === normalizeClassName(className)) {
                        console.log(`\n⚠ Skipping: Class "${className}" matches itself - no changes needed`);
                        continue;
                    }

                    console.log(`\nProposed refactor: Replace ${className} with ${matchingUtilities.join(' ')}`);

                    let answer: string = 'a'; // Default to accept in batch mode
                    if (!batchMode) {
                        answer = await question('Do you want to: (a) accept, (b) skip, or (c) exit? ');
                    } else {
                        console.log('Automatically accepting in batch mode...');
                    }

                    if (answer.toLowerCase() === 'a') {
                        let allChangesSuccessful = true;
                        const processedFiles = new Set<string>();

                        for (const usage of usages) {
                            const absolutePath = resolve(process.cwd(), usage.file);

                            if (processedFiles.has(absolutePath)) continue;
                            processedFiles.add(absolutePath);

                            console.log(`\nUpdating file: ${absolutePath}`);

                            let content = readFileSync(absolutePath, 'utf8');
                            const originalContent = content;

                            // Check if class is used for selection
                            const isSelectionClass = isClassUsedForSelection(content, className);
                            if (isSelectionClass) {
                                console.log(`⚠ Class "${className}" is used for selection - will be kept alongside utility classes`);
                            }

                            // Handle HTML-style class assignments
                            content = content.replace(
                                new RegExp(`class\\s*=\\s*['"][^'"]*${normalizeClassName(className)}[^'"]*['"]`, 'g'),
                                (match: string): string => {
                                    const quote = match.includes('"') ? '"' : "'";
                                    const classes = match
                                        .split(quote)[1]
                                        .split(' ')
                                        .filter(c => c !== normalizeClassName(className) && c !== `[${normalizeClassName(className)}` && c !== normalizeClassName(className) + ']');

                                    if (isSelectionClass) {
                                        return `class=${quote}${[className, ...classes, ...matchingUtilities].join(' ')}${quote}`;
                                    }

                                    return `class=${quote}${classes.concat(matchingUtilities).join(' ')}${quote}`;
                                }
                            );

                            // Handle JavaScript-style class assignments
                            content = content.replace(
                                new RegExp(`className\\s*=\\s*['"][^'"]*${normalizeClassName(className)}[^'"]*['"]`, 'g'),
                                (match: string): string => {
                                    const quote = match.includes('"') ? '"' : "'";
                                    const classes = match
                                        .split(quote)[1]
                                        .split(' ')
                                        .filter(c => c !== normalizeClassName(className) && c !== `[${normalizeClassName(className)}` && c !== normalizeClassName(className) + ']');

                                    if (isSelectionClass) {
                                        return `className=${quote}${[className, ...classes, ...matchingUtilities].join(' ')}${quote}`;
                                    }

                                    return `className=${quote}${classes.concat(matchingUtilities).join(' ')}${quote}`;
                                }
                            );

                            // Handle Obsidian's createDiv with cls array
                            content = content.replace(
                                new RegExp(`cls:\\s*\\[[^\\]]*['"]${normalizeClassName(className)}['"][^\\]]*\\]`, 'g'),
                                (match: string): string => {
                                    const existingClasses = match
                                        .slice(5, -1) // Remove 'cls:[' and ']'
                                        .split(',')
                                        .map(c => c.trim().replace(/['"]/g, ''))
                                        .filter(c => c !== normalizeClassName(className) && c !== `[${normalizeClassName(className)}` && c !== normalizeClassName(className) + ']');

                                    if (isSelectionClass) {
                                        return `cls: [${[`'${className}'`, ...existingClasses, ...matchingUtilities.map(c => `'${c}'`)].join(', ')}]`;
                                    }

                                    return `cls: [${existingClasses.concat(matchingUtilities).map(c => `'${c}'`).join(', ')}]`;
                                }
                            );

                            // Handle classList operations
                            content = content.replace(
                                new RegExp(`classList\\.(add|remove|toggle|contains)\\(['"]${normalizeClassName(className)}['"]\\)`, 'g'),
                                (match: string): string => {
                                    if (isSelectionClass) {
                                        return match;
                                    }
                                    return `classList.${match.split('(')[0]}('${matchingUtilities.join(' ')}')`;
                                }
                            );

                            // In the class replacement section, add handling for cls: 'class-name' pattern
                            content = content.replace(
                                new RegExp(`cls:\\s*['"]${normalizeClassName(className)}['"]`, 'g'),
                                (): string => {
                                    if (isSelectionClass) {
                                        return `cls: '${[className, ...matchingUtilities].join(' ')}'`;
                                    }
                                    return `cls: '${matchingUtilities.join(' ')}'`;
                                }
                            );

                            if (content !== originalContent) {
                                try {
                                    writeFileSync(absolutePath, content);
                                    console.log('✓ File updated successfully');
                                } catch (error) {
                                    console.error('✗ Error updating file:', error.message ?? error);
                                    allChangesSuccessful = false;
                                }
                            } else {
                                console.log('⚠ No changes were made to the file - this might indicate a syntax error in the class usage');
                                allChangesSuccessful = false;
                            }
                        }

                        if (allChangesSuccessful) {
                            console.log('Refactor applied successfully!');
                            refactoredClasses.add(className);

                            // Update CSS file immediately after successful refactor
                            console.log('\nUpdating CSS file...');
                            const cssContent = readFileSync(classCssFile, 'utf8');
                            const cssLines = cssContent.split('\n');
                            let newCssContent = '';
                            let skipBlock = false;
                            let blockDepth = 0;
                            let currentClass = '';
                            let lastLineWasEmpty = false;

                            for (const line of cssLines) {
                                const trimmedLine = line.trim();

                                // Check for class definition start
                                if (trimmedLine.startsWith('.')) {
                                    currentClass = trimmedLine.slice(1).split(/[,\s{]/)[0];
                                }

                                if (skipBlock) {
                                    if (trimmedLine.includes('{')) blockDepth++;
                                    if (trimmedLine.includes('}')) {
                                        blockDepth--;
                                        if (blockDepth === 0) {
                                            skipBlock = false;
                                            currentClass = '';
                                        }
                                    }
                                    continue;
                                }

                                // Skip the entire block if the class has been refactored
                                if (refactoredClasses.has(currentClass)) {
                                    if (trimmedLine.includes('{')) {
                                        skipBlock = true;
                                        blockDepth = 1;
                                        continue;
                                    }
                                }

                                // Handle newlines
                                if (trimmedLine === '') {
                                    if (!lastLineWasEmpty) {
                                        newCssContent += '\n';
                                        lastLineWasEmpty = true;
                                    }
                                } else {
                                    newCssContent += line + '\n';
                                    lastLineWasEmpty = false;
                                }
                            }

                            try {
                                writeFileSync(classCssFile, newCssContent.trim() + '\n');
                                console.log('✓ CSS file updated successfully');
                            } catch (error) {
                                console.error('✗ Error updating CSS file:', error.message ?? error);
                            }
                        }
                    } else if (answer.toLowerCase() === 'c') {
                        console.log('Exiting...');
                        process.exit(0);
                    }
                } else {
                    console.log('No usages found in project code.');
                }
            } else {
                console.log('No matching utility classes found.');
            }
        }
    }

    rl.close();
}

main().catch(console.error);
