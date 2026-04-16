# HJKS 停止情報ビューア

発電所の停止情報を可視化・分析するWebアプリケーションです。発電情報公開システム（HJKS）から停止情報を定期的に取得し、ダッシュボード、タイムライン、詳細一覧で表示します。

**最終更新**: 2026-04-16

**デモサイト**: https://hama-jp.github.io/hjks_viewer/

## 概要

このプロジェクトは、日本の電力会社が公開する停止情報を自動取得し、わかりやすく可視化するツールです。以下のページで停止状況を確認できます:

- **ダッシュボード** (`/`): エリア別、発電形式別、停止区分別の現在の停止状況をグラフで表示
- **タイムライン** (`/timeline`): 停止情報の時系列チャート（計画停止を含む）
- **停止情報一覧** (`/outages`): 詳細な停止情報テーブル（フィルタ・並び替え可能）

主な特徴:
- ダークモード対応
- レスポンシブデザイン（モバイル・タブレット対応）
- リアルタイムデータの自動同期
- 複数期間のアーカイブデータに対応

## 技術スタック

### フロントエンド
- **Next.js 16.2.2**: React 19ベースのSSG/SSR
- **React 19.2.4**: UIコンポーネント
- **ECharts 6.0**: グラフ・チャート表示
- **Tailwind CSS 4**: スタイリング
- **Zod 4.3.6**: データバリデーション
- **date-fns 4.1.0**: 日付操作

### バックエンド・スクリプト
- **TypeScript 5**: 型安全な開発
- **Node.js fetch API**: HTTP通信
- **csv-parse 6.2.1**: CSV解析

### テスト・開発ツール
- **Vitest 4.1.2**: ユニットテスト
- **Playwright 1.59.1**: E2Eテスト
- **ESLint 9**: コード品質チェック
- **TypeScript**: 型チェック

## ディレクトリ構成

```
hjks_viewer/
├── src/                          # フロントエンドソースコード
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx           # ルートレイアウト（ヘッダー・フッター）
│   │   ├── page.tsx             # ダッシュボード
│   │   ├── timeline/page.tsx    # タイムラインページ
│   │   ├── outages/page.tsx     # 停止情報一覧ページ
│   │   └── globals.css          # グローバルスタイル
│   ├── components/               # Reactコンポーネント
│   │   ├── common/              # 共通コンポーネント
│   │   │   ├── ThemeToggle.tsx  # ダーク/ライトモード切り替え
│   │   │   ├── useTheme.ts      # テーマ管理フック
│   │   │   ├── ErrorBoundary.tsx # エラー境界
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ChartCard.tsx    # チャート用カードコンポーネント
│   │   │   ├── KpiCard.tsx      # KPI表示カード
│   │   │   └── Navigation.tsx   # ナビゲーション
│   │   ├── charts/              # チャートコンポーネント
│   │   │   ├── OutageTimelineChart.tsx # タイムラインチャート
│   │   │   ├── CapacityByAreaChart.tsx # エリア別容量
│   │   │   ├── AssortmentTreemap.tsx   # ツリーマップ
│   │   │   └── EChartWrapper.tsx       # ECharts共通ラッパー
│   │   ├── filters/             # フィルタコンポーネント
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── DateRangeFilter.tsx
│   │   │   ├── CheckboxGroup.tsx
│   │   │   └── useFilters.ts
│   │   └── tables/              # テーブルコンポーネント
│   │       ├── OutageTable.tsx
│   │       ├── SortableHeader.tsx
│   │       ├── Pagination.tsx
│   │       └── useTableState.ts
│   ├── lib/                     # ユーティリティ・ロジック
│   │   ├── data-loader.ts       # JSON/マニフェスト読み込み
│   │   ├── schemas.ts           # Zodスキーマ定義
│   │   ├── constants.ts         # マスタコード定義
│   │   ├── filter-utils.ts      # フィルタロジック
│   │   ├── chart-utils.ts       # チャート関連ユーティリティ
│   │   └── date-utils.ts        # 日付操作ユーティリティ
│   └── types/                   # TypeScript型定義
│       └── outage.ts            # 停止情報型定義
├── scripts/                      # バックエンドスクリプト
│   ├── fetch-outages.ts         # 停止情報取得スクリプト
│   ├── fetch-units.ts           # 発電機情報取得スクリプト
│   ├── sync-public-data.ts      # public/へのデータ同期
│   └── lib/                     # スクリプト共通ライブラリ
│       ├── fetchers.ts          # HJKS通信
│       ├── parsers.ts           # CSV/HTMLパース
│       ├── normalizers.ts       # データ正規化
│       └── archiver.ts          # アーカイブ処理
├── data/                         # ローカルデータ
│   └── normalized/              # 正規化済みJSON
│       ├── outages-current.json
│       └── outages-archive/     # 過去データ（四半期ごと）
├── public/                       # 静的ファイル・JSON公開用
│   ├── data/                    # クライアント側で読み込むJSON
│   │   ├── outages-current.json
│   │   ├── outages-archive/
│   │   ├── units.json
│   │   └── manifest.json
│   └── *.svg                    # ロゴなど
├── tests/                        # テスト
│   ├── unit/                    # ユニットテスト
│   │   ├── schemas.test.ts
│   │   ├── constants.test.ts
│   │   ├── filter-utils.test.ts
│   │   ├── chart-utils.test.ts
│   │   ├── date-utils.test.ts
│   │   ├── parsers.test.ts
│   │   ├── normalizers.test.ts
│   │   └── archiver.test.ts
│   └── e2e/                     # E2Eテスト
│       ├── dashboard.spec.ts
│       ├── navigation.spec.ts
│       └── outages.spec.ts
├── package.json                 # npm依存関係
├── tsconfig.json               # TypeScript設定
├── next.config.ts              # Next.js設定（SSG出力）
├── vitest.config.ts            # Vitest設定
├── playwright.config.ts        # Playwright E2Eテスト設定
├── eslint.config.mjs           # ESLint設定
├── postcss.config.mjs          # PostCSS設定
└── README.md                   # このファイル
```

## セットアップ

### 環境要件
- Node.js 18 以上
- npm または yarn

### インストール手順

```bash
# リポジトリをクローン
git clone https://github.com/hama-jp/hjks_viewer.git
cd hjks_viewer

# 依存関係をインストール
npm install
# または
npm ci  # 本番環境・CI/CD用

# 環境変数を設定（オプション）
# basePath を変更したい場合は以下を設定:
# export NEXT_PUBLIC_BASE_PATH="/subdir"  # 例: GitHub Pages用
```

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーが `http://localhost:3000` で起動します。ファイル変更時に自動リロードされます。

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバーを起動（ホットリロード有効） |
| `npm run build` | 本番用に静的ファイル生成（`out/` ディレクトリに出力） |
| `npm start` | ビルド済みアプリを実行（`out/` が必要） |
| `npm run lint` | ESLintで構文・スタイルチェック |
| `npm test` | Vitestでユニットテストを実行 |
| `npm run test:watch` | テストをwatch モード実行 |
| `npm run test:coverage` | カバレッジ報告書を生成 |
| `npm run test:e2e` | Playwriteで E2E テスト実行 |

## データ取得スクリプト

### 停止情報の取得

```bash
# 前日～当日分を取得（デフォルト）
npx tsx scripts/fetch-outages.ts --mode daily

# 当日の最新データを取得
npx tsx scripts/fetch-outages.ts --mode now

# 範囲指定で取得
npx tsx scripts/fetch-outages.ts --mode backfill --from 2024-01-01 --to 2024-12-31

# 全データを取得（フィルタなし）
npx tsx scripts/fetch-outages.ts --mode full
```

取得したデータは `data/normalized/` に保存されます。

### 発電機情報の取得

```bash
# 発電機マスタデータを取得
npx tsx scripts/fetch-units.ts
```

### パブリックデータの同期

```bash
# data/normalized/ → public/data/ へコピー＆manifest.json生成
npx tsx scripts/sync-public-data.ts
```

この処理はビルド前に実行され、クライアント側で読み込むJSONが最新に保たれます。

## 本番ビルド・デプロイ

### スタティック生成（推奨）

```bash
# 最新データを取得してビルド
npx tsx scripts/fetch-outages.ts --mode daily
npx tsx scripts/sync-public-data.ts
npm run build

# 生成されたファイルは `out/` ディレクトリにあります
```

### GitHub Pages へのデプロイ

basePath を設定してビルドしてください:

```bash
export NEXT_PUBLIC_BASE_PATH="/hjks_viewer"
npm run build
# `out/` の内容をGitHub Pagesのディレクトリ（例：gh-pages）にコピー
```

### Vercel へのデプロイ

Vercel GUI から接続するか、Vercel CLI を使用:

```bash
npm install -g vercel
vercel --prod
```

データ取得スクリプトは `vercel.json` や Vercel Cron ジョブで定期実行可能です。

## ページ解説

### ダッシュボード (`/`)

**目的**: 現在の停止状況を一目で把握

**表示内容**:
- **現在の停止状況タイムライン**: 計画停止を除く、進行中の停止情報
- **エリア別停止件数**: 棒グラフで各地域の停止数を比較
- **発電形式別停止件数**: 原子力、水力、火力などの形式ごとの停止数
- **停止区分別件数**: 計画停止、計画外停止、出力低下の円グラフ
- **エリア別停止容量**: エリア別の停止容量（MW）のスタックバー
- **種別内訳**: ツリーマップで各停止原因（故障、送電線制約など）の内訳を可視化

### タイムライン (`/timeline`)

**目的**: 停止情報の時系列変化を追跡

**特徴**:
- 計画停止を含む全停止情報を表示
- 日付や期間でフィルタ可能
- チャートで停止件数の増減を視覚化

### 停止情報一覧 (`/outages`)

**目的**: 詳細な停止情報の検索・分析

**機能**:
- **フィルタパネル**: エリア、発電形式、停止区分で絞り込み
- **日付範囲フィルタ**: 期間指定で検索
- **テーブル表示**: 並び替え可能な詳細データ
- **ページネーション**: 大量データへの対応

**表示列**:
- 停止開始日時、再起予定日時
- 発電所コード、発電機名
- エリア、発電形式
- 最大容量、停止容量
- 停止区分、停止理由

## データフロー

```
HJKS サイト (https://hjks.jepx.or.jp)
    ↓
scripts/fetch-outages.ts
    ↓ (取得→パース→正規化→バリデーション)
data/normalized/outages-current.json
    ↓
scripts/sync-public-data.ts
    ↓ (コピー＋manifest.json生成)
public/data/outages-current.json
    ↓
npm run build (SSG)
    ↓
out/ (静的HTML)
    ↓ (デプロイ)
本番環境
    ↓
src/lib/data-loader.ts (fetch)
    ↓
React コンポーネント (表示)
```

## マスタコード

停止情報には以下のコードが使用されます。詳細は `src/lib/constants.ts` を参照:

### エリアコード
| コード | 地域 |
|--------|------|
| 1 | 北海道 |
| 2 | 東北 |
| 3 | 東京 |
| 4 | 中部 |
| 5 | 北陸 |
| 6 | 関西 |
| 7 | 中国 |
| 8 | 四国 |
| 9 | 九州 |
| 10 | 沖縄 |

### 発電形式コード
| コード | 形式 |
|--------|------|
| 1 | 原子力 |
| 2 | 火力(石炭) |
| 3 | 火力(ガス) |
| 4 | 火力(石油) |
| 5 | 水力 |
| 6 | 地熱 |
| 7 | 風力 |
| 8 | 太陽光・太陽熱 |
| 99 | その他 |

### 停止区分コード
| コード | 区分 |
|--------|------|
| 1 | 計画停止 |
| 2 | 計画外停止 |
| 3 | 出力低下 |

### 停止理由コード（抜粋）
| コード | 理由 |
|--------|------|
| 1 | 停止・定期検査等 |
| 2 | 停止・設備故障 |
| 3 | 停止・送電線等制約 |
| 5 | 停止・燃料制約 |
| 7 | 低下・設備故障 |

詳細は `src/lib/constants.ts` の `ASSORTMENTS` を参照してください。

## テスト

```bash
# ユニットテスト実行
npm test

# watch モード
npm run test:watch

# カバレッジレポート
npm run test:coverage
# レポートは coverage/ ディレクトリに出力
```

## トラブルシューティング

### ビルドが失敗する
- Node.js バージョンを確認: `node --version` (18以上が必要)
- `npm ci` で依存関係をクリーンインストール
- `.next` ディレクトリを削除して再ビルド: `rm -rf .next && npm run build`

### データが表示されない
- `public/data/outages-current.json` が存在するか確認
- ブラウザの DevTools でネットワークエラーを確認
- データ取得スクリプトが成功したか確認: `npx tsx scripts/fetch-outages.ts --mode now`

### テーマ切り替えが動作しない
- ブラウザの localStorage が有効か確認
- JavaScript が有効か確認
- ブラウザコンソールでエラーがないか確認

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。詳細は [LICENSE](./LICENSE) を参照してください。

## 免責事項

本サイトに掲載している停止情報は、[発電情報公開システム（HJKS）](https://hjks.jepx.or.jp/hjks/outages)より取得したデータに基づいています。

本サイトの情報は参考目的で提供しており、正確性・完全性を保証するものではありません。データの取得・加工過程で誤りが生じる可能性があります。本サイトの情報に基づく判断・行動について、作成者は一切の責任を負いません。

## その他のリンク

- [HJKS 公式サイト](https://hjks.jepx.or.jp/hjks/outages)
- [JEPX](https://www.jepx.or.jp/)
- GitHub リポジトリ: [hama-jp/hjks_viewer](https://github.com/hama-jp/hjks_viewer)

## コントリビューション

バグ報告や機能提案は GitHub Issues からお願いします。

---

**作成者**: hama-jp  
**最終更新**: 2026-04-16
