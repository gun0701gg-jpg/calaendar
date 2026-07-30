// 일정 종류(면회 / 일반 일정 / 근무현황)에 따라 고정된 색을 쓴다 (작성자별 색상은 더 이상 사용하지 않음)
export const VISIT_MEMO_PATTERN = /^(\d{2}):(\d{2}) \((.*)\/(\d)층\)$/;

export function isVisitMemo(memo) {
  return VISIT_MEMO_PATTERN.test(memo || "");
}

const CATEGORY_COLORS = {
  visit: "#a855f7", // 면회
  schedule: "#3b82f6", // 일정
  work: "#64748b" // 근무현황
};

export function colorForSchedule(schedule) {
  if (schedule.importBatch) return CATEGORY_COLORS.work;
  if (isVisitMemo(schedule.memo)) return CATEGORY_COLORS.visit;
  return CATEGORY_COLORS.schedule;
}
