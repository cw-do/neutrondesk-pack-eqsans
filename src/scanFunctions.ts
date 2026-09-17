/**
 * Scan-function reference lookup.
 *
 * A port of `cw-do/eqsans-agent-for-ndesk` `scanfunctions.py`, which found that
 * generic chunk-and-embed retrieval is a poor fit for one large file of short
 * function definitions: splitting mid-function loses the signature, and vector
 * similarity on "control peltier" does not reliably surface `setpeltier1temp`.
 *
 * So the file is parsed into whole named functions at build time (the app's
 * pack loader splits `agent/scan-functions.txt` at every top-level `def`) and
 * matched here by exact name or keyword. A question about a function gets that
 * function's real source, not a chunk that happens to overlap it — which
 * matters because the alternative is a model inventing a plausible signature
 * for a command someone then runs at a beamline.
 */

import type { ScanFunction } from 'neutrondesk-pack-api';

/** Lookups over one instrument's functions. Built once per pack. */
export function createScanFunctionIndex(fns: readonly ScanFunction[]) {
  const byName = new Map(fns.map((f) => [f.name.toLowerCase(), f]));

  const listFunctionNames = (): string[] => fns.map((f) => f.name).sort((a, b) => a.localeCompare(b));

  /** Exact, case-insensitive name lookup. */
  const getFunction = (name: string): ScanFunction | null => byName.get(name.trim().toLowerCase()) ?? null;

  /**
   * Keyword search over names and bodies, best first.
   *
   * Scoring mirrors the original: an exact name match dominates, a
   * substring-in-name match comes next, and hits in the body (comments, EPICS PV
   * names) contribute least. Ties break alphabetically so output is stable.
   */
  const searchFunctions = (query: string, limit = 5): ScanFunction[] => {
    const words = (query.toLowerCase().match(/\w+/g) ?? []).filter(Boolean);
    if (words.length === 0) return [];
    const exact = query.trim().toLowerCase();

    const scored: Array<{ score: number; fn: ScanFunction }> = [];
    for (const fn of fns) {
      const lname = fn.name.toLowerCase();
      const lbody = fn.body.toLowerCase();
      let score = 0;
      if (lname === exact) score += 100;
      for (const w of words) if (lname.includes(w)) score += 20;
      for (const w of words) if (lbody.includes(w)) score += 1;
      if (score > 0) scored.push({ score, fn });
    }

    scored.sort((a, b) => b.score - a.score || a.fn.name.localeCompare(b.fn.name));
    return scored.slice(0, limit).map((s) => s.fn);
  };

  return { listFunctionNames, getFunction, searchFunctions };
}

export type ScanFunctionIndex = ReturnType<typeof createScanFunctionIndex>;
