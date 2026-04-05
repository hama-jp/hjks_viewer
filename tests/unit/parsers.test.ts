import { describe, it, expect } from "vitest";
import {
  parseOutagesCsv,
  parseUnitsCsv,
  parseTopPageHtml,
} from "../../scripts/lib/parsers";

// --- CSV test fixtures ---

const OUTAGES_CSV_HEADER =
  "エリア,発電事業者,発電所コード,発電所名,発電形式,ユニット名,認可出力(kW),停止区分,種別,低下量(kW),停止日時,復旧見通し,復旧予定日,停止原因,最終更新日時";

const OUTAGE_ROW_1 =
  '北海道,北海道電力,01001,泊発電所,原子力,1号機,579000,計画停止,停止・定期検査等,579000,2024/05/01 00:00,未定,,定期検査,2024/05/01 10:00';

const OUTAGE_ROW_2 =
  '東京,東京電力,03010,品川火力発電所,火力(ガス),1号機,1140000,計画外停止,停止・設備故障,1140000,2024/06/15 08:30,2024年7月上旬,2024/07/01 00:00,ボイラー不具合,2024/06/15 12:00';

const UNITS_CSV_HEADER =
  "エリア,発電事業者,発電所コード,発電所名,発電形式,ユニット名,認可出力(kW),変更後認可出力(kW),変更後認可出力適用日,稼動開始日,稼動終了日,最終更新日時";

const UNIT_ROW_1 =
  '北海道,北海道電力,01001,泊発電所,原子力,1号機,579000,,,1989/06/22,,2024/01/10 09:00';

// --- parseOutagesCsv ---

describe("parseOutagesCsv", () => {
  it("should parse a valid CSV with header and one row", () => {
    const csv = `${OUTAGES_CSV_HEADER}\n${OUTAGE_ROW_1}`;
    const records = parseOutagesCsv(csv);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      area: "北海道",
      company: "北海道電力",
      plantcd: "01001",
      name: "泊発電所",
      format: "原子力",
      unitname: "1号機",
      maxcapacity: "579000",
      maintemode: "計画停止",
      assortment: "停止・定期検査等",
      downcapacity: "579000",
      startdt: "2024/05/01 00:00",
      outlook: "未定",
      restartschdt: "",
      factor: "定期検査",
      upddt: "2024/05/01 10:00",
    });
  });

  it("should parse multiple rows", () => {
    const csv = `${OUTAGES_CSV_HEADER}\n${OUTAGE_ROW_1}\n${OUTAGE_ROW_2}`;
    const records = parseOutagesCsv(csv);

    expect(records).toHaveLength(2);
    expect(records[1].company).toBe("東京電力");
    expect(records[1].maintemode).toBe("計画外停止");
  });

  it("should handle empty CSV (header only)", () => {
    const csv = OUTAGES_CSV_HEADER;
    const records = parseOutagesCsv(csv);
    expect(records).toHaveLength(0);
  });

  it("should handle CSV with trailing newline", () => {
    const csv = `${OUTAGES_CSV_HEADER}\n${OUTAGE_ROW_1}\n`;
    const records = parseOutagesCsv(csv);
    expect(records).toHaveLength(1);
  });

  it("should handle fields containing commas in quotes", () => {
    const row =
      '東京,東京電力,03010,"品川火力発電所,第二",火力(ガス),1号機,1140000,計画停止,停止・定期検査等,1140000,2024/06/15 08:30,未定,,定期検査,2024/06/15 12:00';
    const csv = `${OUTAGES_CSV_HEADER}\n${row}`;
    const records = parseOutagesCsv(csv);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("品川火力発電所,第二");
  });

  it("should throw on completely empty input", () => {
    expect(() => parseOutagesCsv("")).toThrow();
  });

  it("should parse tab-separated CSV (real HJKS format)", () => {
    const tsv = `"エリア"\t"発電事業者"\t"発電所コード"\t"発電所名"\t"発電形式"\t"ユニット名"\t"認可出力(kW)"\t"停止区分"\t"種別"\t"低下量(kW)"\t"停止日時"\t"復旧見通し"\t"復旧予定日"\t"停止原因"\t"最終更新日時"\n"四国"\t"四国電力(株)"\t"80701-1"\t"西条発電所"\t"火力（石炭）"\t"１号機"\t"500,000"\t"出力低下"\t"低下・その他"\t"123,000"\t"2026/03/23 21:30"\t"あり"\t"2026/04/30"\t"確認試験"\t"2026/03/30 09:32"`;
    const records = parseOutagesCsv(tsv);
    expect(records).toHaveLength(1);
    expect(records[0].name).toBe("西条発電所");
    expect(records[0].maxcapacity).toBe("500,000");
    expect(records[0].maintemode).toBe("出力低下");
  });
});

// --- parseUnitsCsv ---

describe("parseUnitsCsv", () => {
  it("should parse a valid units CSV", () => {
    const csv = `${UNITS_CSV_HEADER}\n${UNIT_ROW_1}`;
    const records = parseUnitsCsv(csv);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      area: "北海道",
      company: "北海道電力",
      plantcd: "01001",
      name: "泊発電所",
      format: "原子力",
      unitname: "1号機",
      maxcapacity: "579000",
      nextmaxcapacity: "",
      nextmaxcapacitystartdt: "",
      startdt: "1989/06/22",
      enddt: "",
      upddt: "2024/01/10 09:00",
    });
  });

  it("should handle empty CSV (header only)", () => {
    const csv = UNITS_CSV_HEADER;
    const records = parseUnitsCsv(csv);
    expect(records).toHaveLength(0);
  });
});

// --- parseTopPageHtml ---

describe("parseTopPageHtml", () => {
  const SAMPLE_HTML = `
<html>
<body>
<table class="outage-table">
<thead>
<tr>
<th>エリア</th><th>発電事業者</th><th>発電所コード</th><th>発電所名</th>
<th>発電形式</th><th>ユニット名</th><th>認可出力(kW)</th><th>停止区分</th>
<th>種別</th><th>低下量(kW)</th><th>停止日時</th><th>復旧見通し</th>
<th>復旧予定日</th><th>停止原因</th><th>最終更新日時</th>
</tr>
</thead>
<tbody>
<tr>
<td>北海道</td><td>北海道電力</td><td>01001</td><td>泊発電所</td>
<td>原子力</td><td>1号機</td><td>579,000</td><td>計画停止</td>
<td>停止・定期検査等</td><td>579,000</td><td>2024/05/01 00:00</td><td>未定</td>
<td></td><td>定期検査</td><td>2024/05/01 10:00</td>
</tr>
</tbody>
</table>
</body>
</html>`;

  it("should parse outage records from HTML table", () => {
    const records = parseTopPageHtml(SAMPLE_HTML);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      area: "北海道",
      company: "北海道電力",
      plantcd: "01001",
      name: "泊発電所",
      unitname: "1号機",
      maxcapacity: "579000",
      downcapacity: "579000",
    });
  });

  it("should strip comma formatting from numbers", () => {
    const records = parseTopPageHtml(SAMPLE_HTML);
    expect(records[0].maxcapacity).toBe("579000");
    expect(records[0].downcapacity).toBe("579000");
  });

  it("should return empty array for HTML with no table rows", () => {
    const html = "<html><body><table><thead><tr><th>Header</th></tr></thead><tbody></tbody></table></body></html>";
    const records = parseTopPageHtml(html);
    expect(records).toHaveLength(0);
  });

  it("should return empty array for empty HTML", () => {
    const records = parseTopPageHtml("");
    expect(records).toHaveLength(0);
  });
});
