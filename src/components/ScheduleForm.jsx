import { useState } from "react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

export default function ScheduleForm({ initial, onSubmit, onCancel }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [hasTime, setHasTime] = useState(!!initial?.time);
  const [hour, setHour] = useState(initial?.time ? initial.time.split(":")[0] : "09");
  const [minute, setMinute] = useState(initial?.time ? initial.time.split(":")[1] : "00");
  const [memo, setMemo] = useState(initial?.memo || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        time: hasTime ? `${hour}:${minute}` : "",
        memo: memo.trim()
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <label className="form-field">
        <span>제목</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
          autoFocus
          required
        />
      </label>
      <div className="form-field">
        <label className="form-field-checkbox-label">
          <input
            type="checkbox"
            checked={hasTime}
            onChange={(e) => setHasTime(e.target.checked)}
          />
          <span>시간</span>
        </label>
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
      <label className="form-field">
        <span>메모 (선택)</span>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={3} />
      </label>
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
