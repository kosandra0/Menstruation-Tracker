import { Link, NavLink } from "react-router";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, ShieldCheck, Smartphone } from "lucide-react";
import { cn } from "@mt/ui";
import { APP_VERSION } from "@mt/config";
import { NAV_ITEMS } from "./nav-items";
import { BrandMark } from "./BrandMark";
import { useAppearance } from "../../stores/appearance";
import { EASE } from "../../lib/motion";

export function Sidebar() {
  const collapsed = useAppearance((s) => s.sidebarCollapsed);
  const set = useAppearance((s) => s.set);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 252 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-line bg-chrome"
      aria-label="Primary"
    >
      <div className="flex items-center gap-3 px-[22px] pb-5 pt-6">
        <BrandMark size={32} />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="font-display text-[17px] text-ink">Menstruation</div>
            <div className="t-label text-muted">Tracker</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Main">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            title={collapsed ? label : undefined}
            aria-label={label}
            className="group relative block rounded-control outline-offset-0"
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ duration: 0.3, ease: EASE }}
                    className="absolute inset-0 rounded-control border border-line bg-surface shadow-soft"
                  />
                )}
                <span
                  className={cn(
                    "t-body relative flex h-10 items-center gap-3 px-[13px] font-medium transition-colors duration-200",
                    isActive ? "text-ink" : "text-muted group-hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-[18px] shrink-0 transition-colors", isActive && "text-accent")} strokeWidth={1.8} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </span>
                {isActive && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" aria-hidden />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line p-3">
        {!collapsed && (
          <div className="t-small flex items-start gap-2.5 rounded-xl bg-surface-alt px-3 py-2.5 leading-snug text-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
            <span>Private by design. No account, no tracking, nothing leaves this device.</span>
          </div>
        )}
        <Link
          to="/settings#about" title="Android version coming soon" aria-label="Android version coming soon"
          className={cn("t-small flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-muted transition-colors hover:border-accent/50 hover:text-ink", collapsed && "justify-center px-0")}
        >
          <Smartphone className="size-4 shrink-0 text-accent" aria-hidden />
          {!collapsed && <span className="min-w-0 leading-tight"><span className="block font-medium text-ink">Android app</span><span className="block">Coming soon</span></span>}
        </Link>
        <div className="flex items-center justify-between px-1">
          {!collapsed && <span className="t-small text-muted">v{APP_VERSION}</span>}
          <button
            type="button"
            onClick={() => set("sidebarCollapsed", !collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-ink", collapsed && "mx-auto")}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
