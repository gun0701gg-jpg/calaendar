// 병합된 수급자 데이터를 "청구명세리스트" 집계표 형식(연번~당월입금액)으로 만든다.
// 열 구성은 기관에서 쓰는 집계표 양식을 그대로 따른다. 수급자현황 파일에 없는 값(식사재료비·
// 경관유동식·간식비·이용비, 이전미납액·선납적용액·당월입금액)은 이 6개 파일로는 알 수 없어 0으로
// 비워두고, 필요하면 만들어진 파일에서 직접 채운다. 가정간호비는 집계표에 별도 열이 없어
// "기타비용" 열에 포함한다.

const HEADER_STYLE = { fontWeight: "bold", backgroundColor: "#e5e7eb", align: "center" };
const BORDER_STYLE = { borderStyle: "thin", borderColor: "#999999" };

function headerCell(value) {
  return { value, type: String, ...HEADER_STYLE, ...BORDER_STYLE };
}

function cell(value, type) {
  return { value, type, ...BORDER_STYLE };
}

function formulaCell(formula) {
  return { value: formula, type: "Formula", ...BORDER_STYLE };
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
    "경관유동식",
    "간식비",
    "상급침실비",
    "이,미용비",
    "진료약제비",
    "계약의사진찰비",
    "기타비용",
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
      cell(r.seq, Number),
      cell(r.name, String),
      cell(r.grade, String),
      cell(r.selfPayRate, String),
      cell(r.days, Number),
      cell(r.insurancePay, Number),
      cell(r.selfPay, Number),
      cell(0, Number), // 식사재료비
      cell(0, Number), // 경관유동식
      cell(0, Number), // 간식비
      cell(r.roomUpgradeCost, Number),
      cell(0, Number), // 이,미용비
      cell(r.pharmacyCost, Number),
      cell(r.doctorFeeCost, Number),
      cell(r.nursingCost, Number), // 기타비용 = 가정간호비
      cell(r.gradeExemptAmount, Number),
      formulaCell(`SUM(H${row}:P${row})`),
      cell(0, Number), // 이전미납액
      cell(0, Number), // 선납적용액
      formulaCell(`Q${row}+R${row}-S${row}`),
      cell(0, Number) // 당월입금액
    ];
  });

  const columnWidths = [6, 10, 8, 10, 6, 12, 12, 10, 10, 8, 10, 9, 10, 12, 10, 10, 12, 10, 10, 12, 10];

  await writeExcelFile([headerRow, ...dataRows], {
    sheet: "청구명세리스트",
    columns: columnWidths.map((width) => ({ width }))
  }).toFile(`명세서집계표_${billingMonth}.xlsx`);
}
