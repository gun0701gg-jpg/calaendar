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

          return (
            <button
              key={dateStr}
              className={[
                "calendar-day",
                !inMonth && "calendar-day--muted",
                selected && "calendar-day--selected",
                isToday(d) && "calendar-day--today"
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelectDate(d)}
            >
              <span className="calendar-day-number">{format(d, "d")}</span>
              <div className="calendar-day-dots">
                {daySchedules.slice(0, 4).map((s) => (
                  <span
                    key={s.id}
                    className="calendar-day-dot"
                    style={{ backgroundColor: s.color }}
                    title={s.title}
                  />
                ))}
                {daySchedules.length > 4 && (
                  <span className="calendar-day-more">+{daySchedules.length - 4}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
