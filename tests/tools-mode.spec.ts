import { test, expect } from '@playwright/test'

test.describe('Tools Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Switch to Tools mode
    await page.locator('.mode-btn:has-text("TOOLS")').click()
    await page.waitForSelector('#processorMode')
  })

  test('should encode JSON to Base64', async ({ page }) => {
    const testJson = { "test": "data" }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Click Base64 Encode
    await page.locator('button:has-text("Base64 Encode")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("Base64 编码成功")')
    
    // Check output is base64
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })
    
    expect(outputValue).toBeTruthy()
    expect(outputValue).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  test('should decode Base64 to JSON', async ({ page }) => {
    const base64 = 'eyJ0ZXN0IjoiZGF0YSJ9'
    
    // Input base64
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(base64)
    
    // Click Base64 Decode
    await page.locator('button:has-text("Base64 Decode")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("Base64 解码成功")')
    
    // Check output is JSON
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })
    
    expect(outputValue).toContain('"test"')
    expect(outputValue).toContain('"data"')
  })

  test('should URL encode JSON', async ({ page }) => {
    const testJson = { "test": "value with spaces" }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Click URL Encode
    await page.locator('button:has-text("URL Encode")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("URL 编码成功")')
    
    // Check output is URL encoded
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })
    
    expect(outputValue).toContain('%20')
    expect(outputValue).toContain('%22')
  })

  test('should sort JSON keys', async ({ page }) => {
    const unsortedJson = { "z": 1, "a": 2, "m": 3 }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(unsortedJson, null, 2))
    
    // Click Sort Keys
    await page.locator('button:has-text("Sort Keys")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("键排序成功")')
    
    // Check output has sorted keys
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })
    
    // Keys should appear in alphabetical order
    const aIndex = outputValue?.indexOf('"a"') ?? -1
    const mIndex = outputValue?.indexOf('"m"') ?? -1
    const zIndex = outputValue?.indexOf('"z"') ?? -1
    
    expect(aIndex).toBeLessThan(mIndex)
    expect(mIndex).toBeLessThan(zIndex)
  })

  test('should copy output to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-write', 'clipboard-read'])
    
    const testJson = { "test": "clipboard" }
    
    // Input JSON and encode
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    await page.locator('button:has-text("Base64 Encode")').click()
    await page.waitForSelector('.notification.success')
    
    // Click Copy
    await page.locator('button:has-text("Copy")').click()
    
    // Check notification
    await page.waitForSelector('.notification.success:has-text("已复制到剪贴板")')
  })

  test('should clear all content', async ({ page }) => {
    const testJson = { "test": "clear" }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Generate some output
    await page.locator('button:has-text("Base64 Encode")').click()
    await page.waitForSelector('.notification.success')
    
    // Click Clear
    await page.locator('button:has-text("Clear")').click()
    
    // Check both editors are cleared
    const inputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })
    
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })
    
    expect(inputValue).toBe('')
    expect(outputValue).toBe('')
  })

  test('should open JSON Hero in processor mode', async ({ page, context }) => {
    const testJson = { "test": "hero" }
    
    // Input JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(JSON.stringify(testJson, null, 2))
    
    // Set up handler for new page
    const pagePromise = context.waitForEvent('page')
    
    // Click JSON Hero button
    await page.locator('button:has-text("JSON Hero")').click()
    
    // Check new tab opened with correct URL
    const newPage = await pagePromise
    await newPage.waitForLoadState()
    const url = newPage.url()
    
    expect(url).toContain('jsonhero.io')
    expect(url).toContain('new?j=')
    
    await newPage.close()
  })
})