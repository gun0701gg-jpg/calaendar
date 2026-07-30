// 일정 종류(면회 / 입소상담 / 그 외 일정 / 근무현황)에 따라 고정된 색을 쓴다
export const VISIT_TITLE_PATTERN = /^면회\((.*)\/(\d)층\)$/;
export const CONSULT_TITLE_PATTERN = /^입소상담\((.*)\)$/;

const CATEGORY_COLORS = {
  visit: "#a855f7", // 면회
  schedule: "#3b82f6", // 일정 (입소상담 포함)
  work: "#64748b" // 근무현황
};

export function colorForSchedule(schedule) {
  if (schedule.importBatch) return CATEGORY_COLORS.work;
  if (VISIT_TITLE_PATTERN.test(schedule.title || "")) return CATEGORY_COLORS.visit;
  return CATEGORY_COLORS.schedule;
}
