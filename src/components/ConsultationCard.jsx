import { STATUS_COLORS } from "../utils/consultationOptions";

function shortDate(isoDate) {
  if (!isoDate) return "";
  const [, month, day] = isoDate.split("-");
  return `${Number(month)}/${Number(day)}`;
}

export default function ConsultationCard({ consultation, onClick }) {
  const statusColor = STATUS_COLORS[consultation.status] || STATUS_COLORS["상담중"];

  return (
    <button className="consultation-card" onClick={onClick}>
      <div className="consultation-card-top">
        <span className="consultation-card-name">{consultation.residentName || "이름 미입력"}</span>
        <span
          className="consultation-card-status"
          style={{ background: statusColor.bg, color: statusColor.fg }}
        >
          {consultation.status}
        </span>
      </div>
      <div className="consultation-card-meta">
        <span>보호자 {consultation.guardianName || "-"}</span>
        {consultation.guardianRelation && <span>({consultation.guardianRelation})</span>}
        {consultation.region && <span>· {consultation.region}</span>}
      </div>
      {consultation.lastLogSnippet ? (
        <p className="consultation-card-snippet">
          {consultation.lastLogDate && (
            <span className="consultation-card-snippet-date">{shortDate(consultation.lastLogDate)}</span>
          )}
          {consultation.lastLogAuthor && <b> {consultation.lastLogAuthor}</b>} {consultation.lastLogSnippet}
        </p>
      ) : (
        <p className="consultation-card-snippet consultation-card-snippet--empty">등록된 상담 내용이 없습니다.</p>
      )}
    </button>
  );
}
