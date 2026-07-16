import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>위드온 팀 캘린더</h1>
        <p>팀 공유 일정을 확인하려면 Google 계정으로 로그인하세요.</p>
        <button className="btn btn--primary btn--lg" onClick={login}>
          Google로 로그인
        </button>
      </div>
    </div>
  );
}
