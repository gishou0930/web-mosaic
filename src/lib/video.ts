import type { Rect } from './mosaic'

export type MosaicSegment = Rect & {
  id: string
  startTime: number
  endTime: number
  blockSize: number
}

export function validateSegment(segment: Omit<MosaicSegment, 'id'>, duration: number): string | null {
  if (segment.width < 2 || segment.height < 2) return '請先框選有效的馬賽克區域。'
  if (!Number.isFinite(segment.startTime) || !Number.isFinite(segment.endTime)) return '開始與結束時間必須是數字。'
  if (segment.startTime < 0 || segment.endTime > duration) return '時間必須在影片長度範圍內。'
  if (segment.endTime <= segment.startTime) return '結束時間必須大於開始時間。'
  return null
}

const number = (value: number) => Number(value.toFixed(3)).toString()

export function buildFilterGraph(segments: MosaicSegment[]): string | null {
  if (segments.length === 0) return null
  const labels = segments.map((_, index) => `[crop${index}]`).join('')
  const filters = [`[0:v]split=${segments.length + 1}[base]${labels}`]
  let base = '[base]'
  segments.forEach((segment, index) => {
    const cropped = `[crop${index}]crop=${segment.width}:${segment.height}:${segment.x}:${segment.y},scale=${Math.max(1, Math.ceil(segment.width / segment.blockSize))}:${Math.max(1, Math.ceil(segment.height / segment.blockSize))},scale=${segment.width}:${segment.height}:flags=neighbor[pixel${index}]`
    const output = index === segments.length - 1 ? '[outv]' : `[overlay${index}]`
    filters.push(cropped)
    filters.push(`${base}[pixel${index}]overlay=${segment.x}:${segment.y}:enable='between(t,${number(segment.startTime)},${number(segment.endTime)})'${output}`)
    base = output
  })
  return filters.join(';')
}
