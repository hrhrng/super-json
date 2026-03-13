import { test, expect } from '@playwright/test'

test.describe('Hero Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/super-json/')
    await page.waitForLoadState('networkidle')

    // Switch to Hero mode
    await page.locator('.mode-btn:has-text("HERO")').click()
    await page.waitForSelector('#heroMode')
  })

  test('should show placeholder when no JSON loaded', async ({ page }) => {
    // Check placeholder instruction text is visible initially
    const instructionText = page.locator('text=Enter JSON and click "Load → Hero"')
    await expect(instructionText).toBeVisible()

    // Iframe should not be present
    await expect(page.locator('iframe')).not.toBeVisible()
  })

  test('should have input editor and Load button', async ({ page }) => {
    // Check editor exists
    await page.waitForSelector('.monaco-editor')
    await expect(page.locator('.panel .monaco-editor').first()).toBeVisible()

    // Check Load → Hero button exists
    await expect(page.locator('button:has-text("Load → Hero")')).toBeVisible()

    // Check open in new tab button exists
    await expect(page.locator('button[title="Open in new tab"]')).toBeVisible()
  })

  test('should show error for invalid JSON', async ({ page }) => {
    // Input invalid JSON
    await page.waitForSelector('.monaco-editor')
    await page.locator('.panel .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type('{ invalid json }')

    // Try to load into Hero
    await page.locator('button:has-text("Load → Hero")').click()

    // Should show error notification
    await page.waitForSelector('.notification.error')

    // Iframe should not be loaded
    await expect(page.locator('iframe')).not.toBeVisible()
  })
})
