// 수급자별 "장기요양급여비용 명세서" 엑셀 생성.
// 국민건강보험공단 등에서 매달 다운로드하는 "청구명세 리스트"(시트 하나에 수급자별 한 줄씩,
// 수급자명·공단부담금·본인부담금 열이 있는 표)를 업로드하면, 위드온빌리지 자체 명세서 양식
// (노인장기요양보험법 시행규칙 별지 제24호서식을 기관 양식으로 재구성한 것)으로 다시 만들어준다.
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
      otherCosts: [0, 0, 0, 0, 0]
    });
  }

  return { residents, skipped: [] };
}

function statusMark(resident, target) {
  return resident.status?.trim() === target ? "[  X  ]" : "[     ]";
}

function receiptNumber(billingMonth, seq) {
  return `${ORG.name}-${billingMonth}-${String(seq).padStart(3, "0")}`;
}

function lastDayOf(billingMonth) {
  const [y, m] = billingMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function issueDateText(billingMonth) {
  const [y, m] = billingMonth.split("-");
  return `${y}년  ${Number(m)}월  ${lastDayOf(billingMonth)}일`;
}

// 리스트 형식 업로드에는 급여제공기간이 없어서, 급여년월 한 달 전체로 기본값을 만든다.
function defaultPeriodText(billingMonth) {
  const [y, m] = billingMonth.split("-");
  const last = String(lastDayOf(billingMonth)).padStart(2, "0");
  return `${y}.${m}.01~${y}.${m}.${last}`;
}

function buildResidentSheetData(resident, seq, billingMonth) {
  const receiptNo = receiptNumber(billingMonth, seq);
  const periodText = resident.period || defaultPeriodText(billingMonth);

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
    [text(resident.name), text(resident.careNumber, { columnSpan: 2 }), null, text(periodText), text(receiptNo, { columnSpan: 4 }), null, null, null],

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
