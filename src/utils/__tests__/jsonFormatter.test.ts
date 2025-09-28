import { describe, expect, it } from 'vitest'
import { formatJsonBestEffort, minifyJsonBestEffort } from '../jsonFormatter'

describe('formatJsonBestEffort', () => {
  it('returns strict mode formatting for valid JSON', () => {
    const input = '{"foo": {"bar": 1}}'
    const result = formatJsonBestEffort(input)

    expect(result.mode).toBe('strict')
    expect(result.output).toBe(`{
  "foo": {
    "bar": 1
  }
}`)
  })

  it('falls back to loose formatting when JSON is invalid', () => {
    const input = '{"foo": 1,, "bar": 2}'
    const result = formatJsonBestEffort(input)

    expect(result.mode).toBe('loose')
    expect(result.output).toContain('"foo": 1')
    expect(result.output.split('\n').length).toBeGreaterThan(1)
  })

  it('preserves separation between primitive tokens when recovering', () => {
    const input = '1 2'
    const result = formatJsonBestEffort(input)

    expect(result.mode).toBe('loose')
    expect(result.output).toBe('1 2')
  })
})

describe('minifyJsonBestEffort', () => {
  it('keeps strict minification for valid JSON', () => {
    const input = '{"foo": {"bar": 1}}'
    const result = minifyJsonBestEffort(input)

    expect(result.mode).toBe('strict')
    expect(result.output).toBe('{"foo":{"bar":1}}')
  })

  it('avoids merging tokens when minifying invalid JSON', () => {
    const input = 'true false'
    const result = minifyJsonBestEffort(input)

    expect(result.mode).toBe('loose')
    expect(result.output).toBe('true false')
  })
})
