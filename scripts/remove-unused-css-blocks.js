#!/usr/bin/env node

/* global process, console */

import fs from "fs";
import { promisify } from "util";
import { parse } from "css";
import { glob } from "glob";
import readline from "readline";

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Parse command line arguments
const args = process.argv.slice(2);
const cssFile = args[0];
const searchDir = args[1] || "src";

if (!cssFile) {
	console.error("Please provide a CSS file path as the first argument");
	process.exit(1);
}

// Extract base class name from a selector (handling pseudo-classes)
function getBaseClassName(selector) {
	// Remove pseudo-classes and pseudo-elements
	selector = selector.replace(/:[^:]+/g, "");
	selector = selector.replace(/::[^:]+/g, "");

	// Extract base class name
	const match = selector.match(/\.([\w-]+)/);
	return match ? match[1] : null;
}

// Find all class references in a string
function findClassReferences(content) {
	const foundClasses = new Set();

	// Just search for the class name directly in the code
	// This will catch all usages, whether in className, classList, or other contexts
	const classPattern = /["'`\s]([a-zA-Z][\w-]*)(?=["'`\s])/g;

	let match;
	while ((match = classPattern.exec(content)) !== null) {
		const className = match[1];
		if (className && className.length > 0) {
			foundClasses.add(className);
		}
	}

	return Array.from(foundClasses);
}

async function findUsedClasses(searchDir) {
	const files = await glob(`${searchDir}/**/*.{js,ts,jsx,tsx,html}`);
	const usedClasses = new Set();

	for (const file of files) {
		const content = await readFile(file, "utf-8");
		const fileClasses = findClassReferences(content);
		fileClasses.forEach((cls) => usedClasses.add(cls));
	}

	return usedClasses;
}

async function parseCSS(cssFile) {
	const content = await readFile(cssFile, "utf-8");
	const ast = parse(content);
	return ast;
}

function findUnusedClasses(ast, usedClasses) {
	const unusedRules = [];
	const usedRules = [];

	ast.stylesheet.rules.forEach(rule => {
		if (rule.type === 'rule') {
			const isUsed = rule.selectors.some(selector => {
				// Handle utility classes and simple selectors
				const baseClass = getBaseClassName(selector);
				if (baseClass && usedClasses.has(baseClass)) {
					return true;
				}

				// Handle complex selectors with multiple classes
				const classMatches = selector.match(/\.[a-zA-Z][\w-]*/g);
				if (classMatches) {
					return classMatches.some(cls => 
						usedClasses.has(cls.substring(1))
					);
				}

				return false;
			});

			if (isUsed) {
				usedRules.push(rule);
			} else {
				unusedRules.push(rule);
			}
		} else {
			// Keep non-rule nodes (like @media, @keyframes, etc.)
			usedRules.push(rule);
		}
	});

	return { unusedRules, usedRules };
}

async function main() {
	try {
		console.log("🔍 Analyzing CSS usage...");

		const usedClasses = await findUsedClasses(searchDir);
		console.log(`Found ${usedClasses.size} unique classes in use`);
		console.log("Used classes:", Array.from(usedClasses).sort().join(", "));

		const ast = await parseCSS(cssFile);
		const { unusedRules, usedRules } = findUnusedClasses(ast, usedClasses);

		if (unusedRules.length > 0) {
			console.log("\n❌ Unused CSS rules:");
			unusedRules.forEach((rule) => {
				console.log(`  - ${rule.selectors.join(", ")}`);
			});

			console.log(`\n📊 Results:`);
			console.log(`- Total CSS rules: ${ast.stylesheet.rules.length}`);
			console.log(`- Unused rules: ${unusedRules.length}`);
			console.log(`- Used rules: ${usedRules.length}`);

			const response = await new Promise((resolve) => {
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				rl.question(
					"\nDo you want to remove these unused rules? (y/n): ",
					(answer) => {
						rl.close();
						resolve(answer.toLowerCase() === "y");
					}
				);
			});

			if (response) {
				// Create new CSS with only used rules
				const newCSS = usedRules
					.map((rule) => {
						if (rule.type === 'comment') {
							return rule.comment;
						}
						
						if (rule.type === 'media') {
							const mediaRules = rule.rules
								.map(mediaRule => {
									const declarations = mediaRule.declarations
										.map(decl => `  ${decl.property}: ${decl.value};`)
										.join('\n');
									return `  ${mediaRule.selectors.join(', ')} {\n${declarations}\n  }`;
								})
								.join('\n\n');
							return `@media ${rule.media} {\n${mediaRules}\n}`;
						}

						const declarations = rule.declarations
							.map(decl => `  ${decl.property}: ${decl.value};`)
							.join('\n');
						return `${rule.selectors.join(', ')} {\n${declarations}\n}`;
					})
					.join('\n\n');

				await writeFile(cssFile, newCSS);
				console.log("\n✅ Successfully removed unused CSS rules!");
			}
		} else {
			console.log("\n✅ No unused CSS rules found!");
		}
	} catch (error) {
		console.error("❌ Error:", error.message);
		process.exit(1);
	}
}

main();
