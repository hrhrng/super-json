import { test, expect } from '@playwright/test'

test.describe('Basic Regression Tests After Refactoring', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/super-json/')
    await page.waitForLoadState('networkidle')
  })

  test('core functionality works after refactoring', async ({ page }) => {
    // 1. Check all main components are present
    await expect(page.locator('.logo')).toBeVisible()
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.tabs')).toBeVisible()
    await expect(page.locator('.status')).toBeVisible()
    
    // 2. Test mode switching
    const modes = ['LAYER', 'TOOLS', 'HERO', 'DIFF']
    for (const mode of modes) {
      const btn = page.locator('.mode-btn').filter({ hasText: mode })
      await btn.click()
      await expect(btn).toHaveClass(/active/)
      await page.waitForTimeout(200)
    }
    
    // 3. Test document tabs
    await page.click('.tab-add')
    await page.waitForTimeout(500)
    const tabs = page.locator('.tab')
    await expect(tabs).toHaveCount(2)
    
    // 4. Test JSON processing in processor mode
    await page.click('.mode-btn:has-text("TOOLS")')
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    const inputEditor = page.locator('.panel .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{"test": 123}')
    
    await page.click('button:has-text("Format")')
    await page.waitForTimeout(500)
    
    // 5. Test layer mode basic input
    await page.click('.mode-btn:has-text("LAYER")')
    await expect(page.locator('#layerMode')).toBeVisible()
    await expect(page.locator('button:has-text("Parse")')).toBeVisible()
    await expect(page.locator('button:has-text("Apply")')).toBeVisible()
    
    // 6. Test status bar
    await expect(page.locator('.status')).toContainText('hrhrng/super-json')
  })

  test('JSON parsing still works with simple JSON', async ({ page }) => {
    // Switch to layer mode
    await page.click('.mode-btn:has-text("LAYER")')
    
    // Wait for editor
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
    
    // Input simple JSON (no nested escaping)
    const simpleJson = JSON.stringify({ test: "value", number: 123 }, null, 2)
    
    const inputEditor = page.locator('.panel-input .monaco-editor').first()
    await inputEditor.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(simpleJson)
    
    // Click Parse
    await page.click('button:has-text("Parse")')
    await page.waitForTimeout(1000)
    
    // Should have at least 1 layer
    const layerInfo = page.locator('.panel-layer .panel-info')
    await expect(layerInfo).toContainText('layer')
    
    // Apply button should work
    await page.click('button:has-text("Apply")')
    await page.waitForTimeout(500)
  })
})