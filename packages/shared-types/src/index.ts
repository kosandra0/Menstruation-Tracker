/**
 * Cross-boundary data contracts.
 * TypeScript is the documentation source; Rust (`src-tauri/src/error`, `commands`)
 * and Go (`services/go-worker/internal/protocol`) mirror these shapes manually.
 * See docs/GO_SERVICE_PROTOCOL.md and docs/ARCHITECTURE.md.
 */

/** Stable, machine-readable error codes. Never include health data in messages. */
export type AppErrorCode =
  | "not_implemented"
  | "unsupported_platform"
  | "native_unavailable"
  | "storage_locked"
  | "storage_unavailable"
  | "invalid_argument"
  | "internal";

export interface AppErrorPayload {
  code: AppErrorCode;
  message: string;
}

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

export type StorageState = "not_initialized" | "locked" | "ready";

export interface StorageStatus {
  state: StorageState;
  /** True only once SQLCipher + OS key protection are implemented and verified. */
  encrypted: boolean;
  schemaVersion: number | null;
}

/** JSON-lines worker protocol (one JSON object per line). */
export interface WorkerRequest<P = unknown> {
  v: 1;
  id: string;
  method: string;
  params?: P;
}

export interface WorkerResponse<R = unknown> {
  v: 1;
  id: string;
  result?: R;
  error?: AppErrorPayload;
}
