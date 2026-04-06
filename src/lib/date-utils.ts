/**
 * HJKS日付文字列 ("2024/03/15 10:30" or "2024/03/15") をミリ秒タイムスタンプに変換する。
 */
export function parseOutageDate(dateStr: string): number {
  const [date, time] = dateStr.split(" ");
  const [y, m, d] = date.split("/").map(Number);
  const [h, min] = (time || "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}
