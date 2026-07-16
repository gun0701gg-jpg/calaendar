import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from "date-fns";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarView({ currentMonth, schedules, selectedDate, onSelectDate }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = [];
  let day = gridStart;
  while (day <= gridEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const schedulesByDate = schedules.reduce((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="calendar">
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((d) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const daySchedules = schedulesByDate[dateStr] || [];
          const inMonth = isSameMonth(d, currentMonth);
          const selected = isSameDay(d, selectedDate);
          const isWeekend = [0, 6].includes(getDay(d));

          // 일정(직접 등록)은 색 배경 칩으로, 근무현황(엑셀 가져오기)은 배경 없이 요일에 따른 글자색으로 구분
          const regularEvents = daySchedules.filter((s) => !s.importBatch);
          const workEvents = daySchedules
            .filter((s) => s.importBatch)
            .slice()
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          const workText = workEvents
            .map((s) => `${s.time ? s.time + " " : ""}${s.title}`)
            .join(", ");

          return (
            <div
              key={dateStr}
              role="button"
              tabIndex={0}
              className={[
                "calendar-day",
                !inMonth && "calendar-day--muted",
                selected && "calendar-day--selected",
                isToday(d) && "calendar-day--today"
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(d)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectDate(d);
              }}
            >
              <span className="calendar-day-number">{format(d, "d")}</span>
              <div className="calendar-day-events">
                {regularEvents.map((s) => (
                  <div
                    key={s.id}
                    className="calendar-day-chip"
                    style={{ backgroundColor: s.color }}
                    title={`${s.time ? s.time + " " : ""}${s.title}`}
                  >
                    {s.time && <span className="calendar-day-chip-time">{s.time} </span>}
                    {s.title}
                  </div>
                ))}
                {workEvents.length > 0 && (
                  <div
                    className={
                      "calendar-day-work " +
                      (isWeekend ? "calendar-day-work--weekend" : "calendar-day-work--weekday")
                    }
                    title={workText}
                  >
                    {workEvents.map((s, i) => (
                      <span key={s.id}>
                        {s.title}
                        {i < workEvents.length - 1 && <span className="calendar-day-work-sep">, </span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
