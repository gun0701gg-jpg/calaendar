import { format } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

export default function Header({ currentMonth, onPrevMonth, onNextMonth, onToday }) {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="app-header-title">
        <h1>위드온 팀 캘린더</h1>
      </div>
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
      </div>
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
