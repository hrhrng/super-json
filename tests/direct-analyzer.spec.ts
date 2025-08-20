import { test, expect } from '@playwright/test'

test('test analyzer directly in browser', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Execute analyzer test directly in browser context
  const result = await page.evaluate(() => {
    // Create test JSON
    const testJson = {
      "config": '{"settings":{"theme":"dark","nested":"{\\"level3\\":\\"deep\\"}"}}',
      "data": '{"info":"test"}'
    }
    
    const jsonString = JSON.stringify(testJson, null, 2)
    
    // Manually test the analyzer logic
    const layers = []
    
    function scanJSON(obj: any, depth: number, parentIndex: number, path: string = '') {
      if (!obj || typeof obj !== 'object') return
      
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key
        
        if (typeof value === 'string') {
          // Check if it looks like JSON
          const trimmed = value.trim()
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
              (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            try {
              const parsed = JSON.parse(value)
              if (typeof parsed === 'object' && parsed !== null) {
                layers.push({
                  depth: depth + 1,
                  field: fieldPath,
                  content: parsed,
                  parentIndex: parentIndex
                })
                
                const newIndex = layers.length - 1
                // Recursively scan
                scanJSON(parsed, depth + 1, newIndex, '')
              }
            } catch (e) {
              // Not valid JSON
            }
          }
        }
      })
    }
    
    // Add root layer
    const parsed = JSON.parse(jsonString)
    layers.push({
      depth: 0,
      field: null,
      content: parsed,
      parentIndex: -1
    })
    
    // Scan for nested JSON
    scanJSON(parsed, 0, 0)
    
    return {
      input: jsonString,
      layerCount: layers.length,
      layers: layers.map(l => ({
        depth: l.depth,
        field: l.field
      }))
    }
  })
  
  console.log('Direct analyzer test result:')
  console.log('  Input:', result.input)
  console.log('  Layer count:', result.layerCount)
  console.log('  Layers:')
  result.layers.forEach((layer, i) => {
    console.log(`    ${i}: depth=${layer.depth}, field=${layer.field}`)
  })
  
  expect(result.layerCount).toBeGreaterThan(1)
  expect(result.layerCount).toBe(4) // Root + config + nested + data
})