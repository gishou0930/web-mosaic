# 馬賽克工作室（Web）

本機執行的繁體中文網頁工具，可在瀏覽器中為單張圖片或影片加入矩形馬賽克。媒體檔案不會上傳到伺服器。

## 啟動

```powershell
npm install
npm run dev
```

開啟終端機顯示的本機網址。第一次匯出影片時，瀏覽器會下載 FFmpeg WebAssembly 引擎。

## 建置與測試

```powershell
npm run test
npm run build
```

## 限制

- 圖片輸出固定為 PNG。
- 影片輸出固定為 MP4；瀏覽器版限制為 200 MB、10 分鐘。
- 影片支援多個固定矩形與各自的開始／結束秒數；不支援追蹤移動目標或關鍵影格動畫。
