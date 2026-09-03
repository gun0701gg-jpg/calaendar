// 병합된 수급자 데이터를 "청구명세리스트" 집계표 형식(연번~당월입금액)으로 만든다.
// 열 구성은 기관에서 쓰는 집계표 양식을 그대로 따른다. 이전미납액·선납적용액·당월입금액은
// 6개 파일로는 알 수 없어 0으로 비워두고, 필요하면 만들어진 파일에서 직접 채운다.

const FONT_STYLE = { fontFamily: "Noto Sans KR" };
const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#e5e7eb", align: "center", ...FONT_STYLE };
const BORDER_STYLE = { borderStyle: "thin", borderColor: "#999999" };
// "회계" 서식(기호 없음): 천 단위 구분 기호만 붙이고 통화 기호는 붙이지 않는다.
const ACCOUNTING_FORMAT = '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-';

function headerCell(value) {
  return { value, type: String, ...HEADER_STYLE, ...BORDER_STYLE };
}

// A~E열(연번/수급현황/수급자명/등급/본인부담률)은 가운데 정렬.
function textCell(value) {
  return { value, type: String, align: "center", ...FONT_STYLE, ...BORDER_STYLE };
}

// 경관식 대상자는 수급자명 칸에 음영을 넣어 표시한다.
const TUBE_FEEDING_HIGHLIGHT = { backgroundColor: "#fef08a" };

function nameCell(value, highlight) {
  return {
    value,
    type: String,
    align: "center",
    ...FONT_STYLE,
    ...BORDER_STYLE,
    ...(highlight ? TUBE_FEEDING_HIGHLIGHT : {})
  };
}

function seqCell(value) {
  return { value, type: Number, align: "center", ...FONT_STYLE, ...BORDER_STYLE };
}

// F~S열(일수~당월입금액)은 회계 서식(기호없음).
function numberCell(value) {
  return { value, type: Number, format: ACCOUNTING_FORMAT, ...FONT_STYLE, ...BORDER_STYLE };
}

// F열(일수)은 가운데 정렬.
function centeredNumberCell(value) {
  return { value, type: Number, align: "center", format: ACCOUNTING_FORMAT, ...FONT_STYLE, ...BORDER_STYLE };
}

function formulaCell(formula) {
  return { value: formula, type: "Formula", format: ACCOUNTING_FORMAT, ...FONT_STYLE, ...BORDER_STYLE };
}

function noteRow(text, columnCount) {
  return [{ value: text, type: String, ...FONT_STYLE }, ...new Array(columnCount - 1).fill(null)];
}

export async function downloadAggregateTable(residents, billingMonth, warnings = []) {
  const writeExcelFile = (await import("write-excel-file/browser")).default;

  const headerRow = [
    "연번",
    "수급현황",
    "수급자명",
    "등급",
    "본인부담률",
    "일수",
    "공단부담금",
    "본인부담금",
    "식사재료비",
    "상급침실비",
    "진료약제비",
    "계약의사진찰비",
    "가정간호비",
    "등급외",
    "부담금합계",
    "이전미납액",
    "선납적용액",
    "총청구액",
    "당월입금액",
    "경관식"
  ].map(headerCell);

  // 공단부담금·본인부담금·식사재료비는 계산 과정을 표에서 그대로 확인/검증할 수 있도록 값이 아닌
  // 수식으로 넣는다(등급 D열/본인부담률 E열/일수 F열/경관식 T열을 참조). 기초수급자는 본인부담률이
  // 0%인 사람으로 본다. 다만 이번 달이 시작되기 전에 이미 퇴소한 사람은 애초에 청구 대상이 아니라
  // 수식으로 표현할 근거 열이 없어서, 그 경우만 예외적으로 0을 값 그대로 넣는다.
  const dataRows = residents.map((r, i) => {
    const row = i + 2; // 1행은 헤더
    const gradeRate = `IF(D${row}="1등급",93070,IF(OR(D${row}="2등급",D${row}="3등급",D${row}="4등급",D${row}="5등급"),81540,0))`;
    const rateFraction = `IFERROR(VALUE(SUBSTITUTE(E${row},"%",""))/100,0)`;
    const mealBase = `(4300*3*F${row})+IF(T${row}="O",0,1000*F${row})`;

    const insurancePayCell = r.alreadyGone
      ? numberCell(0)
      : formulaCell(`IF(D${row}="등급외",0,${gradeRate}*F${row}*(1-${rateFraction}))`);
    const selfPayCell = r.alreadyGone
      ? numberCell(0)
      : formulaCell(`IF(D${row}="등급외",0,${gradeRate}*F${row}*${rateFraction})`);
    const mealCostCell = r.alreadyGone
      ? numberCell(0)
      : formulaCell(`IF(E${row}="0%",MAX(0,${mealBase}-426741),${mealBase})`);

    return [
      seqCell(r.seq),
      textCell(r.status),
      nameCell(r.name, r.isTubeFeeding),
      textCell(r.grade),
      textCell(r.selfPayRate),
      centeredNumberCell(r.days),
      insurancePayCell,
      selfPayCell,
      mealCostCell, // 간식비 포함
      numberCell(r.roomUpgradeCost),
      numberCell(r.pharmacyCost),
      numberCell(r.doctorFeeCost),
      numberCell(r.nursingCost), // 가정간호비
      numberCell(r.gradeExemptAmount),
      formulaCell(`SUM(H${row}:N${row})`), // 본인부담금(H)부터 등급외(N)까지
      numberCell(0), // 이전미납액
      numberCell(0), // 선납적용액
      formulaCell(`O${row}+P${row}-Q${row}`),
      numberCell(0), // 당월입금액
      textCell(r.isTubeFeeding ? "O" : "")
    ];
  });

  // 맨 아래에 열별 합계 행을 추가한다(연번 칸에 "합계" 표시, 수급현황/수급자명/등급/본인부담률/일수
  // 칸은 비움 — 일수는 더해도 의미가 없는 값이라 합계에서 뺀다).
  const lastDataRow = residents.length + 1;
  const totalRow = [
    textCell("합계"),
    textCell(""),
    textCell(""),
    textCell(""),
    textCell(""),
    textCell(""),
    ...["G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"].map((col) =>
      formulaCell(`SUM(${col}2:${col}${lastDataRow})`)
    ),
    textCell("") // T(경관식)는 합계 대상이 아님
  ];

  // A~F는 기존 넓이를 유지하고, G~T(공단부담금~경관식)는 모두 12로 통일한다.
  const columnWidths = [6, 8, 10, 8, 10, 6, ...Array(14).fill(12)];

  // 합계 행 위에 빈 줄을 하나 두어서, 나중에 데이터 영역만 정렬(sorting)해도 합계 행이 데이터
  // 사이로 딸려 들어가지 않게 한다.
  const blankRow = new Array(headerRow.length).fill(null);

  // 경관식 대상자가 있으면 맨 아래에 음영 표시에 대한 주기를 단다.
  const hasTubeFeeding = residents.some((r) => r.isTubeFeeding);

  const rows = [headerRow, ...dataRows, blankRow, totalRow];
  if (hasTubeFeeding) rows.push(noteRow("※ 음영 표시: 경관식 대상자", headerRow.length));
  // 파일을 읽는 중에 발견된 주의사항(예: 퇴소자 후불 청구 누락 가능성 등)도 맨 아래에 그대로 적어서
  // 화면 메시지만 보고 놓치는 일이 없게 한다.
  warnings.forEach((w) => rows.push(noteRow(`※ ${w}`, headerRow.length)));

  await writeExcelFile(rows, {
    sheet: "명세서 집계표",
    columns: columnWidths.map((width) => ({ width }))
  }).toFile(`명세서집계표_${billingMonth}.xlsx`);
}
