import { test } from '@playwright/test'

test('debug analyzer with console output', async ({ page }) => {
  // Collect console messages
  const consoleLogs: string[] = []
  
  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text()
    consoleLogs.push(text)
    if (msg.type() === 'log' && (text.includes('scan') || text.includes('Found') || text.includes('Analyzing'))) {
      console.log('Browser console:', text)
    }
  })
  
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
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
  console.log('\n=== Test JSON ===')
  console.log(jsonString)
  console.log('=================\n')
  
  // Input JSON - need to be careful with formatting
  await page.waitForSelector('.monaco-editor', { timeout: 10000 })
  await page.locator('.panel-input .monaco-editor').click()
  await page.keyboard.press('Control+A')
  
  // Type the JSON carefully to avoid formatting issues
  await page.keyboard.type(jsonString)
  
  // Parse - this should trigger console logs
  console.log('\n=== Clicking Parse button ===\n')
  await page.locator('button:has-text("Parse")').click()
  
  // Wait a bit for logs
  await page.waitForTimeout(1000)
  
  // Get notification
  await page.waitForSelector('.notification.success', { timeout: 5000 })
  const notification = await page.locator('.notification.success').textContent()
  console.log('\nNotification:', notification)
  
  // Check the breadcrumb to see what layers were found
  const breadcrumb = await page.locator('.vscode-breadcrumb').textContent()
  console.log('Breadcrumb:', breadcrumb)
  
  // Open dropdown to see all layers
  await page.locator('.breadcrumb-item').first().click()
  await page.waitForSelector('.breadcrumb-dropdown', { timeout: 5000 })
  
  const layerCount = await page.locator('.tree-row').count()
  console.log('Layers in dropdown:', layerCount)
  
  // Get all layer texts
  const layers = await page.locator('.tree-row').all()
  for (let i = 0; i < layers.length; i++) {
    const text = await layers[i].textContent()
    console.log(`  Layer ${i}: ${text}`)
  }
  
  // Print all console logs at the end
  console.log('\n=== All Browser Console Logs ===')
  consoleLogs.forEach(log => console.log(log))
  console.log('=================================\n')
})