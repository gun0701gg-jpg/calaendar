import { useState } from "react";
import { CONSULT_TITLE_PATTERN, VISIT_TITLE_PATTERN } from "../utils/colors";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];
const FLOORS = ["3", "4", "5", "6"];

export default function ScheduleForm({ initial, onSubmit, onCancel }) {
  const visitMatch = initial?.title?.match(VISIT_TITLE_PATTERN);
  const consultMatch = !visitMatch && initial?.title?.match(CONSULT_TITLE_PATTERN);
  const initialCategory = visitMatch ? "visit" : consultMatch ? "consult" : "schedule";

  const [category, setCategory] = useState(initialCategory);
  const [title, setTitle] = useState(initialCategory === "schedule" ? initial?.title || "" : "");
  const [name, setName] = useState(visitMatch ? visitMatch[1] : consultMatch ? consultMatch[1] : "");
  const [floor, setFloor] = useState(visitMatch ? visitMatch[2] : "3");
  const [hasTime, setHasTime] = useState(initialCategory !== "schedule" || !!initial?.time);
  const [hour, setHour] = useState(initial?.time ? initial.time.split(":")[0] : "09");
  const [minute, setMinute] = useState(initial?.time ? initial.time.split(":")[1] : "00");
  const [memo, setMemo] = useState(initialCategory === "visit" ? "" : initial?.memo || "");
  const [saving, setSaving] = useState(false);

  const setCategoryExclusive = (next) => setCategory((c) => (c === next ? "schedule" : next));

  const handleSubmit = async (e) => {
    e.preventDefault();
    let finalTitle = title.trim();
    if (category === "visit") {
      if (!name.trim()) return;
      finalTitle = `면회(${name.trim()}/${floor}층)`;
    } else if (category === "consult") {
      if (!name.trim()) return;
      finalTitle = `입소상담(${name.trim()})`;
    } else if (!finalTitle) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: finalTitle,
        time: hasTime ? `${hour}:${minute}` : "",
        memo: category === "visit" ? "" : memo.trim()
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <div className="form-field-checkbox-row">
          <label className="form-field-checkbox-label">
            <input
              type="checkbox"
              checked={category === "visit"}
              onChange={() => setCategoryExclusive("visit")}
            />
            <span>면회</span>
          </label>
          <label className="form-field-checkbox-label">
            <input
              type="checkbox"
              checked={category === "consult"}
              onChange={() => setCategoryExclusive("consult")}
            />
            <span>입소상담</span>
          </label>
        </div>
      </div>

      {category === "schedule" ? (
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
      ) : (
        <label className="form-field">
          <span>이름</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            autoFocus
            required
          />
        </label>
      )}

      <div className="form-field">
        {category === "schedule" && (
          <label className="form-field-checkbox-label">
            <input
              type="checkbox"
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
            />
            <span>시간</span>
          </label>
        )}
        {(hasTime || category !== "schedule") && (
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

      {category === "visit" && (
        <label className="form-field">
          <span>층수</span>
          <select value={floor} onChange={(e) => setFloor(e.target.value)}>
            {FLOORS.map((f) => (
              <option key={f} value={f}>
                {f}층
              </option>
            ))}
          </select>
        </label>
      )}

      {category !== "visit" && (
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
