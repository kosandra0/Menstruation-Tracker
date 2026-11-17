/** Symptom taxonomy placeholder: stable ids only; labels live in the presentation layer. */
export const SYMPTOM_CATEGORIES = ["flow", "pain", "mood", "energy", "sleep", "digestion", "skin", "other"] as const;
export type SymptomCategory = (typeof SYMPTOM_CATEGORIES)[number];

export interface SymptomEntry {
  id: string;
  date: string;
  category: SymptomCategory;
  /** 0 = none … 4 = severe */
  severity: 0 | 1 | 2 | 3 | 4;
}
