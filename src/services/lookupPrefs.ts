import type { LookupDisplayMode } from "../types";

const KEY = "satie-reader-lookup-ui";

export function loadLookupDisplayMode(): LookupDisplayMode {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "sidebar" || v === "bubble") return v;
  } catch {
    /* ignore */
  }
  return "bubble";
}

export function saveLookupDisplayMode(mode: LookupDisplayMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
}
