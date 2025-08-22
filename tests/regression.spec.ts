import { test, expect } from '@playwright/test'

test.describe('Super JSON Editor Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/super-json/')
    await page.waitForLoadState('networkidle')
  })

  test('should load the application with default layout', async ({ page }) => {
    // Check main components are visible
    await expect(page.locator('.logo')).toBeVisible()
    await expect(page.locator('.title')).toContainText('SUPER JSON')
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.tabs')).toBeVisible()
    await expect(page.locator('.status')).toBeVisible()
  })

  test('should create and switch between document tabs', async ({ page }) => {
    // Check initial document
    const initialTab = page.locator('.tab').first()
    await expect(initialTab).toHaveClass(/active/)
    
    // Create new document
    await page.click('.tab-add')
    await page.waitForTimeout(500)
    
    // Verify new tab is created and active
    const tabs = page.locator('.tab')
    await expect(tabs).toHaveCount(2)
    const newTab = tabs.nth(1)
    await expect(newTab).toHaveClass(/active/)
    
    // Switch back to first tab
    await tabs.first().click()
    await expect(tabs.first()).toHaveClass(/active/)
    
    // Test tab renaming
    await tabs.first().dblclick()
    await page.keyboard.type('Test Document')
    await page.keyboard.press('Enter')
    await expect(tabs.first()).toContainText('Test Document')
  })

  test('should switch between different modes', async ({ page }) => {
    // Test Layer mode (default)
    const layerBtn = page.locator('.mode-btn').filter({ hasText: 'LAYER' })
    await expect(layerBtn).toHaveClass(/active/)
    await expect(page.locator('#layerMode')).toBeVisible()
    
    // Switch to Processor mode
    const processorBtn = page.locator('.mode-btn').filter({ hasText: 'TOOLS' })
    await processorBtn.click()
    await expect(processorBtn).toHaveClass(/active/)
    await expect(page.locator('#processorMode')).toBeVisible()
    
    // Switch to Hero mode
    const heroBtn = page.locator('.mode-btn').filter({ hasText: 'HERO' })
    await heroBtn.click()
    await expect(heroBtn).toHaveClass(/active/)
    await expect(page.locator('#heroMode')).toBeVisible()
    
    // Switch to Diff mode
    const diffBtn = page.locator('.mode-btn').filter({ hasText: 'DIFF' })
    await diffBtn.click()
    await expect(diffBtn).toHaveClass(/active/)
    await expect(page.locator('#diffMode')).toBeVisible()
    
    // Switch back to Layer mode
    await layerBtn.click()
    await expect(layerBtn).toHaveClass(/active/)
  })

  test('should parse JSON in Layer mode', async ({ page }) => {
    // Input sample JSON with actual nested escaped JSON
    const nestedObject = { level2: "data", another: "value" }
    const sampleJson = JSON.stringify({
      name: "Test",
      nested: JSON.stringify(nestedObject)
    }, null, 2)
    
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    // Focus on input editor and clear it
    const inputEditor = page.locator('.panel-input .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(sampleJson)
    
    // Click Parse button
    await page.click('button:has-text("Parse")')
    await page.waitForTimeout(1000)
    
    // Verify layers are created (should have 2 layers)
    await expect(page.locator('.panel-layer .panel-info')).toContainText('2 layers')
    
    // Check breadcrumb is visible after layers are parsed
    await expect(page.locator('.breadcrumb')).toBeVisible()
  })

  test('should process JSON in Processor mode', async ({ page }) => {
    // Switch to processor mode
    await page.click('.mode-btn:has-text("TOOLS")')
    
    // Input sample JSON
    const sampleJson = '{"test": "value", "number": 123}'
    
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    // Input JSON
    const inputEditor = page.locator('.panel .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(sampleJson)
    
    // Test Format button
    await page.click('button:has-text("Format")')
    await page.waitForTimeout(500)
    
    // Test Minify button
    await page.click('button:has-text("Minify")')
    await page.waitForTimeout(500)
    
    // Test Sort Keys button
    await page.click('button:has-text("Sort Keys")')
    await page.waitForTimeout(500)
    
    // Verify Apply button exists
    await expect(page.locator('.actions button:has-text("Apply")')).toBeVisible()
    await expect(page.locator('.actions button:has-text("Copy")')).toBeVisible()
  })

  test('should handle document operations with paste button', async ({ page }) => {
    // Hover over the add button area to show paste button
    await page.hover('.tab-add')
    await page.waitForTimeout(300)
    
    // Check if paste button appears
    const pasteButton = page.locator('button[title="New document from clipboard"]')
    await expect(pasteButton).toBeVisible()
    
    // Move away to hide paste button
    await page.hover('.logo')
    await page.waitForTimeout(300)
    await expect(pasteButton).not.toBeVisible()
  })

  test('should show GitHub repository link in status bar', async ({ page }) => {
    const githubLink = page.locator('a[href="https://github.com/hrhrng/super-json"]')
    await expect(githubLink).toBeVisible()
    await expect(githubLink).toContainText('hrhrng/super-json')
  })

  test('should handle drag and drop of tabs', async ({ page }) => {
    // Create multiple documents
    await page.click('.tab-add')
    await page.waitForTimeout(200)
    await page.click('.tab-add')
    await page.waitForTimeout(200)
    
    // Get tab elements
    const tabs = page.locator('.tab')
    await expect(tabs).toHaveCount(3)
    
    // Get initial text of first and second tabs
    const firstTabText = await tabs.first().textContent()
    const secondTabText = await tabs.nth(1).textContent()
    
    // Perform drag and drop (first tab to second position)
    const firstTab = tabs.first()
    const secondTab = tabs.nth(1)
    
    await firstTab.dragTo(secondTab)
    await page.waitForTimeout(500)
    
    // Verify order has changed
    const newFirstTabText = await tabs.first().textContent()
    const newSecondTabText = await tabs.nth(1).textContent()
    
    expect(newFirstTabText).toBe(secondTabText)
    expect(newSecondTabText).toBe(firstTabText)
  })

  test('should display correct status for each mode', async ({ page }) => {
    const statusItem = page.locator('.status-item').last()
    
    // Layer mode
    await page.click('.mode-btn:has-text("LAYER")')
    await expect(statusItem).toContainText('layers')
    
    // Processor mode
    await page.click('.mode-btn:has-text("TOOLS")')
    await expect(statusItem).toContainText('Processor')
    
    // Hero mode
    await page.click('.mode-btn:has-text("HERO")')
    await expect(statusItem).toContainText('Hero View')
    
    // Diff mode
    await page.click('.mode-btn:has-text("DIFF")')
    await expect(statusItem).toContainText('Diff Mode')
  })

  test('should show share and copy buttons in Layer mode', async ({ page }) => {
    // Ensure we're in Layer mode
    await page.click('.mode-btn:has-text("LAYER")')
    
    // Check for Share button
    const shareButton = page.locator('button:has-text("Share")').first()
    await expect(shareButton).toBeVisible()
    
    // Check for Copy button
    const copyButton = page.locator('button:has-text("Copy")').first()
    await expect(copyButton).toBeVisible()
  })
})

test.describe('Advanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/super-json/')
    await page.waitForLoadState('networkidle')
  })

  test('should handle layer editing with breadcrumb navigation', async ({ page }) => {
    // Input nested JSON with properly escaped JSON strings
    const level3Data = { level3: "deep value", extra: "data" }
    const level2Data = { level2: JSON.stringify(level3Data) }
    const nestedJson = JSON.stringify({
      level1: JSON.stringify(level2Data)
    }, null, 2)
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    const inputEditor = page.locator('.panel-input .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(nestedJson)
    
    // Parse the JSON
    await page.click('button:has-text("Parse")')
    await page.waitForTimeout(1500)
    
    // Wait for layers to be generated (should have multiple layers)
    const layerInfo = page.locator('.panel-layer .panel-info')
    await expect(layerInfo).toContainText('layers')
    
    // Check breadcrumb exists after successful parsing
    const breadcrumb = page.locator('.breadcrumb')
    await expect(breadcrumb).toBeVisible()
    
    // Check layer actions are visible
    await expect(page.locator('button:has-text("Save as Doc")')).toBeVisible()
    await expect(page.locator('button:has-text("Replace from Doc")')).toBeVisible()
  })

  test('should handle diff mode document comparison', async ({ page }) => {
    // Create two documents with different content
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    // First document
    const inputEditor = page.locator('.panel-input .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"doc1": "value1"}')
    
    // Create second document
    await page.click('.tab-add')
    await page.waitForTimeout(500)
    
    // Second document
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"doc2": "value2"}')
    
    // Switch to Diff mode
    await page.click('.mode-btn:has-text("DIFF")')
    
    // Check diff selector is visible
    const diffSelector = page.locator('select').first()
    await expect(diffSelector).toBeVisible()
    
    // Select first document for comparison
    await diffSelector.selectOption({ index: 1 })
    await page.waitForTimeout(500)
    
    // Check "Show only differences" checkbox
    const checkbox = page.locator('input[type="checkbox"]')
    await expect(checkbox).toBeVisible()
  })
})