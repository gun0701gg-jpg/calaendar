import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";

const SCHEDULES = "schedules";

// monthStart, monthEnd: "yyyy-MM-dd" 문자열
export function useSchedules(monthStart, monthEnd) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, SCHEDULES),
      where("date", ">=", monthStart),
      where("date", "<=", monthEnd),
      orderBy("date"),
      orderBy("time")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSchedules(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsubscribe;
  }, [monthStart, monthEnd]);

  return { schedules, loading };
}

export async function createSchedule({ title, date, time, memo, color, authorUid, authorName }) {
  return addDoc(collection(db, SCHEDULES), {
    title,
    date,
    time: time || null,
    memo: memo || "",
    color,
    authorUid,
    authorName,
    createdAt: serverTimestamp()
  });
}

export async function updateSchedule(id, { title, date, time, memo }) {
  return updateDoc(doc(db, SCHEDULES, id), {
    title,
    date,
    time: time || null,
    memo: memo || ""
  });
}

export async function deleteSchedule(id) {
  return deleteDoc(doc(db, SCHEDULES, id));
}

// 엑셀 근무표에서 가져온 일정을 한 번에 등록. 같은 importBatch가 이미 있으면 중복 등록을 막기 위해 먼저 확인한다.
export async function isImportBatchDone(importBatch) {
  const q = query(collection(db, SCHEDULES), where("importBatch", "==", importBatch), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function bulkImportSchedules(entries, { authorUid, authorName, color, importBatch }) {
  const batch = writeBatch(db);
  for (const entry of entries) {
    const ref = doc(collection(db, SCHEDULES));
    batch.set(ref, {
      title: entry.title,
      date: entry.date,
      time: null,
      memo: "",
      color,
      authorUid,
      authorName,
      importBatch,
      createdAt: serverTimestamp()
    });
  }
  await batch.commit();
}
