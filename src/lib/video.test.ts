import { describe, expect, it } from 'vitest'
import { normalizeRect } from './mosaic'
import { buildFilterGraph, validateSegment } from './video'

describe('mosaic geometry', () => {
  it('normalizes reverse and out-of-bounds selections', () => {
    expect(normalizeRect(120, 90, -5, -2, { width: 100, height: 80 })).toEqual({ x: 0, y: 0, width: 100, height: 80 })
  })
})

describe('video segments', () => {
  const segment = { x: 10, y: 12, width: 40, height: 24, startTime: 1.2, endTime: 3.8, blockSize: 8 }
  it('rejects invalid time ranges', () => expect(validateSegment({ ...segment, endTime: 1.2 }, 10)).toContain('結束'))
  it('creates timed overlays for multiple segments', () => {
    const graph = buildFilterGraph([{ id: 'one', ...segment }, { id: 'two', ...segment, x: 50, startTime: 4, endTime: 7 }])!
    expect(graph).toContain('split=3')
    expect(graph).toContain("between(t,1.2,3.8)")
    expect(graph).toContain("between(t,4,7)")
    expect(graph).toContain('[outv]')
  })
})
