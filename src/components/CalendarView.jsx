import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek
} from "date-fns";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_VISIBLE_EVENTS = 5;

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
          const visible = daySchedules.slice(0, MAX_VISIBLE_EVENTS);
          const hiddenCount = daySchedules.length - visible.length;

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
                {visible.map((s) => (
                  <div
                    key={s.id}
                    className="calendar-day-event"
                    style={{ backgroundColor: s.color }}
                    title={`${s.time ? s.time + " " : ""}${s.title}`}
                  >
                    {s.time && <span className="calendar-day-event-time">{s.time}</span>}
                    {s.title}
                  </div>
                ))}
                {hiddenCount > 0 && <div className="calendar-day-more">+{hiddenCount}건 더보기</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
