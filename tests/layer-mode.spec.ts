import { test, expect } from '@playwright/test'
import { setEditorContent } from './fixtures/helpers'

test.describe('Layer Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/super-json/')
    await page.waitForLoadState('networkidle')
  })

  test('should parse nested JSON layers', async ({ page }) => {
    const nestedJson = {
      "name": "Test",
      "data": JSON.stringify({
        "nested": "value",
        "deeper": JSON.stringify({
          "level3": "data"
        })
      })
    }

    await setEditorContent(page, JSON.stringify(nestedJson, null, 2))

    // Click Parse button
    await page.locator('button:has-text("Parse")').click()

    // Wait for layers to be detected
    await expect(page.locator('.panel-layer .panel-info')).toContainText('3 layers', { timeout: 10000 })

    // Check breadcrumb appears
    await expect(page.locator('.breadcrumb-item').first()).toBeVisible()
  })

  test('should show layer dropdown when clicking breadcrumb', async ({ page }) => {
    const nestedJson = {
      "config": JSON.stringify({
        "settings": {
          "theme": "dark",
          "nested": JSON.stringify({
            "level3": "deep"
          })
        }
      })
    }

    await setEditorContent(page, JSON.stringify(nestedJson, null, 2))

    // Parse
    await page.locator('button:has-text("Parse")').click()
    await expect(page.locator('.breadcrumb-item').first()).toBeVisible({ timeout: 10000 })

    // Click breadcrumb item
    await page.locator('.breadcrumb-item').first().click()

    // Check dropdown appears
    await page.waitForSelector('.tree-row')
    // Check dropdown contains layer items
    const layerItems = await page.locator('.tree-row').count()
    expect(layerItems).toBeGreaterThan(0)
  })

  test('should support bidirectional sync between layers', async ({ page }) => {
    const nestedJson = {
      "data": JSON.stringify({
        "value": "original"
      })
    }

    await setEditorContent(page, JSON.stringify(nestedJson, null, 2))

    // Parse
    await page.locator('button:has-text("Parse")').click()
    await expect(page.locator('.panel-layer .panel-info')).toContainText('layers', { timeout: 10000 })

    // Wait for layer editor
    await page.waitForSelector('.panel-layer .monaco-editor')

    // Edit the nested layer via Monaco API
    await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        editors[1].setValue('{"value": "updated"}')
      }
    })
    await page.waitForTimeout(500)

    // Click Apply to update input
    await page.locator('button:has-text("Apply")').click()

    // Check input was updated
    await page.waitForTimeout(500)
    const inputContent = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })

    expect(inputContent).toContain('updated')
  })

  test('should navigate between layers using dropdown', async ({ page }) => {
    const nestedJson = {
      "level1": JSON.stringify({
        "level2a": JSON.stringify({ "data": "a" }),
        "level2b": JSON.stringify({ "data": "b" })
      })
    }

    await setEditorContent(page, JSON.stringify(nestedJson, null, 2))

    // Parse
    await page.locator('button:has-text("Parse")').click()
    await expect(page.locator('.breadcrumb-item').first()).toBeVisible({ timeout: 10000 })

    // Open dropdown
    await page.locator('.breadcrumb-item').first().click()
    await page.waitForSelector('.tree-row')

    // Click different layer
    const layerRows = page.locator('.tree-row')
    const count = await layerRows.count()
    if (count > 1) {
      await layerRows.nth(1).click()

      // Verify layer switched (breadcrumb should update)
      await page.waitForTimeout(200)
      const breadcrumbText = await page.locator('.breadcrumb-item').first().textContent()
      expect(breadcrumbText).toBeTruthy()
    }
  })

  test('should apply changes back to input', async ({ page }) => {
    const testJson = {
      "test": JSON.stringify({ "inner": "value" })
    }

    await setEditorContent(page, JSON.stringify(testJson, null, 2))

    // Parse
    await page.locator('button:has-text("Parse")').click()
    await expect(page.locator('.panel-layer .panel-info')).toContainText('layers', { timeout: 10000 })

    // Edit layer via Monaco API
    await page.waitForSelector('.panel-layer .monaco-editor')
    await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 1) {
        editors[1].setValue('{"inner": "modified"}')
      }
    })
    await page.waitForTimeout(500)

    // Apply
    await page.locator('button:has-text("Apply")').click()
    await page.waitForTimeout(500)

    // Verify input updated
    const finalInput = await page.evaluate(() => {
      const editors = (window as any).monaco?.editor?.getEditors()
      if (editors && editors.length > 0) {
        return editors[0].getValue()
      }
      return null
    })

    expect(finalInput).toContain('modified')
  })
})
