import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileText, Heart, Lock, Phone, RotateCcw, ShieldCheck, Smartphone, Trash2, Upload } from "lucide-react";
import { APP_NAME, APP_VERSION } from "@mt/config";
import type { StorageStatus } from "@mt/shared-types";
import { cn } from "@mt/ui";
import { Button } from "../../components/ui/Button";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { Switch } from "../../components/ui/Switch";
import { SettingRow, Segmented } from "../../components/ui/controls";
import { toast } from "../../components/common/feedback";
import { BrandIcon } from "../../components/common/BrandIcons";
import { useAppearance, exportAppearance, parseAppearanceFile, sanitizeAppearance } from "../../stores/appearance";
import { useNotifications } from "../../stores/notifications";
import { useRecords } from "../../stores/records";
import { recordsService } from "../../services/records";
import { getAppInfo } from "../../services/storage";
import { invokeNative, isNative } from "../../services/native";
import { downloadText } from "../../lib/format";
import {
  BACKUP_MIME, MAX_BACKUP_BYTES, backupFileName, buildBackup, parseBackup, serializeBackup, type BackupFormat, type ParseResult,
} from "../../lib/backup";
import { clearBackground } from "../../lib/bgImage";
import { useBackgroundVersion } from "../../components/layout/BackgroundLayer";
import { readLastActive, touchLastActive, useWelcome, welcomeAfterRestore } from "../notifications/WelcomeBack";
import developerPhoto from "../../assets/developer.jpg";
import { CHANGELOG } from "./changelog";

/* ---------------------------------------------------------------- Privacy */

export function PrivacySection() {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [dir, setDir] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    recordsService.status().then((s) => live && setStatus(s)).catch(() => live && setStatus(null));
    if (isNative()) import("@tauri-apps/api/path").then((p) => p.appDataDir()).then((d) => live && setDir(d)).catch(() => {});
    return () => { live = false; };
  }, []);
  const rows: [string, string][] = [
    ["Your records (periods, logs, notes, reminders)", isNative() ? `Encrypted file on this computer${dir ? `: ${dir}` : ""}` : "Not saved in a browser preview"],
    ["Appearance, name and notification preferences", "This app's local storage on this computer. Contains no health information."],
    ["Notification history", "This app's local storage. Only the kind of notification and the time, never your notes or reminder text."],
    ["Background image", "This app's local storage on this computer. Never uploaded."],
  ];
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-2xl bg-accent-soft/60 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div className="t-body leading-relaxed text-ink">No account. No advertising. No analytics. The app does not connect to the internet, and nothing you record is ever uploaded. The only time it leaves the app is when you click a developer contact link on the About screen, which opens your own browser.</div>
      </div>
      <dl className="space-y-3">
        {rows.map(([k, v]) => <div key={k}><dt className="t-small text-muted">{k}</dt><dd className="t-body break-all text-ink">{v}</dd></div>)}
      </dl>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="t-body flex items-center gap-2 font-medium text-ink"><Lock className="size-4 text-accent" aria-hidden />Encryption status</div>
        <p className="t-body mt-1.5 leading-relaxed text-muted">
          {status?.encrypted ? "Your records are encrypted with Windows DPAPI, tied to your Windows user account. Other Windows users on this computer cannot read them." : "Encrypted storage is not available here, so the app refuses to save records instead of storing them as plain text."}
        </p>
        <p className="t-small mt-2 leading-relaxed text-muted">Honest limits: DPAPI does not protect against someone signed in as you or malware running as you. Backup files you export (.json, .md, .txt) are readable text, not encrypted. Stronger SQLCipher storage with an optional app lock is planned.</p>
      </div>
      <p className="t-small text-muted">Notifications use discreet wording if you choose it (see Notifications). Application logs never contain your records.</p>
    </div>
  );
}

/* ---------------------------------------------------------------- Data */

const FORMAT_OPTIONS: { value: BackupFormat; label: string }[] = [
  { value: "json", label: "JSON (.json)" }, { value: "md", label: "Markdown (.md)" }, { value: "txt", label: "Text (.txt)" },
];
const FORMAT_HELP: Record<BackupFormat, string> = {
  json: "Best for restoring: exactly the data, nothing else.",
  md: "Readable in any notes app, with the restore data in a marked block at the end.",
  txt: "Plain text anyone can open, with the restore data in a marked block at the end.",
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export function DataSection() {
  const data = useRecords((s) => s.data);
  const ready = useRecords((s) => s.loadStatus === "ready");
  const importData = useRecords((s) => s.importData);
  const deleteEverything = useRecords((s) => s.deleteEverything);
  const replaceAll = useAppearance((s) => s.replaceAll);
  const bump = useBackgroundVersion((s) => s.bump);
  const fileRef = useRef<HTMLInputElement>(null);
  const appearanceRef = useRef<HTMLInputElement>(null);
  const [format, setFormat] = useState<BackupFormat>("json");
  const [includeSettings, setIncludeSettings] = useState(true);
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [typed, setTyped] = useState("");
  const [pendingAppearance, setPendingAppearance] = useState<ReturnType<typeof parseAppearanceFile> | null>(null);
  const [pendingBackup, setPendingBackup] = useState<ParseResult | null>(null);
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [alsoSettings, setAlsoSettings] = useState(true);
  const [busy, setBusy] = useState(false);

  const doExport = () => {
    const b = buildBackup({
      records: data, appearance: sanitizeAppearance(useAppearance.getState()), notifications: useNotifications.getState().settings,
      lastActiveAt: readLastActive(), includeSettings,
    });
    downloadText(backupFileName(format), serializeBackup(b, format), BACKUP_MIME[format]);
    setConfirmExport(false);
    toast.info("Backup created. The file is not encrypted; keep it somewhere safe.");
  };
  const doDelete = async () => {
    setBusy(true);
    try {
      await deleteEverything();
      setConfirmDelete(false); setTyped("");
      toast.success("All records were deleted from this device.");
    } catch {
      toast.error("The records could not be deleted. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };
  const onPickBackup = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { setPendingBackup({ ok: false, error: "That file is too large to be a backup of this app." }); return; }
    setMode("merge");
    setAlsoSettings(true);
    setPendingBackup(parseBackup(await file.text()));
  };
  const applyBackup = () => {
    if (!pendingBackup?.ok) return;
    const b = pendingBackup.backup;
    if (!importData(b.records, mode)) { toast.error("Your records are not available right now, so nothing was imported."); return; }
    if (alsoSettings) {
      if (b.appearance) replaceAll({ ...b.appearance, background: { ...b.appearance.background, hasImage: useAppearance.getState().background.hasImage } });
      else if (b.userName && !useAppearance.getState().userName) useAppearance.getState().set("userName", b.userName);
      if (b.notifications) useNotifications.getState().replaceSettings(b.notifications);
      bump();
    }
    setPendingBackup(null);
    const logs = useRecords.getState().data.logs;
    useWelcome.getState().show(welcomeAfterRestore({ lastActiveAt: b.lastActiveAt, exportedAt: b.exportedAt }, logs, b.counts));
    touchLastActive();
    toast.success(mode === "merge" ? "Backup merged into your records." : "Your records were replaced by the backup.");
  };
  const onPickAppearance = async (file: File | undefined) => {
    if (!file) return;
    setPendingAppearance(parseAppearanceFile(await file.text()));
  };
  const b = pendingBackup?.ok ? pendingBackup.backup : null;

  return (
    <div>
      <SettingRow title="Back up everything" description="One file with every period, daily log, journal entry and reminder, plus your name and settings. Keep it to move to a new computer or to restore after reinstalling." stacked>
        <div className="space-y-3">
          <Segmented<BackupFormat> label="Backup file type" className="flex-wrap" value={format} options={FORMAT_OPTIONS} onChange={setFormat} />
          <p className="t-small text-muted">{FORMAT_HELP[format]}</p>
          <label className="t-body flex items-center gap-3 text-ink">
            <Switch checked={includeSettings} onCheckedChange={setIncludeSettings} aria-label="Include my settings in the backup" />
            Include my name and settings (themes, colours, notifications, clock)
          </label>
          <Button size="sm" variant="soft" onClick={() => setConfirmExport(true)}><Download className="size-4" />Create backup</Button>
        </div>
      </SettingRow>
      <SettingRow title="Restore from a backup" description="Choose a .json, .md or .txt file made by this app. You will see what it contains before anything changes. If you have been away, you get a welcome-back message." stacked>
        <div className="space-y-2">
          <Button size="sm" variant="soft" disabled={!ready} onClick={() => fileRef.current?.click()}><Upload className="size-4" />Choose a backup file</Button>
          {!ready && <p className="t-small text-muted">Your records are not available right now, so restoring is paused.</p>}
          <input ref={fileRef} type="file" accept=".json,.md,.txt,application/json,text/markdown,text/plain" hidden aria-label="Choose a backup file" onChange={(e) => { void onPickBackup(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </SettingRow>
      <SettingRow title="Back up appearance only" description="Save your themes, colours, fonts and layout choices to a file (no health data).">
        <div className="flex gap-2">
          <Button size="sm" variant="soft" onClick={() => downloadText("appearance.json", exportAppearance(), "application/json")}><Download className="size-4" />Export</Button>
          <Button size="sm" variant="soft" onClick={() => appearanceRef.current?.click()}><Upload className="size-4" />Import</Button>
          <input ref={appearanceRef} type="file" accept="application/json,.json" hidden aria-label="Import appearance file" onChange={(e) => { void onPickAppearance(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </SettingRow>
      <SettingRow title="Delete all records" description="Permanently erases your periods, logs, notes and reminders from this device. Appearance settings are kept. This cannot be undone.">
        <Button size="sm" className="bg-danger bg-none text-white" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete everything</Button>
      </SettingRow>
      <p className="t-small pt-3 text-muted">Backups are readable files, not encrypted. Encrypted backup and restore are planned and not available yet. The background image is not part of a backup.</p>

      <Dialog open={confirmExport} onOpenChange={setConfirmExport}>
        <DialogContent title="Create an unencrypted backup?" description="The file contains your health records as readable text. Anyone who gets the file can read it, so keep it somewhere private.">
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmExport(false)}>Cancel</Button><Button onClick={doExport}>Create {format.toUpperCase()} backup</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={(o) => { setConfirmDelete(o); if (!o) setTyped(""); }}>
        <DialogContent title="Delete all records?" description="Every period, log, journal note and reminder will be erased from this device for good.">
          <label className="t-small block text-muted">Type DELETE to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="t-body mt-1 h-10 w-full rounded-control border border-line bg-surface px-3 text-ink outline-none focus-visible:border-danger" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep my records</Button>
            <Button className="bg-danger bg-none text-white" disabled={typed !== "DELETE" || busy} onClick={() => void doDelete()}>Delete permanently</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pendingBackup !== null} onOpenChange={(o) => !o && setPendingBackup(null)}>
        <DialogContent title={b ? "Restore this backup?" : "Could not read the file"} description={pendingBackup && !pendingBackup.ok ? pendingBackup.error : undefined}>
          {b && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface-alt p-3.5">
                <div className="t-body flex items-center gap-2 font-medium text-ink"><FileText className="size-4 text-accent" aria-hidden />What is in this file</div>
                <ul className="t-body mt-1.5 space-y-0.5 text-ink">
                  <li>{plural(b.counts.periods, "period")}</li>
                  <li>{plural(b.counts.logs, "daily log")}</li>
                  <li>{plural(b.counts.journal, "journal entry").replace("entrys", "entries")}</li>
                  <li>{plural(b.counts.reminders, "reminder")}</li>
                </ul>
                <p className="t-small mt-2 text-muted">
                  {b.exportedAt ? `Created ${new Date(b.exportedAt).toLocaleString()}` : "Creation date not recorded"}{b.appVersion ? ` · app version ${b.appVersion}` : ""}
                  {b.legacy ? " · older export (records only)" : ""}
                </p>
              </div>
              {b.countsMismatch && <p role="alert" className="t-small rounded-xl border border-warning/50 bg-warning/10 px-3 py-2 text-ink">The numbers stored inside this file do not match what could be read from it. It may have been edited or cut short. Check the counts above before continuing.</p>}
              <fieldset>
                <legend className="t-small mb-2 text-muted">How should it be added?</legend>
                <div role="radiogroup" aria-label="Restore mode" className="space-y-2">
                  {([["merge", "Merge with my current records", "Keeps everything you have and adds what is missing. Where both have the same day, the more recent edit wins. Recommended."], ["replace", "Replace my current records", "Removes what is on this computer and uses only the backup."]] as const).map(([v, title, desc]) => (
                    <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)}
                      className={cn("flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors", mode === v ? "border-accent bg-accent-soft/50" : "border-line hover:border-accent/40")}>
                      <span aria-hidden className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", mode === v ? "border-accent bg-accent text-accent-contrast" : "border-line")}>{mode === v && <Check className="size-3" />}</span>
                      <span><span className="t-body block font-medium text-ink">{title}</span><span className="t-small block text-muted">{desc}</span></span>
                    </button>
                  ))}
                </div>
              </fieldset>
              {mode === "replace" && <p role="alert" className="t-small rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-ink">This overwrites the {plural(Object.keys(data.logs).length, "daily log")} and {plural(data.periods.length, "period")} currently on this computer. Create a backup first if you might want them.</p>}
              {(b.appearance || b.notifications || b.userName) && (
                <label className="t-body flex items-center gap-3 text-ink">
                  <Switch checked={alsoSettings} onCheckedChange={setAlsoSettings} aria-label="Also restore my name and settings" />
                  Also restore my name and settings
                </label>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPendingBackup(null)}>Cancel</Button>
                <Button className={mode === "replace" ? "bg-danger bg-none text-white" : undefined} onClick={applyBackup}>{mode === "replace" ? "Replace my records" : "Merge backup"}</Button>
              </div>
            </div>
          )}
          {!b && <div className="flex justify-end"><Button variant="ghost" onClick={() => setPendingBackup(null)}>Close</Button></div>}
        </DialogContent>
      </Dialog>

      <Dialog open={pendingAppearance !== null} onOpenChange={(o) => !o && setPendingAppearance(null)}>
        <DialogContent title={pendingAppearance && pendingAppearance.ok ? "Replace your appearance?" : "Could not import"} description={pendingAppearance && pendingAppearance.ok ? "Your current themes, colours, fonts and layout will be replaced by the contents of this file. Your records are not affected." : pendingAppearance && !pendingAppearance.ok ? pendingAppearance.error : undefined}>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setPendingAppearance(null)}>{pendingAppearance?.ok ? "Cancel" : "Close"}</Button>
            {pendingAppearance?.ok && <Button onClick={() => { replaceAll({ ...pendingAppearance.data, background: { ...pendingAppearance.data.background, hasImage: useAppearance.getState().background.hasImage } }); bump(); setPendingAppearance(null); toast.success("Appearance imported."); }}>Replace</Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------------------------------------------------------- About */

const PHONE_DISPLAY = "+91 8276035378";
const CONTACTS = {
  instagram: { name: "Instagram", handle: "@i.have.lost.it.all", url: "https://instagram.com/i.have.lost.it.all" },
  telegram: { name: "Telegram", handle: "@i_am_the_last_passenger", url: "https://t.me/i_am_the_last_passenger" },
} as const;
const DISCORD = { username: "3.11.17", display: "Last Wayferer" };

/** Opens a developer link in the default browser through the app's allow-listed command (never inside the app window). */
async function openLink(url: string): Promise<void> {
  try {
    if (isNative()) await invokeNative("open_external", { url });
    else window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    toast.error("The link could not be opened. You can copy it instead.");
  }
}

async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  } catch {
    toast.error(`Could not copy ${what.toLowerCase()}.`);
  }
}

function ContactRow({ icon, label, value, actions }: { icon: React.ReactNode; label: string; value: React.ReactNode; actions: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-surface">{icon}</span>
      <div className="min-w-0 flex-1 leading-snug">
        <div className="t-small text-muted">{label}</div>
        <div className="t-body break-words text-ink">{value}</div>
      </div>
      <div className="flex shrink-0 gap-1.5">{actions}</div>
    </li>
  );
}

export function AboutSection() {
  const [platform, setPlatform] = useState<string>("");
  useEffect(() => { getAppInfo().then((i) => setPlatform(i.platform)).catch(() => {}); }, []);
  return (
    <div className="space-y-7">
      <div>
        <div className="font-display t-title text-ink">{APP_NAME}</div>
        <div className="t-body text-muted">Version {APP_VERSION}{platform ? ` · ${platform}` : ""}</div>
        <p className="t-small mt-3 max-w-prose leading-relaxed text-muted">A private, local-first cycle tracker. It is a personal recording tool, not a medical device. Estimates are never certainties and must not be used as contraception or to diagnose anything.</p>
      </div>

      <section aria-labelledby="dev-title" className="rounded-card border border-line bg-surface-alt/60 p-5">
        <h3 id="dev-title" className="font-display t-title flex flex-wrap items-center gap-2 text-ink">
          <Heart className="size-5 text-accent" aria-hidden />Made by <span className="text-accent">Bubu</span> for <span className="text-accent">Panda Moma</span>
        </h3>
        <figure className="mt-4">
          <img
            src={developerPhoto} alt="A giant panda mother sitting in the snow with her cub" width={640} height={401} draggable={false}
            className="block h-auto w-full max-w-[360px] border border-accent/40 object-cover shadow-soft"
            style={{ borderRadius: "var(--radius-card)" }}
          />
        </figure>

        <h4 className="font-display t-body mt-6 text-ink">How to reach the developer</h4>
        <ul className="mt-1 divide-y divide-line" aria-label="Developer contact">
          <ContactRow
            icon={<Phone className="size-5 text-accent" aria-hidden />} label="Phone" value={PHONE_DISPLAY}
            actions={<Button size="sm" variant="ghost" onClick={() => void copyText(PHONE_DISPLAY, "Phone number")} aria-label="Copy phone number"><Copy className="size-4" />Copy</Button>}
          />
          {(["instagram", "telegram"] as const).map((k) => (
            <ContactRow
              key={k} icon={<BrandIcon brand={k} size={24} />} label={CONTACTS[k].name}
              value={<button type="button" onClick={() => void openLink(CONTACTS[k].url)} aria-label={`Open ${CONTACTS[k].name} in your browser: ${CONTACTS[k].url.replace("https://", "")}`} className="rounded text-left underline decoration-accent/50 underline-offset-2 hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">{CONTACTS[k].url.replace("https://", "")}</button>}
              actions={<>
                <Button size="sm" variant="ghost" onClick={() => void copyText(CONTACTS[k].url, `${CONTACTS[k].name} link`)} aria-label={`Copy ${CONTACTS[k].name} link`}><Copy className="size-4" /></Button>
                <Button size="sm" variant="soft" onClick={() => void openLink(CONTACTS[k].url)}>Open</Button>
              </>}
            />
          ))}
          <ContactRow
            icon={<BrandIcon brand="discord" size={24} />} label="Discord"
            value={<>Username <strong className="font-semibold">{DISCORD.username}</strong> <span className="text-muted">(display name: {DISCORD.display})</span></>}
            actions={<Button size="sm" variant="ghost" onClick={() => void copyText(DISCORD.username, "Discord username")} aria-label="Copy Discord username"><Copy className="size-4" />Copy</Button>}
          />
        </ul>
        <p className="t-small mt-2 text-muted">Links open in your own browser; the app itself never goes online.</p>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
        <Smartphone className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
        <div>
          <div className="t-body font-medium text-ink">Android version coming soon</div>
          <p className="t-small mt-0.5 leading-relaxed text-muted">An Android app (APK) is planned. It will use the same private, on-device approach, with Android Keystore protecting your records. There is no release date yet.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Update log */

export function UpdateLogSection() {
  return (
    <ol className="space-y-5" aria-label="Update log">
      {CHANGELOG.map((e) => (
        <li key={e.version} className="rounded-2xl border border-line bg-surface p-4">
          <div className="t-body font-medium text-ink">v{e.version} · {e.title}{e.version === APP_VERSION && <span className="t-small ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-ink">Current</span>}</div>
          {([["New", e.added], ["Improved", e.improved], ["Fixed", e.fixed], ["Not finished yet", e.incomplete]] as const).map(([h, items]) => items && (
            <div key={h} className="mt-2.5">
              <div className="t-label text-muted">{h}</div>
              <ul className="t-small mt-1 list-disc space-y-1 pl-5 leading-relaxed text-ink">{items.map((i) => <li key={i}>{i}</li>)}</ul>
            </div>
          ))}
        </li>
      ))}
    </ol>
  );
}

/* ---------------------------------------------------------------- Reset */

export function ResetSection() {
  const resetAll = useAppearance((s) => s.resetAll);
  const bump = useBackgroundVersion((s) => s.bump);
  const [confirm, setConfirm] = useState(false);
  const [alsoImage, setAlsoImage] = useState(false);
  const run = async () => {
    try {
      if (alsoImage) { await clearBackground(); useAppearance.getState().patch("background", { hasImage: false }); bump(); }
      const name = useAppearance.getState().userName;
      resetAll();
      useAppearance.getState().set("userName", name); // your name is not an appearance choice
      setConfirm(false);
      toast.success("Appearance preferences were reset to their defaults.");
    } catch {
      toast.error("Some preferences could not be reset.");
    }
  };
  return (
    <div>
      <SettingRow title="Reset appearance preferences" description="Restores themes, colours, fonts, animation, window, clock and logo choices to the defaults. Your name, records and notes are not touched.">
        <Button size="sm" variant="soft" onClick={() => setConfirm(true)}><RotateCcw className="size-4" />Reset preferences</Button>
      </SettingRow>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent title="Reset all appearance preferences?" description="This cannot be undone, but you can export your appearance first from the Your data section.">
          <label className="t-body mb-4 flex items-center gap-2 text-ink"><input type="checkbox" checked={alsoImage} onChange={(e) => setAlsoImage(e.target.checked)} className="size-4 accent-[var(--c-accent)]" />Also remove my background image</label>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={() => void run()}>Reset</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
