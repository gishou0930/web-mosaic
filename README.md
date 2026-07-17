# 馬賽克工作室

[立即使用線上版本](https://gishou0930.github.io/web-mosaic/)

免費的繁體中文圖片與影片馬賽克工具，所有處理都在瀏覽器內完成，檔案不會上傳到伺服器。

## 功能

- 圖片：拖曳框選矩形、調整馬賽克區塊大小、下載 PNG。
- 影片：播放、時間軸定位、多個起訖時間片段與矩形馬賽克、輸出 H.264/AAC MP4。
- 隱私：圖片與影片只在使用者的裝置中處理。

## 本機執行

```powershell
npm install
npm run dev
```

## 驗證與建置

```powershell
npm run test
npm run build
```

## 部署

推送到 `main` 後，GitHub Actions 會自動部署至 GitHub Pages。
