#!/usr/bin/env node

import { parse } from 'css';
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import readline from 'readline';
import process from 'node:process';
import console from 'node:console';
import { resolve } from 'path';

// @ts-ignore
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const SEPARATOR = '─'.repeat(80);

async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node refactor-css-to-utility.js <class-css-file> <utility-css-file> [project-code-dir]');
        process.exit(1);
    }

    const [classCssFile, utilityCssFile, projectCodeDir = 'src'] = args;

    // Read and parse CSS files
    const classCss = readFileSync(classCssFile, 'utf8');
    const utilityCss = readFileSync(utilityCssFile, 'utf8');

    const classAst = parse(classCss);
    const utilityAst = parse(utilityCss);

    // Extract utility classes
    const utilityClasses = new Map();
    utilityAst.stylesheet.rules.forEach(rule => {
        if (rule.type === 'rule') {
            rule.selectors.forEach(selector => {
                if (selector.startsWith('.')) {
                    const className = selector.slice(1);
                    utilityClasses.set(className, rule.declarations);
                }
            });
        }
    });

    // Keep track of refactored classes to remove from CSS
    const refactoredClasses = new Set();

    // Process each class block
    for (const rule of classAst.stylesheet.rules) {
        if (rule.type !== 'rule') continue;

        const className = rule.selectors[0].slice(1); // Remove the dot
        console.log(`\n${SEPARATOR}`);
        console.log(`Processing class: ${className}`);
        console.log(SEPARATOR);

        // Find matching utility classes
        const matchingUtilities = [];
        for (const [utilClass, declarations] of utilityClasses.entries()) {
            if (declarations.some(decl => 
                rule.declarations.some(classDecl => 
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
            const usages = [];
            
            for (const file of files) {
                const content = readFileSync(file, 'utf8');
                const lines = content.split('\n');
                lines.forEach((line, index) => {
                    if (line.includes(className)) {
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
                console.log(`\nProposed refactor: Replace ${className} with ${matchingUtilities.join(' ')}`);

                const answer = await question('Do you want to: (a) accept, (b) skip, or (c) exit? ');
                
                if (answer.toLowerCase() === 'a') {
                    // Apply the refactor
                    for (const usage of usages) {
                        const absolutePath = resolve(process.cwd(), usage.file);
                        console.log(`\nAttempting to update file: ${absolutePath}`);
                        
                        let content = readFileSync(absolutePath, 'utf8');
                        const originalContent = content;
                        
                        // Handle HTML-style class assignments
                        content = content.replace(
                            new RegExp(`class\\s*=\\s*['"][^'"]*${className}[^'"]*['"]`, 'g'),
                            match => {
                                const quote = match.includes('"') ? '"' : "'";
                                const classes = match
                                    .split(quote)[1]
                                    .split(' ')
                                    .filter(c => c !== className)
                                    .concat(matchingUtilities);
                                return `class=${quote}${classes.join(' ')}${quote}`;
                            }
                        );

                        // Handle JavaScript-style class assignments
                        content = content.replace(
                            new RegExp(`className\\s*=\\s*['"][^'"]*${className}[^'"]*['"]`, 'g'),
                            match => {
                                const quote = match.includes('"') ? '"' : "'";
                                const classes = match
                                    .split(quote)[1]
                                    .split(' ')
                                    .filter(c => c !== className)
                                    .concat(matchingUtilities);
                                return `className=${quote}${classes.join(' ')}${quote}`;
                            }
                        );

                        // Handle Obsidian's createDiv with cls array
                        content = content.replace(
                            new RegExp(`cls:\\s*\\[[^\\]]*['"]${className}['"][^\\]]*\\]`, 'g'),
                            match => {
                                const classes = match
                                    .slice(5, -1) // Remove 'cls:[' and ']'
                                    .split(',')
                                    .map(c => c.trim().replace(/['"]/g, ''))
                                    .filter(c => c !== className)
                                    .concat(matchingUtilities);
                                return `cls: [${classes.map(c => `'${c}'`).join(', ')}]`;
                            }
                        );

                        if (content !== originalContent) {
                            try {
                                writeFileSync(absolutePath, content);
                                console.log('✓ File updated successfully');
                            } catch (error) {
                                console.error('✗ Error updating file:', error.message);
                            }
                        } else {
                            console.log('⚠ No changes were made to the file');
                        }
                    }
                    console.log('Refactor applied successfully!');
                    refactoredClasses.add(className);
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

    // Update the original CSS file to remove refactored classes
    if (refactoredClasses.size > 0) {
        console.log('\nUpdating original CSS file to remove refactored classes...');
        const cssContent = readFileSync(classCssFile, 'utf8');
        const cssLines = cssContent.split('\n');
        let newCssContent = '';
        let skipNextBlock = false;

        for (const line of cssLines) {
            if (skipNextBlock) {
                if (line.trim() === '}') {
                    skipNextBlock = false;
                }
                continue;
            }

            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('.')) {
                const className = trimmedLine.slice(1).split(/[ ,{]/)[0];
                if (refactoredClasses.has(className)) {
                    skipNextBlock = true;
                    continue;
                }
            }
            newCssContent += line + '\n';
        }

        try {
            writeFileSync(classCssFile, newCssContent);
            console.log('✓ Original CSS file updated successfully');
            console.log(`Removed ${refactoredClasses.size} refactored classes`);
        } catch (error) {
            console.error('✗ Error updating CSS file:', error.message);
        }
    }

    rl.close();
}

main().catch(console.error); 