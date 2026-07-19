// 위드온빌리지 "일정"(근무현황 제외)을 구글 캘린더 등에서 구독할 수 있도록
// iCalendar(.ics) 파일로 변환해 public/feed/withon.ics 에 저장한다.
// GitHub Actions 워크플로가 주기적으로 이 스크립트를 실행하고, 결과를 다시 배포한다.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "feed", "withon.ics");
const UID_DOMAIN = "withon-calendar-9a8d5.web.app";

function pad(n) {
  return String(n).padStart(2, "0");
}

function escapeText(text) {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

// RFC 5545: 한 줄은 75옥텟을 넘으면 다음 줄 맨 앞에 공백 하나를 두고 이어 써야 한다.
function foldLine(line) {
  const max = 75;
  if (line.length <= max) return line;
  let result = "";
  let rest = line;
  let first = true;
  while (rest.length > 0) {
    const size = first ? max : max - 1;
    result += (first ? "" : "\r\n ") + rest.slice(0, size);
    rest = rest.slice(size);
    first = false;
  }
  return result;
}

function formatUtc(date) {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

// 위드온은 한국(KST, UTC+9) 고정 서비스이므로 date/time을 KST 기준으로 해석한다.
function scheduleToEvent({ id, title, date, time, memo }) {
  const [y, m, d] = date.split("-").map(Number);
  const lines = ["BEGIN:VEVENT", `UID:withon-${id}@${UID_DOMAIN}`];

  if (time) {
    const [hh, mm] = time.split(":").map(Number);
    const startUtc = new Date(Date.UTC(y, m - 1, d, hh - 9, mm, 0));
    const endUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
    lines.push(`DTSTART:${formatUtc(startUtc)}`);
    lines.push(`DTEND:${formatUtc(endUtc)}`);
  } else {
    const endUtc = new Date(Date.UTC(y, m - 1, d + 1));
    lines.push(`DTSTART;VALUE=DATE:${y}${pad(m)}${pad(d)}`);
    lines.push(
      `DTEND;VALUE=DATE:${endUtc.getUTCFullYear()}${pad(endUtc.getUTCMonth() + 1)}${pad(endUtc.getUTCDate())}`
    );
  }

  lines.push(foldLine(`SUMMARY:${escapeText(title)}`));
  if (memo) {
    lines.push(foldLine(`DESCRIPTION:${escapeText(memo)}`));
  }
  lines.push(`DTSTAMP:${formatUtc(new Date())}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

async function main() {
  initializeApp({ credential: applicationDefault() });
  const db = getFirestore();

  const snapshot = await db.collection("schedules").get();
  const events = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.importBatch) return; // 근무현황(엑셀 가져오기)은 제외, 일정만 내보낸다
    if (!data.date || !data.title) return;
    events.push(scheduleToEvent({ id: doc.id, ...data }));
  });

  const calendar =
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Withon Village//Schedule Feed//KO",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:위드온빌리지 일정",
      "X-WR-TIMEZONE:Asia/Seoul",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n") + "\r\n";

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, calendar, "utf8");
  console.log(`ICS feed written: ${OUTPUT_PATH} (${events.length}개 일정)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
