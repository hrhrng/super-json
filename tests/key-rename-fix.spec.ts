import { test, expect } from '@playwright/test'

test('key renaming in layer mode should not duplicate keys', async ({ page }) => {
  await page.goto('http://localhost:3000/super-json/')
  
  // Switch to layer mode
  await page.getByRole('button', { name: 'Layer' }).click()
  
  // Input test JSON with nested structure
  const testJson = {
    "data": "{\"a\":\"value1\",\"b\":\"value2\"}"
  }
  
  // Clear input and set test JSON
  const inputEditor = page.locator('.panel:first-child .monaco-editor textarea')
  await inputEditor.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.type(JSON.stringify(testJson, null, 2))
  
  // Parse the JSON
  await page.getByRole('button', { name: 'Parse' }).click()
  
  // Wait for layers to be created
  await page.waitForTimeout(1000)
  
  // Click on the second layer (the nested JSON)
  const breadcrumb = page.locator('.vscode-breadcrumb')
  await expect(breadcrumb).toBeVisible()
  
  // Find the dropdown button and click it
  const dropdownButton = breadcrumb.locator('button').last()
  await dropdownButton.click()
  
  // Select "Layer 2" from dropdown
  await page.locator('.dropdown-menu').getByText('Layer 2').click()
  
  // Wait for layer editor to load
  await page.waitForTimeout(500)
  
  // Edit the JSON in layer editor - change key "a" to "A"
  const layerEditor = page.locator('.panel-layer .monaco-editor textarea')
  await layerEditor.click()
  await page.keyboard.press('Control+a')
  
  // Type new JSON with renamed key
  const editedJson = {
    "A": "value1",  // Changed from "a" to "A"
    "b": "value2"
  }
  await page.keyboard.type(JSON.stringify(editedJson, null, 2))
  
  // Wait for sync
  await page.waitForTimeout(500)
  
  // Apply changes
  await page.getByRole('button', { name: 'Apply' }).click()
  
  // Wait for apply to complete
  await page.waitForTimeout(500)
  
  // Get the input content
  const inputContent = await inputEditor.inputValue()
  const parsedInput = JSON.parse(inputContent)
  const innerData = JSON.parse(parsedInput.data)
  
  // Verify that only "A" exists, not both "a" and "A"
  expect(innerData).toHaveProperty('A', 'value1')
  expect(innerData).not.toHaveProperty('a')
  expect(innerData).toHaveProperty('b', 'value2')
  
  // Verify the correct number of keys
  expect(Object.keys(innerData)).toHaveLength(2)
  
  console.log('✅ Key renaming test passed - no duplicate keys!')
})

test('camelCase to snake_case conversion works', async ({ page }) => {
  await page.goto('http://localhost:3000/super-json/')
  
  // Switch to processor mode
  await page.getByRole('button', { name: 'Tools' }).click()
  
  // Input test JSON with camelCase keys
  const testJson = {
    "firstName": "John",
    "lastName": "Doe",
    "homeAddress": {
      "streetName": "Main St",
      "zipCode": "12345"
    }
  }
  
  // Clear input and set test JSON
  const inputEditor = page.locator('.panel:first-child .monaco-editor textarea')
  await inputEditor.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.type(JSON.stringify(testJson, null, 2))
  
  // Click camelCase → snake_case button
  await page.getByRole('button', { name: 'camelCase → snake_case' }).click()
  
  // Wait for conversion
  await page.waitForTimeout(500)
  
  // Get output content
  const outputContent = await page.locator('.panel:last-child .monaco-editor').textContent()
  
  // Verify conversion
  expect(outputContent).toContain('first_name')
  expect(outputContent).toContain('last_name')
  expect(outputContent).toContain('home_address')
  expect(outputContent).toContain('street_name')
  expect(outputContent).toContain('zip_code')
  
  // Should not contain camelCase keys anymore
  expect(outputContent).not.toContain('firstName')
  expect(outputContent).not.toContain('homeAddress')
  
  console.log('✅ camelCase to snake_case conversion test passed!')
})

test('eager formatting in processor mode works', async ({ page }) => {
  await page.goto('http://localhost:3000/super-json/')
  
  // Switch to processor mode
  await page.getByRole('button', { name: 'Tools' }).click()
  
  // Clear input
  const inputEditor = page.locator('.panel:first-child .monaco-editor textarea')
  await inputEditor.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  
  // Type unformatted JSON that ends with }
  await page.keyboard.type('{"name":"test","value":123}')
  
  // Wait for eager formatting to trigger (300ms delay + processing time)
  await page.waitForTimeout(1000)
  
  // Get the formatted content
  const inputContent = await inputEditor.inputValue()
  
  // Check if JSON was auto-formatted (should have newlines and indentation)
  expect(inputContent).toContain('\n')
  expect(inputContent).toMatch(/^\{[\s\S]*"name":\s*"test"/)
  
  console.log('✅ Eager formatting test passed!')
})