# 群呼分析儀表板 - 桌面應用程式

這是根據 FigmaCode 資料夾重現的桌面應用程式，使用 Electron 打包。

## 快速開始

### 1. 複製必要的文件

請執行以下命令來複製所有必要的組件和工具文件：

```bash
# 複製組件文件
cp -r "FigmaCode_群呼分析儀表板/src/components" "src/"

# 複製工具文件
cp -r "FigmaCode_群呼分析儀表板/src/utils" "src/"

# 複製樣式文件
cp "FigmaCode_群呼分析儀表板/src/index.css" "src/"
```

或者使用提供的腳本：

```bash
chmod +x copy-files.sh
./copy-files.sh
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 開發模式

#### 選項 A：僅 Web 開發（瀏覽器）

```bash
npm run dev
```

應用程式將在 `http://localhost:9000` 啟動。

#### 選項 B：桌面應用程式開發（Electron）

```bash
npm run electron:dev
```

這會同時啟動 Vite 開發服務器和 Electron 桌面應用程式。

### 4. 建置桌面應用程式

```bash
# 建置並打包桌面應用程式
npm run electron:build
```

打包完成後，可執行文件將在 `release` 目錄中。

## 專案結構

```
Mass Call＿Dashboard/
├── electron/
│   ├── main.js          # Electron 主進程
│   └── preload.js       # Electron 預載入腳本
├── src/
│   ├── App.tsx          # 主應用程式組件
│   ├── main.tsx         # 入口文件
│   ├── index.css        # 全局樣式
│   ├── components/      # React 組件
│   └── utils/           # 工具函數
├── index.html           # HTML 入口
├── vite.config.ts       # Vite 配置
├── package.json         # 專案配置
└── FigmaCode_群呼分析儀表板/  # Figma 參考資料（保留）
```

## 功能特色

- 📞 **桌面應用程式**：使用 Electron 打包，可在 Windows、macOS、Linux 上運行
- 🔐 **登入系統**：管理員登入功能
- 📊 **即時面板**：群呼即時面板（目前為空白面板，等待後續開發）
- 🎨 **現代 UI**：使用 TailwindCSS 和 Radix UI 組件

## 測試帳號

- **管理員**：帳號 `manage@gmail.com` / 密碼 `1234`

## 建置說明

### 開發模式

- `npm run dev` - 僅啟動 Web 開發服務器
- `npm run electron:dev` - 啟動 Electron 桌面應用程式（開發模式）

### 生產建置

- `npm run build` - 建置 Web 應用程式
- `npm run electron:build` - 建置並打包桌面應用程式
- `npm run electron:pack` - 僅打包（不建置安裝程式）

## 注意事項

- 請確保已從 `FigmaCode_群呼分析儀表板` 資料夾複製所有必要的組件文件
- Electron 應用程式在開發模式下會自動打開開發者工具
- 生產建置需要先執行 `npm run build` 來建置前端應用程式
