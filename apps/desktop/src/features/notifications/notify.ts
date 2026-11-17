import { create } from "zustand";
import { newId } from "../../stores/records";
import { useAppearance } from "../../stores/appearance";
import { useNotifications, type NotificationCategory, type ToastLook } from "../../stores/notifications";
import { useRecords } from "../../stores/records";
import { invokeNative, isNative } from "../../services/native";
import { describeNotification, DISCREET_TEXT, type TextOptions } from "./templates";
import type { ToastPayload } from "./ToastStack";

/** Browser/test fallback: popups are drawn inside the app window instead of the native popup window. */
export const useToastFeed = create<{ items: ToastPayload[]; push: (p: ToastPayload) => void; dismiss: (id: string) => void }>((set) => ({
  items: [],
  push: (p) => set((s) => ({ items: [...s.items.filter((x) => x.id !== p.id), p].slice(-p.look.maxVisible) })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export interface NotifyInput extends TextOptions {
  category: NotificationCategory;
  /** Reminder id, kept in the history so the label can be looked up in the encrypted records. */
  ref?: string;
  /** A preview shown from Settings: always shown, never added to the history. */
  preview?: boolean;
  /** Override the look (used by the settings preview to show unsaved choices). */
  look?: ToastLook;
}

/** Builds the popup payload. Pure apart from reading the stores. */
export function buildPayload(input: NotifyInput): ToastPayload {
  const { settings } = useNotifications.getState();
  const { neutralNotifications, userName } = useAppearance.getState();
  const text = describeNotification(input.category, { ...input, name: input.name ?? (userName || undefined) });
  const shown = neutralNotifications && input.category !== "system" ? { ...DISCREET_TEXT, route: text.route } : text;
  return {
    id: newId(),
    category: input.category,
    title: shown.title,
    body: shown.body,
    route: shown.route,
    look: input.look ?? settings,
    at: new Date().toISOString(),
  };
}

/**
 * Shows a notification in the app's own popup (never a Windows toast) and records it in the in-app history.
 * Returns false when notifications are switched off or the popup could not be shown.
 */
export async function notify(input: NotifyInput): Promise<boolean> {
  const { settings } = useNotifications.getState();
  if (!settings.enabled && !input.preview) return false;
  const payload = buildPayload(input);
  if (!input.preview) useNotifications.getState().add({ id: payload.id, category: input.category, at: payload.at, ref: input.ref });
  try {
    if (isNative()) await invokeNative("toast_show", { payload: JSON.stringify(payload), corner: payload.look.corner });
    else useToastFeed.getState().push(payload);
    return true;
  } catch (e) {
    console.warn("[notifications] popup could not be shown", (e as { code?: string })?.code);
    return false;
  }
}

/** Label of a user-made reminder, read from the encrypted records at display time. */
export function reminderLabel(id: string | undefined): string | undefined {
  return id ? useRecords.getState().data.reminders.find((r) => r.id === id)?.label : undefined;
}
