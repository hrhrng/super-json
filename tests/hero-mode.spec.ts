import { test, expect } from '@playwright/test'

test.describe('Hero Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Switch to Hero mode
    await page.locator('.mode-btn:has-text("HERO")').click()
    await page.waitForSelector('#heroMode')
  })

  test('should load JSON into Hero viewer', async ({ page }) => {
    const testJson = { 
      "name": "Test",
      "data": {
        "nested": "value"
      }
    }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Click Load → Hero button
    await page.locator('button:has-text("Load → Hero")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("加载到 Hero 视图")')
    
    // Check iframe is loaded
    const iframe = page.frameLocator('iframe')
    await expect(page.locator('iframe')).toHaveAttribute('src', /jsonhero\.io/)
  })

  test('should open Hero in new tab', async ({ page, context }) => {
    const testJson = { "test": "new tab" }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Set up handler for new page
    const pagePromise = context.waitForEvent('page')
    
    // Click open in new tab button (↗)
    await page.locator('button[title="Open in new tab"]').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("在新标签页打开")')
    
    // Check new tab opened
    const newPage = await pagePromise
    await newPage.waitForLoadState()
    const url = newPage.url()
    
    expect(url).toContain('jsonhero.io')
    expect(url).toContain('new?j=')
    
    await newPage.close()
  })

  test('should show placeholder when no JSON loaded', async ({ page }) => {
    // Check placeholder is visible initially
    const placeholder = page.locator('text=JSON HERO VIEWER')
    await expect(placeholder).toBeVisible()
    
    const instructionText = page.locator('text=Enter JSON and click "Load → Hero"')
    await expect(instructionText).toBeVisible()
  })

  test('should validate JSON before loading to Hero', async ({ page }) => {
    // Input invalid JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{ invalid json }')
    
    // Try to load into Hero
    await page.locator('button:has-text("Load → Hero")').click()
    
    // Should show error notification
    await page.waitForSelector('.notification.error:has-text("JSON格式错误")')
    
    // Iframe should not be loaded
    const iframe = page.locator('iframe')
    const iframeSrc = await iframe.getAttribute('src')
    expect(iframeSrc).toBeNull()
  })

  test('should handle complex nested JSON', async ({ page }) => {
    const complexJson = {
      "users": [
        {
          "id": 1,
          "name": "John",
          "settings": {
            "theme": "dark",
            "preferences": {
              "notifications": true
            }
          }
        }
      ],
      "metadata": {
        "version": "1.0",
        "timestamp": Date.now()
      }
    }
    
    // Input complex JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(complexJson, null, 2))
    
    // Load into Hero
    await page.locator('button:has-text("Load → Hero")').click()
    
    // Check success
    await page.waitForSelector('.notification.success:has-text("加载到 Hero 视图")')
    
    // Verify iframe URL contains base64 encoded JSON
    const iframeSrc = await page.locator('iframe').getAttribute('src')
    expect(iframeSrc).toBeTruthy()
    expect(iframeSrc).toContain('jsonhero.io/new?j=')
    
    // Decode and verify the JSON is correctly encoded
    const base64Part = iframeSrc?.split('j=')[1]
    if (base64Part) {
      const decoded = Buffer.from(base64Part, 'base64').toString('utf-8')
      const parsedDecoded = JSON.parse(decoded)
      expect(parsedDecoded.users).toBeTruthy()
      expect(parsedDecoded.metadata).toBeTruthy()
    }
  })
})