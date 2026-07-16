import { format } from "date-fns";
import { STATUS_COLORS } from "../utils/consultationOptions";

export default function ConsultationCard({ consultation, onClick }) {
  const statusColor = STATUS_COLORS[consultation.status] || STATUS_COLORS["상담중"];
  const lastLogDate = consultation.lastLogAt?.toDate ? consultation.lastLogAt.toDate() : null;

  return (
    <button className="consultation-card" onClick={onClick}>
      <div className="consultation-card-top">
        <span className="consultation-card-name">{consultation.residentName}</span>
        <span
          className="consultation-card-status"
          style={{ background: statusColor.bg, color: statusColor.fg }}
        >
          {consultation.status}
        </span>
      </div>
      <div className="consultation-card-meta">
        <span>
          보호자 {consultation.guardianName}
          {consultation.guardianRelation ? ` (${consultation.guardianRelation})` : ""}
        </span>
        {consultation.region && <span>· {consultation.region}</span>}
      </div>
      {consultation.lastLogSnippet ? (
        <p className="consultation-card-snippet">
          {lastLogDate && <span className="consultation-card-snippet-date">{format(lastLogDate, "M/d")}</span>}
          {consultation.lastLogAuthor && <b> {consultation.lastLogAuthor}</b>} {consultation.lastLogSnippet}
        </p>
      ) : (
        <p className="consultation-card-snippet consultation-card-snippet--empty">등록된 상담 내용이 없습니다.</p>
      )}
    </button>
  );
}
