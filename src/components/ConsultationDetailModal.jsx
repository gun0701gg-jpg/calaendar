import { useState } from "react";
import { format } from "date-fns";
import {
  addConsultationLog,
  deleteConsultation,
  updateConsultation,
  useConsultationLogs
} from "../hooks/useConsultations";
import { STATUS_COLORS } from "../utils/consultationOptions";
import ConsultationForm from "./ConsultationForm";

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

function formatIsoDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}.${m}.${d}`;
}

export default function ConsultationDetailModal({ consultation, user, onClose }) {
  const { logs } = useConsultationLogs(consultation.id);
  const [editing, setEditing] = useState(false);
  const [logContent, setLogContent] = useState("");
  const [logDate, setLogDate] = useState(todayIso());
  const [submittingLog, setSubmittingLog] = useState(false);

  const statusColor = STATUS_COLORS[consultation.status] || STATUS_COLORS["상담중"];

  const handleUpdate = async (values) => {
    await updateConsultation(consultation.id, values);
    setEditing(false);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!logContent.trim()) return;
    setSubmittingLog(true);
    try {
      await addConsultationLog(consultation.id, { content: logContent.trim(), logDate }, user);
      setLogContent("");
      setLogDate(todayIso());
    } finally {
      setSubmittingLog(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`"${consultation.residentName || "이름 미입력"}" 상담 건을 삭제할까요? 상담이력도 함께 삭제됩니다.`))
      return;
    await deleteConsultation(consultation.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="consultation-detail-header">
          <div>
            <h2>{consultation.residentName || "이름 미입력"}</h2>
            <span
              className="consultation-card-status"
              style={{ background: statusColor.bg, color: statusColor.fg }}
            >
              {consultation.status}
            </span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            닫기
          </button>
        </div>

        {editing ? (
          <ConsultationForm initial={consultation} onSubmit={handleUpdate} onCancel={() => setEditing(false)} />
        ) : (
          <>
            <dl className="consultation-info-grid">
              <div>
                <dt>생년 / 성별</dt>
                <dd>
                  {consultation.birthYear || "-"} / {consultation.gender || "-"}
                </dd>
              </div>
              <div>
                <dt>장기요양등급</dt>
                <dd>{consultation.careGrade || "-"}</dd>
              </div>
              <div>
                <dt>건강/거동 상태</dt>
                <dd>{consultation.condition || "-"}</dd>
              </div>
              <div>
                <dt>보호자</dt>
                <dd>
                  {consultation.guardianName || "-"}
                  {consultation.guardianRelation ? ` (${consultation.guardianRelation})` : ""}
                </dd>
              </div>
              <div>
                <dt>연락처</dt>
                <dd>{consultation.guardianPhone || "-"}</dd>
              </div>
              <div>
                <dt>지역</dt>
                <dd>{consultation.region || "-"}</dd>
              </div>
            </dl>
            <div className="form-actions">
              <button className="btn btn--ghost btn--sm btn--danger" onClick={handleDelete}>
                상담 삭제
              </button>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditing(true)}>
                정보 수정
              </button>
            </div>
          </>
        )}

        <div className="consultation-log-section">
          <h3>상담 내용 등록</h3>
          <form className="consultation-log-form" onSubmit={handleAddLog}>
            <div className="consultation-log-form-row">
              <label className="consultation-log-date-field">
                <span>작성일</span>
                <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </label>
              <span className="consultation-log-author">상담자: {user.displayName}</span>
            </div>
            <textarea
              rows={3}
              placeholder="상담한 내용을 남겨주세요. 다음에 이어받는 담당자가 이 내용을 보고 상담을 이어갈 수 있습니다."
              value={logContent}
              onChange={(e) => setLogContent(e.target.value)}
            />
            <button type="submit" className="btn btn--primary btn--sm" disabled={submittingLog}>
              {submittingLog ? "등록 중..." : "등록"}
            </button>
          </form>

          <h3>상담 이력 ({logs.length}건)</h3>
          {logs.length === 0 ? (
            <p className="schedule-empty">아직 등록된 상담 이력이 없습니다.</p>
          ) : (
            <ul className="consultation-log-list">
              {[...logs].reverse().map((log) => (
                <li key={log.id} className="consultation-log-item">
                  <div className="consultation-log-meta">
                    <b>{log.authorName}</b>
                    <span>{formatIsoDate(log.logDate)}</span>
                  </div>
                  <p>{log.content}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
