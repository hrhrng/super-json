import { Page } from '@playwright/test'

/**
 * Set Monaco editor content using the Monaco API.
 * keyboard.type() doesn't work reliably with Monaco because of auto-bracket completion.
 * @param editorIndex - which editor (0 = first/input, 1 = second/output, etc.)
 */
export async function setEditorContent(page: Page, content: string, editorIndex = 0) {
  await page.waitForSelector('.monaco-editor')
  await page.evaluate(({ content, index }) => {
    const editors = (window as any).monaco?.editor?.getEditors()
    if (editors && editors.length > index) {
      editors[index].focus()
      editors[index].setValue(content)
    }
  }, { content, index: editorIndex })
  // Wait for React state to sync via onDidChangeModelContent
  await page.waitForTimeout(300)
}
