"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const webviewProvider_1 = require("./webviewProvider");
const jsonAnalyzer_1 = require("./jsonAnalyzer");
function activate(context) {
    // Open Super JSON Editor panel
    context.subscriptions.push(vscode.commands.registerCommand('superJson.openEditor', () => {
        const editor = vscode.window.activeTextEditor;
        const content = editor ? editor.document.getText() : undefined;
        webviewProvider_1.SuperJsonPanel.createOrShow(context.extensionUri, content);
    }));
    // Parse selection in the editor
    context.subscriptions.push(vscode.commands.registerCommand('superJson.parseSelection', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        const text = editor.document.getText(selection);
        if (!text) {
            vscode.window.showWarningMessage('No text selected');
            return;
        }
        webviewProvider_1.SuperJsonPanel.createOrShow(context.extensionUri, text);
    }));
    // Format JSON in active editor
    context.subscriptions.push(vscode.commands.registerCommand('superJson.formatJson', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const text = getTextOrSelection(editor);
        const formatted = (0, jsonAnalyzer_1.formatJson)(text);
        if (formatted === text) {
            vscode.window.showWarningMessage('Could not format - invalid JSON');
            return;
        }
        replaceTextOrSelection(editor, formatted);
    }));
    // Minify JSON in active editor
    context.subscriptions.push(vscode.commands.registerCommand('superJson.minifyJson', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const text = getTextOrSelection(editor);
        const minified = (0, jsonAnalyzer_1.minifyJson)(text);
        if (minified === text) {
            vscode.window.showWarningMessage('Could not minify - invalid JSON');
            return;
        }
        replaceTextOrSelection(editor, minified);
    }));
    // Escape JSON string
    context.subscriptions.push(vscode.commands.registerCommand('superJson.escapeJson', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const text = getTextOrSelection(editor);
        replaceTextOrSelection(editor, (0, jsonAnalyzer_1.escapeJson)(text));
    }));
    // Unescape JSON string
    context.subscriptions.push(vscode.commands.registerCommand('superJson.unescapeJson', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor)
            return;
        const text = getTextOrSelection(editor);
        replaceTextOrSelection(editor, (0, jsonAnalyzer_1.unescapeJson)(text));
    }));
}
function getTextOrSelection(editor) {
    const selection = editor.selection;
    if (!selection.isEmpty) {
        return editor.document.getText(selection);
    }
    return editor.document.getText();
}
function replaceTextOrSelection(editor, newText) {
    editor.edit((editBuilder) => {
        const selection = editor.selection;
        if (!selection.isEmpty) {
            editBuilder.replace(selection, newText);
        }
        else {
            const document = editor.document;
            const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length));
            editBuilder.replace(fullRange, newText);
        }
    });
}
function deactivate() {
    // Cleanup
}
//# sourceMappingURL=extension.js.map