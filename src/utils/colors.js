// 일정 종류에 따라 고정된 색을 쓴다: 일정 = a색, 면회/입소상담 = b색 (근무현황은 별도의 요일별 글자색 처리)
export const VISIT_TITLE_PATTERN = /^면회\((.*)\/(\d)층\)$/;

const CATEGORY_COLORS = {
  schedule: "#f59e0b", // 일정 (a색, 앰버 오렌지)
  highlight: "#f97316", // 면회 / 입소상담 (b색)
  work: "#64748b" // 근무현황
};

export function colorForSchedule(schedule) {
  if (schedule.importBatch) return CATEGORY_COLORS.work;
  if (VISIT_TITLE_PATTERN.test(schedule.title || "") || schedule.category === "consult") {
    return CATEGORY_COLORS.highlight;
  }
  return CATEGORY_COLORS.schedule;
}
