/**
 * EQ-SANS Q-range planner configurations, parsed from the pack's `.sav` files.
 *
 * Each file under `data/qrange-configs/` is a `BL6:CS:QPlan:<key> <value>`
 * autosave dump from the OPI computer. Only the keys the Q-range arithmetic
 * reads are kept; the rest is instrument bookkeeping.
 *
 * The app hands the pack its data files verbatim; this is where they become
 * numbers. The format is EQ-SANS's own, which is why the parser lives in the
 * pack and not in the app.
 */

export interface QRangeConfig {
  name: string;
  /** Only the keys the Q-range arithmetic reads. */
  params: Record<string, number>;
}

const DATA_PREFIX = 'qrange-configs/';
const KEY_PREFIX = 'BL6:CS:QPlan:';
const QRANGE_KEYS = ['SampleDetDistance', 'WLMin', 'Freq', 'BSforQ', 'S1s', 'S2s', 'S3s', 'S4'];

export function parseSavConfigs(data: Readonly<Record<string, string>>): QRangeConfig[] {
  const out: QRangeConfig[] = [];
  for (const key of Object.keys(data).sort()) {
    if (!key.startsWith(DATA_PREFIX) || !key.toLowerCase().endsWith('.sav')) continue;
    const file = key.slice(DATA_PREFIX.length);
    if (file.includes('/')) continue;
    const params: Record<string, number> = {};
    for (const raw of data[key].split('\n')) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith('<') || !line.includes(' ')) continue;
      const idx = line.indexOf(' ');
      const k = line.slice(0, idx).replace(KEY_PREFIX, '');
      if (!QRANGE_KEYS.includes(k)) continue;
      const value = line.slice(idx + 1).trim();
      const n = Number(value);
      if (value !== '' && Number.isFinite(n)) params[k] = n;
    }
    if (Object.keys(params).length > 0) out.push({ name: file.replace(/\.sav$/i, ''), params });
  }
  return out;
}
