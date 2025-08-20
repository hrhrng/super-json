import { test, expect } from '@playwright/test'

test('test breadcrumb with multiple layers', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Multi-layer nested JSON
  const testJson = {
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
      }
    }),
    "data": JSON.stringify({
      "info": "test"
    })
  }
  
  // Input JSON - use setValue to avoid formatting issues
  await page.waitForSelector('.monaco-editor', { timeout: 10000 })
  await page.evaluate((json) => {
    const editors = (window as any).monaco?.editor?.getEditors()
    if (editors && editors.length > 0) {
      editors[0].setValue(JSON.stringify(json, null, 2))
    }
  }, testJson)
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  
  // Wait for notification
  await page.waitForSelector('.notification.success', { timeout: 5000 })
  const notification = await page.locator('.notification.success').textContent()
  console.log('Notification:', notification)
  
  // Check breadcrumb
  const breadcrumbText = await page.locator('.vscode-breadcrumb').textContent()
  console.log('Breadcrumb path:', breadcrumbText)
  
  // Click breadcrumb to open dropdown
  await page.locator('.breadcrumb-item').first().click()
  
  // Wait for dropdown
  await page.waitForSelector('.breadcrumb-dropdown', { timeout: 5000 })
  
  // Get all tree rows
  const treeRows = await page.locator('.tree-row').all()
  console.log('Total tree rows:', treeRows.length)
  
  // Print each row content
  for (let i = 0; i < treeRows.length; i++) {
    const text = await treeRows[i].textContent()
    const classes = await treeRows[i].getAttribute('class')
    console.log(`Row ${i}: "${text}" (${classes})`)
  }
  
  // Check layer labels (L1, L2, L3, etc)
  const layerLabels = await page.locator('.tree-row span:has-text("L")').all()
  console.log('Layer labels found:', layerLabels.length)
  
  for (let label of layerLabels) {
    const text = await label.textContent()
    console.log('Layer label:', text)
  }
  
  // Try clicking a different layer
  if (treeRows.length > 2) {
    await treeRows[2].click()
    await page.waitForTimeout(500)
    
    // Check if breadcrumb updated
    const newBreadcrumb = await page.locator('.vscode-breadcrumb').textContent()
    console.log('Breadcrumb after click:', newBreadcrumb)
  }
  
  // Take screenshot
  await page.screenshot({ path: 'breadcrumb-multilayer.png', fullPage: true })
})