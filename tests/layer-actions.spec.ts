import { test, expect } from '@playwright/test'

test.describe('Layer Actions', () => {
  test('Save as Doc and Replace from Doc buttons should work', async ({ page }) => {
    await page.goto('http://localhost:3002/super-json/')
    
    // Add some multi-layer JSON
    const multiLayerJSON = JSON.stringify({
      layer1: {
        name: "First Layer",
        data: JSON.stringify({layer2: {value: "nested"}})
      }
    }, null, 2)
    
    // Input the JSON
    await page.locator('.monaco-editor').first().click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(multiLayerJSON)
    
    // Parse it
    await page.getByRole('button', { name: 'Parse' }).click()
    
    // Wait for success notification or check for error
    const notification = page.locator('.notification')
    await expect(notification).toBeVisible()
    
    // Check notification text
    const notificationText = await notification.textContent()
    console.log('Notification:', notificationText)
    
    // Wait for layers to load
    await page.waitForTimeout(1000)
    
    // Check if layer action buttons are visible
    const saveAsDocBtn = page.locator('button:has-text("Save as Doc")')
    const replaceFromDocBtn = page.locator('button:has-text("Replace from Doc")')
    
    await expect(saveAsDocBtn).toBeVisible()
    await expect(replaceFromDocBtn).toBeVisible()
    
    // Test Save as Doc
    await saveAsDocBtn.click()
    
    // Should create a new document
    await expect(page.locator('.tab').nth(1)).toBeVisible()
    
    // Test Replace from Doc
    // First switch back to Document 1
    await page.locator('.tab').first().click()
    
    // Create another document with different content
    await page.locator('.tab-add').click()
    await page.locator('.monaco-editor').first().click()
    await page.keyboard.type('{"test": "replacement"}')
    
    // Switch back to Document 1
    await page.locator('.tab').first().click()
    await page.waitForTimeout(300)
    
    // Click Replace from Doc
    await replaceFromDocBtn.click()
    
    // Should show a notification
    await expect(page.locator('.notification')).toBeVisible()
  })
})