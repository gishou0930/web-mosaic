export type Rect = { x: number; y: number; width: number; height: number }

export function normalizeRect(startX: number, startY: number, endX: number, endY: number, bounds: { width: number; height: number }): Rect | null {
  const left = Math.max(0, Math.min(bounds.width, Math.min(startX, endX)))
  const top = Math.max(0, Math.min(bounds.height, Math.min(startY, endY)))
  const right = Math.max(0, Math.min(bounds.width, Math.max(startX, endX)))
  const bottom = Math.max(0, Math.min(bounds.height, Math.max(startY, endY)))
  const width = Math.round(right - left)
  const height = Math.round(bottom - top)
  return width > 1 && height > 1 ? { x: Math.round(left), y: Math.round(top), width, height } : null
}

export function clientToMediaPoint(clientX: number, clientY: number, element: DOMRect, media: { width: number; height: number }) {
  return {
    x: ((clientX - element.left) / element.width) * media.width,
    y: ((clientY - element.top) / element.height) * media.height,
  }
}

export function drawPixelated(ctx: CanvasRenderingContext2D, source: CanvasImageSource, rect: Rect, blockSize: number, reusableBuffer?: HTMLCanvasElement) {
  const smallWidth = Math.max(1, Math.ceil(rect.width / Math.max(2, blockSize)))
  const smallHeight = Math.max(1, Math.ceil(rect.height / Math.max(2, blockSize)))
  const buffer = reusableBuffer ?? document.createElement('canvas')
  buffer.width = smallWidth
  buffer.height = smallHeight
  const bufferContext = buffer.getContext('2d')!
  bufferContext.drawImage(source, rect.x, rect.y, rect.width, rect.height, 0, 0, smallWidth, smallHeight)
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(buffer, 0, 0, smallWidth, smallHeight, rect.x, rect.y, rect.width, rect.height)
  ctx.restore()
}
