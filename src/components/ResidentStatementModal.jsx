import { useState } from "react";
import { format } from "date-fns";
import { downloadResidentStatements, parseResidentStatementFile } from "../utils/residentStatement";
import { isChunkLoadError, reloadForFreshVersion } from "../utils/reloadOnChunkError";

export default function ResidentStatementModal({ onClose }) {
  const [file, setFile] = useState(null);
  const [billingMonth, setBillingMonth] = useState(format(new Date(), "yyyy-MM"));
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("업로드할 엑셀 파일을 선택해주세요.");
      return;
    }
    setStatus("working");
    setMessage("파일을 읽는 중...");

    try {
      const { residents, skipped } = await parseResidentStatementFile(file);

      if (residents.length === 0) {
        setStatus("error");
        setMessage("업로드한 파일에서 수급자 데이터를 찾지 못했습니다. 성명이 들어있는 시트가 있는지 확인해주세요.");
        return;
      }

      setMessage(`${residents.length}명 명세서 생성 중...`);
      await downloadResidentStatements(residents, billingMonth);

      setStatus("done");
      setMessage(
        `${residents.length}명 명세서를 생성했습니다.` +
          (skipped.length > 0 ? ` (건너뛴 시트: ${skipped.join(", ")})` : "")
      );
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
          국민건강보험공단 등에서 다운로드한, 수급자 한 명당 시트 하나씩 있는 원본 엑셀을 업로드하면
          그 안의 금액을 읽어서 위드온빌리지 자체 양식의 장기요양급여비용 명세서 파일로 다시
          만들어드립니다. 카드결제·현금영수증·현금·이미납부한금액·비고 항목은 원본에 없어서 빈 칸으로
          만들어지니, 필요하면 만들어진 파일에서 직접 채워주세요.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>급여년월</span>
            <input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
          </label>
          <label className="form-field">
            <span>수급자 원본 엑셀</span>
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
