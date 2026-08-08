// 수급자 명세서/집계표 작성에 필요한 6개 파일(수급자현황, 상급침실 추가비용, 계약의사진찰비,
// 진료약제비(PDF), 가정간호비, 등급외비용)을 읽어서 수급자 이름 기준으로 하나의 데이터로 합친다.
//
// 수급자현황을 제외한 나머지 파일들은 매달 원본 시스템(장기요양기관 업무포털, 협력병원/약국 등)에서
// 그대로 내려받는 표라서 표 구조가 제각각이다. 그래서 "이름이 있는 줄을 찾아서 그 줄에서 가장
// 오른쪽에 있는 숫자 칸을 그 줄의 금액으로 본다"는 공통 규칙으로 읽는다. 실제 파일들을 보면 어느
// 표든 마지막 열이 그 줄의 합계/금액이고, 그 앞쪽 열들은 날짜·생년월일·관리번호처럼 참고용 값이라
// 이 규칙이 안정적으로 맞아떨어진다.

function toNumber(v) {
  return typeof v === "number" ? v : Number(v) || 0;
}

function normName(v) {
  return typeof v === "string" ? v.trim() : "";
}

async function readWorkbook(file) {
  const { sanitizeXlsxFile } = await import("./xlsxSanitize.js");
  const readXlsxFile = (await import("read-excel-file/browser")).default;
  const safeFile = await sanitizeXlsxFile(file);
  return readXlsxFile(safeFile);
}

function findColumn(headers, candidates) {
  for (const name of candidates) {
    const i = headers.indexOf(name);
    if (i >= 0) return i;
  }
  return -1;
}

// File1(수급자현황). 두 가지 표 형식을 모두 지원한다.
// - 업무포털 "수급자정보" 내보내기: 수급현황(입소중인 사람만 사용)/수급자명/인정등급/본인부담률(예:
//   "감경(8%)")/인정번호 열이 있는 표. 일수·공단부담금·본인부담금·등급외 금액은 이 표에는 없다.
// - (예전 방식) 청구명세리스트 형태: 연번/수급자명/등급/본인부담률/일수/공단부담금/본인부담금/등급외
//   금액이 모두 있는 표.
export async function parseRosterFile(file) {
  const sheets = await readWorkbook(file);
  const data = sheets[0]?.data || [];

  const headerRowIndex = data.findIndex(
    (row) => row.includes("수급자명") && (row.includes("인정등급") || row.includes("등급"))
  );
  if (headerRowIndex === -1) return [];

  const headers = data[headerRowIndex];
  const col = {
    status: findColumn(headers, ["수급현황"]),
    seq: findColumn(headers, ["연번"]),
    name: findColumn(headers, ["수급자명"]),
    grade: findColumn(headers, ["인정등급", "등급"]),
    selfPayRate: findColumn(headers, ["본인부담률"]),
    careNumber: findColumn(headers, ["인정번호", "장기요양인정번호"]),
    days: findColumn(headers, ["일수"]),
    insurancePay: findColumn(headers, ["공단부담금"]),
    selfPay: findColumn(headers, ["본인부담금"]),
    gradeExempt: findColumn(headers, ["등급외"])
  };

  const roster = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const name = normName(row[col.name]);
    if (!name) continue;
    // "수급현황" 열이 있는 표(업무포털 내보내기)는 "입소중"인 사람만 쓴다.
    if (col.status >= 0 && String(row[col.status] ?? "").trim() !== "입소중") continue;

    // "감경(8%)"처럼 괄호 안에 실제 부담률이 있으면 그 부분만 쓰고, 아니면(예전 표) 그대로 쓴다.
    const rawRate = col.selfPayRate >= 0 ? String(row[col.selfPayRate] ?? "").trim() : "";
    const rateMatch = rawRate.match(/\(([^)]+)\)/);

    roster.push({
      seq: col.seq >= 0 ? toNumber(row[col.seq]) : roster.length + 1,
      name,
      grade: col.grade >= 0 ? String(row[col.grade] ?? "").trim() : "",
      selfPayRate: rateMatch ? rateMatch[1] : rawRate,
      careNumber: col.careNumber >= 0 ? String(row[col.careNumber] ?? "").trim() : "",
      days: col.days >= 0 ? toNumber(row[col.days]) : 0,
      insurancePay: col.insurancePay >= 0 ? toNumber(row[col.insurancePay]) : 0,
      selfPay: col.selfPay >= 0 ? toNumber(row[col.selfPay]) : 0,
      gradeExemptAmount: col.gradeExempt >= 0 ? toNumber(row[col.gradeExempt]) : 0
    });
  }
  return roster;
}

// "26.08" 같은 시트 이름 형식으로 급여년월을 변환한다.
function monthSheetLabel(billingMonth) {
  const [y, m] = billingMonth.split("-");
  return `${y.slice(2)}.${m}`;
}

// 이름이 나온 줄에서 가장 오른쪽 숫자 칸을 그 줄의 금액으로 보고, 이름별로 합산한다.
function sumRowsByName(data, names) {
  const totals = {};
  for (const row of data) {
    let matchedName = null;
    for (const cell of row) {
      if (typeof cell === "string" && names.has(cell.trim())) {
        matchedName = cell.trim();
        break;
      }
    }
    if (!matchedName) continue;

    let amount = null;
    for (let i = row.length - 1; i >= 0; i--) {
      if (typeof row[i] === "number") {
        amount = row[i];
        break;
      }
    }
    if (amount === null) continue;

    totals[matchedName] = (totals[matchedName] || 0) + amount;
  }
  return totals;
}

// File2(계약의사진찰비)/File4(가정간호비)/File5(상급침실 추가비용) 공용 파서.
// 시트가 여러 개면(예: 월별 시트) 급여년월과 이름이 같은 시트를 찾아서 쓰고, 못 찾으면 첫 시트를
// 쓰면서 경고 메시지를 남긴다.
export async function sumCostFile(file, roster, billingMonth) {
  const sheets = await readWorkbook(file);
  const names = new Set(roster.map((r) => r.name));

  let chosen = sheets[0];
  let warning = "";
  if (sheets.length > 1) {
    const label = monthSheetLabel(billingMonth);
    const match = sheets.find((s) => typeof s.sheet === "string" && s.sheet.trim() === label);
    if (match) {
      chosen = match;
    } else {
      warning = `"${label}" 이름의 시트를 찾지 못해 "${sheets[0]?.sheet}" 시트를 사용했습니다. 파일과 급여년월을 확인해주세요.`;
    }
  }

  return { totals: sumRowsByName(chosen?.data || [], names), warning };
}

// File3(진료약제비, PDF 청구서). 텍스트 위치를 읽어 줄 단위로 묶은 뒤, 같은 규칙(이름이 있는 줄의
// 가장 오른쪽 숫자)으로 이름별 합계를 구한다.
export async function sumPharmacyPdf(file, roster) {
  const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  const workerModule = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

  const names = new Set(roster.map((r) => r.name));
  const totals = {};

  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();

    const rows = [];
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      let row = rows.find((r) => Math.abs(r.y - y) < 3);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ x, str: item.str.trim() });
    }

    for (const row of rows) {
      row.items.sort((a, b) => a.x - b.x);

      // PDF마다 한 단어가 여러 조각으로 나뉘어 추출되기도 해서, 낱개 일치뿐 아니라 줄 전체를
      // 이어 붙인 텍스트에 이름이 포함되는지도 확인한다.
      const rowText = row.items.map((it) => it.str).join("");
      let matchedName = null;
      for (const it of row.items) {
        if (names.has(it.str)) {
          matchedName = it.str;
          break;
        }
      }
      if (!matchedName) {
        matchedName = [...names].find((name) => rowText.includes(name)) || null;
      }
      if (!matchedName) continue;

      let amount = null;
      for (let i = row.items.length - 1; i >= 0; i--) {
        const cleaned = row.items[i].str.replace(/,/g, "");
        if (/^-?\d+$/.test(cleaned)) {
          amount = Number(cleaned);
          break;
        }
      }
      if (amount === null) continue;

      totals[matchedName] = (totals[matchedName] || 0) + amount;
    }
  }

  return totals;
}

// 6개 파일을 모두 읽어서 수급자 이름 기준으로 병합한다.
// files: { rosterFile, roomFile, doctorFile, pharmacyFile, nursingFile } (등급외비용은 별도 파일 없음)
// 어느 파일을 읽다가 실패했는지 알 수 있도록, 각 파일 파싱 단계를 이름표를 붙여 감싼다.
async function withFileLabel(label, task) {
  try {
    return await task();
  } catch (err) {
    const reason = err?.message || String(err);
    throw new Error(`[${label}] 파일을 읽는 중 오류가 발생했습니다: ${reason}`);
  }
}

export async function buildMergedResidentData(files, billingMonth) {
  const { rosterFile, roomFile, doctorFile, pharmacyFile, nursingFile } = files;

  if (!rosterFile) {
    throw new Error("수급자현황 파일을 업로드해주세요.");
  }

  const roster = await withFileLabel("1.수급자현황", () => parseRosterFile(rosterFile));
  if (roster.length === 0) {
    throw new Error("수급자현황 파일에서 수급자 목록을 찾지 못했습니다. \"수급자명\"·\"등급\" 열이 있는지 확인해주세요.");
  }

  const warnings = [];

  const [room, doctor, nursing] = await Promise.all([
    roomFile
      ? withFileLabel("2.상급침실", () => sumCostFile(roomFile, roster, billingMonth))
      : { totals: {}, warning: "" },
    doctorFile
      ? withFileLabel("3.계약의사진찰비", () => sumCostFile(doctorFile, roster, billingMonth))
      : { totals: {}, warning: "" },
    nursingFile
      ? withFileLabel("5.가정간호비", () => sumCostFile(nursingFile, roster, billingMonth))
      : { totals: {}, warning: "" }
  ]);
  const pharmacy = pharmacyFile
    ? await withFileLabel("4.진료약제비", () => sumPharmacyPdf(pharmacyFile, roster))
    : {};

  [room.warning, doctor.warning, nursing.warning].forEach((w) => w && warnings.push(w));

  const residents = roster.map((r) => ({
    seq: r.seq,
    name: r.name,
    grade: r.grade,
    selfPayRate: r.selfPayRate,
    careNumber: r.careNumber,
    days: r.days,
    insurancePay: r.insurancePay,
    selfPay: r.selfPay,
    roomUpgradeCost: room.totals[r.name] || 0,
    doctorFeeCost: doctor.totals[r.name] || 0,
    pharmacyCost: pharmacy[r.name] || 0,
    nursingCost: nursing.totals[r.name] || 0,
    gradeExemptAmount: r.grade === "등급외" ? r.gradeExemptAmount : 0
  }));

  return { residents, warnings };
}
