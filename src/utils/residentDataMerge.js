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
//   "감경(8%)")/인정번호 열이 있는 표.
// - (예전 방식) 청구명세리스트 형태: 연번/수급자명/등급/본인부담률 열이 있는 표.
// 일수 열이 있으면 그 값을 쓰고, 없으면 급여년월의 날짜 수로 대신한다(daysInBillingMonth).
// 공단부담금·본인부담금·식사재료비·간식비·등급외 금액은 파일에서 읽지 않고 등급별 산식으로
// 계산한다(computeGradeBasedAmounts 참고).
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
    days: findColumn(headers, ["일수"])
  };

  const roster = [];
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const name = normName(row[col.name]);
    if (!name) continue;
    // "수급현황" 열이 있는 표(업무포털 내보내기)는 "입소중"인 사람만 쓴다.
    if (col.status >= 0 && String(row[col.status] ?? "").trim() !== "입소중") continue;

    // "감경(8%)"처럼 괄호 앞에 구분(기초/감경/일반/의료 등)이 있으면 따로 떼어 저장하고,
    // 괄호 안 부담률만 selfPayRate로 쓴다. 괄호가 없으면(예전 표) 그대로 부담률로 쓴다.
    const rawRate = col.selfPayRate >= 0 ? String(row[col.selfPayRate] ?? "").trim() : "";
    const rateMatch = rawRate.match(/^([^(]*)\(([^)]+)\)$/);

    roster.push({
      seq: col.seq >= 0 ? toNumber(row[col.seq]) : roster.length + 1,
      name,
      grade: col.grade >= 0 ? String(row[col.grade] ?? "").trim() : "",
      selfPayRate: rateMatch ? rateMatch[2] : rawRate,
      selfPayCategory: rateMatch ? rateMatch[1].trim() : "",
      careNumber: col.careNumber >= 0 ? String(row[col.careNumber] ?? "").trim() : "",
      days: col.days >= 0 ? toNumber(row[col.days]) : null
    });
  }
  return roster;
}

// 등급별 1일 단가(장기요양 급여 산정 기준). 등급외는 원내 자체 기준 단가.
const GRADE_DAILY_RATE = {
  "1등급": 93070,
  "2등급": 86340,
  "3등급": 81540,
  "4등급": 81540,
  "5등급": 81540,
  등급외: 100000
};
const MEAL_COST_PER_DAY = 4300 * 3;
const SNACK_COST_PER_DAY = 1000 * 3;

function daysInBillingMonth(billingMonth) {
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function parseRateFraction(rateText) {
  const n = Number(String(rateText).replace("%", "").trim());
  return Number.isFinite(n) ? n / 100 : 0;
}

// 공단부담금 = 등급별 금액 * 일수 * (1-본인부담률), 본인부담금 = 등급별 금액 * 일수 * 본인부담률.
// 등급외는 공단부담금 개념이 없어서 전액을 등급외 열에 담는다.
// 식사재료비/간식비는 등급과 상관없이 실제로 식사를 제공한 만큼 매기는 별도 항목이라 등급외도
// 똑같이 계산한다. 기초수급자만 지자체보조금 정보가 아직 없어 0으로 비워둔다(추후 직접 입력).
function computeGradeBasedAmounts(roster, days) {
  const dailyRate = GRADE_DAILY_RATE[roster.grade];
  const isBasicRecipient = roster.selfPayCategory === "기초";
  const isGradeExempt = roster.grade === "등급외";
  const mealCost = isBasicRecipient ? 0 : MEAL_COST_PER_DAY * days;
  const snackCost = isBasicRecipient ? 0 : SNACK_COST_PER_DAY * days;

  if (dailyRate === undefined) {
    return { insurancePay: 0, selfPay: 0, gradeExemptAmount: 0, mealCost, snackCost };
  }

  const baseAmount = dailyRate * days;
  if (isGradeExempt) {
    return { insurancePay: 0, selfPay: 0, gradeExemptAmount: baseAmount, mealCost, snackCost };
  }

  const rate = parseRateFraction(roster.selfPayRate);
  return {
    insurancePay: baseAmount * (1 - rate),
    selfPay: baseAmount * rate,
    gradeExemptAmount: 0,
    mealCost,
    snackCost
  };
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

// 시트가 여러 개면(예: 월별 시트) 급여년월과 이름이 같은 시트를 찾아서 쓰고, 못 찾으면 첫 시트를
// 쓰면서 경고 메시지를 남긴다.
function chooseSheet(sheets, billingMonth) {
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
  return { chosen, warning };
}

// 이름 열 머리글로 쓰이는 이름표들. 표(구간)가 여러 개 있는 파일에서도 각 구간의 이름 열을 찾는다.
const NAME_HEADER_LABELS = ["성명", "대상자", "수급자명"];

// 시트 전체에서 이름 열 머리글을 찾아 그 아래(다음 이름 열 머리글이 나오기 전까지) 각 줄의 이름과
// 그 줄의 가장 오른쪽 숫자를 모두 모은다. "OO합계" 같은 소계 줄은 이름이 아니라서 제외한다.
function collectNameAmountPairs(data) {
  const pairs = [];
  let activeCol = -1;
  for (const row of data) {
    const headerCol = row.findIndex(
      (cell) => typeof cell === "string" && NAME_HEADER_LABELS.includes(cell.trim())
    );
    if (headerCol >= 0) {
      activeCol = headerCol;
      continue;
    }
    if (activeCol < 0) continue;

    const name = typeof row[activeCol] === "string" ? row[activeCol].trim() : "";
    if (!name || name.includes("합계")) continue;

    let amount = null;
    for (let i = row.length - 1; i >= 0; i--) {
      if (typeof row[i] === "number") {
        amount = row[i];
        break;
      }
    }
    if (!amount) continue;

    pairs.push({ name, amount });
  }
  return pairs;
}

// 계약의사진찰비·진료약제비·가정간호비는 후불로 청구되는 항목이라, 청구서가 도착했을 때는 이미
// 퇴소해서 이번 달 수급자현황(입소중 명단)에 없는 사람의 몫이 있을 수 있다. 그런 경우 자동으로는
// 어디에도 반영되지 않고 조용히 빠지게 되므로, 놓치지 않도록 경고로 알려준다.
function unmatchedNamesWarning(pairs, names) {
  const byName = {};
  for (const { name, amount } of pairs) {
    if (names.has(name)) continue;
    byName[name] = (byName[name] || 0) + amount;
  }
  const entries = Object.entries(byName);
  if (entries.length === 0) return "";
  const list = entries.map(([name, amount]) => `${name}(${amount.toLocaleString()}원)`).join(", ");
  return `이번 달 수급자현황(입소중 명단)에 없는 이름의 금액이 있습니다(퇴소 후 후불 청구된 경우일 수 있으니 확인해주세요): ${list}`;
}

// File2(계약의사진찰비)/File4(가정간호비) 공용 파서.
export async function sumCostFile(file, roster, billingMonth) {
  const sheets = await readWorkbook(file);
  const names = new Set(roster.map((r) => r.name));
  const { chosen, warning } = chooseSheet(sheets, billingMonth);
  const data = chosen?.data || [];

  const totals = sumRowsByName(data, names);
  const unmatchedWarning = unmatchedNamesWarning(collectNameAmountPairs(data), names);

  return { totals, warning: [warning, unmatchedWarning].filter(Boolean).join(" ") };
}

// File5(상급침실 이용에 따른 추가비용). "일요금" 열에 값이 있으면 일요금 * 일수로 계산하고,
// "월요금" 열에 값이 있으면 월요금을 그 달 일수 기준으로 일할 계산한다(원 단위 절사).
// rosterWithDays: 각 수급자의 최종 일수(days)까지 정해진 상태의 roster 배열.
export async function sumRoomUpgradeFile(file, rosterWithDays, billingMonth) {
  const sheets = await readWorkbook(file);
  const daysByName = new Map(rosterWithDays.map((r) => [r.name, r.days]));
  const { chosen, warning } = chooseSheet(sheets, billingMonth);
  const data = chosen?.data || [];

  const headerRowIndex = data.findIndex(
    (row) => row.includes("수급자명") && (row.includes("일요금") || row.includes("월요금"))
  );
  if (headerRowIndex === -1) {
    // 예상한 열 구성이 아니면, 이름이 있는 줄의 가장 오른쪽 숫자를 쓰는 예전 방식으로 대신한다.
    return { totals: sumRowsByName(data, new Set(daysByName.keys())), warning };
  }

  const headers = data[headerRowIndex];
  const nameIdx = headers.indexOf("수급자명");
  const dailyIdx = headers.indexOf("일요금");
  const monthlyIdx = headers.indexOf("월요금");
  const daysInMonth = daysInBillingMonth(billingMonth);

  const totals = {};
  for (let i = headerRowIndex + 1; i < data.length; i++) {
    const row = data[i];
    const name = normName(row[nameIdx]);
    if (!name || !daysByName.has(name)) continue;
    const residentDays = daysByName.get(name);

    const daily = dailyIdx >= 0 ? row[dailyIdx] : null;
    const monthly = monthlyIdx >= 0 ? row[monthlyIdx] : null;

    let amount = 0;
    if (typeof daily === "number") {
      amount = daily * residentDays;
    } else if (typeof monthly === "number") {
      amount = Math.floor((monthly * residentDays) / daysInMonth);
    }
    if (amount === 0) continue;

    totals[name] = (totals[name] || 0) + amount;
  }
  return { totals, warning };
}

// 순번(정수)으로 시작하고 그다음 칸이 이름인 줄들을 모아 이름·금액 쌍을 뽑는다("총 청구금액"·
// "회차별 합계" 같은 안내/합계 줄은 순번으로 시작하지 않아서 자연히 제외된다).
function collectPdfNameAmountPairs(rows) {
  const pairs = [];
  for (const row of rows) {
    if (row.items.length < 2) continue;
    if (!/^\d+$/.test(row.items[0].str)) continue;
    const name = row.items[1].str;
    if (!name || /^\d/.test(name)) continue;

    let amount = null;
    for (let i = row.items.length - 1; i >= 1; i--) {
      const cleaned = row.items[i].str.replace(/,/g, "");
      if (/^-?\d+$/.test(cleaned)) {
        amount = Number(cleaned);
        break;
      }
    }
    if (!amount) continue;

    pairs.push({ name, amount });
  }
  return pairs;
}

// File3(진료약제비, PDF 청구서). 텍스트 위치를 읽어 줄 단위로 묶은 뒤, 같은 규칙(이름이 있는 줄의
// 가장 오른쪽 숫자)으로 이름별 합계를 구한다.
export async function sumPharmacyPdf(file, roster) {
  const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  const workerModule = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;

  const names = new Set(roster.map((r) => r.name));
  const totals = {};
  const allPairs = [];

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
      if (matchedName) {
        let amount = null;
        for (let i = row.items.length - 1; i >= 0; i--) {
          const cleaned = row.items[i].str.replace(/,/g, "");
          if (/^-?\d+$/.test(cleaned)) {
            amount = Number(cleaned);
            break;
          }
        }
        if (amount !== null) {
          totals[matchedName] = (totals[matchedName] || 0) + amount;
        }
      }
    }

    allPairs.push(...collectPdfNameAmountPairs(rows));
  }

  const warning = unmatchedNamesWarning(allPairs, names);
  return { totals, warning };
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

  // 상급침실비 일할 계산에 각 수급자의 최종 일수가 필요해서, 다른 파일을 읽기 전에 먼저 정한다.
  const fallbackDays = daysInBillingMonth(billingMonth);
  const rosterWithDays = roster.map((r) => ({
    ...r,
    days: r.days != null ? r.days : fallbackDays
  }));

  const [room, doctor, nursing] = await Promise.all([
    roomFile
      ? withFileLabel("2.상급침실", () => sumRoomUpgradeFile(roomFile, rosterWithDays, billingMonth))
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
    : { totals: {}, warning: "" };

  [room.warning, doctor.warning, nursing.warning, pharmacy.warning].forEach((w) => w && warnings.push(w));

  const residents = rosterWithDays.map((r) => {
    const amounts = computeGradeBasedAmounts(r, r.days);
    return {
      seq: r.seq,
      name: r.name,
      grade: r.grade,
      selfPayRate: r.selfPayRate,
      careNumber: r.careNumber,
      days: r.days,
      insurancePay: amounts.insurancePay,
      selfPay: amounts.selfPay,
      mealCost: amounts.mealCost,
      snackCost: amounts.snackCost,
      roomUpgradeCost: room.totals[r.name] || 0,
      doctorFeeCost: doctor.totals[r.name] || 0,
      pharmacyCost: pharmacy.totals[r.name] || 0,
      nursingCost: nursing.totals[r.name] || 0,
      gradeExemptAmount: amounts.gradeExemptAmount
    };
  });

  return { residents, warnings };
}
