import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
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
    lastLogAt: null,
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

export async function addConsultationLog(consultationId, content, user) {
  await addDoc(collection(db, CONSULTATIONS, consultationId, "logs"), {
    content,
    authorUid: user.uid,
    authorName: user.displayName,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, CONSULTATIONS, consultationId), {
    lastLogSnippet: content.slice(0, 80),
    lastLogAuthor: user.displayName,
    lastLogAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
