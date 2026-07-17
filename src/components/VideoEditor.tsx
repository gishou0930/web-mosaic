import { useEffect, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { clientToMediaPoint, drawPixelated, normalizeRect, type Rect } from '../lib/mosaic'
import { buildFilterGraph, validateSegment, type MosaicSegment } from '../lib/video'

const videoTypes = 'video/mp4,video/quicktime,video/x-msvideo,video/x-matroska'
const MAX_SIZE = 200 * 1024 * 1024
const MAX_DURATION = 10 * 60

const time = (seconds: number) => Number.isFinite(seconds) ? seconds.toFixed(3) : '0.000'

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), milliseconds)),
  ])
}

export default function VideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<File | null>(null)
  const urlRef = useRef<string | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const pixelBufferRef = useRef<HTMLCanvasElement | null>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const cancelled = useRef(false)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [selection, setSelection] = useState<Rect | null>(null)
  const [blockSize, setBlockSize] = useState(18)
  const [startTime, setStartTime] = useState('0.000')
  const [endTime, setEndTime] = useState('0.000')
  const [segments, setSegments] = useState<MosaicSegment[]>([])
  const [status, setStatus] = useState('選擇影片後，播放或拖曳時間軸到目標影格，再框選馬賽克區域。')
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const render = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const playhead = video.currentTime
    const pixelBuffer = pixelBufferRef.current ?? (pixelBufferRef.current = document.createElement('canvas'))
    segments.filter((segment) => playhead >= segment.startTime && playhead <= segment.endTime)
      .forEach((segment) => drawPixelated(ctx, video, segment, segment.blockSize, pixelBuffer))
    if (selection) {
      drawPixelated(ctx, video, selection, blockSize)
      ctx.strokeStyle = '#ffce45'
      ctx.lineWidth = Math.max(2, canvas.width / 600)
      ctx.setLineDash([8, 5])
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height)
      ctx.setLineDash([])
    }
  }
  useEffect(() => { render() }, [currentTime, selection, segments, blockSize, loaded])
  useEffect(() => {
    if (!playing) return
    let frameId = 0
    const drawFrame = () => {
      render()
      frameId = requestAnimationFrame(drawFrame)
    }
    frameId = requestAnimationFrame(drawFrame)
    return () => cancelAnimationFrame(frameId)
  }, [playing, selection, segments, blockSize])
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  const openVideo = (file?: File) => {
    if (!file) return
    if (file.size > MAX_SIZE) { setStatus('影片超過 200 MB，請改用桌面版 VideoMosaic.exe。'); return }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = URL.createObjectURL(file)
    fileRef.current = file
    setSegments([]); setSelection(null); setLoaded(false); setStatus(`正在讀取 ${file.name}…`)
    const video = videoRef.current!
    video.src = urlRef.current
    video.load()
  }

  const metadata = () => {
    const video = videoRef.current!
    if (!Number.isFinite(video.duration) || video.duration > MAX_DURATION) {
      setStatus('影片超過 10 分鐘，請改用桌面版 VideoMosaic.exe。')
      video.removeAttribute('src'); video.load(); return
    }
    setDuration(video.duration); setEndTime(time(video.duration))
    setStatus(`已載入影片（${video.videoWidth} × ${video.videoHeight}，${time(video.duration)} 秒）`)
  }
  const firstFrameReady = () => {
    const video = videoRef.current!
    video.pause()
    video.currentTime = 0
    setCurrentTime(0)
    setLoaded(true)
    requestAnimationFrame(render)
  }
  const togglePlay = async () => {
    const video = videoRef.current!
    if (video.paused) await video.play(); else video.pause()
  }
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    return clientToMediaPoint(event.clientX, event.clientY, canvas.getBoundingClientRect(), { width: canvas.width, height: canvas.height })
  }
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart.current) return
    const cursor = point(event); const canvas = canvasRef.current!
    setSelection(normalizeRect(dragStart.current.x, dragStart.current.y, cursor.x, cursor.y, { width: canvas.width, height: canvas.height }))
  }
  const addSegment = () => {
    if (!selection) { setStatus('請先在目前影格框選一個矩形區域。'); return }
    const candidate = { ...selection, startTime: Number(startTime), endTime: Number(endTime), blockSize }
    const error = validateSegment(candidate, duration)
    if (error) { setStatus(error); return }
    setSegments((items) => [...items, { id: crypto.randomUUID(), ...candidate }])
    setSelection(null); setStatus('已加入影片馬賽克片段。')
  }
  const seek = (next: number) => { const video = videoRef.current!; video.currentTime = next; setCurrentTime(next) }

  const exportVideo = async () => {
    if (!fileRef.current || exporting) return
    cancelled.current = false; setExporting(true); setProgress(0); setStatus('正在準備瀏覽器端影片引擎…')
    try {
      const ffmpeg = ffmpegRef.current ?? new FFmpeg()
      let lastFfmpegMessage = ''
      ffmpegRef.current = ffmpeg
      if (!ffmpeg.loaded) {
        await withTimeout(
          ffmpeg.load({
            coreURL: await toBlobURL('/ffmpeg/ffmpeg-core.js', 'text/javascript'),
            wasmURL: await toBlobURL('/ffmpeg/ffmpeg-core.wasm', 'application/wasm'),
          }),
          60_000,
          '轉檔引擎載入超過 60 秒，請重新整理頁面後再試。',
        )
      }
      ffmpeg.on('progress', ({ progress: value }) => setProgress(Math.round(value * 100)))
      ffmpeg.on('log', ({ message }) => { lastFfmpegMessage = message })
      setStatus('正在讀取影片…')
      await ffmpeg.writeFile('input', await fetchFile(fileRef.current))
      setStatus('正在輸出 MP4…')
      const graph = buildFilterGraph(segments)
      const args = graph
        ? ['-i', 'input', '-filter_complex', graph, '-map', '[outv]', '-map', '0:a?', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']
        : ['-i', 'input', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart', 'output.mp4']
      const code = await ffmpeg.exec(args)
      if (cancelled.current) throw new Error('已取消匯出。')
      if (code !== 0) throw new Error(`影片轉檔失敗：${lastFfmpegMessage || '請嘗試較短或較小的影片。'}`)
      const data = await ffmpeg.readFile('output.mp4')
      if (typeof data === 'string') throw new Error('影片輸出資料無效。')
      const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
      const blob = new Blob([buffer], { type: 'video/mp4' })
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'mosaic.mp4'; link.click(); URL.revokeObjectURL(link.href)
      await ffmpeg.deleteFile('input'); await ffmpeg.deleteFile('output.mp4')
      setStatus('影片已匯出為 mosaic.mp4。')
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      setStatus(detail ? `影片匯出失敗：${detail}` : '影片匯出失敗。')
    }
    finally { setExporting(false) }
  }
  const cancelExport = () => { cancelled.current = true; ffmpegRef.current?.terminate(); ffmpegRef.current = null; setStatus('正在取消匯出…') }

  return <section className="workspace">
    <div className="intro"><h1>影片馬賽克</h1><p>影片不會上傳；純瀏覽器處理上限為 200 MB、10 分鐘。</p></div>
    <video ref={videoRef} className="hidden-video" onLoadedMetadata={metadata} onLoadedData={firstFrameReady} onSeeked={render} onTimeUpdate={() => setCurrentTime(videoRef.current!.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
    <div className="toolbar video-toolbar">
      <label className="primary">開啟影片<input type="file" accept={videoTypes} onChange={(event) => openVideo(event.target.files?.[0])} /></label>
      <button disabled={!loaded || exporting} onClick={togglePlay}>{playing ? '暫停' : '播放'}</button>
      <label>區塊大小 <input aria-label="影片區塊大小" type="range" min="4" max="80" value={blockSize} onChange={(event) => setBlockSize(Number(event.target.value))} /> <b>{blockSize}px</b></label>
      <button className="primary" disabled={!loaded || exporting} onClick={exportVideo}>匯出 MP4</button>
      {exporting && <button onClick={cancelExport}>取消匯出</button>}
    </div>
    {loaded && <>
      <div className="timeline"><button onClick={() => seek(0)}>回到開頭</button><input aria-label="影片時間軸" type="range" min="0" max={duration || 0} step="0.001" value={currentTime} onChange={(event) => seek(Number(event.target.value))} /><output>{time(currentTime)} / {time(duration)}</output></div>
      <div className="segment-form">
        <label>開始秒數 <input value={startTime} inputMode="decimal" onChange={(event) => setStartTime(event.target.value)} /></label><button onClick={() => setStartTime(time(currentTime))}>設為目前時間</button>
        <label>結束秒數 <input value={endTime} inputMode="decimal" onChange={(event) => setEndTime(event.target.value)} /></label><button onClick={() => setEndTime(time(currentTime))}>設為目前時間</button>
        <button className="primary" disabled={exporting} onClick={addSegment}>加入片段</button>
      </div>
    </>}
    <p className="status" aria-live="polite">{exporting ? `${status} ${progress}%（速度受影片長度、解析度、馬賽克片段數量與電腦效能影響）` : status}</p>
    <div className="canvas-shell">{loaded ? <canvas ref={canvasRef} className="media-canvas" onPointerDown={(event) => { dragStart.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); setSelection(null) }} onPointerMove={move} onPointerUp={(event) => { move(event); dragStart.current = null }} /> : <div className="empty">尚未載入影片</div>}</div>
    {segments.length > 0 && <div className="segment-list"><h2>馬賽克片段</h2>{segments.map((segment, index) => <div className="segment" key={segment.id}><span>#{index + 1}　{time(segment.startTime)}–{time(segment.endTime)} 秒　{segment.width}×{segment.height}　{segment.blockSize}px</span><button disabled={exporting} onClick={() => setSegments((items) => items.filter((item) => item.id !== segment.id))}>刪除</button></div>)}</div>}
  </section>
}
