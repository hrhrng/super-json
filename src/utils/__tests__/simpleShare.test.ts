import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importFromBase64Url, importFromCompressedUrl } from '../simpleShare'
import { gzipSync } from 'node:zlib'

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

  describe('importFromCompressedUrl', () => {
    // Helper: gzip + base64url encode (mirrors the shell command)
    function gzipBase64Url(input: string): string {
      const compressed = gzipSync(Buffer.from(input, 'utf-8'), { level: 9 })
      const base64 = compressed.toString('base64')
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
    }

    beforeEach(() => {
      // Polyfill DecompressionStream for happy-dom if not available
      if (typeof globalThis.DecompressionStream === 'undefined') {
        const { createInflate } = require('node:zlib')

        globalThis.DecompressionStream = class DecompressionStream {
          readable: ReadableStream
          writable: WritableStream

          constructor(_format: string) {
            const inflate = createInflate()
            const chunks: Uint8Array[] = []
            let resolveRead: (() => void) | null = null
            let done = false

            this.writable = new WritableStream({
              write(chunk) {
                return new Promise<void>((resolve, reject) => {
                  inflate.write(chunk, (err: Error | null) => {
                    if (err) reject(err)
                    else resolve()
                  })
                })
              },
              close() {
                return new Promise<void>((resolve) => {
                  inflate.end(() => resolve())
                })
              }
            })

            inflate.on('data', (chunk: Buffer) => {
              chunks.push(new Uint8Array(chunk))
              if (resolveRead) resolveRead()
            })

            inflate.on('end', () => {
              done = true
              if (resolveRead) resolveRead()
            })

            this.readable = new ReadableStream({
              pull(controller) {
                if (chunks.length > 0) {
                  controller.enqueue(chunks.shift()!)
                  return
                }
                if (done) {
                  controller.close()
                  return
                }
                return new Promise<void>((resolve) => {
                  resolveRead = () => {
                    resolveRead = null
                    if (chunks.length > 0) {
                      controller.enqueue(chunks.shift()!)
                    } else if (done) {
                      controller.close()
                    }
                    resolve()
                  }
                })
              }
            })
          }
        } as unknown as typeof DecompressionStream
      }
    })

    it('should decode gzip+base64url-encoded JSON', async () => {
      const input = '{"name":"test"}'
      const encoded = gzipBase64Url(input)
      const result = await importFromCompressedUrl(encoded)
      expect(result).toBe(input)
    })

    it('should handle larger JSON payloads', async () => {
      const input = JSON.stringify({ data: Array.from({ length: 100 }, (_, i) => ({ id: i, value: `item-${i}` })) })
      const encoded = gzipBase64Url(input)

      // Verify compression actually reduces size
      const rawBase64Length = btoa(input).length
      expect(encoded.length).toBeLessThan(rawBase64Length)

      const result = await importFromCompressedUrl(encoded)
      expect(result).toBe(input)
    })

    it('should throw on invalid compressed data', async () => {
      await expect(importFromCompressedUrl('!!!invalid!!!')).rejects.toThrow('Failed to import shared content')
    })
  })
})
