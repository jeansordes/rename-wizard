"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeFilenames = exports.parseFilePath = void 0;
/**
 * Parse a file path into its components
 */
function parseFilePath(path) {
    var lastSlashIndex = path.lastIndexOf('/');
    var folderPath = lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex) : '';
    var filename = lastSlashIndex !== -1 ? path.substring(lastSlashIndex + 1) : path;
    var lastDotIndex = filename.lastIndexOf('.');
    var basename = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename;
    var extension = lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1) : '';
    return {
        folderPath: folderPath,
        basename: basename,
        extension: extension
    };
}
exports.parseFilePath = parseFilePath;
/**
 * Merge two filenames using a template
 * @param currentPath Current file path
 * @param suggestionPath Suggestion file path
 * @param template Template string for merging
 * @returns Merged filename
 */
function mergeFilenames(currentPath, suggestionPath, template) {
    var current = parseFilePath(currentPath);
    var suggestion = parseFilePath(suggestionPath);
    // Replace template variables with actual values
    return template
        .replace(/\${suggestion\.folderPath}/g, suggestion.folderPath)
        .replace(/\${suggestion\.basename}/g, suggestion.basename)
        .replace(/\${suggestion\.extension}/g, suggestion.extension)
        .replace(/\${current\.folderPath}/g, current.folderPath)
        .replace(/\${current\.basename}/g, current.basename)
        .replace(/\${current\.extension}/g, current.extension);
}
exports.mergeFilenames = mergeFilenames;
