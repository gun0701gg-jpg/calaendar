import { useState } from "react";
import { createConsultation, fetchAllConsultationLogs, useConsultations } from "../hooks/useConsultations";
import ConsultationCard from "./ConsultationCard";
import ConsultationForm from "./ConsultationForm";
import ConsultationDetailModal from "./ConsultationDetailModal";
import { STATUS_OPTIONS } from "../utils/consultationOptions";
import { isChunkLoadError, reloadForFreshVersion } from "../utils/reloadOnChunkError";

export default function ConsultationView({ user }) {
  const { consultations, loading } = useConsultations();
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("전체");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const selected = consultations.find((c) => c.id === selectedId);

  const handleCreate = async (values) => {
    const ref = await createConsultation(values, user);
    setCreating(false);
    setSelectedId(ref.id);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError("");
    try {
      const logs = await fetchAllConsultationLogs();
      const { exportConsultationsToExcel } = await import("../utils/exportConsultations");
      await exportConsultationsToExcel(consultations, logs);
    } catch (err) {
      console.error(err);
      if (isChunkLoadError(err) && reloadForFreshVersion()) {
        return;
      }
      setExportError(err.message || "다운로드 중 오류가 발생했습니다.");
    } finally {
      setExporting(false);
    }
  };

  const visible =
    statusFilter === "전체" ? consultations : consultations.filter((c) => c.status === statusFilter);

  return (
    <div className="consultation-view">
      <div className="consultation-view-header">
        <h2>입소상담</h2>
        <div className="consultation-filter">
          <button
            className={`chip ${statusFilter === "전체" ? "chip--active" : ""}`}
            onClick={() => setStatusFilter("전체")}
          >
            전체 {consultations.length}
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`chip ${statusFilter === s ? "chip--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
        <button className="btn btn--ghost" onClick={handleExport} disabled={exporting || consultations.length === 0}>
          {exporting ? "다운로드 중..." : "엑셀 다운로드"}
        </button>
        <button className="btn btn--primary" onClick={() => setCreating(true)}>
          + 신규상담
        </button>
      </div>

      {exportError && <p className="modal-message modal-message--error">{exportError}</p>}

      {loading ? (
        <p className="schedule-empty">불러오는 중...</p>
      ) : visible.length === 0 ? (
        <p className="schedule-empty">등록된 상담이 없습니다. "+ 신규상담"으로 시작해보세요.</p>
      ) : (
        <div className="consultation-grid">
          {visible.map((c) => (
            <ConsultationCard key={c.id} consultation={c} onClick={() => setSelectedId(c.id)} />
          ))}
        </div>
      )}

      {creating && (
        <div className="modal-overlay" onClick={() => setCreating(false)}>
          <div className="modal modal--wide" onClick={(e) => e.stopPropagation()}>
            <h2>신규상담</h2>
            <ConsultationForm onSubmit={handleCreate} onCancel={() => setCreating(false)} />
          </div>
        </div>
      )}

      {selected && (
        <ConsultationDetailModal consultation={selected} user={user} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
