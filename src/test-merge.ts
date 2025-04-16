import { mergeFilenames } from './utils/nameUtils';

// Test cases with different scenarios
const testCases = [
    {
        description: "Basic merge with simple filenames",
        currentPath: "notes/my-note.md",
        suggestionPath: "ideas/great-idea.md",
        template: "${suggestion.folderPath}/${suggestion.basename}.${current.basename}.${current.extension}"
    },
    {
        description: "Files in same folder",
        currentPath: "notes/current-file.md",
        suggestionPath: "notes/suggested-file.txt",
        template: "${suggestion.basename}.${current.basename}.${suggestion.extension}"
    },
    {
        description: "Complex folder structure",
        currentPath: "projects/2024/Q1/draft.md",
        suggestionPath: "archive/2023/Q4/final-version.md",
        template: "${suggestion.folderPath}/${current.basename}-${suggestion.basename}.${current.extension}"
    },
    {
        description: "Different file extensions",
        currentPath: "documents/report.pdf",
        suggestionPath: "templates/template.docx",
        template: "${current.folderPath}/${suggestion.basename}-${current.basename}.${current.extension}"
    },
    {
        description: "Using only suggestion components",
        currentPath: "old/outdated.md",
        suggestionPath: "new/updated-version.md",
        template: "${suggestion.folderPath}/${suggestion.basename}.${suggestion.extension}"
    },
    {
        description: "Using only current components",
        currentPath: "important/critical-doc.md",
        suggestionPath: "archive/old-version.md",
        template: "${current.folderPath}/${current.basename}.${current.extension}"
    },
    {
        description: "Complex naming pattern",
        currentPath: "projects/project-x/draft-v1.md",
        suggestionPath: "templates/standard-template.md",
        template: "${suggestion.folderPath}/[${current.basename}]-based-on-${suggestion.basename}.${current.extension}"
    },
    {
        description: "Nested folders with spaces",
        currentPath: "My Documents/Current Work/draft notes.md",
        suggestionPath: "Reference Material/Best Practices/final guide.md",
        template: "${suggestion.folderPath}/${suggestion.basename} (from ${current.basename}).${current.extension}"
    },
    {
        description: "Files with dots in names",
        currentPath: "notes/version.1.2.md",
        suggestionPath: "releases/release.2.0.md",
        template: "${current.folderPath}/${suggestion.basename}.based.on.${current.basename}.${current.extension}"
    },
    {
        description: "Using default template",
        currentPath: "current/file.md",
        suggestionPath: "suggestion/better-name.md",
        template: "${suggestion.folderPath}/${suggestion.basename}.${current.basename}.${current.extension}"
    }
];

// Function to run tests and format output
function runTests(): void {
    console.log("Running merge filename tests...\n");
    
    testCases.forEach((test, index) => {
        console.log(`Test Case ${index + 1}: ${test.description}`);
        console.log("Current Path:     ", test.currentPath);
        console.log("Suggestion Path:  ", test.suggestionPath);
        console.log("Template:         ", test.template);
        
        const result = mergeFilenames(test.currentPath, test.suggestionPath, test.template);
        console.log("Result:           ", result);
        console.log("----------------------------------------\n");
    });
}

// Run the tests
runTests(); 