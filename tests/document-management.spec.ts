import { test, expect } from '@playwright/test'

test.describe('Document Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should create new document', async ({ page }) => {
    // Count initial tabs
    const initialTabs = await page.locator('.tab').count()
    
    // Click add button
    await page.locator('.tab-add').click()
    
    // Check new tab created
    const newTabCount = await page.locator('.tab').count()
    expect(newTabCount).toBe(initialTabs + 1)
    
    // New tab should be active
    const activeTabs = await page.locator('.tab.active').count()
    expect(activeTabs).toBe(1)
  })

  test('should switch between documents', async ({ page }) => {
    // Create second document
    await page.locator('.tab-add').click()
    
    // Type in second document
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.type('{"doc2": "content"}')
    
    // Switch to first document
    await page.locator('.tab').first().click()
    
    // Check first tab is active
    const firstTabClass = await page.locator('.tab').first().getAttribute('class')
    expect(firstTabClass).toContain('active')
    
    // Type in first document
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"doc1": "content"}')
    
    // Switch back to second document
    await page.locator('.tab').nth(1).click()
    
    // Content should be preserved
    const content = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })
    
    expect(content).toContain('doc2')
  })

  test('should close document', async ({ page }) => {
    // Create multiple documents
    await page.locator('.tab-add').click()
    await page.locator('.tab-add').click()
    
    const tabCount = await page.locator('.tab').count()
    expect(tabCount).toBeGreaterThan(1)
    
    // Close middle tab
    await page.locator('.tab').nth(1).hover()
    await page.locator('.tab').nth(1).locator('.tab-close').click()
    
    // Check tab count decreased
    const newTabCount = await page.locator('.tab').count()
    expect(newTabCount).toBe(tabCount - 1)
  })

  test('should not show close button when only one document', async ({ page }) => {
    // Ensure only one document
    while (await page.locator('.tab').count() > 1) {
      await page.locator('.tab').last().hover()
      await page.locator('.tab-close').last().click()
    }
    
    // Check no close button visible
    const closeButtons = await page.locator('.tab-close').count()
    expect(closeButtons).toBe(0)
  })

  test('should persist documents across page reload', async ({ page }) => {
    const testData = '{"persisted": "data"}'
    
    // Add content to first document
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(testData)
    
    // Create second document
    await page.locator('.tab-add').click()
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.type('{"second": "doc"}')
    
    // Wait for auto-save
    await page.waitForTimeout(1000)
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.monaco-editor')
    
    // Check documents are restored
    const tabCount = await page.locator('.tab').count()
    expect(tabCount).toBeGreaterThanOrEqual(2)
    
    // Check first document content
    await page.locator('.tab').first().click()
    await page.waitForTimeout(500)
    
    const firstDocContent = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })
    
    expect(firstDocContent).toContain('persisted')
  })

  test('should handle keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+T for new document
    const initialTabs = await page.locator('.tab').count()
    await page.keyboard.press('Control+t')
    
    const newTabCount = await page.locator('.tab').count()
    expect(newTabCount).toBe(initialTabs + 1)
    
    // Test Ctrl+W to close document (only if multiple docs)
    if (newTabCount > 1) {
      await page.keyboard.press('Control+w')
      const afterCloseCount = await page.locator('.tab').count()
      expect(afterCloseCount).toBe(newTabCount - 1)
    }
  })

  test('should maintain separate layer states per document', async ({ page }) => {
    // Setup first document with layers
    const doc1Json = {
      "doc1": JSON.stringify({ "nested": "value1" })
    }
    
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(doc1Json, null, 2))
    
    // Parse layers
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Create second document
    await page.locator('.tab-add').click()
    
    // Setup second document with different layers
    const doc2Json = {
      "doc2": JSON.stringify({ 
        "different": JSON.stringify({ "deep": "value2" })
      })
    }
    
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(doc2Json, null, 2))
    
    // Parse layers
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Switch back to first document
    await page.locator('.tab').first().click()
    await page.waitForTimeout(200)
    
    // Check first document layers are preserved
    const layerInfo1 = await page.locator('.panel-info').textContent()
    expect(layerInfo1).toContain('2 layers')
    
    // Switch to second document
    await page.locator('.tab').nth(1).click()
    await page.waitForTimeout(200)
    
    // Check second document has different layers
    const layerInfo2 = await page.locator('.panel-info').textContent()
    expect(layerInfo2).toContain('3 layers')
  })
})