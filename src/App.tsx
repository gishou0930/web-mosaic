import { useState } from 'react'
import ImageEditor from './components/ImageEditor'
import VideoEditor from './components/VideoEditor'

export default function App() {
  const [mode, setMode] = useState<'image' | 'video'>('image')
  return <>
    <header className="topbar">
      <div className="brand">馬賽克工作室 <span>瀏覽器版</span></div>
      <div className="mode-switch" role="group" aria-label="工作區切換">
        <button className={mode === 'image' ? 'active' : ''} onClick={() => setMode('image')}>圖片馬賽克</button>
        <button className={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>影片馬賽克</button>
      </div>
      <div className="privacy">檔案只在此裝置處理</div>
    </header>
    <main>{mode === 'image' ? <ImageEditor /> : <VideoEditor />}</main>
  </>
}
