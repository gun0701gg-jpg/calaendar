import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";
import BrandMark from "./BrandMark";

export default function Header({
  activeView,
  onSwitchView,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onOpenUpload
}) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header-title">
        <BrandMark size="sm" />
        <span className="app-header-divider" />
        <h1>위드온빌리지 캘린더</h1>
      </div>

      <div className="app-header-tabs">
        <button
          className={`chip ${activeView === "calendar" ? "chip--active" : ""}`}
          onClick={() => onSwitchView("calendar")}
        >
          캘린더
        </button>
        <button
          className={`chip ${activeView === "consultation" ? "chip--active" : ""}`}
          onClick={() => onSwitchView("consultation")}
        >
          입소상담
        </button>
      </div>

      {activeView === "calendar" && (
        <div className="app-header-nav">
          <button className="btn btn--ghost btn--sm" onClick={onPrevMonth}>
            ‹
          </button>
          <span className="app-header-month">{format(currentMonth, "yyyy년 M월")}</span>
          <button className="btn btn--ghost btn--sm" onClick={onNextMonth}>
            ›
          </button>
          <button className="btn btn--ghost btn--sm" onClick={onToday}>
            오늘
          </button>
          <button className="btn btn--primary btn--sm" onClick={onOpenUpload}>
            근무표 올리기
          </button>
        </div>
      )}

      <div className="app-header-user">
        {user?.photoURL && <img className="app-header-avatar" src={user.photoURL} alt="" />}
        <span className="app-header-name">{user?.displayName}</span>
        <button className="btn btn--ghost btn--sm" onClick={logout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
