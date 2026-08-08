import { useState } from "react";
import { format } from "date-fns";
import { buildMergedResidentData } from "../utils/residentDataMerge";
import { downloadAggregateTable } from "../utils/residentAggregateTable";
import { downloadResidentStatements, residentStatementInputFromMerged } from "../utils/residentStatement";
import { isChunkLoadError, reloadForFreshVersion } from "../utils/reloadOnChunkError";

const FILE_SLOTS = [
  { key: "rosterFile", label: "1. 수급자현황", accept: ".xlsx,.xls" },
  { key: "roomFile", label: "2. 상급침실 이용에 따른 추가비용", accept: ".xlsx,.xls" },
  { key: "doctorFile", label: "3. 계약의사진찰비", accept: ".xlsx,.xls" },
  { key: "pharmacyFile", label: "4. 진료약제비", accept: ".pdf" },
  { key: "nursingFile", label: "5. 가정간호비", accept: ".xlsx,.xls" }
];

export default function ResidentStatementView() {
  const [files, setFiles] = useState({});
  const [billingMonth, setBillingMonth] = useState(format(new Date(), "yyyy-MM"));
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");

  const setFile = (key) => (e) => {
    setFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] || null }));
  };

  const runWithMergedData = async (task) => {
    if (!files.rosterFile) {
      setStatus("error");
      setMessage("1. 수급자현황 파일을 업로드해주세요.");
      return;
    }
    setStatus("working");
    setMessage("파일을 읽는 중...");

    try {
      const { residents, warnings } = await buildMergedResidentData(files, billingMonth);
      if (residents.length === 0) {
        setStatus("error");
        setMessage("수급자현황 파일에서 수급자 목록을 찾지 못했습니다.");
        return;
      }
      await task(residents);
      setStatus("done");
      const warningText = warnings.length ? `\n주의: ${warnings.join("\n")}` : "";
      setMessage(`${residents.length}명 처리했습니다.${warningText}`);
    } catch (err) {
      if (isChunkLoadError(err) && reloadForFreshVersion()) return;
      setStatus("error");
      setMessage(err.message || "생성 중 오류가 발생했습니다.");
    }
  };

  const handleAggregate = () =>
    runWithMergedData((residents) => downloadAggregateTable(residents, billingMonth));

  const handleStatements = () =>
    runWithMergedData((residents) =>
      downloadResidentStatements(residents.map(residentStatementInputFromMerged), billingMonth)
    );

  return (
    <div className="statement-view">
      <div className="statement-view-header">
        <h2>수급자 명세서</h2>
      </div>

      <p className="modal-hint" style={{ whiteSpace: "pre-wrap" }}>
        {`사용안내
1. 수급자현황 : 케어포 1-8 수급자현황 리포트 (조회기준:연간 선택) - [수급자목록 엑셀 다운로드] 클릭
2. 상급침실료 : 해당 수급자별 일요금 또는 월요금 입력 (호실 불필요)
3. 계약의사진찰비, 진료약제비, 가정간호비 는 수령한 파일 그대로 첨부
   (여러 개의 시트에 월별 자료가 있는 경우는 해당 월 시트만 남기고 다른 월은 삭제)
4. 명세서 집계표는 관리용 / 수급자별 명세서는 발송용`}
      </p>

      <label className="form-field">
        <span>급여년월</span>
        <input type="month" value={billingMonth} onChange={(e) => setBillingMonth(e.target.value)} />
      </label>

      <div className="statement-upload-grid">
        {FILE_SLOTS.map((slot) => (
          <label className="form-field" key={slot.key}>
            <span>{slot.label}</span>
            <input type="file" accept={slot.accept} onChange={setFile(slot.key)} />
          </label>
        ))}

        <div className="form-field">
          <span>6. 등급외비용</span>
          <p className="statement-derived-hint">
            1번 수급자현황 파일에서 등급이 "등급외"인 수급자의 금액을 자동으로 반영합니다. 별도
            파일 업로드는 필요하지 않습니다.
          </p>
        </div>
      </div>

      {message && (
        <p className={`modal-message modal-message--${status}`} style={{ whiteSpace: "pre-wrap" }}>
          {message}
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn btn--primary" onClick={handleAggregate} disabled={status === "working"}>
          {status === "working" ? "생성 중..." : "명세서 집계표 생성"}
        </button>
        <button type="button" className="btn btn--primary" onClick={handleStatements} disabled={status === "working"}>
          {status === "working" ? "생성 중..." : "수급자별 명세서 생성"}
        </button>
      </div>
    </div>
  );
}
