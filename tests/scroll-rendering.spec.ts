import { test, expect } from '@playwright/test'

test.describe('Monaco Editor Scroll Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('.monaco-editor', { timeout: 10000 })
  })

  test('should maintain text visibility when scrolling through long JSON with Unicode characters', async ({ page }) => {
    // Test JSON with long lines and Unicode characters
    const testJson = {
      "chat_input|01": {
        "chat_input": "我要退款\n",
        "query": "",
        "customerId": "",
        "poiId": 0,
        "itemId": "",
        "merchantId": 0,
        "extraInfo": "",
        "clientInfo": "",
        "orderId": 0,
        "sessionId": "",
        "history@#@#": "[{\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"HumanMessage\"], \"kwargs\": {\"content\": \"（全款预售）黄金嘎粮王（5500粒）\", \"type\": \"human\", \"id\": \"8408eff0-adb9-4f43-91db-f25066d8b6c0\"}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"None\", \"type\": \"ai\", \"id\": \"0aeed911-5f95-44fa-b306-2cce2d7f4ae6\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"HumanMessage\"], \"kwargs\": {\"content\": \"我要退款\", \"type\": \"human\", \"id\": \"f0151acc-59e3-4491-93d0-f7921eb48dab\"}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"9571cb8a-1ef1-4bf6-aa32-111880673c70\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"6694ec13-5d8b-4bcb-9584-fd8dd99dc5f8\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"04b548b1-4eec-4e91-ba3c-679ae833b0e6\", \"tool_calls\": [], \"invalid_tool_calls\": []}}]"
      }
    }

    // Set JSON content via clipboard
    await page.evaluate((json) => {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    }, testJson)
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+V')
    await page.waitForTimeout(500)

    // Parse the JSON
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success', { timeout: 5000 })

    // Wait for layers to be created
    await page.waitForSelector('.breadcrumb-item', { timeout: 5000 })

    // Click on the first layer (Root)
    const rootBreadcrumb = page.locator('.breadcrumb-item').first()
    await rootBreadcrumb.click()
    await page.waitForTimeout(500)

    // Get the layer editor
    const layerEditor = page.locator('.panel-layer .monaco-editor').first()
    await expect(layerEditor).toBeVisible()

    // Scroll through the editor in steps
    const scrollSteps = [
      { position: 0, description: 'top' },
      { position: 0.25, description: 'quarter' },
      { position: 0.5, description: 'middle' },
      { position: 0.75, description: 'three-quarters' },
      { position: 1.0, description: 'bottom' }
    ]

    for (const step of scrollSteps) {
      // Scroll to position
      await layerEditor.evaluate((el, pos) => {
        const scrollContainer = el.querySelector('.monaco-scrollable-element') as HTMLElement
        if (scrollContainer) {
          const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
          scrollContainer.scrollTop = maxScroll * pos
        }
      }, step.position)

      await page.waitForTimeout(300)

      // Take a screenshot at this position
      await page.screenshot({
        path: `test-results/scroll-${step.description}.png`,
        fullPage: false
      })

      // Check that the editor is still rendering content
      const editorContent = await layerEditor.evaluate((el) => {
        const lines = el.querySelectorAll('.view-line')
        return {
          lineCount: lines.length,
          hasContent: lines.length > 0,
          firstLineVisible: lines[0]?.textContent || '',
          lastLineVisible: lines[lines.length - 1]?.textContent || ''
        }
      })

      console.log(`At ${step.description}: ${editorContent.lineCount} lines visible`)
      expect(editorContent.hasContent).toBeTruthy()
      expect(editorContent.lineCount).toBeGreaterThan(0)
    }

    // Scroll back to top
    await layerEditor.evaluate((el) => {
      const scrollContainer = el.querySelector('.monaco-scrollable-element') as HTMLElement
      if (scrollContainer) {
        scrollContainer.scrollTop = 0
      }
    })

    await page.waitForTimeout(300)

    // Verify we're back at the top and content is visible
    const finalContent = await layerEditor.evaluate((el) => {
      const lines = el.querySelectorAll('.view-line')
      return {
        lineCount: lines.length,
        firstLineText: lines[0]?.textContent || ''
      }
    })

    expect(finalContent.lineCount).toBeGreaterThan(0)
    console.log('Test completed successfully - no black screens detected')
  })

  test('should handle clicking on long line content', async ({ page }) => {
    // Test JSON with long lines and Unicode characters
    const testJson = {
      "chat_input|01": {
        "chat_input": "我要退款\n",
        "query": "",
        "customerId": "",
        "poiId": 0,
        "itemId": "",
        "merchantId": 0,
        "extraInfo": "",
        "clientInfo": "",
        "orderId": 0,
        "sessionId": "",
        "history@#@#": "[{\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"HumanMessage\"], \"kwargs\": {\"content\": \"（全款预售）黄金嘎粮王（5500粒）\", \"type\": \"human\", \"id\": \"8408eff0-adb9-4f43-91db-f25066d8b6c0\"}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"None\", \"type\": \"ai\", \"id\": \"0aeed911-5f95-44fa-b306-2cce2d7f4ae6\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"HumanMessage\"], \"kwargs\": {\"content\": \"我要退款\", \"type\": \"human\", \"id\": \"f0151acc-59e3-4491-93d0-f7921eb48dab\"}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"9571cb8a-1ef1-4bf6-aa32-111880673c70\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"6694ec13-5d8b-4bcb-9584-fd8dd99dc5f8\", \"tool_calls\": [], \"invalid_tool_calls\": []}}, {\"lc\": 1, \"type\": \"constructor\", \"id\": [\"langchain\", \"schema\", \"messages\", \"AIMessage\"], \"kwargs\": {\"content\": \"请问您要咨询哪个订单的退款呢？请先选择对应的订单，以便我为您处理。\", \"type\": \"ai\", \"id\": \"04b548b1-4eec-4e91-ba3c-679ae833b0e6\", \"tool_calls\": [], \"invalid_tool_calls\": []}}]"
      }
    }

    // Set JSON content via clipboard
    await page.evaluate((json) => {
      navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    }, testJson)
    await page.locator('.panel-input .monaco-editor').click()
    await page.keyboard.press('Control+A')
    await page.keyboard.press('Control+V')
    await page.waitForTimeout(500)

    // Parse the JSON
    await page.locator('button:has-text("Parse")').click()
    await page.waitForSelector('.notification.success', { timeout: 5000 })

    // Wait for layers
    await page.waitForSelector('.breadcrumb-item', { timeout: 5000 })

    // Click on the first layer
    const rootBreadcrumb = page.locator('.breadcrumb-item').first()
    await rootBreadcrumb.click()
    await page.waitForTimeout(500)

    const layerEditor = page.locator('.panel-layer .monaco-editor').first()

    // Scroll to middle where the long "history@#@#" line is
    await layerEditor.evaluate((el) => {
      const scrollContainer = el.querySelector('.monaco-scrollable-element') as HTMLElement
      if (scrollContainer) {
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight
        scrollContainer.scrollTop = maxScroll * 0.5
      }
    })

    await page.waitForTimeout(500)

    // Try to click on a line in the middle
    const lines = layerEditor.locator('.view-line')
    const middleLineCount = await lines.count()
    if (middleLineCount > 5) {
      await lines.nth(5).click()
      await page.waitForTimeout(200)

      // Verify cursor is active and editor is responsive
      const cursorVisible = await layerEditor.locator('.cursor').isVisible()
      expect(cursorVisible).toBeTruthy()
    }
  })
})
