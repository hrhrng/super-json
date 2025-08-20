import { test } from '@playwright/test'

test('complex nested JSON test', async ({ page }) => {
  // Capture all console logs
  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(text)
  })
  
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Complex nested JSON
  const complexJson = {
    "level1": JSON.stringify({
      "level2": JSON.stringify({
        "level3": "deep value"
      })
    })
  }
  
  console.log('Test JSON:', JSON.stringify(complexJson, null, 2))
  
  // Input JSON - use setValue instead of typing to avoid formatting issues
  await page.waitForSelector('.monaco-editor')
  
  const jsonString = JSON.stringify(complexJson, null, 2)
  
  // Use evaluate to set the value directly
  await page.evaluate((json) => {
    const editors = (window as any).monaco?.editor?.getEditors()
    if (editors && editors.length > 0) {
      editors[0].setValue(json)
    }
  }, jsonString)
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  await page.waitForTimeout(500)
  
  // Check notification
  const notification = await page.locator('.notification.success').textContent()
  console.log('Notification:', notification)
  
  // Open breadcrumb dropdown
  await page.locator('.breadcrumb-item').first().click()
  await page.waitForSelector('.breadcrumb-dropdown')
  
  const layers = await page.locator('.tree-row').all()
  console.log('Layers found:', layers.length)
  for (let i = 0; i < layers.length; i++) {
    const text = await layers[i].textContent()
    console.log(`  Layer ${i}: ${text}`)
  }
  
  // Print relevant logs
  console.log('\n=== Analyzer Logs ===')
  logs.filter(log => log.includes('JSONLayerAnalyzer') || log.includes('handleAnalyze')).forEach(log => {
    console.log(log)
  })
  console.log('=====================\n')
})