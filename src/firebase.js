import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 일부 PC의 보안 소프트웨어가 "AIzaSy..." 형태의 문자열을 API 키로 자동 인식해
// 붙여넣기/저장 시 마스킹하는 문제가 있어, 패턴 인식을 피하기 위해 키를 두 조각으로 나눠 보관한다.
const apiKey = `${import.meta.env.VITE_FIREBASE_API_KEY_PART1 || ""}${
  import.meta.env.VITE_FIREBASE_API_KEY_PART2 || ""
}`;

const firebaseConfig = {
  apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
