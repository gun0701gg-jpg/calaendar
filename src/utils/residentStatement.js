// 수급자별 "장기요양급여비용 명세서" 엑셀 생성.
// 국민건강보험공단 등에서 매달 다운로드하는 "청구명세 리스트"(시트 하나에 수급자별 한 줄씩,
// 수급자명·공단부담금·본인부담금 열이 있는 표)를 업로드하면, 위드온빌리지 자체 명세서 양식으로
// 다시 만들어준다. 서식은 새로 그리지 않고 public/templates/resident-statement-template.xlsx의
// "명세서(양식)" 시트를 그대로 복제해서 값만 채워 넣기 때문에 글꼴·행높이·열너비·테두리가
// 원본과 완전히 동일하다 (도장 이미지 등 그림 개체는 시트 복제 과정에서 제외된다).
const TEMPLATE_URL = "/templates/resident-statement-template.xlsx";
const TEMPLATE_SHEET_PATH = "xl/worksheets/sheet2.xml"; // 템플릿 파일 안의 "명세서(양식)" 시트

const ORG_NAME = "위드온빌리지";

function toNumber(v) {
  return typeof v === "number" ? v : Number(v) || 0;
}

// "청구명세 리스트" 표에서 필요한 열을 찾는다. 열 이름으로 찾아서, 리스트 앞뒤에 제목 줄이
// 몇 줄 더 있거나 열 순서가 바뀌어도 안정적으로 읽을 수 있게 한다.
const REQUIRED_COLUMNS = {
  name: "수급자명",
  insurancePay: "공단부담금",
  selfPay: "본인부담금"
};

// 업로드한 표에서 "수급자명" 열이 있는 줄을 헤더로 보고, 그 아래 각 줄을 수급자 한 명으로 읽는다.
export async function parseResidentStatementFile(file) {
  const readXlsxFile = (await import("read-excel-file/browser")).default;
  const sheets = await readXlsxFile(file);
  const data = sheets[0]?.data || [];

  const headerRowIndex = data.findIndex((row) => row.includes(REQUIRED_COLUMNS.name));
  if (headerRowIndex === -1) {
    return { residents: [], skipped: [] };
  }

  const headers = data[headerRowIndex];
  const columnIndex = Object.fromEntries(
    Object.entries(REQUIRED_COLUMNS).map(([key, header]) => [key, headers.indexOf(header)])
  );

  const residents = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const name = row[columnIndex.name];
    if (!name || typeof name !== "string") continue;

    residents.push({
      name: name.trim(),
      careNumber: "",
      period: "",
      selfPay: toNumber(row[columnIndex.selfPay]),
      insurancePay: toNumber(row[columnIndex.insurancePay]),
      mealCost: 0,
      roomUpgradeCost: 0,
      groomingCost: 0,
      otherCosts: [0, 0, 0, 0, 0],
      prepaidAmount: 0,
      cardAmount: 0,
      receiptAmount: 0,
      cashAmount: 0,
      status: ""
    });
  }

  return { residents, skipped: [] };
}

function statusMark(resident, target) {
  return resident.status?.trim() === target ? "[  X  ]" : "[     ]";
}

function receiptNumber(billingMonth, seq) {
  return `${ORG_NAME}-${billingMonth}-${String(seq).padStart(3, "0")}`;
}

function lastDayOf(billingMonth) {
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

// 리스트 형식 업로드에는 급여제공기간이 없어서, 급여년월 한 달 전체로 기본값을 만든다.
function defaultPeriodText(billingMonth) {
  const [y, m] = billingMonth.split("-");
  const last = String(lastDayOf(billingMonth)).padStart(2, "0");
  return `${y}.${m}.01~${y}.${m}.${last}`;
}

// 엑셀은 날짜를 1899-12-30부터의 일수(정수)로 저장한다.
function excelSerialDate(year, month, day) {
  const epoch = Date.UTC(1899, 11, 30);
  return Math.round((Date.UTC(year, month - 1, day) - epoch) / 86400000);
}

function escapeXmlText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXmlAttr(value) {
  return escapeXmlText(value).replace(/"/g, "&quot;");
}

// 원본 셀의 스타일(s="NN")은 그대로 두고 값/타입만 갈아 끼운다.
function cellPattern(ref) {
  return new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
}

function setTextCell(xml, ref, value) {
  const attrsMatch = xml.match(cellPattern(ref));
  if (!attrsMatch) return xml;
  const attrs = attrsMatch[1].replace(/\st="[^"]*"/, "");
  return xml.replace(
    cellPattern(ref),
    `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${escapeXmlText(value)}</t></is></c>`
  );
}

function setNumberCell(xml, ref, value) {
  const attrsMatch = xml.match(cellPattern(ref));
  if (!attrsMatch) return xml;
  const attrs = attrsMatch[1].replace(/\st="[^"]*"/, "");
  return xml.replace(cellPattern(ref), `<c r="${ref}"${attrs}><v>${Number(value) || 0}</v></c>`);
}

function setFormulaCell(xml, ref, formula) {
  const attrsMatch = xml.match(cellPattern(ref));
  if (!attrsMatch) return xml;
  const attrs = attrsMatch[1].replace(/\st="[^"]*"/, "");
  return xml.replace(cellPattern(ref), `<c r="${ref}"${attrs}><f>${escapeXmlText(formula)}</f></c>`);
}

// 명세서(양식) 시트 원본 XML에 수급자 한 명의 값을 채워 넣는다. 셀 위치는 원본 양식 기준.
function injectResidentValues(templateSheetXml, resident, seq, billingMonth) {
  const [y, m] = billingMonth.split("-").map(Number);
  const periodText = resident.period || defaultPeriodText(billingMonth);
  const receiptNo = receiptNumber(billingMonth, seq);
  const issueDateSerial = excelSerialDate(y, m, lastDayOf(billingMonth));

  let xml = templateSheetXml;
  xml = setTextCell(xml, "A6", resident.name);
  xml = setTextCell(xml, "B6", resident.careNumber);
  xml = setTextCell(xml, "D6", periodText);
  xml = setTextCell(xml, "E6", receiptNo);
  xml = setNumberCell(xml, "D8", resident.selfPay);
  xml = setNumberCell(xml, "D9", resident.insurancePay);
  xml = setNumberCell(xml, "D11", resident.mealCost);
  xml = setNumberCell(xml, "D12", resident.roomUpgradeCost);
  xml = setNumberCell(xml, "D13", resident.groomingCost);
  ["D14", "D15", "D16", "D17", "D18"].forEach((ref, i) => {
    xml = setNumberCell(xml, ref, resident.otherCosts[i]);
  });
  xml = setNumberCell(xml, "G11", resident.prepaidAmount);
  xml = setNumberCell(xml, "G12", resident.cardAmount);
  xml = setNumberCell(xml, "G13", resident.receiptAmount);
  xml = setNumberCell(xml, "G14", resident.cashAmount);
  // 원본 양식에는 ⑨총액/⑩본인부담총액 수식이 비어 있어서, 사용안내에 적힌 공식대로 채운다.
  xml = setFormulaCell(xml, "G8", "D10+D19");
  xml = setFormulaCell(xml, "G10", "D8+D19");
  xml = setTextCell(xml, "H1", `${statusMark(resident, "퇴소")}  퇴 소`);
  xml = setTextCell(xml, "H2", `${statusMark(resident, "중간")}  중 간`);
  xml = setNumberCell(xml, "A22", issueDateSerial);
  return xml;
}

function uniqueSheetName(name, index, used) {
  const base = (name || `수급자${index + 1}`).replace(/[\\/*?:[\]]/g, "").slice(0, 25) || `수급자${index + 1}`;
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}(${n})`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}

function buildWorkbookXml(sheetEntries) {
  const sheetsXml = sheetEntries
    .map((s) => `<sheet name="${escapeXmlAttr(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`)
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheetsXml}</sheets></workbook>`
  );
}

function buildWorkbookRelsXml(count) {
  const sheetRels = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join("");
  const stylesId = count + 1;
  const themeId = count + 2;
  const sstId = count + 3;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheetRels +
    `<Relationship Id="rId${stylesId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId${themeId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>` +
    `<Relationship Id="rId${sstId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>` +
    "</Relationships>"
  );
}

function buildContentTypesXml(count) {
  const sheetOverrides = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheetOverrides +
    '<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
    "</Types>"
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadResidentStatements(residents, billingMonth) {
  const { unzipSync, zipSync, strFromU8, strToU8 } = await import("fflate");

  const templateResponse = await fetch(TEMPLATE_URL);
  if (!templateResponse.ok) {
    throw new Error("명세서 양식 파일을 불러오지 못했습니다.");
  }
  const templateBytes = new Uint8Array(await templateResponse.arrayBuffer());
  const templateFiles = unzipSync(templateBytes);
  const templateSheetXml = strFromU8(templateFiles[TEMPLATE_SHEET_PATH]);

  const outFiles = {
    "_rels/.rels": templateFiles["_rels/.rels"],
    "xl/styles.xml": templateFiles["xl/styles.xml"],
    "xl/theme/theme1.xml": templateFiles["xl/theme/theme1.xml"],
    "xl/sharedStrings.xml": templateFiles["xl/sharedStrings.xml"]
  };

  const used = new Set();
  const sheetEntries = residents.map((resident, i) => {
    const seq = i + 1;
    const sheetXml = injectResidentValues(templateSheetXml, resident, seq, billingMonth);
    outFiles[`xl/worksheets/sheet${seq}.xml`] = strToU8(sheetXml);
    return { id: seq, name: uniqueSheetName(resident.name, i, used) };
  });

  outFiles["xl/workbook.xml"] = strToU8(buildWorkbookXml(sheetEntries));
  outFiles["xl/_rels/workbook.xml.rels"] = strToU8(buildWorkbookRelsXml(sheetEntries.length));
  outFiles["[Content_Types].xml"] = strToU8(buildContentTypesXml(sheetEntries.length));

  const zipped = zipSync(outFiles);
  const blob = new Blob([zipped], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
  downloadBlob(blob, `수급자명세서_${billingMonth}.xlsx`);
}
