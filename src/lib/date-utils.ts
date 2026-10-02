/**
 * HJKS日付文字列 ("2024/03/15 10:30" or "2024/03/15") をミリ秒タイムスタンプに変換する。
 * HJKSデータはJST (UTC+9) なので、ブラウザ側ではローカルタイムゾーンで処理する。
 * スクリプト側はTZ=Asia/Tokyoの環境変数設定を前提とする。
 */
export function parseOutageDate(dateStr: string): number {
  const [date, time] = dateStr.split(" ");
  const [y, m, d] = date.split("/").map(Number);
  const [h, min] = (time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

/**
 * HJKS日付文字列をJST前提でDateオブジェクトに変換する（スクリプト用）。
 * ISO 8601形式もサポートする。
 */
export function parseOutageDateAsJST(dateStr: string): Date {
  // "YYYY/MM/DD HH:mm" format
  const slashMatch = dateStr.match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?$/
  );
  if (slashMatch) {
    const [, y, mo, d, h = "0", mi = "0"] = slashMatch;
    // Build ISO string with JST offset (+09:00) so parsing is timezone-explicit
    const iso = `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi.padStart(2, "0")}:00+09:00`;
    return new Date(iso);
  }

  // ISO format fallback
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  throw new Error(`Cannot parse outage date: ${dateStr}`);
}

/**
 * 2つのミリ秒タイムスタンプの差を「X日Y時間」形式の文字列に変換する。
 */
export function formatDuration(startMs: number, endMs: number): string {
  const diffMs = endMs - startMs;
  if (diffMs <= 0) return "0日0時間";
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  return `${days}日${hours}時間`;
}

/**
 * ミリ秒タイムスタンプを M/D 形式の短い日付文字列に変換する。
 * 例: 12/23, 1/3
 */
export function formatShortDate(timestampMs: number): string {
  const d = new Date(timestampMs);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * HJKSは停止・復旧予定が未定の場合、年を 9999 とするセンチネル値
 * （例: "9999/12/31 00:00"）を格納する。それを判定する。
 */
export function isUndeterminedDate(
  dateStr: string | null | undefined
): boolean {
  if (!dateStr) return false;
  const match = dateStr.match(/^(\d{4})\//);
  return match ? Number(match[1]) >= 9999 : false;
}

/**
 * ISO 8601 の生成日時を「yyyy年M月d日 H:mm」形式（ローカルタイム）に整形する。
 * 例: 2026年10月2日 13:45
 */
export function formatGeneratedAt(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${d.getHours()}:${minutes}`;
}

/**
 * 日時文字列を表示用に整形する。未定センチネルは「未定」、
 * 空値は「―」を返し、それ以外は元の文字列を返す。
 */
export function formatOutageDateLabel(
  dateStr: string | null | undefined
): string {
  if (!dateStr) return "―";
  if (isUndeterminedDate(dateStr)) return "未定";
  return dateStr;
}
