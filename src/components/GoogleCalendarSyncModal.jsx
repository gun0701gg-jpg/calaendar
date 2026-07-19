const FEED_URL = "https://withon-calendar-9a8d5.web.app/feed/withon.ics";

export default function GoogleCalendarSyncModal({ onClose }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FEED_URL);
      window.alert("주소를 복사했습니다.");
    } catch {
      window.prompt("아래 주소를 직접 복사해주세요.", FEED_URL);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>구글 캘린더 연동</h2>
        <p className="modal-hint">
          위드온빌리지에 등록된 "일정"(근무현황 제외)을 구글 캘린더에서 볼 수 있습니다. 위드온에서
          등록/수정/삭제한 내용만 반영되며, 구글 캘린더 쪽에서는 확인만 가능합니다(수정 불가). 몇 시간
          간격으로 자동 갱신되어, 실시간으로 바로 반영되지는 않습니다.
        </p>

        <label className="form-field">
          <span>피드 주소</span>
          <input type="text" readOnly value={FEED_URL} onFocus={(e) => e.target.select()} />
        </label>

        <ol className="modal-hint" style={{ paddingLeft: "1.2em" }}>
          <li>구글 캘린더 웹사이트 접속 → 왼쪽 "다른 캘린더" 옆 + 버튼 클릭</li>
          <li>"URL로 추가" 선택</li>
          <li>위 주소를 붙여넣고 "캘린더 추가" 클릭</li>
        </ol>

        <div className="form-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            닫기
          </button>
          <button type="button" className="btn btn--primary" onClick={handleCopy}>
            주소 복사
          </button>
        </div>
      </div>
    </div>
  );
}
