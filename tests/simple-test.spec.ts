import { test } from '@playwright/test'

test('simple nested JSON test', async ({ page }) => {
  // Capture all console logs
  const logs: string[] = []
  page.on('console', msg => {
    const text = msg.text()
    logs.push(text)
  })
  
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Simple nested JSON - config is a JSON string
  const simpleJson = {
    "test": '{"inner": "value"}'
  }
  
  // Input JSON
  await page.waitForSelector('.monaco-editor')
  await page.locator('.panel-input .monaco-editor').click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(JSON.stringify(simpleJson))
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  await page.waitForTimeout(500)
  
  // Check notification
  const notification = await page.locator('.notification.success').textContent()
  console.log('Notification:', notification)
  
  // Print relevant logs
  console.log('\n=== Analyzer Logs ===')
  logs.filter(log => log.includes('JSONLayerAnalyzer') || log.includes('handleAnalyze')).forEach(log => {
    console.log(log)
  })
  console.log('=====================\n')
})