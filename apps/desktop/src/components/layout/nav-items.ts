import { Bell, BookOpen, CalendarDays, LayoutDashboard, PenLine, Settings, Sparkles, type LucideIcon } from "lucide-react";

export interface NavItem { to: string; label: string; icon: LucideIcon }

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Cycle Calendar", icon: CalendarDays },
  { to: "/log", label: "Daily Log", icon: PenLine },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/journal", label: "Health Journal", icon: BookOpen },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
];
