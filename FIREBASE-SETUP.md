# 汽車筆試測驗｜Google 跨裝置同步設定

此專案已加入 Google 登入介面、本機優先的資料儲存，以及 Firestore 雲端歷次測驗同步程式。**目前 `firebase-config.js` 尚未設定，因此雲端同步尚未啟用。**

## Firebase 初次設定（一次即可）

1. 開啟 https://console.firebase.google.com/ ，使用你要綁定測驗的 Google 帳號，建立 Firebase 專案（例如 driving-exam-tw）。
2. 專案 →「新增應用程式」→ 選擇 Web `</>`，取得 `firebaseConfig`（apiKey、authDomain、projectId、appId、messagingSenderId）。
3. Authentication → Sign-in method → Google → Enable。Authentication → Settings → Authorized domains 加入 `tracyw14108.github.io`（不要包含 https:// 和路徑）。
4. Firestore Database → 建立資料庫（建議正式模式）；在 Rules 把儲存庫的 `firestore.rules` 完整貼入並 Publish。不要使用允許任何人讀寫的測試規則。
5. GitHub → `tracyw14108/driving-exam-tw` → `firebase-config.js`：用你的 Firebase 網頁設定取代 `null`，格式如下：
   ```js
   window.DRIVING_FIREBASE_CONFIG = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT",
     appId: "YOUR_APP_ID",
     messagingSenderId: "YOUR_SENDER_ID"
   };
   ```
6. 等待 GitHub Pages 更新，開啟網站，選「使用 Google 登入」，檢查顯示「已同步」後，再到其他裝置用同一 Google 帳號登入。

## 記錄保存及安全性

- 未登入或斷網：測驗紀錄先保存於目前瀏覽器。完成雲端設定後首次登入時，會嘗試上傳當前裝置的既有紀錄。
- 登入同一帳號：下載其他裝置紀錄並合併顯示；每個考試事件使用唯一 ID 避免重覆。
- 舊版本無題號的考試無法回復逐題答題資料；會保留已知歷史分數。
- Firebase 網頁設定值可用於前端，**不要放服務帳戶 private key 或管理員金鑰到 GitHub**。
- GitHub Pages 不是登入系統，保護資料的是 Google 認證及嚴格的 Firestore Security Rules。
- 如果跨多台裝置同時登入，在雲端同步尚未完成前先交卷，可能出現不同裝置的本機資料尚未合併的短暫延遲。請確認同步狀態顯示成功。
- Safari 在第三方儲存限制下，Firebase 的 signInWithRedirect 可能失敗；本站使用 signInWithPopup，瀏覽器必須允許這個按鈕發起的登入彈窗。

## 自行檢查
- 先在 iPad 登入：首頁顯示「已同步 Google 帳號」，保留舊分數。
- 手機登入同一帳號：核對分數及錯題庫。
- 手機完成一回：切回 iPad 點「立即同步」查看是否增加測驗次數與題數。
- 用完登出後本機紀錄仍在原設備；不代表雲端資料已刪除。
