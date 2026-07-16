import { useMemo, useState } from "react";
import {
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subMonths
} from "date-fns";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./components/Login";
import Header from "./components/Header";
import CalendarView from "./components/CalendarView";
import DayPanel from "./components/DayPanel";
import ImportBanner from "./components/ImportBanner";
import { createSchedule, deleteSchedule, updateSchedule, useSchedules } from "./hooks/useSchedules";
import { colorForAuthor } from "./utils/colors";

function CalendarApp() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { gridStart, gridEnd } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    return {
      gridStart: format(startOfWeek(monthStart), "yyyy-MM-dd"),
      gridEnd: format(endOfWeek(monthEnd), "yyyy-MM-dd")
    };
  }, [currentMonth]);

  const { schedules } = useSchedules(gridStart, gridEnd);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const daySchedules = schedules.filter((s) => s.date === selectedDateStr);

  const handleCreate = (values) =>
    createSchedule({
      ...values,
      authorUid: user.uid,
      authorName: user.displayName,
      color: colorForAuthor(user.uid)
    });

  const handleUpdate = (id, values) => updateSchedule(id, values);
  const handleDelete = (id) => deleteSchedule(id);

  return (
    <div className="app">
      <Header
        currentMonth={currentMonth}
        onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
        onToday={() => {
          setCurrentMonth(new Date());
          setSelectedDate(new Date());
        }}
      />
      <ImportBanner monthKey={format(currentMonth, "yyyy-MM")} user={user} />
      <main className="app-main">
        <CalendarView
          currentMonth={currentMonth}
          schedules={schedules}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
        <DayPanel
          selectedDate={selectedDate}
          schedules={daySchedules}
          currentUser={user}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      </main>
    </div>
  );
}

function Gate() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <p>불러오는 중...</p>
      </div>
    );
  }

  return user ? <CalendarApp /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
