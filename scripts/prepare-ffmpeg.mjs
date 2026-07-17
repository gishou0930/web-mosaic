import { cp, mkdir } from 'node:fs/promises'

const source = new URL('../node_modules/@ffmpeg/core/dist/esm/', import.meta.url)
const target = new URL('../public/ffmpeg/', import.meta.url)

await mkdir(target, { recursive: true })
await Promise.all([
  cp(new URL('ffmpeg-core.js', source), new URL('ffmpeg-core.js', target)),
  cp(new URL('ffmpeg-core.wasm', source), new URL('ffmpeg-core.wasm', target)),
])
