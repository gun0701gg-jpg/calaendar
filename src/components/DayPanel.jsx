import { useState } from "react";
import { format, getDay } from "date-fns";
import ScheduleForm from "./ScheduleForm";

export default function DayPanel({
  readOnly,
  selectedDate,
  schedules,
  workSchedules = [],
  currentUser,
  onCreate,
  onUpdate,
  onDelete
}) {
  const [mode, setMode] = useState("list"); // "list" | "create" | "edit"
  const [editingId, setEditingId] = useState(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const editingSchedule = schedules.find((s) => s.id === editingId);
  const isWeekend = [0, 6].includes(getDay(selectedDate));

  const startCreate = () => {
    setMode("create");
  };

  const startEdit = (id) => {
    setEditingId(id);
    setMode("edit");
  };

  const cancel = () => {
    setMode("list");
    setEditingId(null);
  };

  const handleCreate = async (values) => {
    await onCreate({ ...values, date: dateStr });
    cancel();
  };

  const handleUpdate = async (values) => {
    await onUpdate(editingId, { ...values, date: dateStr });
    cancel();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("이 일정을 삭제할까요?")) return;
    await onDelete(id);
  };

  return (
    <div className="day-panel">
      <div className="day-panel-header">
        <h2>{format(selectedDate, "M월 d일 (EEE)")}</h2>
        {!readOnly && mode === "list" && (
          <button className="btn btn--primary" onClick={startCreate}>
            + 일정 추가
          </button>
        )}
      </div>

      {workSchedules.length > 0 && (
        <div className="day-panel-work">
          <h3>근무현황</h3>
          <ul className="day-panel-work-list">
            {workSchedules.map((s) => (
              <li
                key={s.id}
                className={isWeekend ? "day-panel-work-item--weekend" : "day-panel-work-item--weekday"}
              >
                {s.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mode === "create" && (
        <ScheduleForm onSubmit={handleCreate} onCancel={cancel} />
      )}

      {mode === "edit" && editingSchedule && (
        <ScheduleForm initial={editingSchedule} onSubmit={handleUpdate} onCancel={cancel} />
      )}

      {mode === "list" && (
        <ul className="schedule-list">
          {schedules.length === 0 && <li className="schedule-empty">등록된 일정이 없습니다.</li>}
          {schedules.map((s) => {
            const isMine = !readOnly && !s.importBatch && s.authorUid === currentUser?.uid;
            return (
              <li key={s.id} className="schedule-item" style={{ borderLeftColor: s.color }}>
                <div className="schedule-item-main">
                  {s.time && <span className="schedule-item-time">{s.time}</span>}
                  <span className="schedule-item-title">{s.title}</span>
                </div>
                <div className="schedule-item-meta">
                  <span className="schedule-item-author" style={{ color: s.color }}>
                    {s.authorName}
                  </span>
                  {s.memo && <p className="schedule-item-memo">{s.memo}</p>}
                </div>
                {isMine && (
                  <div className="schedule-item-actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => startEdit(s.id)}>
                      수정
                    </button>
                    <button
                      className="btn btn--ghost btn--sm btn--danger"
                      onClick={() => handleDelete(s.id)}
                    >
                      삭제
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
