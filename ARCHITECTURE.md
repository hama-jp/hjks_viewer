# HJKS 停止情報ビューア — アーキテクチャ設計書

## 1. モジュール設計（Class/Module Design）

### 1.1 スクリプト層（`scripts/`）

#### `scripts/lib/fetchers.ts` — HJKS通信モジュール

**責務**: HJKSサイトとの全通信を一元管理。セッション管理、CSRF取得、リトライ、レート制限を担当。

```
┌─────────────────────────────────────────────────┐
│  HjksClient                                     │
├─────────────────────────────────────────────────┤
│ - sessionId: string | null                      │
│ - csrfToken: string | null                      │
│ - cookieJar: Map<string, string>                │
├─────────────────────────────────────────────────┤
│ + initSession(): Promise<void>                  │
│   → GET /hjks/outages でセッション+CSRF取得     │
│                                                 │
│ + downloadOutagesCsv(params: FetchParams):      │
│     Promise<string>                             │
│   → POST /hjks/outages で csv=csv 送信          │
│                                                 │
│ + downloadUnitsCsv(): Promise<string>           │
│   → POST /hjks/unit で csv=csv 送信             │
│                                                 │
│ + fetchOutagesAjax(params: AjaxParams):         │
│     Promise<AjaxResponse>                       │
│   → POST /hjks/outages_ajax (w2ui形式)          │
│                                                 │
│ + scrapeTopPage(): Promise<string>              │
│   → GET /hjks/top (認証不要、フォールバック用)   │
│                                                 │
│ - extractCsrf(html: string): string             │
│ - buildFormData(params): URLSearchParams         │
│ - withRetry<T>(fn, opts): Promise<T>            │
│ - rateLimit(): Promise<void>                    │
└─────────────────────────────────────────────────┘
```

**設計ポイント**:
- `fetch` API を使用（Node.js 18+ のネイティブfetch）
- リトライは指数バックオフ（最大3回、初期1秒、最大8秒）
- レート制限: リクエスト間に最低1秒の間隔
- セッション有効期限切れの自動検出と再取得
- CSRFトークンはHTMLから `<meta name="_csrf" content="...">` または `<input name="_csrf">` でパース

#### `scripts/lib/parsers.ts` — CSV/HTMLパーサー

**責務**: 生データのパースのみ。バリデーションは行わない。

```typescript
parseOutagesCsv(csvText: string): RawOutageRecord[]
parseUnitsCsv(csvText: string): RawUnitRecord[]
parseTopPageHtml(html: string): RawOutageRecord[]
```

- `csv-parse/sync` を使用、Shift_JIS → UTF-8 変換を考慮
- CSVヘッダーのマッピング（日本語ヘッダー → 英語フィールド名）

#### `scripts/lib/normalizers.ts` — 正規化・バリデーション

**責務**: パース結果をZodスキーマでバリデーションし、正規化済みJSONに変換。

```typescript
normalizeOutages(raw: RawOutageRecord[]): NormalizedOutage[]
normalizeUnits(raw: RawUnitRecord[]): NormalizedUnit[]
deduplicateOutages(existing: NormalizedOutage[], incoming: NormalizedOutage[]): NormalizedOutage[]
```

- 日付文字列 → ISO 8601形式に統一
- 数値文字列 → number変換（`maxcapacity`, `downcapacity`）
- コードマスタのインライン展開（`area: "1"` → `areaName: "北海道"`）
- 重複排除: `plantcd + unitname + startdt` を複合キーとして使用

#### `scripts/fetch-outages.ts` — 停止情報取得エントリーポイント

```
モード:
  --mode daily    : 前日〜当日分を取得（デフォルト）
  --mode now      : 当日の最新データを取得
  --mode backfill : --from YYYY-MM-DD --to YYYY-MM-DD で範囲指定
  --mode full     : 全データ取得（フィルタなし）
```

**取得戦略（フォールバックチェイン）**:
1. CSV ダウンロード（セッション+CSRF）
2. AJAX エンドポイント（同セッション）
3. トップページ HTML スクレイピング（認証不要、最新データのみ）
4. Playwright ブラウザ自動化（最終手段）

#### `scripts/sync-public-data.ts` — ビルド前データ同期

**責務**: `data/normalized/` → `public/data/` へのコピーと、インデックスファイル（`manifest.json`）の生成。

---

### 1.2 フロントエンド層（`src/`）

#### `src/lib/schemas.ts` — Zodスキーマ（共有）

スクリプト層とフロントエンド層の両方から参照される共有スキーマ。

#### `src/lib/data-loader.ts` — データ読み込み

```typescript
// ビルド時（RSC経由）
loadOutages(): Promise<NormalizedOutage[]>
loadUnits(): Promise<NormalizedUnit[]>

// ランタイム（クライアント側）
fetchOutageChunk(page: number): Promise<OutageChunk>
fetchManifest(): Promise<DataManifest>
```

#### `src/lib/constants.ts` — マスタデータ定数

```typescript
export const AREAS: Record<string, string> = { "1": "北海道", "2": "東北", ... }
export const FORMATS: Record<string, string> = { ... }
export const MAINTEMODES: Record<string, string> = { ... }
export const ASSORTMENTS: Record<string, string> = { ... }
```

#### `src/components/` — UIコンポーネント

```
components/
├── layout/
│   ├── Header.tsx           # サイトヘッダー
│   ├── Sidebar.tsx          # ナビゲーション
│   └── PageContainer.tsx    # 共通レイアウトラッパー
├── filters/
│   ├── FilterPanel.tsx      # フィルタパネル全体（コンテナ）
│   ├── AreaFilter.tsx       # エリア選択
│   ├── FormatFilter.tsx     # 発電形式選択
│   ├── MaintemodeFilter.tsx # 停止区分選択
│   ├── DateRangeFilter.tsx  # 期間選択
│   └── useFilters.ts        # フィルタ状態管理Hook
├── tables/
│   ├── OutageTable.tsx      # 停止情報テーブル
│   ├── SortableHeader.tsx   # ソート可能カラムヘッダー
│   ├── Pagination.tsx       # ページネーション
│   └── useTableState.ts    # テーブルソート・ページネーションHook
├── charts/
│   ├── EChartWrapper.tsx    # ECharts共通ラッパー（lazy load対応）
│   ├── OutageByAreaChart.tsx
│   ├── OutageByFormatChart.tsx
│   ├── MonthlyTrendChart.tsx
│   ├── AssortmentPieChart.tsx
│   └── UnitTimelineChart.tsx
└── common/
    ├── LoadingSpinner.tsx
    ├── ErrorBoundary.tsx
    └── EmptyState.tsx
```

---

## 2. データ取得戦略（Data Fetching Strategy）

### 2.1 セッション管理フロー

```
┌──────────────┐     GET /hjks/outages     ┌──────────────┐
│ fetch-outages│ ───────────────────────→  │   HJKS       │
│    .ts       │ ←─────────────────────── │   Server     │
│              │   Set-Cookie: JSESSIONID  │              │
│              │   HTML with _csrf token   │              │
│              │                           │              │
│              │  POST /hjks/outages       │              │
│              │  Cookie: JSESSIONID       │              │
│              │  Body: csv=csv&_csrf=xxx  │              │
│              │  &area=&format=&...       │              │
│              │ ───────────────────────→  │              │
│              │ ←─────────────────────── │              │
│              │   Content-Type: text/csv  │              │
└──────────────┘                           └──────────────┘
```

### 2.2 リトライとフォールバック

```typescript
async function fetchOutageData(params: FetchParams): Promise<RawOutageRecord[]> {
  // Strategy 1: CSV Download
  try {
    const client = new HjksClient();
    await client.initSession();
    const csv = await client.downloadOutagesCsv(params);
    return parsers.parseOutagesCsv(csv);
  } catch (e) {
    logger.warn("CSV download failed, trying AJAX", e);
  }

  // Strategy 2: AJAX endpoint
  try {
    const client = new HjksClient();
    await client.initSession();
    const data = await client.fetchOutagesAjax(params);
    return data.records;
  } catch (e) {
    logger.warn("AJAX failed, trying top page scrape", e);
  }

  // Strategy 3: Top page (limited data, no auth)
  try {
    const client = new HjksClient();
    const html = await client.scrapeTopPage();
    return parsers.parseTopPageHtml(html);
  } catch (e) {
    logger.warn("Top page scrape failed, trying Playwright", e);
  }

  // Strategy 4: Playwright (if installed)
  if (isPlaywrightAvailable()) {
    return await playwrightFallback(params);
  }

  throw new FetchError("All fetch strategies exhausted");
}
```

### 2.3 レート制限

- リクエスト間隔: 最低1000ms
- セッション初期化後のウェイト: 500ms
- GitHub Actions cron: `0 6,18 * * *`（JST 15:00, 03:00）
- バックフィル時: 月単位でループ、各リクエスト間2秒

---

## 3. データモデル（Data Model）

### 3.1 Zodスキーマ

```typescript
// src/lib/schemas.ts

// --- 生データスキーマ（パース直後） ---
export const RawOutageRecordSchema = z.object({
  area: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  unitname: z.string(),
  maxcapacity: z.string(),
  maintemode: z.string(),
  assortment: z.string(),
  downcapacity: z.string(),
  startdt: z.string(),
  outlook: z.string(),
  restartschdt: z.string(),
  factor: z.string(),
  upddt: z.string(),
});

// --- 正規化済みスキーマ ---
export const NormalizedOutageSchema = z.object({
  id: z.string(),              // `${plantcd}_${unitname}_${startdt}` のハッシュ
  area: z.string(),
  areaName: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  formatName: z.string(),
  unitname: z.string(),
  maxcapacity: z.number(),     // kW
  downcapacity: z.number(),    // kW
  maintemode: z.string(),
  maintemodeName: z.string(),
  assortment: z.string(),
  assortmentName: z.string(),
  startdt: z.string(),         // ISO 8601
  restartschdt: z.string().nullable(),
  outlook: z.string(),
  factor: z.string(),
  upddt: z.string(),
  fetchedAt: z.string(),
});

export const NormalizedUnitSchema = z.object({
  id: z.string(),
  area: z.string(),
  areaName: z.string(),
  company: z.string(),
  plantcd: z.string(),
  name: z.string(),
  format: z.string(),
  formatName: z.string(),
  unitname: z.string(),
  maxcapacity: z.number(),
  nextmaxcapacity: z.number().nullable(),
  nextmaxcapacitystartdt: z.string().nullable(),
  startdt: z.string().nullable(),
  enddt: z.string().nullable(),
  upddt: z.string(),
});

// --- データファイルスキーマ ---
export const OutageFileSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    recordCount: z.number(),
    source: z.enum(["csv", "ajax", "toppage", "playwright"]),
  }),
  records: z.array(NormalizedOutageSchema),
});
```

### 3.2 データファイル構成

```
data/
├── raw/                                    # .gitignore（GA内のみ使用）
│   ├── outages_2026-04-05.csv
│   └── units_2026-04-05.csv
└── normalized/
    ├── outages-current.json                # 現在停止中の全件
    ├── outages-archive/
    │   ├── 2026-Q1.json                    # 四半期アーカイブ
    │   └── 2025-Q4.json
    ├── units.json                           # ユニットマスタ
    └── manifest.json                        # メタ情報
```

**`manifest.json`**:
```json
{
  "lastUpdated": "2026-04-05T06:00:00Z",
  "files": {
    "current": { "path": "outages-current.json", "recordCount": 245, "sizeBytes": 189000 },
    "archives": [
      { "path": "outages-archive/2026-Q1.json", "period": "2026-Q1", "recordCount": 1200 }
    ],
    "units": { "path": "units.json", "recordCount": 850 }
  }
}
```

**分割方式の判断**: 四半期アーカイブ + currentスナップショット
- `outages-current.json`: 現在停止中のみ（200-400件、100-300KB）→ ダッシュボード用
- アーカイブ: 過去分析時のみオンデマンドロード
- `data/raw/` は `.gitignore`、GitHub Actions Artifactsとして90日保持

---

## 4. エラーハンドリング戦略

### 4.1 カスタムエラー階層

```typescript
class HjksError extends Error {
  constructor(message: string, public readonly cause?: unknown) { super(message); }
}
class SessionError extends HjksError {}      // セッション取得失敗
class CsrfError extends HjksError {}         // CSRFトークン抽出失敗
class NetworkError extends HjksError {}      // ネットワークエラー
class ParseError extends HjksError {}        // CSV/HTMLパースエラー
class ValidationError extends HjksError {}   // Zodバリデーション失敗
```

### 4.2 エラー対応マトリクス

| エラー種類 | リトライ | フォールバック | 通知 |
|---|---|---|---|
| NetworkError (timeout) | 3回 | 次のストラテジーへ | - |
| SessionError | 1回（再取得） | 次のストラテジーへ | - |
| CsrfError | 再セッション取得 | 次のストラテジーへ | - |
| ParseError | - | - | GitHub Actions失敗通知 |
| ValidationError (部分) | - | 不正レコードをスキップ | 閾値超えで通知 |
| 全ストラテジー失敗 | - | 前回データを維持 | 必ず通知 |

**バリデーション閾値**: 失敗レコードが全体の10%超 → データ形式変更の可能性としてGitHub Actionsを失敗扱い。

### 4.3 フロントエンドのGraceful Degradation

```typescript
export async function loadOutagesCurrent(): Promise<LoadResult<NormalizedOutage[]>> {
  try {
    const res = await fetch(`${basePath}/data/outages-current.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = OutageFileSchema.parse(await res.json());
    return { ok: true, data: data.records, meta: data.meta };
  } catch (e) {
    return { ok: false, error: "データの読み込みに失敗しました。", data: [] };
  }
}
```

- データ読み込み失敗 → エラーメッセージ + 「再読み込み」ボタン
- 部分失敗（currentは成功、archiveは失敗） → currentのみ表示
- チャートライブラリ読み込み失敗 → テーブルのみ表示

---

## 5. 状態管理（State Management）

### 5.1 フィルタ状態 → URLクエリパラメータ同期

```typescript
// src/components/filters/useFilters.ts
export interface FilterState {
  areas: string[];
  formats: string[];
  maintemodes: string[];
  assortments: string[];
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
}

export function useFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: FilterState = useMemo(() => ({
    areas: searchParams.getAll("area"),
    formats: searchParams.getAll("format"),
    maintemodes: searchParams.getAll("maintemode"),
    assortments: searchParams.getAll("assortment"),
    dateFrom: searchParams.get("from"),
    dateTo: searchParams.get("to"),
    search: searchParams.get("q") ?? "",
  }), [searchParams]);

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    const merged = { ...filters, ...newFilters };
    const params = new URLSearchParams();
    // ... serialize to URL
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, router, pathname]);

  return { filters, setFilters };
}
```

**グローバル状態管理ライブラリを使わない理由**:
- フィルタ状態はURLで完結 → ブックマーク・共有可能
- データはfetch結果のキャッシュのみ → React state + useMemo で十分
- 静的サイトのためサーバー状態管理は不要

### 5.2 フィルタリング・ソート処理

**クライアントサイドで全件フィルタ**（currentデータは数百件のため十分高速）:

```typescript
export function applyFilters(records: NormalizedOutage[], filters: FilterState): NormalizedOutage[] {
  return records.filter(r => {
    if (filters.areas.length > 0 && !filters.areas.includes(r.area)) return false;
    if (filters.formats.length > 0 && !filters.formats.includes(r.format)) return false;
    // ...
    return true;
  });
}
```

---

## 6. データフロー（End-to-End）

```
┌────────────────────────────────────────────────────────────────────┐
│                      GitHub Actions (Cron)                         │
│                                                                    │
│  fetch-outages.ts → parsers.ts → normalizers.ts → data/normalized/│
│       ↓                                                ↓           │
│    HJKS Server                                    git commit/push  │
│                                                        ↓           │
│  sync-public-data.ts → public/data/                                │
│                             ↓                                      │
│  next build (static export) → GitHub Pages (CDN)                   │
└────────────────────────────────┼───────────────────────────────────┘
                                 ↓
                        Browser: fetch JSON → フィルタ → テーブル/チャート
```

### GitHub Actions ワークフロー

**`data-refresh.yml`**: cron `0 6,18 * * *` + manual dispatch
1. checkout → setup Node.js → npm ci
2. `tsx scripts/fetch-outages.ts --mode daily`
3. `tsx scripts/fetch-units.ts`
4. `tsx scripts/sync-public-data.ts`
5. 差分あれば git commit & push → deploy-pages トリガー

**`deploy-pages.yml`**: push to main (paths: src/**, public/**) + workflow_dispatch
1. checkout → npm ci → next build → upload to GitHub Pages

**`ci.yml`**: PR to main
1. tsc --noEmit → eslint → vitest run → next build

---

## 7. パフォーマンス考慮事項

### 7.1 データサイズ見積もり

| データ | 件数（推定） | JSONサイズ |
|---|---|---|
| current | 200-500件 | 150-400KB |
| 四半期アーカイブ | 1000-2000件/Q | 500KB-1.5MB |
| ユニットマスタ | 800-1000件 | 200-400KB |
| 合計（1年分） | ~8000件 | ~6MB |

### 7.2 最適化

- **ECharts遅延ロード**: `dynamic(() => import("echarts-for-react"), { ssr: false })`
- **アーカイブオンデマンドロード**: 期間フィルタで過去を選択した場合のみ取得
- **テーブルページネーション**: クライアントサイド、50件/ページ
- **リポジトリサイズ管理**: `data/raw/` は `.gitignore`、normalized のみコミット

---

## ADR（Architecture Decision Records）

### ADR-001: データファイル分割 — 四半期アーカイブ + currentスナップショット
ダッシュボード表示に必要なデータを軽量に保ちつつ、過去分析にも対応。

### ADR-002: 状態管理 — URLクエリパラメータベース
ブックマーク・共有可能、ブラウザの戻る/進むで自然に動作、依存ライブラリ不要。

### ADR-003: スクレイピング方式 — 4段階フォールバックチェイン
CSV → AJAX → HTMLスクレイピング → Playwright で可用性を最大化。

### ADR-004: RAWデータ管理 — Gitにコミットしない
`data/raw/` は `.gitignore`、正規化済みJSONのみコミット。生CSVはGitHub Actions Artifactsとして90日保持。

---

## 実装優先順位

| 順序 | モジュール | 重要度 |
|---|---|---|
| 1 | `src/lib/schemas.ts` + `src/types/outage.ts` | 最高（全モジュールの基盤） |
| 2 | `scripts/lib/fetchers.ts` | 最高 |
| 3 | `scripts/lib/parsers.ts` + `normalizers.ts` | 最高 |
| 4 | `scripts/fetch-outages.ts` | 最高 |
| 5 | テスト（Vitest: parsers, normalizers） | 高 |
| 6 | `.github/workflows/data-refresh.yml` | 高 |
| 7 | `src/lib/data-loader.ts` + `constants.ts` | 高 |
| 8 | `src/components/filters/` + `tables/` | 中 |
| 9 | `src/app/outages/page.tsx` | 中 |
| 10 | `src/components/charts/` | 中 |
| 11 | `src/app/page.tsx`（ダッシュボード） | 中 |
| 12 | `.github/workflows/deploy-pages.yml` | 中 |
| 13 | Playwright E2E テスト | 低 |
