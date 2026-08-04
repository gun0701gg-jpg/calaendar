// 수급자별 "장기요양급여비용 명세서" 엑셀 생성.
// 국민건강보험공단 등에서 매달 다운로드하는 "청구명세 리스트"(시트 하나에 수급자별 한 줄씩,
// 수급자명·공단부담금·본인부담금 열이 있는 표)를 업로드하면, 위드온빌리지 자체 명세서 양식
// (노인장기요양보험법 시행규칙 별지 제24호서식을 기관 양식으로 재구성한 것)으로 다시 만들어준다.
// 폰트/글자크기/행높이/열너비는 원본 양식 파일의 값을 그대로 따른다.
const ORG = {
  code: "1-11530-00453",
  name: "위드온빌리지",
  address: "서울시 구로구 목동남로 32",
  businessNumber: "610-80-23554",
  ceoLine: "장기요양기관명 : 위드온빌리지         대표자명 : 윤 건      (인)"
};

const BORDER = { borderStyle: "thin", borderColor: "#999999" };

// 라벨(항목명) 칸 — 원본에서 거의 전부 굵게.
const label = (value, extra = {}) => ({
  value,
  fontWeight: "bold",
  align: "center",
  alignVertical: "center",
  wrap: true,
  ...BORDER,
  ...extra
});
// 테두리만 있는 빈 칸.
const blank = (extra = {}) => ({ value: null, align: "center", alignVertical: "center", ...BORDER, ...extra });
// 성명/기관정보 같은 텍스트 값 칸 — 원본에서 라벨과 같은 굵은 스타일을 그대로 씀.
const text = (value, extra = {}) => ({
  value: value || "",
  fontWeight: "bold",
  align: "center",
  alignVertical: "center",
  wrap: true,
  ...BORDER,
  ...extra
});
// 급여/비급여 항목 금액(D열) — 원본에서 이 칸들만 Arial, 굵지 않음.
const dAmount = (value, extra = {}) => ({
  value: value || 0,
  type: Number,
  format: "#,##0",
  fontFamily: "Arial",
  align: "center",
  alignVertical: "center",
  ...BORDER,
  ...extra
});
// write-excel-file writes this value verbatim into the raw <f> XML tag, which per the xlsx
// spec must NOT include the leading "=" (that's only ever shown in the UI), so strip it here.
const stripEquals = (f) => f.replace(/^=/, "");
const dFormula = (f, extra = {}) => ({
  value: stripEquals(f),
  type: "Formula",
  format: "#,##0",
  fontFamily: "Arial",
  align: "center",
  alignVertical: "center",
  ...BORDER,
  ...extra
});
// 오른쪽(⑨⑩⑫ 등) 계산값 — 원본에서 굵은 글씨.
const gAmount = (value, extra = {}) => ({
  value: value || 0,
  type: Number,
  format: "#,##0",
  align: "center",
  alignVertical: "center",
  ...BORDER,
  ...extra
});
const gFormula = (f, extra = {}) => ({
  value: stripEquals(f),
  type: "Formula",
  format: "#,##0",
  fontWeight: "bold",
  align: "center",
  alignVertical: "center",
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

// 원본 양식의 행 높이(포인트). write-excel-file은 한 행 안의 셀들 중 가장 큰 height 값을 그 행에 적용한다.
const ROW_HEIGHTS = [
  19.95, // 1
  19.95, // 2
  ...Array(21).fill(33), // 3-23
  18, // 24
  24, // 25
  18, // 26
  18 // 27
];

function buildResidentSheetData(resident, seq, billingMonth) {
  const receiptNo = receiptNumber(billingMonth, seq);
  const periodText = resident.period || defaultPeriodText(billingMonth);
  const h = (row) => ({ height: ROW_HEIGHTS[row - 1] });

  return [
    [
      {
        value: "장기요양급여비용 명세서",
        columnSpan: 6,
        rowSpan: 2,
        fontSize: 18,
        fontWeight: "bold",
        align: "center",
        alignVertical: "center",
        wrap: true,
        ...BORDER,
        ...h(1)
      },
      null, null, null, null, null,
      { value: null },
      text(`${statusMark(resident, "퇴소")}  퇴 소`, { fontSize: 9.5, fontWeight: false, align: "left" })
    ],
    [
      null, null, null, null, null, null,
      { value: null, ...h(2) },
      text(`${statusMark(resident, "중간")}  중 간`, { fontSize: 9.5, fontWeight: false, align: "left" })
    ],

    [label("장기요양\n기관기호", h(3)), text(ORG.code, { columnSpan: 3 }), null, null, label("장기요양기관명"), text(ORG.name, { columnSpan: 3 }), null, null],

    [label("주소", h(4)), text(ORG.address, { columnSpan: 3 }), null, null, label("사업자등록번호"), text(ORG.businessNumber, { columnSpan: 3 }), null, null],

    [label("성명", h(5)), label("장기요양인정번호", { columnSpan: 2 }), null, label("급여제공기간"), label("영수증 번호", { columnSpan: 4 }), null, null, null],
    [text(resident.name, h(6)), text(resident.careNumber, { columnSpan: 2 }), null, text(periodText), text(receiptNo, { columnSpan: 4 }), null, null, null],

    [label("항목", { columnSpan: 3, ...h(7) }), null, null, label("금액"), label("금액산정내역", { columnSpan: 4 }), null, null, null],

    [
      label("급여", { rowSpan: 3, ...h(8) }),
      label("본인부담금①", { columnSpan: 2 }), null,
      dAmount(resident.selfPay),
      label("총액(급여+비급여)\n⑨(③+⑧)", { columnSpan: 2, rowSpan: 2 }), null,
      gFormula("=D10+D19", { columnSpan: 2, rowSpan: 2 }), null
    ],
    [null, label("공단부담금②", { columnSpan: 2, ...h(9) }), null, dAmount(resident.insurancePay), null, null, null, null],
    [null, label("급여 계③(①+②)", { columnSpan: 2, ...h(10) }), null, dFormula("=D8+D9"), label("본인부담총액\n⑩(①+⑧)", { columnSpan: 2 }), null, gFormula("=D8+D19", { columnSpan: 2 }), null],

    [
      label("비급여", { rowSpan: 9, ...h(11) }),
      label("식사재료비④", { columnSpan: 2 }), null,
      dAmount(resident.mealCost),
      label("이미 납부한 금액⑪", { columnSpan: 2 }), null,
      gAmount(undefined, { columnSpan: 2, fontWeight: "bold" }), null
    ],
    [null, label("상급침실 이용에 따른\n추가비용⑤", { columnSpan: 2, ...h(12) }), null, dAmount(resident.roomUpgradeCost), label("수납금액\n⑫\n(⑩-⑪)", { rowSpan: 4 }), label("카드"), gAmount(undefined, { columnSpan: 2 }), null],
    [null, label("이ㆍ미용비⑥", { columnSpan: 2, ...h(13) }), null, dAmount(resident.groomingCost), null, label("현금영수증"), gAmount(undefined, { columnSpan: 2 }), null],
    [null, label("기타\n⑦", { rowSpan: 5, ...h(14) }), blank(), dAmount(resident.otherCosts[0]), null, label("현금"), gAmount(undefined, { columnSpan: 2 }), null],
    [null, null, blank(h(15)), dAmount(resident.otherCosts[1]), null, label("합계"), gFormula("=G12+G13+G14", { columnSpan: 2 }), null],
    [null, null, blank(h(16)), dAmount(resident.otherCosts[2]), label("현금영수증", { columnSpan: 4 }), null, null, null],
    [null, null, blank(h(17)), dAmount(resident.otherCosts[3]), label("신분확인번호"), blank({ columnSpan: 3 }), null, null],
    [null, null, blank(h(18)), dAmount(resident.otherCosts[4]), label("현금승인번호"), blank({ columnSpan: 3 }), null, null],
    [
      null,
      label("비급여 계 \n⑧(④+⑤+⑥+⑦)", { columnSpan: 2, ...h(19) }),
      null,
      dFormula("=D11+D12+D13+SUM(D14:D18)"),
      label("※ 비고", { align: "left", alignVertical: "top" }),
      text("", { columnSpan: 3, align: "left", alignVertical: "top", fontWeight: false }),
      null, null
    ],

    [
      label("신용카드를\n사용하실때", { rowSpan: 2, fontSize: 10, ...h(20) }),
      label("회원번호", { fontWeight: false }), blank(),
      label("승인번호", { columnSpan: 2, fontWeight: false, align: "left" }), null,
      label("할부", { fontWeight: false }), blank(),
      label("사용금액", { fontWeight: false })
    ],
    [
      null,
      label("카드종류", { fontWeight: false, ...h(21) }), blank(),
      label("유효기간", { columnSpan: 2, fontWeight: false, align: "left" }), null,
      label("가맹점번호", { fontWeight: false }), blank(), blank()
    ],

    [
      { value: issueDateText(billingMonth), columnSpan: 8, fontSize: 12, align: "center", ...BORDER, ...h(22) },
      null, null, null, null, null, null, null
    ],
    [
      { value: ORG.ceoLine, columnSpan: 8, fontSize: 12, fontWeight: "bold", align: "center", ...BORDER, ...h(23) },
      null, null, null, null, null, null, null
    ],
    [blank(h(24)), blank(), blank(), blank(), blank(), blank(), blank(), blank()],
    [
      {
        value:
          "* 이 명세서(영수증)는 「소득세법」에 따른 의료비 또는 「조세특례제한법」에 따른 현금영수증(현금영수증 승인번호가 적힌 경우) 공제신청에 사용할 수 있습니다. 다만, 지출증빙용으로 발급된 현금영수증(지출증빙)은 공제신청에 사용할 수 없습니다.",
        columnSpan: 8,
        fontSize: 8,
        align: "left",
        wrap: true,
        ...h(25)
      },
      null, null, null, null, null, null, null
    ],
    [
      { value: "* 이 명세서(영수증)에 대한 세부내역을 요구할 수 있습니다.", columnSpan: 8, fontSize: 8, align: "left", wrap: true, ...h(26) },
      null, null, null, null, null, null, null
    ],
    [
      {
        value: "* 비고란은 장기요양기관의 임의활용 란으로 사용합니다. 다만, 복지용구의 경우 품목과 구입ㆍ대여를 구분하여 적으시기 바랍니다.",
        columnSpan: 8,
        fontSize: 8,
        align: "left",
        alignVertical: "top",
        wrap: true,
        ...BORDER,
        ...h(27)
      },
      null, null, null, null, null, null, null
    ]
  ];
}

// 원본 양식의 열 너비(글자 수 단위).
const SHEET_COLUMNS = [
  { width: 9.78 }, { width: 8.66 }, { width: 15.89 }, { width: 20.33 },
  { width: 14.22 }, { width: 10.44 }, { width: 12.22 }, { width: 8.66 }
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

  await writeExcelFile(sheets, { fontFamily: "Noto Sans KR", fontSize: 11 }).toFile(
    `수급자명세서_${billingMonth}.xlsx`
  );
}
