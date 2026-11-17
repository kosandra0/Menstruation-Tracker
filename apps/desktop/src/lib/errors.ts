import type { AppErrorCode, AppErrorPayload } from "@mt/shared-types";

/** Typed application error. Messages must never contain health data. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

function isPayload(value: unknown): value is AppErrorPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as AppErrorPayload).code === "string" &&
    typeof (value as AppErrorPayload).message === "string"
  );
}

/** Normalises anything thrown (including Tauri command rejections) into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (isPayload(error)) return new AppError(error.code, error.message);
  return new AppError("internal", "An unexpected error occurred.");
}
