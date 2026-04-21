# 謊言編年者 — Chronicles of Lies

> **你相信的一切,可能都是你自己造成的。**
> 在帷幕撕裂之前,決定誰是神。

卡牌對戰 RPG。穿越 15 個歷史時代,在編織者、守真者、無相面者的三方戰爭中改寫人類信仰。

---

## 專案狀態

- **目前階段:** Phase 0 — 基礎建置(完成)
- **版本:** v0.1.0
- **路線圖:** 見規格書 §14 分階段開發路線

| Phase | 內容 | 狀態 |
|---|---|---|
| Phase 0 | 專案骨架、設計系統、Prisma schema、部署 | ✅ 完成 |
| Phase 1 | 登入、4 首發時代、60 卡、PvE 戰鬥、抽卡 | ⏳ 規劃中 |
| Phase 2 | 融合、覺醒、通行證 | — |
| Phase 3 | PvP 天梯、公會 | — |
| Phase 4-6 | 時代擴充、跨服、終章 | — |

## 技術棧

- **前端:** Next.js 16 (App Router) + React 19.2 + TypeScript 5
- **樣式:** Tailwind CSS v4(Design Tokens via `@theme`)
- **狀態管理:** Zustand 5
- **資料庫:** PostgreSQL 16 + Prisma 6
- **部署:** Railway(全包:應用 + Postgres)

## 本地開發

```bash
# 1. 安裝依賴
npm install

# 2. 複製環境變數
cp .env.example .env.local
# 編輯 .env.local,填入本地 PostgreSQL 連線字串

# 3. 建立資料庫 schema
npm run db:push

# 4. 啟動開發伺服器
npm run dev
# → http://localhost:3000
```

## 目錄結構

```
chronicles-of-lies/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx         # 首頁(宣傳頁)
│   │   └── globals.css      # 設計 Tokens
│   ├── components/
│   │   ├── ui/              # 基礎元件(Button/Input/Modal/Toast)
│   │   └── game/            # 遊戲元件(Phase 1 起加入)
│   ├── lib/
│   │   ├── utils.ts         # cn()
│   │   └── prisma.ts        # Prisma client singleton
│   └── stores/              # Zustand stores(Phase 1 起加入)
├── prisma/
│   └── schema.prisma        # User / Card / Deck / EraProgress
└── public/
```

## 規格文件

專案規格書位於桌面:
- `謊言編年者.txt` — 完整技術規格 v4.0
- `謊言編年者 世界觀背景.txt` — 世界觀聖經 v1.0
- `謊言編年者 遊戲簡介.txt` — 對外宣傳文案

---

© 2026 Chronicles of Lies
