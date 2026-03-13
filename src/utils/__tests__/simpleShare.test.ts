import { describe, it, expect } from 'vitest'
import { importFromBase64Url } from '../simpleShare'

describe('simpleShare', () => {
  describe('importFromBase64Url', () => {
    it('should decode base64url-encoded JSON', () => {
      // echo -n '{"name":"test"}' | base64 | tr '+/' '-_' | tr -d '='
      const encoded = btoa('{"name":"test"}').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = importFromBase64Url(encoded)
      expect(result).toBe('{"name":"test"}')
    })

    it('should handle base64url with padding stripped', () => {
      // Content that would normally need padding
      const input = '{"a":1}'
      const encoded = btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = importFromBase64Url(encoded)
      expect(result).toBe(input)
    })

    it('should handle unicode content', () => {
      const input = '{"message":"hello"}'
      const encoded = btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const result = importFromBase64Url(encoded)
      expect(result).toBe(input)
    })

    it('should throw on invalid base64 data', () => {
      expect(() => importFromBase64Url('!!!invalid!!!')).toThrow('Failed to import shared content')
    })
  })
})
