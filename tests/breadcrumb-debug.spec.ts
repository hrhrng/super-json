import { test, expect } from '@playwright/test'

test('debug breadcrumb dropdown', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Simple test JSON
  const testJson = {
    "data": JSON.stringify({ "nested": "value" })
  }
  
  // Wait for editor and input JSON
  await page.waitForSelector('.monaco-editor', { timeout: 10000 })
  await page.locator('.panel-input .monaco-editor').click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type(JSON.stringify(testJson, null, 2))
  
  // Parse
  await page.locator('button:has-text("Parse")').click()
  
  // Wait for notification
  await page.waitForSelector('.notification.success', { timeout: 5000 })
  
  // Check if breadcrumb exists
  const breadcrumb = await page.locator('.vscode-breadcrumb')
  const breadcrumbExists = await breadcrumb.count()
  console.log('Breadcrumb exists:', breadcrumbExists)
  
  // Get breadcrumb content
  const breadcrumbText = await breadcrumb.textContent()
  console.log('Breadcrumb text:', breadcrumbText)
  
  // Check for breadcrumb items
  const items = await page.locator('.breadcrumb-item').count()
  console.log('Breadcrumb items count:', items)
  
  if (items > 0) {
    // Click first breadcrumb item
    await page.locator('.breadcrumb-item').first().click()
    
    // Wait a bit for dropdown
    await page.waitForTimeout(500)
    
    // Check if dropdown appears
    const dropdown = await page.locator('.breadcrumb-dropdown').count()
    console.log('Dropdown visible:', dropdown)
    
    // Get dropdown content if visible
    if (dropdown > 0) {
      const dropdownContent = await page.locator('.breadcrumb-dropdown').textContent()
      console.log('Dropdown content:', dropdownContent)
      
      const treeRows = await page.locator('.tree-row').count()
      console.log('Tree rows count:', treeRows)
    }
  }
  
  // Take screenshot for debugging
  await page.screenshot({ path: 'breadcrumb-debug.png', fullPage: true })
})