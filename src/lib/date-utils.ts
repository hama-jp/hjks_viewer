/**
 * HJKS日付文字列 ("2024/03/15 10:30" or "2024/03/15") をミリ秒タイムスタンプに変換する。
 */
export function parseOutageDate(dateStr: string): number {
  const [date, time] = dateStr.split(" ");
  const [y, m, d] = date.split("/").map(Number);
  const [h, min] = (time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
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
