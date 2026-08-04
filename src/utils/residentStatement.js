// 수급자별 "장기요양급여비용 명세서" 엑셀 생성.
// 국민건강보험공단 등에서 매달 다운로드하는, 수급자 한 명당 시트 하나씩 있는 원본 엑셀을 업로드하면
// 그 안의 금액을 읽어서 위드온빌리지 자체 명세서 양식(노인장기요양보험법 시행규칙 별지 제24호서식을
// 기관 양식으로 재구성한 것)으로 다시 만들어준다.
const ORG = {
  code: "1-11530-00453",
  name: "위드온빌리지",
  address: "서울시 구로구 목동남로 32",
  businessNumber: "610-80-23554",
  ceoLine: "장기요양기관명 : 위드온빌리지         대표자명 : 윤 건      (인)"
};

const BORDER = { borderStyle: "thin", borderColor: "#999999" };
const label = (value, extra = {}) => ({
  value,
  fontWeight: "bold",
  align: "center",
  valign: "center",
  wrap: true,
  ...BORDER,
  ...extra
});
const blank = (extra = {}) => ({ value: null, align: "center", valign: "center", ...BORDER, ...extra });
const text = (value, extra = {}) => ({ value: value || "", align: "center", valign: "center", wrap: true, ...BORDER, ...extra });
const amount = (value, extra = {}) => ({
  value: value || 0,
  type: Number,
  format: "#,##0",
  align: "center",
  valign: "center",
  ...BORDER,
  ...extra
});
// write-excel-file writes this value verbatim into the raw <f> XML tag, which per the xlsx
// spec must NOT include the leading "=" (that's only ever shown in the UI), so strip it here.
const formula = (f, extra = {}) => ({
  value: f.replace(/^=/, ""),
  type: "Formula",
  format: "#,##0",
  align: "center",
  valign: "center",
  backgroundColor: "#E2EFDA",
  ...BORDER,
  ...extra
});

// 원본 파일(시트 1개 = 수급자 1명)에서 값이 들어있는 고정 셀 위치.
// [row, col] — 1행/1열부터 시작하는 엑셀 좌표.
const SOURCE_CELLS = {
  name: [8, 1], // A8
  careNumber: [8, 3], // C8
  period: [8, 6], // F8 (예: "2026.08.01~2026.08.31" — 이미 보기 좋은 형식이라 그대로 사용)
  selfPay: [10, 6], // F10 본인부담금①
  insurancePay: [11, 6], // F11 공단부담금②
  mealCost: [14, 6], // F14 식사재료비④
  roomUpgradeCost: [15, 6], // F15 추가비용⑤
  groomingCost: [17, 6], // F17 이미용비⑥
  otherCosts: [
    [19, 6],
    [21, 6],
    [23, 6],
    [25, 6],
    [27, 6]
  ] // F19,F21,F23,F25,F27 기타⑦ 개별 항목 (최대 5건)
};

function cellAt(rows, [row, col]) {
  return rows[row - 1]?.[col - 1];
}

function toNumber(v) {
  return typeof v === "number" ? v : Number(v) || 0;
}

// 업로드한 워크북의 시트마다 수급자 한 명의 데이터를 뽑아낸다. 성명이 없는 시트(안내/빈 시트 등)는 건너뛴다.
export async function parseResidentStatementFile(file) {
  const readXlsxFile = (await import("read-excel-file/browser")).default;
  const sheets = await readXlsxFile(file);

  const residents = [];
  const skipped = [];

  for (const { sheet, data } of sheets) {
    const name = cellAt(data, SOURCE_CELLS.name);
    if (!name || typeof name !== "string") {
      skipped.push(sheet);
      continue;
    }
    residents.push({
      name: name.trim(),
      careNumber: cellAt(data, SOURCE_CELLS.careNumber) || "",
      period: cellAt(data, SOURCE_CELLS.period) || "",
      selfPay: toNumber(cellAt(data, SOURCE_CELLS.selfPay)),
      insurancePay: toNumber(cellAt(data, SOURCE_CELLS.insurancePay)),
      mealCost: toNumber(cellAt(data, SOURCE_CELLS.mealCost)),
      roomUpgradeCost: toNumber(cellAt(data, SOURCE_CELLS.roomUpgradeCost)),
      groomingCost: toNumber(cellAt(data, SOURCE_CELLS.groomingCost)),
      otherCosts: SOURCE_CELLS.otherCosts.map((pos) => toNumber(cellAt(data, pos)))
    });
  }

  return { residents, skipped };
}

function statusMark(resident, target) {
  return resident.status?.trim() === target ? "[  X  ]" : "[     ]";
}

function receiptNumber(billingMonth, seq) {
  return `${ORG.name}-${billingMonth}-${String(seq).padStart(3, "0")}`;
}

function issueDateText(billingMonth) {
  const [y, m] = billingMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}년  ${m}월  ${lastDay}일`;
}

function buildResidentSheetData(resident, seq, billingMonth) {
  const receiptNo = receiptNumber(billingMonth, seq);

  return [
    [
      { value: "장기요양급여비용 명세서", columnSpan: 6, rowSpan: 2, fontSize: 16, fontWeight: "bold", align: "center", valign: "center", ...BORDER },
      null, null, null, null, null,
      { value: null },
      text(`${statusMark(resident, "퇴소")}  퇴 소`, { align: "left" })
    ],
    [null, null, null, null, null, null, { value: null }, text(`${statusMark(resident, "중간")}  중 간`, { align: "left" })],

    [label("장기요양\n기관기호"), text(ORG.code, { columnSpan: 3 }), null, null, label("장기요양기관명"), text(ORG.name, { columnSpan: 3 }), null, null],

    [label("주소"), text(ORG.address, { columnSpan: 3 }), null, null, label("사업자등록번호"), text(ORG.businessNumber, { columnSpan: 3 }), null, null],

    [label("성명"), label("장기요양인정번호", { columnSpan: 2 }), null, label("급여제공기간"), label("영수증 번호", { columnSpan: 4 }), null, null, null],
    [text(resident.name), text(resident.careNumber, { columnSpan: 2 }), null, text(resident.period), text(receiptNo, { columnSpan: 4 }), null, null, null],

    [label("항목", { columnSpan: 3 }), null, null, label("금액"), label("금액산정내역", { columnSpan: 4 }), null, null, null],

    [
      label("급여", { rowSpan: 3 }),
      label("본인부담금①", { columnSpan: 2 }), null,
      amount(resident.selfPay),
      label("총액(급여+비급여)\n⑨(③+⑧)", { columnSpan: 2, rowSpan: 2 }), null,
      formula("=D10+D19", { columnSpan: 2, rowSpan: 2 }), null
    ],
    [null, label("공단부담금②", { columnSpan: 2 }), null, amount(resident.insurancePay), null, null, null, null],
    [null, label("급여 계③(①+②)", { columnSpan: 2 }), null, formula("=D8+D9"), label("본인부담총액\n⑩(①+⑧)", { columnSpan: 2 }), null, formula("=D8+D19", { columnSpan: 2 }), null],

    [
      label("비급여", { rowSpan: 9 }),
      label("식사재료비④", { columnSpan: 2 }), null,
      amount(resident.mealCost),
      label("이미 납부한 금액⑪", { columnSpan: 2 }), null,
      amount(resident.prepaidAmount, { columnSpan: 2 }), null
    ],
    [null, label("상급침실 이용에 따른\n추가비용⑤", { columnSpan: 2 }), null, amount(resident.roomUpgradeCost), label("수납금액\n⑫\n(⑩-⑪)", { rowSpan: 4 }), label("카드"), amount(resident.cardAmount, { columnSpan: 2 }), null],
    [null, label("이ㆍ미용비⑥", { columnSpan: 2 }), null, amount(resident.groomingCost), null, label("현금영수증"), amount(resident.receiptAmount, { columnSpan: 2 }), null],
    [null, label("기타\n⑦", { rowSpan: 5 }), blank(), amount(resident.otherCosts[0]), null, label("현금"), amount(resident.cashAmount, { columnSpan: 2 }), null],
    [null, null, blank(), amount(resident.otherCosts[1]), null, label("합계"), formula("=G12+G13+G14", { columnSpan: 2 }), null],
    [null, null, blank(), amount(resident.otherCosts[2]), label("현금영수증", { columnSpan: 4 }), null, null, null],
    [null, null, blank(), amount(resident.otherCosts[3]), label("신분확인번호"), blank({ columnSpan: 3 }), null, null],
    [null, null, blank(), amount(resident.otherCosts[4]), label("현금승인번호"), blank({ columnSpan: 3 }), null, null],
    [null, label("비급여 계 \n⑧(④+⑤+⑥+⑦)", { columnSpan: 2 }), null, formula("=D11+D12+D13+SUM(D14:D18)"), label("※ 비고"), text(resident.note, { columnSpan: 3 }), null, null],

    [
      label("신용카드를\n사용하실때", { rowSpan: 2 }),
      label("회원번호"), blank(),
      label("승인번호", { columnSpan: 2 }), null,
      label("할부"), blank(),
      label("사용금액")
    ],
    [null, label("카드종류"), blank(), label("유효기간", { columnSpan: 2 }), null, label("가맹점번호"), blank(), blank()],

    [{ value: issueDateText(billingMonth), columnSpan: 8, align: "center" }, null, null, null, null, null, null, null],
    [{ value: ORG.ceoLine, columnSpan: 8, align: "center" }, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [
      {
        value:
          "* 이 명세서(영수증)는 「소득세법」에 따른 의료비 또는 「조세특례제한법」에 따른 현금영수증(현금영수증 승인번호가 적힌 경우) 공제신청에 사용할 수 있습니다. 다만, 지출증빙용으로 발급된 현금영수증(지출증빙)은 공제신청에 사용할 수 없습니다.",
        columnSpan: 8,
        fontSize: 8,
        wrap: true
      },
      null, null, null, null, null, null, null
    ],
    [
      { value: "* 이 명세서(영수증)에 대한 세부내역을 요구할 수 있습니다.", columnSpan: 8, fontSize: 8, wrap: true },
      null, null, null, null, null, null, null
    ],
    [
      {
        value: "* 비고란은 장기요양기관의 임의활용 란으로 사용합니다. 다만, 복지용구의 경우 품목과 구입ㆍ대여를 구분하여 적으시기 바랍니다.",
        columnSpan: 8,
        fontSize: 8,
        wrap: true
      },
      null, null, null, null, null, null, null
    ]
  ];
}

const SHEET_COLUMNS = [
  { width: 10 }, { width: 16 }, { width: 6 }, { width: 12 }, { width: 14 }, { width: 8 }, { width: 12 }, { width: 8 }
];

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

export async function downloadResidentStatements(residents, billingMonth) {
  const writeExcelFile = (await import("write-excel-file/browser")).default;
  const used = new Set();

  const sheets = residents.map((resident, i) => ({
    data: buildResidentSheetData(resident, i + 1, billingMonth),
    sheet: uniqueSheetName(resident.name, i, used),
    columns: SHEET_COLUMNS
  }));

  await writeExcelFile(sheets, { fontFamily: "Malgun Gothic", fontSize: 10 }).toFile(
    `수급자명세서_${billingMonth}.xlsx`
  );
}
