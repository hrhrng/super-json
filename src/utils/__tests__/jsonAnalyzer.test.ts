import { describe, it, expect } from 'vitest'
import { JSONLayerAnalyzer } from '../jsonAnalyzer'

describe('JSONLayerAnalyzer', () => {
  const analyzer = new JSONLayerAnalyzer()

  describe('analyze', () => {
    it('should parse simple JSON object', () => {
      const input = '{"name": "test", "value": 123}'
      const layers = analyzer.analyze(input)
      
      expect(layers).toHaveLength(1)
      expect(layers[0].depth).toBe(0)
      expect(layers[0].type).toBe('object')
      expect(layers[0].content).toEqual({ name: 'test', value: 123 })
    })

    it('should detect escaped JSON strings', () => {
      const input = '{"data": "{\\"nested\\": true}"}'
      const layers = analyzer.analyze(input)
      
      expect(layers.length).toBeGreaterThan(1)
      expect(layers[0].hasChildren).toBe(true)
      expect(layers[1].parentField).toBe('data')
    })

    it('should handle deeply nested structures', () => {
      const nested = JSON.stringify({ level3: 'deep' })
      const level2 = JSON.stringify({ level2: nested })
      const input = JSON.stringify({ level1: level2 })
      
      const layers = analyzer.analyze(input)
      expect(layers.length).toBeGreaterThanOrEqual(3)
    })

    it('should handle invalid JSON as string', () => {
      const input = 'not valid json'
      const layers = analyzer.analyze(input)
      
      expect(layers).toHaveLength(1)
      expect(layers[0].type).toBe('string')
      expect(layers[0].content).toBe(input)
    })
  })

  describe('rebuild', () => {
    it('should rebuild single layer', () => {
      const layers = [{
        depth: 0,
        content: { test: 'value' },
        type: 'object' as const,
      }]
      
      const result = analyzer.rebuild(layers)
      expect(JSON.parse(result)).toEqual({ test: 'value' })
    })

    it('should rebuild nested layers', () => {
      const input = '{"data": "{\\"nested\\": true}"}'
      const layers = analyzer.analyze(input)
      const rebuilt = analyzer.rebuild(layers)
      
      expect(JSON.parse(rebuilt)).toEqual(JSON.parse(input))
    })
  })
})