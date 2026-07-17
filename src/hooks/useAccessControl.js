import { useEffect, useState } from "react";
import { arrayRemove, arrayUnion, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const ACCESS_DOC = doc(db, "config", "access");

// undefined = 아직 확인 중, null = 허용 목록 문서가 없음(제한 없음), string[] = 허용된 이메일 목록
export function useAllowedEmails(enabled) {
  const [emails, setEmails] = useState(undefined);

  useEffect(() => {
    if (!enabled) {
      setEmails(undefined);
      return;
    }
    return onSnapshot(
      ACCESS_DOC,
      (snap) => setEmails(snap.exists() ? snap.data().allowedEmails || [] : null),
      () => setEmails(null)
    );
  }, [enabled]);

  return emails;
}

// 목록을 바꾸는 사람(currentUserEmail)은 항상 함께 포함시켜서, 실수로 본인을 제외해 접근이 막히는 것을 방지한다.
export async function addAllowedEmail(email, currentUserEmail) {
  await setDoc(
    ACCESS_DOC,
    { allowedEmails: arrayUnion(email.trim().toLowerCase(), currentUserEmail.trim().toLowerCase()) },
    { merge: true }
  );
}

export async function removeAllowedEmail(email) {
  await setDoc(ACCESS_DOC, { allowedEmails: arrayRemove(email) }, { merge: true });
}
