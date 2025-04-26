import * as fs from "fs";
import { promisify } from "util";
import { parse } from "css";
import { glob } from "glob";
import * as readline from "readline";
import { logger } from "../src/utils/logger";

logger.enable();

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Parse command line arguments
const args = process.argv.slice(2);
const cssFile = args[0];
const searchDir = args[1] || "src";

if (!cssFile) {
	logger.logToConsole("Please provide a CSS file path as the first argument");
	process.exit(1);
}

// Extract base class name from a selector (handling pseudo-classes)
function getBaseClassName(selector: string): string | null {
	// Remove pseudo-classes and pseudo-elements
	selector = selector.replace(/:[^:]+/g, "");
	selector = selector.replace(/::[^:]+/g, "");

	// Extract base class name
	const match = selector.match(/\.([\w-]+)/);
	return match ? match[1] : null;
}

// Find all class references in a string
function findClassReferences(content: string): string[] {
	const foundClasses = new Set<string>();

	// Just search for the class name directly in the code
	// This will catch all usages, whether in className, classList, or other contexts
	const classPattern = /["'`\s]([a-zA-Z][\w-]*)(?=["'`\s])/g;

	let match: RegExpExecArray | null;
	while ((match = classPattern.exec(content)) !== null) {
		const className = match[1];
		if (className && className.length > 0) {
			foundClasses.add(className);
		}
	}

	return Array.from(foundClasses);
}

async function findUsedClasses(searchDir: string): Promise<Set<string>> {
	const files = await glob(`${searchDir}/**/*.{js,ts,jsx,tsx,html}`);
	const usedClasses = new Set<string>();

	for (const file of files) {
		const content = await readFile(file, "utf-8");
		const fileClasses = findClassReferences(content);
		fileClasses.forEach((cls) => usedClasses.add(cls));
	}

	return usedClasses;
}

// Types for CSS AST nodes (since the 'css' package types are not always complete)
interface CSSDeclaration {
	property: string;
	value: string;
}

interface CSSRuleNode {
	type: string;
	selectors?: string[];
	declarations?: CSSDeclaration[];
	rules?: CSSRuleNode[];
	media?: string;
	comment?: string;
	[key: string]: unknown; // for any extra properties
}

async function parseCSS(cssFile: string): Promise<CSSRuleNode[]> {
	const content = await readFile(cssFile, "utf-8");
	const ast = parse(content);
	// The 'stylesheet' property contains the rules array
	if (ast.stylesheet && Array.isArray(ast.stylesheet.rules)) {
		// Check that every rule is an object with a 'type' property (basic type guard)
		return ast.stylesheet.rules.filter((rule: unknown): rule is CSSRuleNode =>
			typeof rule === 'object' && rule !== null && 'type' in rule
		);
	}
	return [];
}

function findUnusedClasses(
	rules: CSSRuleNode[],
	usedClasses: Set<string>
): { unusedRules: CSSRuleNode[]; usedRules: CSSRuleNode[] } {
	const unusedRules: CSSRuleNode[] = [];
	const usedRules: CSSRuleNode[] = [];

	(rules || []).forEach((rule) => {
		if (rule.type === 'rule') {
			const isUsed = (rule.selectors ?? []).some((selector) => {
				// Handle utility classes and simple selectors
				const baseClass = getBaseClassName(selector);
				if (baseClass && usedClasses.has(baseClass)) {
					return true;
				}

				// Handle complex selectors with multiple classes
				const classMatches = selector.match(/\.[a-zA-Z][\w-]*/g);
				if (classMatches) {
					return classMatches.some((cls) =>
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
		} else if (rule.type === 'media' && Array.isArray(rule.rules)) {
			// Recursively check media rules
			const { unusedRules: unusedMedia, usedRules: usedMedia } = findUnusedClasses(rule.rules, usedClasses);
			if (usedMedia.length > 0) {
				// Only keep media if it has used rules
				usedRules.push({ ...rule, rules: usedMedia });
			}
			if (unusedMedia.length > 0) {
				unusedRules.push(...unusedMedia);
			}
		} else {
			// Keep non-rule nodes (like @keyframes, comments, etc.)
			usedRules.push(rule);
		}
	});

	return { unusedRules, usedRules };
}

async function main(): Promise<void> {
	try {
		logger.logToConsole("🔍 Analyzing CSS usage...");

		const usedClasses = await findUsedClasses(searchDir);
		logger.logToConsole(`Found ${usedClasses.size} unique classes in use`);
		logger.logToConsole("Used classes:", Array.from(usedClasses).sort().join(", "));

		const rules = await parseCSS(cssFile);
		const { unusedRules, usedRules } = findUnusedClasses(rules, usedClasses);

		if (unusedRules.length > 0) {
			logger.logToConsole("\n❌ Unused CSS rules:");
			unusedRules.forEach((rule) => {
				if (rule.selectors) {
					logger.logToConsole(`  - ${rule.selectors.join(", ")}`);
				} else if (rule.type === "media" && rule.rules) {
					logger.logToConsole(`  - @media ${rule.media} (contains unused rules)`);
				}
			});

			logger.logToConsole(`\n📊 Results:`);
			logger.logToConsole(`- Total CSS rules: ${rules.length}`);
			logger.logToConsole(`- Unused rules: ${unusedRules.length}`);
			logger.logToConsole(`- Used rules: ${usedRules.length}`);

			const response = await new Promise<boolean>((resolve) => {
				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout,
				});
				rl.question(
					"\nDo you want to remove these unused rules? (y/n): ",
					(answer: string) => {
						rl.close();
						resolve(answer.trim().toLowerCase() === "y");
					}
				);
			});

			if (response) {
				// Create new CSS with only used rules
				const newCSS = usedRules
					.map((rule) => {
						if (rule.type === 'comment' && typeof rule.comment === "string") {
							return `/*${rule.comment}*/`;
						}

						if (rule.type === 'media' && Array.isArray(rule.rules)) {
							const mediaRules = rule.rules
								.map((mediaRule) => {
									const declarations = (mediaRule.declarations ?? [])
										.map((decl) => `  ${decl.property}: ${decl.value};`)
										.join('\n');
									return `  ${(mediaRule.selectors ?? []).join(', ')} {\n${declarations}\n  }`;
								})
								.join('\n\n');
							return `@media ${rule.media} {\n${mediaRules}\n}`;
						}

						const declarations = (rule.declarations ?? [])
							.map((decl) => `  ${decl.property}: ${decl.value};`)
							.join('\n');
						return `${(rule.selectors ?? []).join(', ')} {\n${declarations}\n}`;
					})
					.join('\n\n');

				await writeFile(cssFile, newCSS);
				logger.logToConsole("\n✅ Successfully removed unused CSS rules!");
			}
		} else {
			logger.logToConsole("\n✅ No unused CSS rules found!");
		}
	} catch (error) {
		if (error instanceof Error) {
			logger.logToConsole("❌ Error:", error.message);
		} else {
			logger.logToConsole("❌ Error:", error);
		}
		process.exit(1);
	}
}

main();
