# HJKS 停止情報ビューア — 実装計画

## 要件の整理

**目的**: HJKS（発電情報公開システム）の停止情報を、ユニットごとの履歴・トラブル停止頻度などを分析できるモダンなWebアプリとして構築する

**スコープ**:
- 対象: 停止情報（計画停止、計画外停止、出力低下）
- 対象外: ユニットの稼働情報（別アプリで対応）
- デプロイ先: GitHub Pages（静的サイト）
- データ取得: GitHub Actionsで自動化

**データソース** (`https://hjks.jepx.or.jp/hjks/`):

| エンドポイント | 内容 | 取得方法 |
|---|---|---|
| `/hjks/outages` | 停止情報一覧 + CSVダウンロード | セッション+CSRF経由POST |
| `/hjks/unit` | ユニット一覧 + CSVダウンロード | セッション+CSRF経由POST |
| `/hjks/top` | 最新停止情報HTMLテーブル | 認証不要GET |

**停止情報フィールド**:

| フィールド名 | 日本語 | 型 |
|---|---|---|
| `area` | エリア | text |
| `company` | 発電事業者 | text |
| `plantcd` | 発電所コード | text |
| `name` | 発電所名 | text |
| `format` | 発電形式 | text |
| `unitname` | ユニット名 | text |
| `maxcapacity` | 認可出力(kW) | int |
| `maintemode` | 停止区分 | text |
| `assortment` | 種別 | text |
| `downcapacity` | 低下量(kW) | int |
| `startdt` | 停止日時 | date |
| `outlook` | 復旧見通し | text |
| `restartschdt` | 復旧予定日 | date |
| `factor` | 停止原因 | text |
| `upddt` | 最終更新日時 | text |

**ユニット一覧フィールド**: `area`, `company`, `plantcd`, `name`, `format`, `unitname`, `maxcapacity`, `nextmaxcapacity`, `nextmaxcapacitystartdt`, `startdt`(稼動開始日), `enddt`(稼動終了日), `upddt`

**クエリパラメータ（フィルタ値）**:

- **エリア** (`area`): `1`=北海道, `2`=東北, `3`=東京, `4`=中部, `5`=北陸, `6`=関西, `7`=中国, `8`=四国, `9`=九州, `10`=沖縄
- **発電形式** (`format`): `1`=原子力, `5`=水力, `2`=火力(石炭), `3`=火力(ガス), `4`=火力(石油), `6`=地熱, `7`=風力, `8`=太陽光・太陽熱, `99`=その他
- **停止区分** (`maintemode`): `1`=計画停止, `2`=計画外停止, `3`=出力低下
- **種別** (`assortment`): `1`=停止・定期検査等, `2`=停止・設備故障, `3`=停止・送電線等制約, `4`=停止・長期計画停止, `5`=停止・燃料制約, `6`=停止・その他, `7`=低下・設備故障, `8`=低下・送電線等制約, `9`=低下・燃料制約, `10`=低下・その他
- **停止期間**: `startdtfrom`, `startdtto` (datetime形式)

**AJAXエンドポイント**:

| エンドポイント | 用途 | 方式 |
|---|---|---|
| `outages_ajax` | 停止情報データ取得 | POST (w2ui get-records) |
| `unit_list_ajax` | ユニット一覧データ取得 | POST (w2ui get-records) |
| `unit_status_ajax` | チャートデータ取得 | GET (JSON) |

---

## 技術スタック

参考プロジェクト: [hama-jp/occto-grid-observatory](https://github.com/hama-jp/occto-grid-observatory)

| 領域 | 技術 |
|---|---|
| フレームワーク | **Next.js 16** (static export) |
| 言語 | **TypeScript** |
| スタイリング | **Tailwind CSS v4** |
| チャート | **ECharts** (echarts-for-react) |
| データ取得スクリプト | **tsx** (TypeScript実行) |
| CSVパース | **csv-parse** |
| バリデーション | **Zod** |
| 日付処理 | **date-fns** |
| テスト | **Vitest** + **Playwright** |
| CI/CD | **GitHub Actions** (data-refresh + deploy-pages) |
| ホスティング | **GitHub Pages** |

---

## 実装フェーズ

### Phase 1: プロジェクト初期化 & データ取得基盤

1. Next.js + TypeScript プロジェクトのセットアップ
2. `scripts/fetch-outages.ts` — HJKS CSVダウンロードスクリプト
   - セッション取得 → CSRF取得 → CSV POST → パース → JSON保存
   - エリア・期間でフィルタ可能
3. `scripts/fetch-units.ts` — ユニットマスタ取得スクリプト
4. `data/` ディレクトリ構成:
   - `data/raw/` — 取得したCSV保存
   - `data/normalized/` — 正規化済みJSON（フロントエンド用）
5. Zodによるデータスキーマ定義

**スクレイピング方法の優先順位**:

1. **CSVダウンロード**（最も完全なデータ）: `/hjks/outages` と `/hjks/unit` にCSVダウンロードボタンあり。フォームPOSTで `csv=csv` パラメータを送信。セッション管理（JSESSIONID）とCSRFトークンが必要。手順: GETでページ取得しセッション+CSRF取得 → フォームPOSTでCSVダウンロード
2. **トップページHTMLスクレイピング**（最も簡単）: `/hjks/top` は認証不要で最新の停止情報がHTMLテーブルとして取得可能
3. **Playwright ブラウザ自動化**（フォールバック）: CSRF検証が厳しい場合の代替手段

### Phase 2: GitHub Actions 自動化

1. `data-refresh.yml` — 定期データ取得（1日2回）
   - HJKS CSVダウンロード → JSON正規化 → コミット&プッシュ
   - モード: `daily`（前日分取得）, `now`（当日分取得）, `backfill`（日付範囲指定）
2. `deploy-pages.yml` — データ更新時・mainプッシュ時にPages自動デプロイ
3. `ci.yml` — lint + test

### Phase 3: フロントエンド — 停止情報一覧

1. レイアウト（ヘッダー、サイドバー/フィルタ、メインコンテンツ）
2. 停止情報テーブル（ソート・フィルタ・ページネーション）
   - エリア、発電形式、停止区分、種別でフィルタ
   - 期間指定
3. レスポンシブデザイン

### Phase 4: フロントエンド — 分析ダッシュボード

1. **停止概況サマリー**: 現在停止中件数、計画外停止件数、エリア別集計
2. **トラブル停止頻度分析**:
   - エリア別・発電形式別の計画外停止件数（棒グラフ）
   - 月別トレンド（折れ線グラフ）
3. **ユニット別履歴**:
   - 特定ユニットの停止履歴タイムライン（ガントチャート風）
   - 停止日数の累計
4. **停止原因分析**: 種別ごとの件数・割合（円グラフ/ツリーマップ）

### Phase 5: テスト & 品質

1. Vitest — データパーサー、正規化ロジックのユニットテスト
2. Playwright — E2Eテスト（主要画面の表示確認）

---

## リスク評価

| リスク | 重要度 | 対策 |
|---|---|---|
| HJKS のCSRF/セッション管理が厳しい | **高** | Playwright でブラウザ自動化にフォールバック |
| HJKS のデータ形式変更 | 中 | Zodバリデーションで検知、CI通知 |
| 過去データの蓄積に時間がかかる | 中 | 初回はbackfillスクリプトで一括取得 |
| GitHub Pages の容量制限 | 低 | JSON圧縮、古いデータはアーカイブ |

---

## ディレクトリ構成

```
hjks_viewer/
├── .github/workflows/
│   ├── data-refresh.yml      # 定期データ取得
│   ├── deploy-pages.yml      # GitHub Pages デプロイ
│   └── ci.yml                # lint + test
├── data/
│   ├── raw/                  # 取得したCSV
│   └── normalized/           # 正規化済みJSON（フロントエンド用）
├── scripts/
│   ├── lib/
│   │   ├── fetchers.ts       # HJKS通信（セッション・CSRF管理）
│   │   ├── parsers.ts        # CSVパース
│   │   └── normalizers.ts    # JSON正規化
│   ├── fetch-outages.ts      # 停止情報取得
│   ├── fetch-units.ts        # ユニットマスタ取得
│   └── sync-public-data.ts   # public/data へコピー
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # ダッシュボード（Phase 4）
│   │   └── outages/
│   │       └── page.tsx      # 停止情報一覧（Phase 3）
│   ├── components/
│   │   ├── charts/           # EChartsラッパー
│   │   ├── filters/          # フィルタUI
│   │   └── tables/           # テーブルUI
│   ├── lib/
│   │   ├── schemas.ts        # Zodスキーマ
│   │   └── data-loader.ts    # JSON読み込み
│   └── types/
│       └── outage.ts         # 型定義
├── tests/
│   ├── unit/                 # Vitest
│   └── e2e/                  # Playwright
├── public/
│   └── data/                 # ビルド時にnormalized JSONをコピー
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── vitest.config.ts
├── playwright.config.ts
└── .gitignore
```

---

## 参考情報

- HJKS公式: https://hjks.jepx.or.jp/hjks/
- 参考プロジェクト: https://github.com/hama-jp/occto-grid-observatory
- HJKS マニュアルPDF: https://hjks.jepx.or.jp/hjks/pdf/hjks_manual_2020_09.pdf
