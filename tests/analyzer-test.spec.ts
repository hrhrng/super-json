import { test } from '@playwright/test'

test('test JSON analyzer directly in browser', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Test the analyzer in the browser console
  const result = await page.evaluate(() => {
    // Access the analyzer from window if available, or create inline
    const testJson = {
      "config": JSON.stringify({
        "settings": {
          "theme": "dark", 
          "nested": JSON.stringify({
            "level3": "deep"
          })
        }
      }),
      "data": JSON.stringify({
        "info": "test"
      })
    }
    
    const jsonString = JSON.stringify(testJson, null, 2)
    
    // Try to find and use the analyzer
    // This would work if analyzer is exposed globally
    const analyzerTest = {
      input: jsonString,
      testJson: testJson,
      expectedLayers: 4 // root + config + nested + data
    }
    
    return analyzerTest
  })
  
  console.log('Test JSON:', result.testJson)
  console.log('Expected layers:', result.expectedLayers)
  
  // Now input this JSON and parse it
  await page.waitForSelector('.monaco-editor', { timeout: 10000 })
  await page.locator('.panel-input .monaco-editor').click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(result.input)
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  
  // Get notification to see how many layers were found
  await page.waitForSelector('.notification.success', { timeout: 5000 })
  const notification = await page.locator('.notification.success').textContent()
  console.log('Notification:', notification)
  
  // The issue: notification says "成功解析 1 个JSON层级" instead of 4
  // This means the analyzer is not finding the nested JSON strings
})