import { useState } from "react";
import { addAllowedEmail, removeAllowedEmail, useAllowedEmails } from "../hooks/useAccessControl";

export default function AccessManageModal({ user, onClose }) {
  const emails = useAllowedEmails(true);
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSaving(true);
    try {
      await addAllowedEmail(newEmail, user.email);
      setNewEmail("");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (email) => {
    const selfWarning = email.toLowerCase() === user.email.toLowerCase() ? "\n\n본인 계정입니다. 제거하면 즉시 접근이 막힐 수 있습니다." : "";
    if (!window.confirm(`${email} 계정을 접근 허용 목록에서 제거할까요?${selfWarning}`)) return;
    await removeAllowedEmail(email);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>접근 허용 관리</h2>

        {emails === undefined ? (
          <p className="modal-hint">불러오는 중...</p>
        ) : emails === null ? (
          <p className="modal-hint">
            아직 제한을 설정하지 않아 <b>Google 계정만 있으면 누구나</b> 로그인할 수 있습니다. 아래에 이메일을
            추가하면 그때부터 목록에 있는 이메일만 로그인할 수 있게 됩니다.
          </p>
        ) : (
          <p className="modal-hint">아래 목록에 있는 이메일만 로그인할 수 있습니다.</p>
        )}

        {Array.isArray(emails) && emails.length > 0 && (
          <ul className="access-email-list">
            {emails.map((email) => (
              <li key={email}>
                <span>{email}</span>
                <button className="btn btn--ghost btn--sm btn--danger" onClick={() => handleRemove(email)}>
                  제거
                </button>
              </li>
            ))}
          </ul>
        )}

        <form className="access-email-form" onSubmit={handleAdd}>
          <input
            type="email"
            placeholder="team-member@gmail.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
            추가
          </button>
        </form>

        <div className="form-actions">
          <button className="btn btn--ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
