// 병합된 수급자 데이터를 "청구명세리스트" 집계표 형식(연번~당월입금액)으로 만든다.
// 열 구성은 기관에서 쓰는 집계표 양식을 그대로 따른다. 이전미납액·선납적용액·당월입금액은
// 6개 파일로는 알 수 없어 0으로 비워두고, 필요하면 만들어진 파일에서 직접 채운다.

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#e5e7eb", align: "center" };
const BORDER_STYLE = { borderStyle: "thin", borderColor: "#999999" };
// "회계" 서식(기호 없음): 천 단위 구분 기호만 붙이고 통화 기호는 붙이지 않는다.
const ACCOUNTING_FORMAT = '_-* #,##0_-;-* #,##0_-;_-* "-"_-;_-@_-';

function headerCell(value) {
  return { value, type: String, ...HEADER_STYLE, ...BORDER_STYLE };
}

// A~D열(연번/수급자명/등급/본인부담률)은 가운데 정렬.
function textCell(value) {
  return { value, type: String, align: "center", ...BORDER_STYLE };
}

function seqCell(value) {
  return { value, type: Number, align: "center", ...BORDER_STYLE };
}

// E~S열(일수~당월입금액)은 회계 서식(기호없음).
function numberCell(value) {
  return { value, type: Number, format: ACCOUNTING_FORMAT, ...BORDER_STYLE };
}

function formulaCell(formula) {
  return { value: formula, type: "Formula", format: ACCOUNTING_FORMAT, ...BORDER_STYLE };
}

export async function downloadAggregateTable(residents, billingMonth) {
  const writeExcelFile = (await import("write-excel-file/browser")).default;

  const headerRow = [
    "연번",
    "수급자명",
    "등급",
    "본인부담률",
    "일수",
    "공단부담금",
    "본인부담금",
    "식사재료비",
    "간식비",
    "상급침실비",
    "진료약제비",
    "계약의사진찰비",
    "가정간호비",
    "등급외",
    "부담금합계",
    "이전미납액",
    "선납적용액",
    "총청구액",
    "당월입금액"
  ].map(headerCell);

  const dataRows = residents.map((r, i) => {
    const row = i + 2; // 1행은 헤더
    return [
      seqCell(r.seq),
      textCell(r.name),
      textCell(r.grade),
      textCell(r.selfPayRate),
      numberCell(r.days),
      numberCell(r.insurancePay),
      numberCell(r.selfPay),
      numberCell(r.mealCost),
      numberCell(r.snackCost),
      numberCell(r.roomUpgradeCost),
      numberCell(r.pharmacyCost),
      numberCell(r.doctorFeeCost),
      numberCell(r.nursingCost), // 가정간호비
      numberCell(r.gradeExemptAmount),
      formulaCell(`SUM(G${row}:N${row})`), // 본인부담금(G)부터 등급외(N)까지
      numberCell(0), // 이전미납액
      numberCell(0), // 선납적용액
      formulaCell(`O${row}+P${row}-Q${row}`),
      numberCell(0) // 당월입금액
    ];
  });

  // 맨 아래에 열별 합계 행을 추가한다(연번 칸에 "합계" 표시, 수급자명/등급/본인부담률/일수 칸은 비움 —
  // 일수는 더해도 의미가 없는 값이라 합계에서 뺀다).
  const lastDataRow = residents.length + 1;
  const totalRow = [
    textCell("합계"),
    textCell(""),
    textCell(""),
    textCell(""),
    textCell(""),
    ...["F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S"].map((col) =>
      formulaCell(`SUM(${col}2:${col}${lastDataRow})`)
    )
  ];

  const columnWidths = [6, 10, 8, 10, 6, 12, 12, 10, 8, 10, 10, 12, 10, 10, 12, 10, 10, 12, 10];

  await writeExcelFile([headerRow, ...dataRows, totalRow], {
    sheet: "청구명세리스트",
    columns: columnWidths.map((width) => ({ width }))
  }).toFile(`명세서집계표_${billingMonth}.xlsx`);
}
