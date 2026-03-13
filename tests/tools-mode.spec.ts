import { test, expect } from '@playwright/test'
import { setEditorContent } from './fixtures/helpers'

test.describe('Tools Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/super-json/')
    await page.waitForLoadState('networkidle')

    // Switch to Tools mode
    await page.locator('.mode-btn:has-text("TOOLS")').click()
    await page.waitForSelector('#processorMode')
  })

  test('should encode JSON to Base64', async ({ page }) => {
    const testJson = { "test": "data" }

    await setEditorContent(page, JSON.stringify(testJson, null, 2))

    // Click Base64 Encode
    await page.locator('button:has-text("Base64 Encode")').click()

    // Check notification
    await page.waitForSelector('.notification.success:has-text("Base64 encoded successfully")')

    // Check output is base64
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })

    expect(outputValue).toBeTruthy()
    expect(outputValue).toMatch(/^[A-Za-z0-9+/=]+$/)
  })

  test('should decode Base64 to JSON', async ({ page }) => {
    const base64 = 'eyJ0ZXN0IjoiZGF0YSJ9'

    await setEditorContent(page, base64)

    // Click Base64 Decode
    await page.locator('button:has-text("Base64 Decode")').click()

    // Check notification
    await page.waitForSelector('.notification.success:has-text("Base64 decoded successfully")')

    // Check output is JSON
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })

    expect(outputValue).toContain('"test"')
    expect(outputValue).toContain('"data"')
  })

  test('should URL encode JSON', async ({ page }) => {
    const testJson = { "test": "value with spaces" }

    await setEditorContent(page, JSON.stringify(testJson, null, 2))

    // Click URL Encode
    await page.locator('button:has-text("URL Encode")').click()

    // Check notification
    await page.waitForSelector('.notification.success:has-text("URL encoded successfully")')

    // Check output is URL encoded
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })

    expect(outputValue).toContain('%20')
    expect(outputValue).toContain('%22')
  })

  test('should sort JSON keys', async ({ page }) => {
    const unsortedJson = { "z": 1, "a": 2, "m": 3 }

    await setEditorContent(page, JSON.stringify(unsortedJson, null, 2))

    // Click Sort Keys
    await page.locator('button:has-text("Sort Keys")').click()

    // Check notification
    await page.waitForSelector('.notification.success:has-text("Keys sorted successfully")')

    // Check output has sorted keys
    const outputValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })

    // Keys should appear in alphabetical order
    const aIndex = outputValue?.indexOf('"a"') ?? -1
    const mIndex = outputValue?.indexOf('"m"') ?? -1
    const zIndex = outputValue?.indexOf('"z"') ?? -1

    expect(aIndex).toBeLessThan(mIndex)
    expect(mIndex).toBeLessThan(zIndex)
  })

  test('should copy output to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-write', 'clipboard-read'])

    const testJson = { "test": "clipboard" }

    await setEditorContent(page, JSON.stringify(testJson, null, 2))

    await page.locator('button:has-text("Base64 Encode")').click()
    await page.waitForSelector('.notification.success')

    // Click Copy (the action button in the output panel)
    await page.locator('.actions button:has-text("Copy")').click()

    // Check notification
    await page.waitForSelector('.notification.success:has-text("Copied to clipboard")')
  })

  test('should escape JSON', async ({ page }) => {
    const testJson = { "test": "value" }

    await setEditorContent(page, JSON.stringify(testJson, null, 2))

    // Click Escape (exact match to avoid matching "Unescape")
    await page.getByRole('button', { name: 'Escape', exact: true }).click()
    await page.waitForSelector('.notification.success:has-text("Escaped successfully")')

    // Check output contains escaped content
    const escapedValue = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        return editors[1].getValue()
      }
      return null
    })

    expect(escapedValue).toBeTruthy()
    expect(escapedValue).toContain('\\"test\\"')
  })
})
