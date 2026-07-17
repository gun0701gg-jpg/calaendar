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
import WorkScheduleUploadModal from "./components/WorkScheduleUploadModal";
import ConsultationView from "./components/ConsultationView";
import AccessDeniedScreen from "./components/AccessDeniedScreen";
import AccessManageModal from "./components/AccessManageModal";
import { createSchedule, deleteSchedule, updateSchedule, useSchedules } from "./hooks/useSchedules";
import { useAllowedEmails } from "./hooks/useAccessControl";
import { colorForAuthor } from "./utils/colors";

function CalendarApp() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState("calendar"); // "calendar" | "consultation"
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [accessManageOpen, setAccessManageOpen] = useState(false);

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
  // 일별 일정 패널은 직접 등록한 일정만 보여주고, 엑셀로 올린 근무현황은 캘린더 칸에만 표시한다.
  const daySchedules = schedules.filter((s) => s.date === selectedDateStr && !s.importBatch);

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
        activeView={activeView}
        onSwitchView={setActiveView}
        currentMonth={currentMonth}
        onPrevMonth={() => setCurrentMonth((m) => subMonths(m, 1))}
        onNextMonth={() => setCurrentMonth((m) => addMonths(m, 1))}
        onToday={() => {
          setCurrentMonth(new Date());
          setSelectedDate(new Date());
        }}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenAccessManage={() => setAccessManageOpen(true)}
      />
      {uploadOpen && (
        <WorkScheduleUploadModal
          user={user}
          defaultYear={currentMonth.getFullYear()}
          defaultMonth={currentMonth.getMonth() + 1}
          onClose={() => setUploadOpen(false)}
        />
      )}
      {accessManageOpen && <AccessManageModal user={user} onClose={() => setAccessManageOpen(false)} />}
      {activeView === "calendar" ? (
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
      ) : (
        <main className="app-main app-main--single">
          <ConsultationView user={user} />
        </main>
      )}
    </div>
  );
}

function Gate() {
  const { user } = useAuth();
  const allowedEmails = useAllowedEmails(!!user);

  if (user === undefined) {
    return (
      <div className="loading-screen">
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (allowedEmails === undefined) {
    return (
      <div className="loading-screen">
        <p>불러오는 중...</p>
      </div>
    );
  }

  const isAllowed =
    allowedEmails === null ||
    allowedEmails.map((e) => e.toLowerCase()).includes((user.email || "").toLowerCase());

  return isAllowed ? <CalendarApp /> : <AccessDeniedScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
