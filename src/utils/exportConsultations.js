import { format } from "date-fns";

function ts(t) {
  return t?.toDate ? format(t.toDate(), "yyyy-MM-dd HH:mm") : "";
}

function isoDate(iso) {
  return iso || "";
}

export async function exportConsultationsToExcel(consultations, logs) {
  const writeExcelFile = (await import("write-excel-file/browser")).default;

  const listSheet = [
    [
      "수급자 이름",
      "생년",
      "성별",
      "건강/거동 상태",
      "장기요양등급",
      "보호자 이름",
      "보호자와의 관계",
      "연락처",
      "지역",
      "진행상태",
      "등록일",
      "최근상담일",
      "최근상담자",
      "최근상담 요약"
    ],
    ...consultations.map((c) => [
      c.residentName || "",
      c.birthYear || "",
      c.gender || "",
      c.condition || "",
      c.careGrade || "",
      c.guardianName || "",
      c.guardianRelation || "",
      c.guardianPhone || "",
      c.region || "",
      c.status || "",
      ts(c.createdAt),
      isoDate(c.lastLogDate),
      c.lastLogAuthor || "",
      c.lastLogSnippet || ""
    ])
  ];

  const nameById = Object.fromEntries(consultations.map((c) => [c.id, c.residentName || "이름 미입력"]));
  const logSheet = [
    ["수급자 이름", "작성일", "상담자", "상담내용"],
    ...logs.map((l) => [nameById[l.consultationId] || "", isoDate(l.logDate), l.authorName || "", l.content || ""])
  ];

  await writeExcelFile([
    { data: listSheet, sheet: "상담목록" },
    { data: logSheet, sheet: "상담이력" }
  ]).toFile(`입소상담_${format(new Date(), "yyyyMMdd")}.xlsx`);
}
