import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";

const CONSULTATIONS = "consultations";

export function useConsultations() {
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, CONSULTATIONS), orderBy("updatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConsultations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { consultations, loading };
}

export async function createConsultation(fields, user) {
  return addDoc(collection(db, CONSULTATIONS), {
    ...fields,
    createdByUid: user.uid,
    createdByName: user.displayName,
    lastLogDate: null,
    lastLogSnippet: "",
    lastLogAuthor: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateConsultation(id, fields) {
  return updateDoc(doc(db, CONSULTATIONS, id), {
    ...fields,
    updatedAt: serverTimestamp()
  });
}

export async function deleteConsultation(id) {
  const logsSnapshot = await getDocs(collection(db, CONSULTATIONS, id, "logs"));
  const batch = writeBatch(db);
  logsSnapshot.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db, CONSULTATIONS, id));
  await batch.commit();
}

export function useConsultationLogs(consultationId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!consultationId) return;
    setLoading(true);
    const q = query(
      collection(db, CONSULTATIONS, consultationId, "logs"),
      orderBy("logDate", "asc"),
      orderBy("createdAt", "asc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, [consultationId]);

  return { logs, loading };
}

// logDate: "yyyy-MM-dd" 형식, 상담자가 실제로 상담한 날짜 (기본값 오늘, 다른 날짜로 바꿔서 등록 가능)
export async function addConsultationLog(consultationId, { content, logDate }, user) {
  await addDoc(collection(db, CONSULTATIONS, consultationId, "logs"), {
    content,
    logDate,
    authorUid: user.uid,
    authorName: user.displayName,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, CONSULTATIONS, consultationId), {
    lastLogSnippet: content.slice(0, 80),
    lastLogAuthor: user.displayName,
    lastLogDate: logDate,
    updatedAt: serverTimestamp()
  });
}

// 엑셀 다운로드용: 모든 상담 건의 상담이력을 한 번에 가져온다 (collectionGroup 쿼리)
export async function fetchAllConsultationLogs() {
  const q = query(collectionGroup(db, "logs"), orderBy("logDate", "asc"), orderBy("createdAt", "asc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    consultationId: d.ref.parent.parent.id,
    ...d.data()
  }));
}
