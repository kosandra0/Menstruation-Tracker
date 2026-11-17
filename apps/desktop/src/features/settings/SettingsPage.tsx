import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Bell, Clock as ClockIcon, Database, Frame, History, Image as ImageIcon, Info, Palette, RotateCcw, Search, ShieldCheck, Sparkles, Pipette, Type, UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@mt/ui";
import { PageHeader } from "../../components/common/PageHeader";
import { ThemesSection, ColorsSection, TypographySection } from "./AppearanceSections";
import { BackgroundSection } from "./MediaSections";
import { AnimationSection, PersonalizationSection, WindowSection } from "./ShellSections";
import { NotificationsSection } from "../notifications/NotificationSettings";
import { ClockSection } from "../clock/ClockSettings";
import { AboutSection, DataSection, PrivacySection, ResetSection, UpdateLogSection } from "./DataSections";

interface Section {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string;
  component: ComponentType;
}

export const SETTINGS_SECTIONS: readonly Section[] = [
  { id: "themes", title: "Appearance & themes", description: "Pick a theme and choose light, dark or follow Windows.", icon: Palette, keywords: "theme light dark mode system lavender rosewater sage ocean sand midnight slate terracotta plum glacier appearance", component: ThemesSection },
  { id: "colors", title: "Colours", description: "Fine-tune accents, backgrounds, text and borders, with live contrast checks and your own palettes.", icon: Pipette, keywords: "color colour accent hex rgb contrast palette custom import export background surface text border", component: ColorsSection },
  { id: "typography", title: "Typography", description: "Choose a font and make text larger, smaller, lighter or more spaced.", icon: Type, keywords: "font text size heading body label weight line height letter spacing segoe arial calibri aptos georgia verdana", component: TypographySection },
  { id: "background", title: "Background image", description: "Use your own picture behind the app and generate a matching theme from it.", icon: ImageIcon, keywords: "background image wallpaper picture blur brightness contrast saturation opacity tint overlay vignette focal position theme from image", component: BackgroundSection },
  { id: "animation", title: "Animation", description: "Control how much the interface moves.", icon: Sparkles, keywords: "animation motion reduced reduce transitions intensity", component: AnimationSection },
  { id: "window", title: "Window & tray", description: "Title bar buttons, tray behaviour and starting with Windows.", icon: Frame, keywords: "window title bar traffic lights minimize maximize close tray startup start with windows button shape", component: WindowSection },
  { id: "personalization", title: "Personalisation", description: "Your name, app logo, how round things are, mood bars and dashboard layout.", icon: UserRound, keywords: "name logo icon bloom petal lunar cycle heartleaf mood bars bar style corner radius roundness rounded progress dashboard layout cards petal drop lotus moon blossom butterfly hourglass", component: PersonalizationSection },
  { id: "clock", title: "Clock", description: "An analog or digital clock that follows your region, in 12 or 24-hour format.", icon: ClockIcon, keywords: "clock time analog digital 12 hour 24 hour seconds time zone region date", component: ClockSection },
  { id: "notifications", title: "Notifications", description: "Reminders and prompts shown as popups in your theme: what, when, and how they look.", icon: Bell, keywords: "notification popup toast reminder prompt quiet hours discreet preview style position theme corner radius duration bell history", component: NotificationsSection },
  { id: "privacy", title: "Privacy", description: "What is stored, where, and how it is protected.", icon: ShieldCheck, keywords: "privacy encryption dpapi storage data location account analytics security", component: PrivacySection },
  { id: "data", title: "Your data", description: "Back up and restore everything (JSON, Markdown or text), or delete.", icon: Database, keywords: "data export import delete backup restore erase records json markdown md txt text appearance welcome back", component: DataSection },
  { id: "updates", title: "Update log", description: "What is new in each version, and what is not finished yet.", icon: History, keywords: "update log changelog release notes what is new version history", component: UpdateLogSection },
  { id: "about", title: "About", description: "Version, who made it, how to reach the developer, and what is coming next.", icon: Info, keywords: "about version developer made by bubu panda moma contact phone instagram telegram discord android apk coming soon mobile", component: AboutSection },
  { id: "reset", title: "Reset", description: "Return appearance choices to their defaults.", icon: RotateCcw, keywords: "reset defaults restore", component: ResetSection },
];

export function SettingsPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const fromHash = hash.replace("#", "");
  const [active, setActive] = useState(() => (SETTINGS_SECTIONS.some((s) => s.id === fromHash) ? fromHash : "themes"));

  useEffect(() => {
    if (SETTINGS_SECTIONS.some((s) => s.id === fromHash)) setActive(fromHash);
  }, [fromHash]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SETTINGS_SECTIONS;
    return SETTINGS_SECTIONS.filter((s) => `${s.title} ${s.description} ${s.keywords}`.toLowerCase().includes(q));
  }, [query]);

  const current = matches.find((s) => s.id === active) ?? matches[0];
  const Body = current?.component;

  const choose = (id: string) => {
    setActive(id);
    navigate({ hash: id }, { replace: true });
  };

  return (
    <div>
      <PageHeader title="Settings" description="Make the app yours. Visual changes apply instantly and are remembered." />
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside aria-label="Settings sections" className="space-y-3 lg:sticky lg:top-0 lg:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search settings" aria-label="Search settings"
              className="t-body h-10 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-ink outline-none focus-visible:border-accent"
            />
          </div>
          <nav aria-label="Settings">
            <ul className="space-y-0.5">
              {matches.map((s) => (
                <li key={s.id}>
                  <button
                    type="button" onClick={() => choose(s.id)} aria-current={current?.id === s.id ? "page" : undefined}
                    className={cn("t-body flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left transition-colors", current?.id === s.id ? "bg-accent-soft font-medium text-ink" : "text-muted hover:bg-surface-alt hover:text-ink")}
                  >
                    <s.icon className={cn("size-4 shrink-0", current?.id === s.id && "text-accent")} aria-hidden />{s.title}
                  </button>
                </li>
              ))}
            </ul>
            {matches.length === 0 && <p role="status" className="t-small px-1 text-muted">No settings match “{query}”.</p>}
          </nav>
        </aside>

        {current && Body && (
          <section aria-labelledby="settings-section-title" className="min-w-0 rounded-card border border-line bg-surface p-6 shadow-soft">
            <h2 id="settings-section-title" className="font-display t-title text-[1.35rem] text-ink">{current.title}</h2>
            <p className="t-body mb-5 mt-1 max-w-xl text-muted">{current.description}</p>
            <Body />
          </section>
        )}
      </div>
    </div>
  );
}
