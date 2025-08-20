import { test } from '@playwright/test'

test('test TreeMenu with real nested JSON', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Real nested JSON with multiple layers
  const nestedJson = {
    "config": JSON.stringify({
      "settings": {
        "theme": "dark",
        "nested": JSON.stringify({
          "level3": {
            "deep": JSON.stringify({
              "level4": "final"
            })
          }
        })
      },
      "data": {
        "info": "test"
      }
    }),
    "items": JSON.stringify([
      { "id": 1, "value": JSON.stringify({ "inner": "data" }) }
    ])
  }
  
  // Set value directly
  await page.waitForSelector('.monaco-editor')
  await page.evaluate((json) => {
    const editors = (window as any).monaco?.editor?.getEditors()
    if (editors && editors.length > 0) {
      editors[0].setValue(JSON.stringify(json, null, 2))
    }
  }, nestedJson)
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  await page.waitForTimeout(500)
  
  // Get notification
  const notification = await page.locator('.notification.success').textContent()
  console.log('Notification:', notification)
  
  // Check breadcrumb
  const breadcrumb = await page.locator('.vscode-breadcrumb').textContent()
  console.log('Initial breadcrumb:', breadcrumb)
  
  // Click to open TreeMenu
  await page.locator('.breadcrumb-item').first().click()
  await page.waitForSelector('.breadcrumb-dropdown')
  
  // Get all tree rows
  const treeRows = await page.locator('.tree-row').all()
  console.log('\nTreeMenu layers found:', treeRows.length)
  
  for (let i = 0; i < treeRows.length; i++) {
    const text = await treeRows[i].textContent()
    const style = await treeRows[i].getAttribute('style')
    console.log(`  Layer ${i}: "${text}" (padding: ${style?.match(/padding-left: (\d+)px/)?.[1] || '0'}px)`)
  }
  
  // Try to navigate to a deeper layer
  if (treeRows.length > 2) {
    console.log('\nClicking on layer 2...')
    await treeRows[2].click()
    await page.waitForTimeout(200)
    
    const newBreadcrumb = await page.locator('.vscode-breadcrumb').textContent()
    console.log('Breadcrumb after navigation:', newBreadcrumb)
  }
})