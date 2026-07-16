// 근무예정표 엑셀(행: NO/직위/성명 + 1~31일 열, 코드: D=정상근무, F=휴무, 연/반/건강/교육 등=기타)을
// 파싱해서 캘린더용 일정 목록으로 변환한다.
// 규칙: 평일은 정상근무(D)가 아닌 대상자만 "이름 코드" 형태로, 주말/공휴일은 정상근무(D)인 대상자만 이름으로 기록한다.

export const DEFAULT_TARGET_NAMES = [
  "윤기훈",
  "서미진",
  "박은정",
  "김유리",
  "윤미희",
  "이영애",
  "김경철"
];

// 매년 날짜가 고정인 대한민국 공휴일 (음력 공휴일인 설날/추석/부처님오신날은 매년 날짜가 달라
// 자동 계산하지 않고, 필요 시 업로드할 때 extraHolidays로 직접 추가한다)
const FIXED_HOLIDAYS_MM_DD = new Set([
  "01-01", // 신정
  "03-01", // 삼일절
  "05-05", // 어린이날
  "06-06", // 현충일
  "08-15", // 광복절
  "10-03", // 개천절
  "10-09", // 한글날
  "12-25" // 크리스마스
]);

function normalize(value) {
  if (value == null) return "";
  return String(value).trim();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function isHoliday(year, month, day, extraHolidaySet) {
  const date = new Date(year, month - 1, day);
  const dow = date.getDay(); // 0=일, 6=토
  if (dow === 0 || dow === 6) return true;
  const mmdd = `${pad2(month)}-${pad2(day)}`;
  if (FIXED_HOLIDAYS_MM_DD.has(mmdd)) return true;
  const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
  return extraHolidaySet.has(dateStr);
}

// rows: read-excel-file의 readSheet() 결과 (2차원 배열)
export function parseWorkScheduleRows(rows, { year, month, targetNames = DEFAULT_TARGET_NAMES, extraHolidays = [] }) {
  const extraHolidaySet = new Set(extraHolidays.map(normalize).filter(Boolean));

  const headerRowIndex = rows.findIndex((row) => row.some((cell) => normalize(cell) === "성명"));
  if (headerRowIndex === -1) {
    throw new Error("표에서 '성명' 열을 찾을 수 없습니다. 근무예정표 형식이 맞는지 확인해주세요.");
  }
  const headerRow = rows[headerRowIndex];
  const nameColIndex = headerRow.findIndex((cell) => normalize(cell) === "성명");

  const dayColumns = [];
  let expectedDay = 1;
  for (let c = nameColIndex + 1; c < headerRow.length; c++) {
    const cell = headerRow[c];
    const num = typeof cell === "number" ? cell : Number(normalize(cell));
    if (Number.isInteger(num) && num === expectedDay) {
      dayColumns.push({ col: c, day: num });
      expectedDay++;
    } else {
      break;
    }
  }
  if (dayColumns.length === 0) {
    throw new Error("표에서 날짜(1~31) 열을 찾을 수 없습니다.");
  }

  let firstEmployeeRow = -1;
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    if (normalize(rows[r][nameColIndex])) {
      firstEmployeeRow = r;
      break;
    }
  }
  if (firstEmployeeRow === -1) {
    throw new Error("직원 목록을 찾을 수 없습니다.");
  }

  const targetSet = new Set(targetNames.map(normalize));
  const entries = [];
  let order = 0; // 엑셀에 등장하는 행 순서대로 부여 (캘린더에 표시할 때 이 순서를 따른다)

  for (let r = firstEmployeeRow; r < rows.length; r++) {
    const row = rows[r];
    const name = normalize(row[nameColIndex]);
    if (!name) break; // 직원 목록 끝(합계/범례 행 시작)
    if (!targetSet.has(name)) continue;

    const rowOrder = order++;

    for (const { col, day } of dayColumns) {
      const code = normalize(row[col]);
      if (!code) continue;

      const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
      const holiday = isHoliday(year, month, day, extraHolidaySet);

      if (holiday) {
        if (code === "D") {
          entries.push({ date: dateStr, title: name, order: rowOrder });
        }
      } else if (code !== "D") {
        const title = code === "F" ? `${name} F` : `${name} (${code})`;
        entries.push({ date: dateStr, title, order: rowOrder });
      }
    }
  }

  return entries;
}
