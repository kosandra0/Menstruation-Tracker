import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Download, Plus, Search, Trash2 } from "lucide-react";
import { cn } from "@mt/ui";
import { isIsoDate, todayIso, type IsoDate, type JournalEntry } from "@mt/domain";
import { PageHeader } from "../../components/common/PageHeader";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/controls";
import { Dialog, DialogContent } from "../../components/ui/Dialog";
import { EmptyState, StorageBanner, toast } from "../../components/common/feedback";
import { newId, useRecords } from "../../stores/records";
import { downloadText, fmtLong, fmtShort } from "../../lib/format";

const CATEGORIES = ["General", "Symptoms", "Mood", "Appointments", "Medication", "Questions"];
const AUTOSAVE_MS = 800;

type SaveState = "idle" | "dirty" | "saved";

export function JournalPage() {
  const journal = useRecords((s) => s.data.journal);
  const ready = useRecords((s) => s.loadStatus === "ready");
  const { upsertJournal, deleteJournal } = useRecords.getState();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JournalEntry | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tagText, setTagText] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const draftRef = useRef<JournalEntry | null>(null);
  const dirtyRef = useRef(false);
  draftRef.current = draft;

  const commit = useCallback(() => {
    window.clearTimeout(timer.current);
    const d = draftRef.current;
    if (d && dirtyRef.current && ready) {
      upsertJournal(d);
      dirtyRef.current = false;
      setSaveState("saved");
    }
  }, [ready, upsertJournal]);

  // Never lose edits: flush when leaving the page or closing the window.
  useEffect(() => {
    const onHide = () => commit();
    window.addEventListener("beforeunload", onHide);
    return () => { window.removeEventListener("beforeunload", onHide); commit(); };
  }, [commit]);

  const edit = (patch: Partial<JournalEntry>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
    dirtyRef.current = true;
    setSaveState("dirty");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(commit, AUTOSAVE_MS);
  };

  const open = (id: string) => {
    commit();
    const e = useRecords.getState().data.journal.find((j) => j.id === id);
    if (!e) return;
    setSelectedId(id);
    setDraft({ ...e });
    setSaveState("idle");
    dirtyRef.current = false;
  };

  const create = () => {
    commit();
    if (!ready) return toast.error("Your records are not available yet.");
    const e: JournalEntry = { id: newId(), date: todayIso(), title: "", body: "", category: "General", tags: [], updatedAt: "" };
    upsertJournal(e);
    setSelectedId(e.id);
    setDraft(e);
    setSaveState("idle");
    dirtyRef.current = false;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); commit(); toast.success("Note saved."); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") { e.preventDefault(); create(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const allTags = useMemo(() => [...new Set(journal.flatMap((j) => j.tags))].sort(), [journal]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...journal]
      .filter((j) => (!q || j.title.toLowerCase().includes(q) || j.body.toLowerCase().includes(q) || j.tags.some((t) => t.toLowerCase().includes(q)))
        && (!category || j.category === category) && (!tagFilter || j.tags.includes(tagFilter))
        && (!from || j.date >= from) && (!to || j.date <= to))
      .sort((a, b) => (a.date === b.date ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.date < b.date ? 1 : -1));
  }, [journal, query, category, tagFilter, from, to]);

  const addTag = () => {
    const t = tagText.trim().toLowerCase().slice(0, 24);
    if (t && draft && !draft.tags.includes(t)) edit({ tags: [...draft.tags, t].slice(0, 12) });
    setTagText("");
  };

  const exportAll = () => {
    const text = [...journal].sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((j) => `# ${j.title || "Untitled"}\n${j.date} · ${j.category}${j.tags.length ? ` · ${j.tags.map((t) => `#${t}`).join(" ")}` : ""}\n\n${j.body}\n`).join("\n---\n\n");
    downloadText("health-journal.md", text, "text/markdown");
    toast.info("Exported. This file is not encrypted; keep it somewhere safe.");
  };

  return (
    <div>
      <PageHeader
        title="Health Journal" description="Private notes for symptoms, appointments and anything you want to remember."
        actions={<div className="flex gap-2">
          {journal.length > 0 && <Button variant="ghost" size="sm" onClick={exportAll}><Download className="size-4" />Export notes</Button>}
          <Button size="sm" onClick={create}><Plus className="size-4" />New note</Button>
        </div>}
      />
      <StorageBanner />

      {journal.length === 0 && !draft ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="Your journal is empty" action={<Button onClick={create}><Plus className="size-4" />Write your first note</Button>}>
          Notes are saved automatically and stay encrypted on this device. Press Ctrl+N any time to start a new one.
        </EmptyState>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section aria-label="Notes list" className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" aria-label="Search notes" className="t-body h-10 w-full rounded-control border border-line bg-surface pl-9 pr-3 text-ink outline-none focus-visible:border-accent" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Select aria-label="Filter by tag" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
                <option value="">All tags</option>{allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
              </Select>
              <input type="date" aria-label="From date" value={from} onChange={(e) => setFrom(e.target.value)} className="t-small h-10 rounded-control border border-line bg-surface px-2 text-ink" />
              <input type="date" aria-label="To date" value={to} onChange={(e) => setTo(e.target.value)} className="t-small h-10 rounded-control border border-line bg-surface px-2 text-ink" />
            </div>
            <ul className="max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
              {filtered.map((j) => (
                <li key={j.id}>
                  <button type="button" onClick={() => open(j.id)} aria-current={selectedId === j.id}
                    className={cn("w-full rounded-xl border px-3.5 py-2.5 text-left transition-colors", selectedId === j.id ? "border-accent/50 bg-accent-soft" : "border-line bg-surface hover:border-accent/30")}>
                    <div className="t-body truncate font-medium text-ink">{j.title || "Untitled note"}</div>
                    <div className="t-small mt-0.5 flex items-center gap-2 text-muted"><span>{fmtShort(j.date)}</span><span>·</span><span>{j.category}</span></div>
                    {j.body && <p className="t-small mt-1 line-clamp-1 text-muted">{j.body}</p>}
                  </button>
                </li>
              ))}
              {filtered.length === 0 && <li className="t-body px-1 py-6 text-center text-muted">No notes match your filters.</li>}
            </ul>
          </section>

          <section aria-label="Note editor" className="rounded-card border border-line bg-surface p-5 shadow-soft">
            {!draft ? (
              <p className="t-body py-16 text-center text-muted">Choose a note, or start a new one.</p>
            ) : (
              <div className="space-y-4">
                <input
                  value={draft.title} onChange={(e) => edit({ title: e.target.value.slice(0, 120) })} placeholder="Title" aria-label="Title"
                  className="font-display t-title w-full border-b border-line bg-transparent pb-2 text-[1.35rem] text-ink outline-none focus-visible:border-accent"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input type="date" aria-label="Note date" value={draft.date} max={todayIso()} onChange={(e) => isIsoDate(e.target.value) && edit({ date: e.target.value as IsoDate })} className="t-small h-9 rounded-control border border-line bg-surface px-2 text-ink" />
                  <Select aria-label="Category" className="h-9" value={draft.category} onChange={(e) => edit({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
                  <span className="t-small ml-auto text-muted" aria-live="polite">{saveState === "dirty" ? "Saving…" : saveState === "saved" ? "Saved" : fmtLong(draft.date)}</span>
                </div>
                <textarea
                  value={draft.body} onChange={(e) => edit({ body: e.target.value })} rows={14} maxLength={50000} aria-label="Note text" placeholder="Write freely. Line breaks are kept exactly as typed."
                  className="t-body w-full resize-y whitespace-pre-wrap rounded-control border border-line bg-surface p-3 leading-relaxed text-ink outline-none focus-visible:border-accent"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {draft.tags.map((t) => (
                    <span key={t} className="t-small inline-flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3 pr-1.5 text-ink">#{t}
                      <button type="button" aria-label={`Remove tag ${t}`} onClick={() => edit({ tags: draft.tags.filter((x) => x !== t) })} className="rounded-full px-1 hover:bg-surface/60">×</button>
                    </span>
                  ))}
                  <input type="text" value={tagText} onChange={(e) => setTagText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} onBlur={addTag}
                    placeholder="Add tag" aria-label="Add tag" className="t-small h-8 w-28 rounded-control border border-line bg-surface px-2.5 text-ink outline-none focus-visible:border-accent" />
                  <Button variant="ghost" size="sm" className="ml-auto text-danger" onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" />Delete</Button>
                </div>
                <p className="t-small text-muted">Saves automatically. Ctrl+S saves now, Ctrl+N starts a new note.</p>
              </div>
            )}
          </section>
        </div>
      )}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent title="Delete this note?" description="It will be removed from this device and cannot be recovered.">
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Keep it</Button>
            <Button className="bg-danger bg-none text-white" onClick={() => {
              if (draft) { window.clearTimeout(timer.current); dirtyRef.current = false; deleteJournal(draft.id); }
              setDraft(null); setSelectedId(null); setConfirmDelete(false); toast.info("Note deleted.");
            }}>Delete note</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
