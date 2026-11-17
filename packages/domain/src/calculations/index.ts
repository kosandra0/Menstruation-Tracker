/**
 * Every future prediction MUST be expressed as an `Estimate`, never as a bare fact.
 * See docs/ARCHITECTURE.md ("Medical and data integrity principles").
 */
export interface Estimate<T> {
  /** Best estimate. */
  value: T;
  /** Plausible range reflecting recorded cycle variability. */
  range: { earliest: T; latest: T };
  /** Number of recorded cycles the estimate is based on. */
  basedOnCycles: number;
  /** Human-readable explanation of uncertainty, shown next to the value. */
  uncertaintyNote: string;
}

export const ESTIMATE_DISCLAIMER =
  "Estimates are based on your recorded history and may be wrong. This is not medical advice and must not be used as contraception.";
