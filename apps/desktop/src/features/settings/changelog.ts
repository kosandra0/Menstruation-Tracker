/** In-app Update Log. Keep in step with CHANGELOG.md. Be honest about what is and is not finished. */
export interface ChangelogEntry {
  version: string;
  title: string;
  added?: string[];
  improved?: string[];
  fixed?: string[];
  incomplete?: string[];
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    version: "0.3.1",
    title: "Notification history, popup fade-out, window corners and the None flow level",
    added: [
      "Notification history page: everything the app showed you, grouped by day, newest first. Open it from Settings > Notifications > Open history, or “Full history” in the bell panel. Anything you have not opened stays marked “Not opened”, so a popup you missed can still be found. Filter, mark all opened, or clear.",
      "Notification popups fade out smoothly after their time is up. A popup you rest your mouse on pauses its countdown, but it fades after twice its duration at most, so it never stays forever.",
      "Window corners: Settings > Personalisation > Interface roundness has a new “Window corners” slider (0 to 24 px) that rounds the app window itself. A maximised window stays square.",
      "Flow has a “None” choice in the Daily Log and Calendar, to record a day with no bleeding. It is not counted as a flow day in the monthly summary.",
    ],
    fixed: [
      "The popup countdown bar did not move (its style was missing), so it now empties over the popup's time.",
      "Imported records with an unknown flow value are dropped, instead of being counted in the flow chart.",
      "A black outline appeared around the app window because of the Windows shadow on the transparent frame. The shadow is off now.",
    ],
    incomplete: [],
  },
  {
    version: "0.3.0",
    title: "Notifications, backups, clock and more ways to personalise",
    added: [
      "Notification system: reminders and gentle “remember to record” prompts (daily log, period expected soon, estimated start passed, record the end of a period) shown as popups drawn by the app itself, in your theme, in a corner of your screen, even while the app is in the tray. Never the Windows notification style.",
      "Notification centre: a bell in the title bar with a history of what was shown, unread count, mark all read and clear.",
      "Notification settings: turn each kind on or off, choose times, preview any popup, and style them (five styles, four screen corners, three sizes, their own theme or the app's, corner radius, how long they stay, entrance animation, logo and countdown bar).",
      "Back up and restore everything as .json, .md or .txt: every period, daily log, journal entry, reminder, your name and settings. Restore can merge with or replace your current records and shows what the file contains first.",
      "Welcome-back message: after restoring a backup, or whenever you return after two or more days away, with how many days it has been and a gentle nudge to log.",
      "Ten more logos (MT04 to MT13) in Personalisation, usable on the start-up screen, title bar, taskbar, tray and notifications.",
      "Ten more themes in the family of Slate Dusk, Terracotta and Plum Velvet (Dusk Lagoon, Mulberry Mist, Clay Rose, Fog Harbor, Copper Dusk, Fig & Honey, Olive Ember, Storm Blossom, Mauve Dune, Pine Slate).",
      "Your name: the dashboard and messages greet you by name.",
      "Interface roundness slider (0 to 24 px) for cards and controls, and the bar corner radius slider now goes from 0 to 24 px for every bar style.",
      "Clock: analog or digital (digital always shows seconds), 12-hour, 24-hour or your region's default, your computer's time zone or another one; on the dashboard, in the title bar, or both.",
      "Daily Log: stress, temperature, weight, cervical fluid and an intimacy note.",
      "More analysis: recording coverage heat map, what you record most, stress/temperature/weight charts, things that move together (with sample sizes), symptoms that appear together, last 30 days compared with the 30 before, temperature across the cycle.",
      "About: who made the app (Bubu for Panda Moma), a photo, and ways to contact the developer with Instagram, Telegram and Discord marks.",
    ],
    improved: [
      "Bar style now explains what it changes and shows a preview; Pill is always fully round and every other style uses the corner radius.",
      "Settings rows wrap on narrow windows instead of overflowing.",
      "CSV export includes the new daily-log fields.",
    ],
    fixed: [
      "The bar corner radius slider did nothing for the Minimal line and Pill styles.",
      "Notifications no longer depend on Windows notification permission or Focus assist.",
    ],
    incomplete: [
      "Popups are shown on the main screen only, and Windows Focus assist does not silence them (use quiet hours or the master switch).",
      "Backups are readable text files, not encrypted; the background image is not part of a backup.",
      "SQLCipher storage, the installer and code signing, and the Android app are still to come.",
    ],
  },
  {
    version: "0.2.0",
    title: "Complete desktop rebuild",
    added: [
      "Working tracker: record periods, daily logs, journal notes and reminders, stored in an encrypted vault on this device.",
      "Estimates with ranges and plain-language uncertainty, calculated only from your recorded history.",
      "Insights with cycle, period, mood, energy, pain, sleep and symptom charts, monthly summaries and CSV export.",
      "Appearance: ten themes with light and dark, custom colours with contrast checks, saved palettes (import and export), typography settings, background images with adjustments and themes generated from an image.",
      "Choose your app logo from three designs; start-up and exit screens use your logo and theme.",
      "Optional mood-adaptive accent and configurable mood bars.",
      "Title bar: six button styles (Windows, traffic lights, capsule, rings, dots, text) with position, size, shape, spacing and colour options.",
      "More insights: logging consistency and streaks, cycle length trend, averages by day of cycle, symptoms across the cycle, mood by weekday, sleep and mood comparison (each shows its sample size and needs a minimum number of days).",
      "Dedicated Update log section, and an Android-version-coming-soon note pinned in the sidebar.",
      "System tray with a themed right-click menu, close/minimise to tray, and an optional Start with Windows setting.",
      "Customisable dashboard cards and in-app Update Log.",
    ],
    improved: ["Single-instance app: launching it twice focuses the running window.", "All animations run once and rest; reduced-motion is respected everywhere."],
    fixed: ["Retired the old Win32 preview shell (its resize handler was suspected of re-entering itself); the new Tauri app was checked for responsiveness through minimise, maximise, restore, tray and exit cycles."],
    incomplete: [
      "Records use Windows DPAPI encryption, not SQLCipher yet.",
      "No encrypted backup/restore yet; JSON and CSV exports are unencrypted by design and warn you.",
      "The Go worker is not used by the desktop app yet.",
      "The Windows installer and code signing are not done.",
      "Android app (APK) is planned and coming later; iOS is future work.",
    ],
  },
  {
    version: "0.1.2",
    title: "Icon concepts and release verification",
    added: ["Three original app icon concepts (Bloom Petal, Lunar Cycle, Heartleaf)."],
  },
  {
    version: "0.1.1",
    title: "Windows foundation preview",
    added: ["Standalone Win32 preview executable with illustrative content only."],
  },
  {
    version: "0.1.0",
    title: "Foundation",
    added: ["Monorepo architecture, design system, application shell and documentation."],
  },
];
