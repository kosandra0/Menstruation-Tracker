import { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { NATIVE_EVENTS } from "@mt/config";
import { TitleBar } from "../components/layout/TitleBar";
import { Sidebar } from "../components/layout/Sidebar";
import { BackgroundLayer } from "../components/layout/BackgroundLayer";
import { Toaster } from "../components/common/feedback";
import { Onboarding } from "../components/common/Onboarding";
import { makePageVariants } from "../lib/motion";
import { useAppearance } from "../stores/appearance";
import { useRecords } from "../stores/records";
import { useNotificationEngine } from "../features/reminders/scheduler";
import { InAppToastHost } from "../features/notifications/ToastWindow";
import { WelcomeBackDialog, useActivityTracker } from "../features/notifications/WelcomeBack";
import { shell } from "../services/shell";

export function AppShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const intensity = useAppearance((s) => s.motionIntensity);
  const variants = useMemo(() => makePageVariants(intensity), [intensity]);

  useEffect(() => {
    if (useRecords.getState().loadStatus === "idle") void useRecords.getState().load();
  }, []);

  // Native "open this screen" requests (e.g. tray > Open Dashboard). One listener, removed on unmount.
  useEffect(() => {
    let off: (() => void) | undefined;
    let cancelled = false;
    void shell.on<string>(NATIVE_EVENTS.navigate, (path) => {
      if (typeof path === "string" && path.startsWith("/")) navigate(path);
    }).then((u) => (cancelled ? u() : (off = u)));
    return () => { cancelled = true; off?.(); };
  }, [navigate]);

  useNotificationEngine();
  useActivityTracker();

  return (
    <div className="shell-root relative flex h-full flex-col bg-canvas">
      <BackgroundLayer />
      <TitleBar />
      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto">
          <motion.div
            key={pathname}
            variants={variants}
            initial="initial"
            animate="animate"
            className="mx-auto max-w-[1080px] px-10 pb-12 pt-9"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
      <Toaster />
      <InAppToastHost />
      <WelcomeBackDialog />
      <Onboarding />
    </div>
  );
}
