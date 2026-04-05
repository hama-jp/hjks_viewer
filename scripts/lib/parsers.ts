import { parse } from "csv-parse/sync";
import type { RawOutageRecord, RawUnitRecord } from "@/types/outage";

const OUTAGE_HEADER_MAP: Record<string, keyof RawOutageRecord> = {
  エリア: "area",
  発電事業者: "company",
  発電所コード: "plantcd",
  発電所名: "name",
  発電形式: "format",
  ユニット名: "unitname",
  "認可出力(kW)": "maxcapacity",
  認可出力: "maxcapacity",
  停止区分: "maintemode",
  種別: "assortment",
  "低下量(kW)": "downcapacity",
  低下量: "downcapacity",
  停止日時: "startdt",
  復旧見通し: "outlook",
  復旧予定日: "restartschdt",
  停止原因: "factor",
  最終更新日時: "upddt",
};

const UNIT_HEADER_MAP: Record<string, keyof RawUnitRecord> = {
  エリア: "area",
  発電事業者: "company",
  発電所コード: "plantcd",
  発電所名: "name",
  発電形式: "format",
  ユニット名: "unitname",
  "認可出力(kW)": "maxcapacity",
  認可出力: "maxcapacity",
  "変更後認可出力(kW)": "nextmaxcapacity",
  変更後認可出力: "nextmaxcapacity",
  変更後認可出力適用日: "nextmaxcapacitystartdt",
  稼動開始日: "startdt",
  稼動終了日: "enddt",
  最終更新日時: "upddt",
};

function mapHeaders(
  headerMap: Record<string, string>
): (headers: string[]) => string[] {
  return (headers: string[]) =>
    headers.map((h) => {
      const trimmed = h.trim();
      return headerMap[trimmed] ?? trimmed;
    });
}

/**
 * Auto-detect delimiter: if the first line contains tabs, use tab (real HJKS
 * downloads are TSV); otherwise fall back to comma (test fixtures).
 */
function detectDelimiter(text: string): string {
  const firstLine = text.split("\n")[0];
  return firstLine.includes("\t") ? "\t" : ",";
}

export function parseOutagesCsv(csvText: string): RawOutageRecord[] {
  if (!csvText.trim()) {
    throw new Error("Empty CSV input");
  }

  const records = parse(csvText, {
    columns: mapHeaders(OUTAGE_HEADER_MAP),
    delimiter: detectDelimiter(csvText),
    quote: '"',
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as RawOutageRecord[];

  return records;
}

export function parseUnitsCsv(csvText: string): RawUnitRecord[] {
  if (!csvText.trim()) {
    throw new Error("Empty CSV input");
  }

  const records = parse(csvText, {
    columns: mapHeaders(UNIT_HEADER_MAP),
    delimiter: detectDelimiter(csvText),
    quote: '"',
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    relax_quotes: true,
  }) as RawUnitRecord[];

  return records;
}

export function parseTopPageHtml(html: string): RawOutageRecord[] {
  if (!html.trim()) {
    return [];
  }

  const records: RawOutageRecord[] = [];
  const fields: (keyof RawOutageRecord)[] = [
    "area",
    "company",
    "plantcd",
    "name",
    "format",
    "unitname",
    "maxcapacity",
    "maintemode",
    "assortment",
    "downcapacity",
    "startdt",
    "outlook",
    "restartschdt",
    "factor",
    "upddt",
  ];

  // Match <tbody> content
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) return records;

  // Match each <tr> in tbody
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(tbodyMatch[1])) !== null) {
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
      const stripTags = (html: string) => html.replace(/<[^>]+>/g, "").trim();
      cells.push(stripTags(cellMatch[1]));
    }

    if (cells.length >= fields.length) {
      const record = {} as Record<string, string>;
      for (let i = 0; i < fields.length; i++) {
        let value = cells[i];
        // Strip comma formatting from numbers
        if (fields[i] === "maxcapacity" || fields[i] === "downcapacity") {
          value = value.replace(/,/g, "");
        }
        record[fields[i]] = value;
      }
      records.push(record as unknown as RawOutageRecord);
    }
  }

  return records;
}
