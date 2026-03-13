import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

/**
 * These tests verify the Super JSON Editor webview UI by loading
 * the HTML directly in a browser. The webview uses the active editor
 * as input — the webview only shows the Layers panel.
 */

// Get test HTML by calling the exported getWebviewHtml and removing CSP for testing
function getTestHtml(): string {
  // We need to extract the HTML from the TypeScript source since we can't import it directly.
  // Read the compiled JS if available, otherwise extract from TS source.
  const providerPath = path.join(__dirname, '..', 'src', 'webviewProvider.ts');
  const source = fs.readFileSync(providerPath, 'utf-8');

  // Extract the template literal content from getWebviewHtml function
  // Find the function and get everything between the backticks
  const fnStart = source.indexOf('export function getWebviewHtml');
  if (fnStart === -1) throw new Error('Could not find getWebviewHtml function');

  const templateStart = source.indexOf('`<!DOCTYPE html>', fnStart);
  if (templateStart === -1) throw new Error('Could not find HTML template start');

  // Find the matching closing backtick - it's at the end: </html>`;
  const templateEnd = source.indexOf('</html>`', templateStart);
  if (templateEnd === -1) throw new Error('Could not find HTML template end');

  let html = source.substring(templateStart + 1, templateEnd + 7); // +7 for </html>

  // Replace template expressions with test values
  html = html.replace(/\$\{cspSource\}/g, "'self' 'unsafe-inline'");
  html = html.replace(/\$\{nonce\}/g, 'test-nonce');

  // Remove CSP meta tag so scripts can run freely in tests
  html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');

  return html;
}

// Helper to simulate receiving a parseContent message from the extension
async function simulateParse(page: import('@playwright/test').Page, jsonContent: string) {
  await page.evaluate((content) => {
    window.postMessage({ command: 'parseContent', content }, '*');
  }, jsonContent);
  // Wait for layers to render
  await page.waitForSelector('.layer-tab', { timeout: 3000 });
}

test.describe('Super JSON Editor Webview', () => {
  test.beforeEach(async ({ page }) => {
    const html = getTestHtml();
    await page.setContent(html);
    await page.waitForLoadState('domcontentloaded');
    // Small wait for script initialization
    await page.waitForTimeout(100);
  });

  test('initial layout renders correctly', async ({ page }) => {
    await expect(page.locator('.title')).toHaveText('Super JSON');
    await expect(page.locator('#btnParse')).toBeVisible();
    await expect(page.locator('#btnApply')).toBeVisible();
    await expect(page.locator('.header-hint')).toHaveText('Active editor = Input');
    await expect(page.locator('#layerPlaceholder')).toBeVisible();
    await expect(page.locator('#statusLeft')).toHaveText('Ready');

    await expect(page).toHaveScreenshot('initial-layout.png');
  });

  test('parse simple JSON shows single layer', async ({ page }) => {
    const json = JSON.stringify({ name: 'test', value: 42 });
    await simulateParse(page, json);

    await expect(page.locator('#layerInfo')).toHaveText('1 layers');
    await expect(page.locator('.layer-tab')).toHaveCount(1);
    await expect(page.locator('#layerEditor')).toBeVisible();

    await expect(page).toHaveScreenshot('single-layer.png');
  });

  test('parse nested escaped JSON shows multiple layers', async ({ page }) => {
    const inner = JSON.stringify({ nested: true, data: [1, 2, 3] });
    const outer = JSON.stringify({ wrapper: 'hello', payload: inner });
    await simulateParse(page, outer);

    await expect(page.locator('#layerInfo')).toHaveText('2 layers');
    await expect(page.locator('.layer-tab')).toHaveCount(2);

    await expect(page).toHaveScreenshot('nested-layers.png');
  });

  test('switch between layers via tabs', async ({ page }) => {
    const inner = JSON.stringify({ key: 'innerValue' });
    const outer = JSON.stringify({ outer: 'data', inner: inner });
    await simulateParse(page, outer);

    // Click second layer tab
    await page.locator('.layer-tab').nth(1).click();
    await expect(page.locator('.layer-tab').nth(1)).toHaveClass(/active/);

    const editorValue = await page.locator('#layerEditor').inputValue();
    expect(editorValue).toContain('innerValue');

    await expect(page).toHaveScreenshot('layer-switched.png');
  });

  test('breadcrumb navigation works', async ({ page }) => {
    const inner = JSON.stringify({ deep: true });
    const outer = JSON.stringify({ container: inner });
    await simulateParse(page, outer);

    // Switch to inner layer
    await page.locator('.layer-tab').nth(1).click();
    await expect(page.locator('.breadcrumb-item')).toHaveCount(2);
    await expect(page.locator('.breadcrumb-item').nth(0)).toHaveText('Root');

    // Click Root in breadcrumb
    await page.locator('.breadcrumb-item').nth(0).click();
    await expect(page.locator('.layer-tab').nth(0)).toHaveClass(/active/);
  });

  test('apply sends message to editor', async ({ page }) => {
    const json = JSON.stringify({ msg: 'hello' });
    await simulateParse(page, json);

    // Listen for console messages (mock vscode.postMessage logs)
    const messages: string[] = [];
    page.on('console', (msg) => messages.push(msg.text()));

    await page.locator('#btnApply').click();

    await expect(page.locator('#statusLeft')).toHaveText('Applied to editor');
  });

  test('format layer button formats JSON', async ({ page }) => {
    const json = JSON.stringify({ a: 1, b: 2 });
    await simulateParse(page, json);

    // Make the editor content minified
    await page.locator('#layerEditor').fill('{"a":1,"b":2}');
    await page.locator('#btnFormatLayer').click();

    const value = await page.locator('#layerEditor').inputValue();
    expect(value).toContain('  "a": 1');
  });

  test('copy layer button sends clipboard message', async ({ page }) => {
    const json = JSON.stringify({ a: 1 });
    await simulateParse(page, json);

    const messages: string[] = [];
    page.on('console', (msg) => messages.push(msg.text()));

    await page.locator('#btnCopyLayer').click();
    await page.waitForTimeout(200);
    const copyMsg = messages.find(m => m.includes('copyToClipboard'));
    expect(copyMsg).toBeTruthy();
  });

  test('parse button sends requestParse message', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => messages.push(msg.text()));

    await page.locator('#btnParse').click();
    await page.waitForTimeout(200);

    const parseMsg = messages.find(m => m.includes('requestParse'));
    expect(parseMsg).toBeTruthy();
  });

  test('layer placeholder hidden after parse', async ({ page }) => {
    await expect(page.locator('#layerPlaceholder')).toBeVisible();
    await expect(page.locator('#layerEditor')).not.toBeVisible();

    const json = JSON.stringify({ test: 1 });
    await simulateParse(page, json);

    await expect(page.locator('#layerPlaceholder')).not.toBeVisible();
    await expect(page.locator('#layerEditor')).toBeVisible();
  });

  test('status bar updates after parse', async ({ page }) => {
    const json = JSON.stringify({ x: 1, y: 2 });
    await simulateParse(page, json);

    await expect(page.locator('#statusLeft')).toHaveText('1 layer(s) detected');
    await expect(page.locator('#statusRight')).toHaveText(json.length.toLocaleString() + ' chars');
    await expect(page.locator('#statusDot')).toHaveClass(/active/);
  });

  test('full workflow snapshot', async ({ page }) => {
    const inner = JSON.stringify({ level: 2, items: ['a', 'b'] });
    const outer = JSON.stringify({
      title: 'Test Document',
      count: 5,
      payload: inner,
    });
    await simulateParse(page, outer);

    await expect(page).toHaveScreenshot('full-workflow.png');
  });

  test('keyboard shortcut Ctrl+Enter triggers parse', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (msg) => messages.push(msg.text()));

    await page.keyboard.press('Control+Enter');
    await page.waitForTimeout(200);

    const parseMsg = messages.find(m => m.includes('requestParse'));
    expect(parseMsg).toBeTruthy();
  });
});
