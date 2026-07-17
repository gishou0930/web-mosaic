import { useEffect, useRef, useState } from 'react'
import { clientToMediaPoint, drawPixelated, normalizeRect, type Rect } from '../lib/mosaic'

const imageTypes = 'image/png,image/jpeg,image/webp,image/bmp'

export default function ImageEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sourceRef = useRef<HTMLImageElement | null>(null)
  const workingRef = useRef<HTMLCanvasElement | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [blockSize, setBlockSize] = useState(18)
  const [message, setMessage] = useState('選擇一張圖片後，在預覽上拖曳框選要打馬賽克的區域。')

  const render = () => {
    const source = sourceRef.current
    const working = workingRef.current
    const canvas = canvasRef.current
    if (!source || !working || !canvas) return
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(working, 0, 0)
    if (selection) {
      drawPixelated(ctx, working, selection, blockSize)
      ctx.strokeStyle = '#ffce45'
      ctx.lineWidth = Math.max(2, source.naturalWidth / 600)
      ctx.setLineDash([8, 5])
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      ctx.setLineDash([])
    }
  }

  useEffect(() => { render() }, [selection, blockSize, loaded])
  useEffect(() => () => { sourceRef.current?.src.startsWith('blob:') && URL.revokeObjectURL(sourceRef.current.src) }, [])

  const openImage = (file?: File) => {
    if (!file) return
    const image = new Image()
    image.onload = () => {
      const working = document.createElement('canvas')
      working.width = image.naturalWidth
      working.height = image.naturalHeight
      working.getContext('2d')!.drawImage(image, 0, 0)
      sourceRef.current = image
      workingRef.current = working
      setSelection(null)
      setLoaded(true)
      setMessage(`已載入 ${file.name}（${image.naturalWidth} × ${image.naturalHeight}）`)
    }
    image.onerror = () => setMessage('無法讀取這張圖片。')
    image.src = URL.createObjectURL(file)
  }

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    return clientToMediaPoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), { width: canvas.width, height: canvas.height })
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return
    const current = point(event)
    setSelection(normalizeRect(dragStart.current.x, dragStart.current.y, current.x, current.y, { width: canvasRef.current!.width, height: canvasRef.current!.height }))
  }
  const apply = () => {
    const canvas = canvasRef.current
    const working = workingRef.current
    if (!canvas || !working || !selection) return
    const context = working.getContext('2d')!
    drawPixelated(context, working, selection, blockSize)
    setSelection(null)
    setMessage('已套用馬賽克；可繼續選取其他區域。')
  }
  const download = () => {
    const working = workingRef.current
    if (!working) return
    working.toBlob((blob) => {
      if (!blob) return
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'mosaic.png'
      link.click()
      URL.revokeObjectURL(link.href)
    }, 'image/png')
  }

  return <section className="workspace">
    <div className="intro"><h1>圖片馬賽克</h1><p>原始圖片不會被修改；輸出時下載新的 PNG 檔案。</p></div>
    <div className="toolbar">
      <label className="primary">開啟圖片<input type="file" accept={imageTypes} onChange={(event) => openImage(event.target.files?.[0])} /></label>
      <label>區塊大小 <input aria-label="圖片區塊大小" type="range" min="4" max="80" value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))} /> <b>{blockSize}px</b></label>
      <button disabled={!selection} onClick={apply}>套用馬賽克</button>
      <button disabled={!selection} onClick={() => setSelection(null)}>清除選取</button>
      <button className="primary" disabled={!loaded} onClick={download}>下載 PNG</button>
    </div>
    <p className="status" aria-live="polite">{message}</p>
    <div className="canvas-shell">{loaded ? <canvas ref={canvasRef} className="media-canvas" onPointerDown={(event) => { dragStart.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); setSelection(null) }} onPointerMove={move} onPointerUp={(event) => { move(event); dragStart.current = null }} /> : <div className="empty">尚未載入圖片</div>}</div>
  </section>
}
