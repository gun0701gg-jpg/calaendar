import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
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
