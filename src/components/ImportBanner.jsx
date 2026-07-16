import { useEffect, useState } from "react";
import { bulkImportSchedules, isImportBatchDone } from "../hooks/useSchedules";
import { JULY_IMPORT_2026, JULY_IMPORT_BATCH } from "../data/julyImport2026";
import { colorForAuthor } from "../utils/colors";

export default function ImportBanner({ monthKey, user }) {
  const [status, setStatus] = useState("checking"); // checking | available | importing | done | hidden

  useEffect(() => {
    if (monthKey !== "2026-07") {
      setStatus("hidden");
      return;
    }
    setStatus("checking");
    isImportBatchDone(JULY_IMPORT_BATCH).then((done) => {
      setStatus(done ? "done" : "available");
    });
  }, [monthKey]);

  if (status === "hidden" || status === "checking" || status === "done") {
    return null;
  }

  const handleImport = async () => {
    if (!window.confirm(`엑셀 근무표에서 ${JULY_IMPORT_2026.length}건의 일정을 가져올까요?`)) return;
    setStatus("importing");
    await bulkImportSchedules(JULY_IMPORT_2026, {
      authorUid: user.uid,
      authorName: user.displayName,
      color: colorForAuthor(user.uid),
      importBatch: JULY_IMPORT_BATCH
    });
    setStatus("done");
  };

  return (
    <div className="import-banner">
      <span>7월 근무예정표(엑셀)를 아직 캘린더에 반영하지 않았습니다.</span>
      <button className="btn btn--primary btn--sm" onClick={handleImport} disabled={status === "importing"}>
        {status === "importing" ? "가져오는 중..." : "지금 가져오기"}
      </button>
    </div>
  );
}
