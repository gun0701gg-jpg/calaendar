import { useState } from "react";
import { format } from "date-fns";
import {
  downloadResidentStatementTemplate,
  downloadResidentStatements,
  parseResidentStatementFile
} from "../utils/residentStatement";
import { isChunkLoadError, reloadForFreshVersion } from "../utils/reloadOnChunkError";

export default function ResidentStatementModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [billingMonth, setBillingMonth] = useState(format(new Date(), "yyyy-MM"));
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");

  const handleDownloadTemplate = async () => {
    try {
      await downloadResidentStatementTemplate();
    } catch (err) {
      if (isChunkLoadError(err) && reloadForFreshVersion()) return;
      window.alert(err.message || "양식 다운로드 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("업로드할 엑셀 파일을 선택해주세요.");
      return;
    }
    setStatus("working");
    setMessage("파일을 읽는 중...");

    try {
      const { objects, errors } = await parseResidentStatementFile(file);

      if (errors) {
        setStatus("error");
        setMessage(
          errors
            .map((e) => `${e.row}행 "${e.column}": ${e.error === "required" ? "값이 비어있습니다" : e.error}`)
            .join("\n")
        );
        return;
      }

      if (!objects || objects.length === 0) {
        setStatus("error");
        setMessage("업로드한 파일에서 수급자 데이터를 찾지 못했습니다.");
        return;
      }

      setMessage(`${objects.length}명 명세서 생성 중...`);
      await downloadResidentStatements(objects, billingMonth);

      setStatus("done");
      setMessage(`${objects.length}명 명세서를 생성했습니다.`);
    } catch (err) {
      if (isChunkLoadError(err) && reloadForFreshVersion()) return;
      setStatus("error");
      setMessage(err.message || "생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>수급자 명세서 작성</h2>
        <p className="modal-hint">
          매달 수급자별 데이터를 정해진 양식의 엑셀로 업로드하면, 수급자 한 명당 시트 하나씩 담긴
          장기요양급여비용 명세서 파일을 만들어드립니다.
        </p>

        <button type="button" className="btn btn--ghost btn--sm" onClick={handleDownloadTemplate}>
          빈 업로드 양식 다운로드
        </button>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>급여년월</span>
            <input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
          </label>
          <label className="form-field">
            <span>수급자 데이터 엑셀</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          {message && (
            <p className={`modal-message modal-message--${status}`} style={{ whiteSpace: "pre-wrap" }}>
              {message}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
            <button type="submit" className="btn btn--primary" disabled={status === "working"}>
              {status === "working" ? "생성 중..." : "명세서 생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
