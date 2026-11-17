import { createHashRouter, type RouteObject } from "react-router";
import { AppShell } from "../layouts/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { DailyLogPage } from "../features/daily-log/DailyLogPage";
import { InsightsPage } from "../features/insights/InsightsPage";
import { JournalPage } from "../features/journal/JournalPage";
import { RemindersPage } from "../features/reminders/RemindersPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { NotificationHistoryPage } from "../features/notifications/HistoryPage";
import { ErrorFallback } from "../components/common/ErrorFallback";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <ErrorFallback />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "log", element: <DailyLogPage /> },
      { path: "insights", element: <InsightsPage /> },
      { path: "journal", element: <JournalPage /> },
      { path: "reminders", element: <RemindersPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "notifications", element: <NotificationHistoryPage /> },
    ],
  },
];

/** Hash routing keeps deep links working inside the Tauri webview and static hosting. */
export const createAppRouter = () => createHashRouter(routes);
