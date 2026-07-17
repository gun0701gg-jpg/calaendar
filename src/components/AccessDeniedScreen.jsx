import { useAuth } from "../contexts/AuthContext";
import BrandMark from "./BrandMark";

export default function AccessDeniedScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <BrandMark size="lg" />
        <h1>접근 권한이 없습니다</h1>
        <p>
          {user?.email} 계정은 아직 이용 허용 목록에 없습니다.
          <br />
          관리자에게 등록을 요청해주세요.
        </p>
        <button className="btn btn--ghost btn--lg" onClick={logout}>
          다른 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
