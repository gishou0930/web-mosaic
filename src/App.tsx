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
    <main>
      {mode === 'image' ? <ImageEditor /> : <VideoEditor />}
      <section className="seo-copy" aria-label="工具說明">
        <h2>免費線上圖片與影片馬賽克工具</h2>
        <p>馬賽克工作室讓你直接在瀏覽器中處理單張圖片與影片。所有檔案只會留在你的裝置，不會上傳到伺服器。</p>
        <ul>
          <li>圖片：拖曳框選區域、調整區塊大小，下載 PNG。</li>
          <li>影片：播放與定位影格，建立多個矩形馬賽克片段，再輸出 MP4。</li>
        </ul>
      </section>
    </main>
  </>
}
