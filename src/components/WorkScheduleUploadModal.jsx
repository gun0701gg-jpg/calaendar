import { useState } from "react";
import { bulkImportSchedules, countImportBatch, deleteImportBatch } from "../hooks/useSchedules";
import { DEFAULT_TARGET_NAMES, parseWorkScheduleRows } from "../utils/parseWorkSchedule";
import { colorForAuthor } from "../utils/colors";
import { isChunkLoadError, reloadForFreshVersion } from "../utils/reloadOnChunkError";

export default function WorkScheduleUploadModal({ user, defaultYear, defaultMonth, onClose }) {
  const [file, setFile] = useState(null);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [extraHolidaysText, setExtraHolidaysText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("엑셀 파일을 선택해주세요.");
      return;
    }
    setStatus("working");
    setMessage("파일을 읽는 중...");

    try {
      const { readSheet } = await import("read-excel-file/browser");
      const rows = await readSheet(file);

      const extraHolidays = extraHolidaysText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const entries = parseWorkScheduleRows(rows, {
        year: Number(year),
        month: Number(month),
        targetNames: DEFAULT_TARGET_NAMES,
        extraHolidays
      });

      if (entries.length === 0) {
        setStatus("error");
        setMessage("추출된 일정이 없습니다. 연/월이 맞는지, 대상자 이름이 표와 일치하는지 확인해주세요.");
        return;
      }

      const importBatch = `excel-${year}-${String(month).padStart(2, "0")}`;
      const existingCount = await countImportBatch(importBatch);
      if (existingCount > 0) {
        const replace = window.confirm(
          `${year}년 ${month}월 근무표가 이미 등록되어 있습니다 (${existingCount}건). 지우고 새로 등록할까요?`
        );
        if (!replace) {
          setStatus("idle");
          setMessage("");
          return;
        }
        setMessage("기존 근무표를 지우는 중...");
        await deleteImportBatch(importBatch);
      }

      setMessage(`${entries.length}건 등록하는 중...`);
      await bulkImportSchedules(entries, {
        authorUid: user.uid,
        authorName: user.displayName,
        color: colorForAuthor(user.uid),
        importBatch
      });

      setStatus("done");
      setMessage(`${entries.length}건 등록 완료되었습니다.`);
    } catch (err) {
      if (isChunkLoadError(err) && reloadForFreshVersion()) {
        return;
      }
      setStatus("error");
      setMessage(err.message || "가져오는 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>근무표 올리기</h2>
        <p className="modal-hint">
          해당 월의 근무예정표 시트 하나만 담긴 엑셀 파일을 올려주세요 (여러 시트가 있으면 첫 번째 시트를 읽습니다).
        </p>
        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>엑셀 파일</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <div className="form-row">
            <label className="form-field">
              <span>연도</span>
              <input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </label>
            <label className="form-field">
              <span>월</span>
              <input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
          </div>
          <label className="form-field">
            <span>추가 공휴일 (음력 명절 등, 쉼표로 구분, 예: 2026-09-24,2026-09-25)</span>
            <input
              type="text"
              value={extraHolidaysText}
              onChange={(e) => setExtraHolidaysText(e.target.value)}
              placeholder="선택 사항"
            />
          </label>

          {message && <p className={`modal-message modal-message--${status}`}>{message}</p>}

          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              닫기
            </button>
            <button type="submit" className="btn btn--primary" disabled={status === "working"}>
              {status === "working" ? "처리 중..." : "가져오기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
