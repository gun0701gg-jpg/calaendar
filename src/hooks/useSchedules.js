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

// 엑셀 근무표에서 가져온 일정은 importBatch로 묶어 관리한다 (예: "excel-2026-07").
// 같은 배치가 이미 있으면 재업로드 시 기존 것을 지우고 새로 넣어 교체할 수 있게 한다.
export async function countImportBatch(importBatch) {
  const q = query(collection(db, SCHEDULES), where("importBatch", "==", importBatch));
  const snapshot = await getDocs(q);
  return snapshot.size;
}

export async function deleteImportBatch(importBatch) {
  const q = query(collection(db, SCHEDULES), where("importBatch", "==", importBatch));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function bulkImportSchedules(entries, { authorUid, authorName, color, importBatch }) {
  const CHUNK_SIZE = 400; // Firestore 배치 쓰기 최대 500건 제한 여유
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(i, i + CHUNK_SIZE)) {
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
        order: entry.order ?? 0,
        createdAt: serverTimestamp()
      });
    }
    await batch.commit();
  }
}
