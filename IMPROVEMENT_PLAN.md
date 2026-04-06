# HJKS Viewer UI/UX 改善計画

## 概要

HJKS Viewerの12項目の改善を、4つのフェーズに分けて段階的に実装する。各フェーズは独立してマージ可能であり、Phase 1のバグ修正・UIの基本改善から着手し、Phase 4の低優先度クリーンアップまで順に進める。

---

## Phase 1: バグ修正とナビゲーション改善 (高優先度・即効性)

このフェーズは既存機能の破壊リスクが最も低く、ユーザー体験の改善効果が高い。

### 1-1. 重複dark classの修正

- **ファイル**: `src/app/timeline/page.tsx` 115行目
- **操作**: `dark:text-slate-400 dark:text-slate-400` を `dark:text-slate-400` に修正（重複削除）
- **依存**: なし
- **リスク**: 低 - 単純なtypo修正

### 1-2. ナビゲーションのアクティブ状態表示

- **ファイル**: `src/app/layout.tsx`
- **操作**:
  - `layout.tsx` はServer Componentなので、ナビゲーション部分を新規Client Componentに抽出する必要がある
  - **新規ファイル**: `src/components/common/Navigation.tsx` を作成
  - `"use client"` を指定し、`usePathname()` を使って現在のパスを取得
  - アクティブなリンクに `text-blue-700 dark:text-blue-400 font-semibold` を適用、非アクティブには既存の `text-slate-600` スタイルを維持
  - `/` のマッチは完全一致、`/timeline` と `/outages` は前方一致で判定
  - `layout.tsx` の48-67行目（デスクトップナビ）と72-91行目（モバイルナビ）を `<Navigation />` コンポーネントで置き換え
- **依存**: なし
- **リスク**: 低 - Next.js 16で `usePathname()` が `next/navigation` にあることを確認する必要がある。`node_modules/next/dist/docs/` 内のドキュメントを事前確認すること

### 1-3. モバイルハンバーガーメニュー

- **ファイル**: `src/components/common/Navigation.tsx` (1-2で作成したもの)
- **操作**:
  - ハンバーガーアイコンボタン（三本線SVG）を追加し、`useState` で開閉を管理
  - `sm:hidden` で表示し、クリックでドロップダウンメニューを表示
  - メニュー展開時はオーバーレイ（半透明背景）を配置してクリックで閉じる
  - 各リンククリック時に自動的にメニューを閉じる（`pathname` 変更を `useEffect` で監視）
  - 既存のモバイルナビ（72-91行目の `sm:hidden` nav）を完全に置き換え
  - **外部ライブラリは使わず**、SVGアイコンとTailwindのみで実装
- **依存**: 1-2（Navigationコンポーネント抽出後に統合）
- **リスク**: 中 - フォーカス管理とキーボードアクセシビリティ（Escで閉じる等）を忘れないこと

### 1-4. ダークモードのバッジカラー修正

- **ファイル**: `src/app/timeline/page.tsx` 208-212行目
- **操作**:
  - インラインの `style={{ backgroundColor, color }}` はダークモードの切替に対応できないため、Tailwindのクラスベースに変更する
  - maintemodeコード別にクラスマッピングを定義:
    - `"1"` (計画停止): `bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300`
    - `"2"` (計画外停止): `bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300`
    - `"3"` (出力低下): `bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300`
  - `style` 属性を削除し、`className` に統合
- **依存**: なし
- **リスク**: 低

### Phase 1 実装順序

```
1-1 (typo修正) → 1-4 (バッジ色) → 1-2 (ナビ抽出) → 1-3 (ハンバーガー)
```

---

## Phase 2: ダッシュボード強化とフィルターUX (中優先度)

### 2-1. KPIサマリーカード追加

- **ファイル**: `src/app/page.tsx`
- **操作**:
  - `records` から `useMemo` で以下のKPI値を算出:
    - 停止件数合計: `records.length`
    - 停止容量合計 (MW): `records.reduce((sum, r) => sum + r.downcapacity / 1000, 0)`
    - 停止区分別件数: maintemodeごとに集計（計画停止/計画外停止/出力低下）
  - 221行目の `{/* Charts */}` コメントの直前（219行目以降）に、カードグリッドを挿入
  - レイアウト: `grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6`
  - 各カードは白背景の丸角ボックス（既存チャートカードと同じスタイル）
  - ローディング中はスケルトンを表示（既存の `SkeletonChart` パターンに合わせた小型版）
  - カードには数値を大きく、ラベルを小さく表示
- **依存**: なし
- **リスク**: 低 - 表示のみの追加で既存ロジックに変更なし

### 2-2. モバイルフィルター折りたたみのデフォルト化

- **ファイル**: `src/components/filters/FilterPanel.tsx`
- **操作**:
  - `useState(false)` を、ウインドウ幅に基づく初期値に変更
  - `useEffect` で初回マウント時にモバイル判定して `setCollapsed(true)` にするアプローチ（hydration mismatchを避けるため推奨）
  - 折りたたみトグルボタンの `sm:hidden` を削除し、全画面サイズで操作可能にする
  - アクティブフィルターがある場合は「フィルター (3件適用中)」のようにカウントを表示
- **依存**: なし
- **リスク**: 低 - hydration mismatchに注意。`useEffect` でクライアント側のみ `collapsed` を変更するのが安全

### 2-3. 日付パース関数の共通化

- **ファイル**:
  - **新規**: `src/lib/date-utils.ts`
  - **変更**: `src/app/page.tsx` 96-103行目
  - **変更**: `src/app/timeline/page.tsx` 19-24行目
  - **変更**: `src/components/charts/OutageTimelineChart.tsx` 24-29行目
- **操作**:
  - `date-utils.ts` に `parseOutageDate(dateStr: string): number` を定義
  - 既存の3箇所にある同名関数を削除し、`import { parseOutageDate } from "@/lib/date-utils"` に置き換え
  - `page.tsx`（Dashboard）の96-103行目のインラインパースも `parseOutageDate` を使うよう統一
- **依存**: なし
- **リスク**: 中 - 3ファイルの関数署名が微妙に異なる（Dashboard版は `split(/[/ :]/)` パターン、他は `split(" ")` + `split("/")` パターン）ため、動作を完全に一致させるテストが必要

### Phase 2 実装順序

```
2-3 (日付ユーティリティ) → 2-1 (KPIカード) → 2-2 (フィルター折りたたみ)
```

---

## Phase 3: データ層とチャート改善 (中〜低優先度)

### 3-1. データフェッチのキャッシュ化

- **ファイル**: `src/lib/data-loader.ts`
- **操作**:
  - SWRやReact Queryの追加は依存を増やすため、**シンプルなモジュールレベルキャッシュ**を実装
  - `loadOutagesCurrent` の結果をモジュールスコープの変数にキャッシュ:
    ```typescript
    let cachedResult: Promise<...> | null = null;
    let cacheTimestamp = 0;
    const CACHE_TTL = 5 * 60 * 1000; // 5分
    ```
  - キャッシュが有効（TTL内）であれば同じPromiseを返す
  - `invalidateCache()` 関数もエクスポートし、強制リロード時に呼べるようにする
  - 各ページの `handleRetry` / リロードボタンで `invalidateCache()` を呼んでからフェッチ
- **依存**: なし
- **リスク**: 中 - キャッシュが古いデータを返す場合のUXを考慮。TTLを適切に設定し、手動リフレッシュ手段を確保すること

### 3-2. EChartsダークモードのグリッド線対応

- **ファイル**: `src/app/page.tsx` の各チャートオプション
- **操作**:
  - `areaChartOption` と `formatChartOption` の `yAxis` に `splitLine` を追加:
    - `splitLine: { lineStyle: { color: theme === "dark" ? "#334155" : "#e2e8f0" } }`
  - `xAxis` にも同様の `splitLine` 設定を追加
  - `CapacityByAreaChart.tsx` の `option` にも同じ設定を追加
  - 既に `labelColor` を `useTheme()` から取得しているので、同じパターンで `splitLineColor` を定義
- **依存**: なし
- **リスク**: 低

### 3-3. タイムラインチャートのラベル幅改善

- **ファイル**: `src/components/charts/OutageTimelineChart.tsx`
- **操作**:
  - `grid.left: 180` を `220` に増やす
  - `axisLabel.width: 160` を `200` に増やす
  - **推奨**: まず幅を広げるだけの最小限の変更を行い、それで不十分なら2行表示を検討
- **依存**: なし
- **リスク**: 低 - グリッド左マージンを広げるとチャートの有効描画エリアが狭まる。モバイルで特に影響があるため、レスポンシブ対応も検討

### Phase 3 実装順序

```
3-1 (キャッシュ) → 3-2 (グリッド線) → 3-3 (ラベル幅)
```

---

## Phase 4: クリーンアップとアクセシビリティ (低優先度)

### 4-1. 未使用コードの削除

- **ファイル**:
  - **削除**: `src/components/charts/MonthlyTrendChart.tsx` - どのページからもインポートされていない
  - **検討**: `src/lib/data-loader.ts` の `loadUnits()` と `loadOutageArchive()` - 将来使う可能性があるため削除はせずコメントで注記のみ
- **依存**: なし
- **リスク**: 低

### 4-2. チャートのアクセシビリティ改善

- **ファイル**:
  - `src/components/charts/EChartWrapper.tsx`
  - `src/components/charts/OutageTimelineChart.tsx`
  - `src/components/charts/CapacityByAreaChart.tsx`
  - `src/components/charts/AssortmentTreemap.tsx`
- **操作**:
  - `EChartWrapper` に `ariaLabel` プロパティを追加
  - チャートを囲む `div` に `role="img"` と `aria-label={ariaLabel}` を設定
  - 各チャート使用箇所で適切な `ariaLabel` を渡す:
    - 「エリア別停止件数の棒グラフ」「停止区分別件数の円グラフ」等
  - `OutageTimelineChart` にも同様に `role="img"` と `aria-label` を追加
- **依存**: なし
- **リスク**: 低

### Phase 4 実装順序

```
4-1 (未使用コード削除) → 4-2 (アクセシビリティ)
```

---

## テスト戦略

### ユニットテスト
- `src/lib/date-utils.ts` - `parseOutageDate` の各種フォーマット（時刻あり/なし、不正文字列）
- `Navigation` コンポーネント - アクティブ状態のクラス適用
- `FilterPanel` - モバイル時のデフォルト折りたたみ
- データキャッシュ - TTL超過時の再フェッチ、`invalidateCache` の動作

### E2Eテスト（Playwright）
- 各ページのナビゲーションアクティブ状態の視覚的確認
- モバイルビューポートでのハンバーガーメニュー開閉
- ダークモード切替時のバッジ色変化
- ページ間遷移時のデータ再フェッチ抑制

### 手動テスト
- 375px幅でのハンバーガーメニュー動作
- ダークモード全ページ目視確認
- KPIカードの数値正確性

---

## リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| `layout.tsx` がServer Componentのため `usePathname` が直接使えない | 高 | ナビゲーションを Client Component に抽出 |
| Next.js 16 の API 変更 | 中 | `node_modules/next/dist/docs/` を事前に確認してから実装 |
| Dashboard の日付パースが他ファイルと異なる正規表現を使用 | 中 | 統合時にテストケースで両方のパターンをカバー |
| データキャッシュによる古いデータ表示 | 中 | TTLを5分に設定、手動リフレッシュボタンで `invalidateCache` を呼ぶ |
| ハンバーガーメニューのhydration mismatch | 低 | 初期状態を `closed` にし、クライアント側のみで開閉管理 |
| EChartsのy軸ラベルtooltipのサポート制限 | 低 | まずラベル幅拡大のみで対応し、不十分なら次フェーズで対処 |

---

## 成功基準

- [ ] 全ページでナビゲーションのアクティブ状態が正しく表示される
- [ ] 375pxビューポートでハンバーガーメニューが正常に動作する
- [ ] ダークモードでバッジ・グリッド線・ラベルが適切な色で表示される
- [ ] タイムラインページの重複dark classが解消されている
- [ ] ダッシュボードにKPIサマリーカードが表示される
- [ ] モバイルでフィルターパネルがデフォルト折りたたみ状態になる
- [ ] 日付パース関数が `date-utils.ts` に統合され、3箇所から参照されている
- [ ] ページ間遷移でデータの再フェッチが発生しない（キャッシュが機能）
- [ ] `MonthlyTrendChart.tsx` が削除されている
- [ ] 全チャートに `aria-label` が設定されている
- [ ] `vitest run` と `playwright test` が全てパスする
