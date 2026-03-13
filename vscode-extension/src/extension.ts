import * as vscode from 'vscode';
import { SuperJsonPanel } from './webviewProvider';
import {
  formatJson,
  minifyJson,
  escapeJson,
  unescapeJson,
} from './jsonAnalyzer';

export function activate(context: vscode.ExtensionContext) {
  // Open Super JSON Editor panel
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.openEditor', () => {
      const editor = vscode.window.activeTextEditor;
      const content = editor ? editor.document.getText() : undefined;
      SuperJsonPanel.createOrShow(context.extensionUri, content);
    })
  );

  // Parse selection in the editor
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.parseSelection', () => {
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
      SuperJsonPanel.createOrShow(context.extensionUri, text);
    })
  );

  // Format JSON in active editor
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.formatJson', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const text = getTextOrSelection(editor);
      const formatted = formatJson(text);
      if (formatted === text) {
        vscode.window.showWarningMessage(
          'Could not format - invalid JSON'
        );
        return;
      }
      replaceTextOrSelection(editor, formatted);
    })
  );

  // Minify JSON in active editor
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.minifyJson', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const text = getTextOrSelection(editor);
      const minified = minifyJson(text);
      if (minified === text) {
        vscode.window.showWarningMessage(
          'Could not minify - invalid JSON'
        );
        return;
      }
      replaceTextOrSelection(editor, minified);
    })
  );

  // Escape JSON string
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.escapeJson', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const text = getTextOrSelection(editor);
      replaceTextOrSelection(editor, escapeJson(text));
    })
  );

  // Unescape JSON string
  context.subscriptions.push(
    vscode.commands.registerCommand('superJson.unescapeJson', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const text = getTextOrSelection(editor);
      replaceTextOrSelection(editor, unescapeJson(text));
    })
  );
}

function getTextOrSelection(editor: vscode.TextEditor): string {
  const selection = editor.selection;
  if (!selection.isEmpty) {
    return editor.document.getText(selection);
  }
  return editor.document.getText();
}

function replaceTextOrSelection(
  editor: vscode.TextEditor,
  newText: string
): void {
  editor.edit((editBuilder) => {
    const selection = editor.selection;
    if (!selection.isEmpty) {
      editBuilder.replace(selection, newText);
    } else {
      const document = editor.document;
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      editBuilder.replace(fullRange, newText);
    }
  });
}

export function deactivate() {
  // Cleanup
}
