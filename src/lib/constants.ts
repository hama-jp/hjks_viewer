export const AREAS: Record<string, string> = {
  "1": "北海道",
  "2": "東北",
  "3": "東京",
  "4": "中部",
  "5": "北陸",
  "6": "関西",
  "7": "中国",
  "8": "四国",
  "9": "九州",
  "10": "沖縄",
};

export const FORMATS: Record<string, string> = {
  "1": "原子力",
  "5": "水力",
  "2": "火力(石炭)",
  "3": "火力(ガス)",
  "4": "火力(石油)",
  "6": "地熱",
  "7": "風力",
  "8": "太陽光・太陽熱",
  "99": "その他",
};

export const MAINTEMODES: Record<string, string> = {
  "1": "計画停止",
  "2": "計画外停止",
  "3": "出力低下",
};

export const ASSORTMENTS: Record<string, string> = {
  "1": "停止・定期検査等",
  "2": "停止・設備故障",
  "3": "停止・送電線等制約",
  "4": "停止・長期計画停止",
  "5": "停止・燃料制約",
  "6": "停止・その他",
  "7": "低下・設備故障",
  "8": "低下・送電線等制約",
  "9": "低下・燃料制約",
  "10": "低下・その他",
};

export const MAINTEMODE_COLORS: Record<string, string> = {
  "1": "#3b82f6", // 計画停止 blue
  "2": "#ef4444", // 計画外停止 red
  "3": "#f59e0b", // 出力低下 amber
};

export function getAreaName(code: string): string {
  return AREAS[code] ?? "不明";
}

export function getFormatName(code: string): string {
  return FORMATS[code] ?? "不明";
}

export function getMaintemodeName(code: string): string {
  return MAINTEMODES[code] ?? "不明";
}

export function getAssortmentName(code: string): string {
  return ASSORTMENTS[code] ?? "不明";
}

// Reverse maps: display name → code
function invertMap(map: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {};
  for (const [code, name] of Object.entries(map)) {
    inv[name] = code;
  }
  return inv;
}

export const AREAS_REVERSE = invertMap(AREAS);
export const FORMATS_REVERSE = invertMap(FORMATS);
export const MAINTEMODES_REVERSE = invertMap(MAINTEMODES);
export const ASSORTMENTS_REVERSE = invertMap(ASSORTMENTS);
