import { useState } from "react";
import { VISIT_MEMO_PATTERN } from "../utils/colors";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const FLOORS = ["3", "4", "5", "6"];

export default function ScheduleForm({ initial, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [hasTime, setHasTime] = useState(!!initial?.time);
  const [hour, setHour] = useState(initial?.time ? initial.time.split(":")[0] : "09");
  const [minute, setMinute] = useState(initial?.time ? initial.time.split(":")[1] : "00");

  const visitMatch = initial?.memo?.match(VISIT_MEMO_PATTERN);
  const [isVisit, setIsVisit] = useState(!!visitMatch);
  const [visitHour, setVisitHour] = useState(visitMatch ? visitMatch[1] : "09");
  const [visitMinute, setVisitMinute] = useState(visitMatch ? visitMatch[2] : "00");
  const [visitName, setVisitName] = useState(visitMatch ? visitMatch[3] : "");
  const [visitFloor, setVisitFloor] = useState(visitMatch ? visitMatch[4] : "3");
  const [memo, setMemo] = useState(!visitMatch ? initial?.memo || "" : "");

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const finalMemo = isVisit
        ? `${visitHour}:${visitMinute} (${visitName.trim()}/${visitFloor}층)`
        : memo.trim();
      await onSubmit({
        title: title.trim(),
        time: hasTime ? `${hour}:${minute}` : "",
        memo: finalMemo
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>제목</span>
        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
          rows={2}
          autoFocus
          required
        />
      </label>
      <div className="form-field">
        <div className="form-field-checkbox-row">
          <label className="form-field-checkbox-label">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
            />
            <span>시간</span>
          </label>
          <label className="form-field-checkbox-label">
            <input
              type="checkbox"
              checked={isVisit}
              onChange={(e) => setIsVisit(e.target.checked)}
            />
            <span>면회</span>
          </label>
        </div>
        {hasTime && (
          <div className="time-select-row">
            <select value={hour} onChange={(e) => setHour(e.target.value)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}시
                </option>
              ))}
            </select>
            <select value={minute} onChange={(e) => setMinute(e.target.value)}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {isVisit ? (
        <div className="form-field">
          <span>면회 정보 (예: 13:20 (홍길동/3층))</span>
          <div className="visit-info-row">
            <select value={visitHour} onChange={(e) => setVisitHour(e.target.value)}>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}시
                </option>
              ))}
            </select>
            <select value={visitMinute} onChange={(e) => setVisitMinute(e.target.value)}>
              {MINUTES.map((m) => (
                <option key={m} value={m}>
                  {m}분
                </option>
              ))}
            </select>
            <input
              type="text"
              value={visitName}
              onChange={(e) => setVisitName(e.target.value)}
              placeholder="이름"
            />
            <select value={visitFloor} onChange={(e) => setVisitFloor(e.target.value)}>
              {FLOORS.map((f) => (
                <option key={f} value={f}>
                  {f}층
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <label className="form-field">
          <span>메모 (선택)</span>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
        </label>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          취소
        </button>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </form>
  );
}
