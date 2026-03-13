"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatJson = formatJson;
exports.minifyJson = minifyJson;
exports.escapeJson = escapeJson;
exports.unescapeJson = unescapeJson;
function formatJson(input, indent = 2) {
    try {
        return JSON.stringify(JSON.parse(input), null, indent);
    }
    catch {
        return input;
    }
}
function minifyJson(input) {
    try {
        return JSON.stringify(JSON.parse(input));
    }
    catch {
        return input;
    }
}
function escapeJson(input) {
    return JSON.stringify(input);
}
function unescapeJson(input) {
    try {
        const result = JSON.parse(input);
        return typeof result === 'string' ? result : input;
    }
    catch {
        return input.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }
}
//# sourceMappingURL=jsonUtils.js.map