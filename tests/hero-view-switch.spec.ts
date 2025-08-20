import { test, expect } from '@playwright/test'

test.describe('Hero View Document Switching', () => {
  test('hero view should update when switching between documents', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3004/super-json/')
    
    // Wait for the app to load
    await page.waitForSelector('.container')
    
    // Switch to Hero mode
    await page.click('button:has-text("HERO")')
    
    // Wait for hero mode to be active
    await expect(page.locator('#heroMode')).toBeVisible()
    
    // Add some test JSON to first document
    const testJson1 = '{"test": "document1", "value": 123}'
    await page.locator('.editor-container').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(testJson1)
    
    // Click Load → Hero button
    await page.click('button:has-text("Load → Hero")')
    
    // Wait for the hero view to load
    await page.waitForTimeout(2000)
    
    // Check if iframe is loaded
    const iframe = page.frameLocator('iframe')
    await expect(page.locator('iframe')).toBeVisible()
    
    // Create a new document
    await page.click('.tab-add')
    
    // Add different JSON to second document
    const testJson2 = '{"test": "document2", "value": 456}'
    await page.locator('.editor-container').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(testJson2)
    
    // Click Load → Hero button for second document
    await page.click('button:has-text("Load → Hero")')
    
    // Wait for the hero view to update
    await page.waitForTimeout(2000)
    
    // Switch back to the first document
    await page.click('.tab:has-text("Document 1")')
    
    // The hero view should show the first document's URL
    const firstIframeSrc = await page.locator('iframe').getAttribute('src')
    expect(firstIframeSrc).toBeTruthy()
    
    // Switch to the second document
    await page.click('.tab:has-text("Document 2")')
    
    // The hero view should show the second document's URL
    const secondIframeSrc = await page.locator('iframe').getAttribute('src')
    expect(secondIframeSrc).toBeTruthy()
    
    // The URLs should be different
    expect(firstIframeSrc).not.toBe(secondIframeSrc)
    
    // Switch back to first document and verify the URL is restored
    await page.click('.tab:has-text("Document 1")')
    await page.waitForTimeout(500)
    
    const restoredIframeSrc = await page.locator('iframe').getAttribute('src')
    expect(restoredIframeSrc).toBe(firstIframeSrc)
  })
  
  test('hero view should be empty for new documents without loaded JSON', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3004/super-json/')
    
    // Wait for the app to load
    await page.waitForSelector('.container')
    
    // Switch to Hero mode
    await page.click('button:has-text("HERO")')
    
    // Wait for hero mode to be active
    await expect(page.locator('#heroMode')).toBeVisible()
    
    // Add JSON and load to hero
    const testJson = '{"test": "loaded", "value": 789}'
    await page.locator('.editor-container').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(testJson)
    await page.click('button:has-text("Load → Hero")')
    await page.waitForTimeout(2000)
    
    // Verify iframe is loaded
    await expect(page.locator('iframe')).toBeVisible()
    
    // Create a new document
    await page.click('.tab-add')
    
    // New document should not have an iframe (should show the placeholder)
    await expect(page.locator('iframe')).not.toBeVisible()
    await expect(page.locator('text="Enter JSON and click \\"Load → Hero\\""')).toBeVisible()
  })
})