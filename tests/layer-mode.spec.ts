import { test, expect } from '@playwright/test'

test.describe('Layer Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test('should parse nested JSON layers', async ({ page }) => {
    // Input nested JSON
    const nestedJson = {
      "name": "Test",
      "data": JSON.stringify({
        "nested": "value",
        "deeper": JSON.stringify({
          "level3": "data"
        })
      })
    }
    
    // Wait for Monaco editor to load
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    // Clear and type new JSON
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(nestedJson, null, 2))
    
    // Click Parse button
    await page.locator('button:has-text("Parse")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success')
    const notification = await page.locator('.notification.success').textContent()
    expect(notification).toContain('成功解析')
    expect(notification).toMatch(/\d+ 个JSON层级/)
    
    // Check breadcrumb appears
    await page.waitForSelector('.vscode-breadcrumb')
    const breadcrumb = await page.locator('.vscode-breadcrumb').textContent()
    expect(breadcrumb).toBeTruthy()
  })

  test('should show layer dropdown when clicking breadcrumb', async ({ page }) => {
    // Setup test data
    const nestedJson = {
      "config": JSON.stringify({
        "settings": {
          "theme": "dark",
          "nested": JSON.stringify({
            "level3": "deep"
          })
        }
      })
    }
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(nestedJson, null, 2))
    
    // Parse
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Click breadcrumb item
    await page.locator('.breadcrumb-item').first().click()
    
    // Check dropdown appears
    await page.waitForSelector('.breadcrumb-dropdown')
    const dropdown = await page.locator('.breadcrumb-dropdown')
    expect(await dropdown.isVisible()).toBeTruthy()
    
    // Check dropdown contains layer items
    const layerItems = await dropdown.locator('.tree-row').count()
    expect(layerItems).toBeGreaterThan(0)
    
    // Check L1, L2, L3 labels
    const labels = await dropdown.locator('span:has-text("L")').allTextContents()
    expect(labels.length).toBeGreaterThan(0)
  })

  test('should support bidirectional sync between layers', async ({ page }) => {
    // Setup multi-layer JSON
    const nestedJson = {
      "data": JSON.stringify({
        "value": "original"
      })
    }
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(nestedJson, null, 2))
    
    // Parse
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Wait for layer editor
    await page.waitForSelector('.panel-layer .monaco-editor')
    
    // Edit the nested layer
    await page.locator('.panel-layer .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"value": "updated"}')
    
    // Wait a bit for sync
    await page.waitForTimeout(500)
    
    // Click Apply to update input
    await page.locator('button:has-text("Apply")').click()
    await page.waitForSelector('.notification.success:has-text("应用成功")')
    
    // Check input was updated
    const inputContent = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })
    
    expect(inputContent).toContain('updated')
  })

  test('should navigate between layers using dropdown', async ({ page }) => {
    // Complex nested structure
    const nestedJson = {
      "level1": JSON.stringify({
        "level2a": JSON.stringify({ "data": "a" }),
        "level2b": JSON.stringify({ "data": "b" })
      })
    }
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(nestedJson, null, 2))
    
    // Parse
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Open dropdown
    await page.locator('.breadcrumb-item').first().click()
    await page.waitForSelector('.breadcrumb-dropdown')
    
    // Click different layer
    const layerRows = page.locator('.tree-row')
    const count = await layerRows.count()
    if (count > 1) {
      await layerRows.nth(1).click()
      
      // Verify layer switched (breadcrumb should update)
      await page.waitForTimeout(200)
      const breadcrumbText = await page.locator('.vscode-breadcrumb').textContent()
      expect(breadcrumbText).toBeTruthy()
    }
  })

  test('should apply changes back to input', async ({ page }) => {
    const testJson = {
      "test": JSON.stringify({ "inner": "value" })
    }
    
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Parse
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success')
    
    // Edit layer
    await page.waitForSelector('.panel-layer .monaco-editor')
    await page.locator('.panel-layer .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"inner": "modified"}')
    
    // Apply
    await page.locator('button:has-text("Apply")').click()
    await page.waitForSelector('.notification.success:has-text("应用成功")')
    
    // Verify input updated
    const finalInput = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })
    
    expect(finalInput).toContain('modified')
    expect(finalInput).not.toContain('"inner": "value"')
  })
})