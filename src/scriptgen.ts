/**
 * Deterministic EQ-SANS script generation.
 *
 * A port of `cw-do/eqsans-agent-for-ndesk` `scriptgen.py`, itself ported from
 * ESAC v2's `services/script_builder.py`, following the grammar documented in
 * knowledge modules 2 and 3.
 *
 * This is the reliability upgrade over letting a model write the script: the
 * model only extracts structured arguments from the conversation, and this
 * renders the text. A script that is subtly wrong — a missing empty beam, a
 * transmission block that never ran — costs real beam time, and it is exactly
 * the kind of detail a model drops. Here the defaults are enforced in code:
 * every sample gets transmission *and* scattering, and an empty-beam
 * transmission run is prepended whether or not anyone remembered to ask.
 */

export const RACK_TYPES = ['peltier', 'banjo', 'ti', 'tumbler', 'humid'] as const;
export type RackType = (typeof RACK_TYPES)[number];

/** Typical proton-charge limits, from the module 3 templates. */
export const DEFAULT_TRANS_LIMIT = 0.15;
export const DEFAULT_SCATT_LIMIT = 1.0;

/** Peltier temperatures at or above this need the polysci chiller (module 5). */
export const POLYSCI_GUARD_TEMP = 80;

export interface SampleSpec {
  name: string;
  items: number;
  pos: number;
  rack: RackType | string;
  /**
   * Both default true. A standard EQ-SANS measurement is transmission then
   * scattering for every sample at every configuration — modules 1/2/3/4 all
   * document this as the unconditional default, so it is enforced here rather
   * than left to the caller to remember.
   */
  trans?: boolean;
  scatt?: boolean;
}

export const STANDARD_HEADER = [
  'from epics import caget',
  'from scan import *',
  'import os',
  'import sys',
  "sys.path.append('/home/controls/var/tmp/scripting/dev/')",
  'from eqsans_scanfunctions_live import *',
].join('\n');

/** Strip a trailing `_trans` / `_scatt` to get the base configuration. */
export function configBase(name: string): string {
  if (name.endsWith('_trans')) return name.slice(0, -'_trans'.length);
  if (name.endsWith('_scatt')) return name.slice(0, -'_scatt'.length);
  return name;
}

/** `conf_4000mm_2p5A_60Hz` -> `4m 2.5a`. Falls back to the base name. */
export function configLabel(base: string): string {
  const m = /(\d+)mm_(\d+(?:p\d+)?)A_(\d+)Hz/.exec(base);
  if (!m) return base;
  const distMm = Number(m[1]);
  const dist = distMm % 1000 === 0 ? distMm / 1000 : Math.round((distMm / 1000) * 10) / 10;
  const wlNum = Number(m[2].replace('p', '.'));
  const wlStr = Number.isInteger(wlNum) ? String(wlNum) : String(wlNum);
  return `${dist}m ${wlStr}a`;
}

const LABEL_RE = /^\s*(\d+(?:\.\d+)?)\s*m\s*(\d+(?:\.\d+)?)\s*a(?:\s*(\d+)\s*hz)?\s*$/i;

/** Module 2's convention: 60 Hz unless stated. */
export const DEFAULT_FREQ_HZ = 60;

/**
 * Inverse of {@link configLabel}: `4m 2.5a` -> `conf_4000mm_2p5A_60Hz`.
 *
 * The naming convention is documented and fixed, not site data, so this works
 * identically on and off the beamline. Returns null when the input is not a
 * `<dist>m <wavelength>a[ <freq>hz]` label — e.g. it is already an exact name.
 */
export function labelToConfigBase(label: string): string | null {
  const m = LABEL_RE.exec(label);
  if (!m) return null;
  const distMm = Math.round(Number(m[1]) * 1000);
  const wlNum = Number(m[2]);
  const wlStr = Number.isInteger(wlNum) ? String(wlNum) : String(wlNum).replace('.', 'p');
  const freqHz = m[3] ? Number(m[3]) : DEFAULT_FREQ_HZ;
  return `conf_${distMm}mm_${wlStr}A_${freqHz}Hz`;
}

/**
 * Turn whatever the model passed into a base configuration name.
 *
 * A real configuration from the bundle wins over a synthesised name, since the
 * instrument's actual configs are ground truth. The naming convention is the
 * fallback. Passes through unchanged when neither applies, rather than refusing:
 * a user describing a not-yet-created configuration should still get a script.
 */
export function resolveConfigRef(ref: string, knownBases: string[]): string {
  if (knownBases.length > 0) {
    if (knownBases.includes(ref)) return ref;
    const synthesized = labelToConfigBase(ref);
    if (synthesized && knownBases.includes(synthesized)) return synthesized;
  }
  return labelToConfigBase(ref) ?? ref;
}

/** Format a position or item count without a trailing `.0`. */
function fmtNum(value: number | string): string {
  const f = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(f)) return String(value);
  return Number.isInteger(f) ? String(Math.trunc(f)) : String(f);
}

/**
 * Format a proton-charge limit the way the original does.
 *
 * These are floats in the Python, so an integral one renders as `1.0`, and
 * JavaScript would write `1`. Both run identically at the instrument, but the
 * generated scripts are compared against the original's output — matching it
 * exactly is what keeps that comparison meaningful instead of a list of
 * differences everyone learns to ignore.
 */
function fmtPc(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  return Number.isInteger(value) ? `${value}.0` : String(value);
}

/**
 * Prepend a synthetic `emptybeam` transmission run when transmission is asked
 * for and the caller did not already include one.
 *
 * Every worked example across modules 1–4 opens a transmission block with an
 * empty beam. It is not optional, and it is exactly what gets forgotten — so it
 * is added here in code. Position 1 unless a real sample already occupies it.
 */
export function withEmptyBeam(samples: SampleSpec[]): SampleSpec[] {
  const needsTrans = samples.some((s) => s.trans !== false);
  if (!needsTrans) return samples;
  if (samples.some((s) => s.name.trim().toLowerCase() === 'emptybeam')) return samples;

  const used = new Set(samples.map((s) => s.pos));
  let pos = 1;
  while (used.has(pos)) pos += 1;

  return [
    {
      name: 'emptybeam',
      items: 0,
      pos,
      rack: samples[0]?.rack ?? 'peltier',
      trans: true,
      scatt: false,
    },
    ...samples,
  ];
}

export interface BlockOptions {
  label?: string;
  transLimit?: number;
  scattLimit?: number;
}

/**
 * The transmission-then-scattering block for one configuration.
 *
 * Strictly table-driven: only the supplied samples are emitted. The empty beam
 * is added by {@link withEmptyBeam} before this is called, not here, so a caller
 * that deliberately omits it (a configuration already calibrated earlier in the
 * experiment) can do so.
 */
export function measurementBlock(
  base: string,
  samples: SampleSpec[],
  { label, transLimit = DEFAULT_TRANS_LIMIT, scattLimit = DEFAULT_SCATT_LIMIT }: BlockOptions = {}
): string {
  const lbl = label ?? configLabel(base);
  const transSamples = samples.filter((s) => s.trans !== false);
  const scattSamples = samples.filter((s) => s.scatt !== false);
  const lines: string[] = [];

  if (transSamples.length > 0) {
    lines.push(`# Transmission ${lbl}`);
    lines.push(`loadconf('${base}_trans')`);
    lines.push('openShutter()');
    for (const s of transSamples) {
      lines.push(
        `runsampleid('T-${s.name} ${lbl}', ${fmtNum(s.items)}, ` +
          `'${s.rack}', 'pc', ${fmtNum(s.pos)}, ${fmtPc(transLimit)})`
      );
    }
    lines.push('closeShutter()');
    lines.push('');
  }

  if (scattSamples.length > 0) {
    lines.push(`# Scattering ${lbl}`);
    lines.push(`loadconf('${base}_scatt')`);
    lines.push('openShutter()');
    for (const s of scattSamples) {
      lines.push(
        `runsampleid('S-${s.name} ${lbl}', ${fmtNum(s.items)}, ` +
          `'${s.rack}', 'pc', ${fmtNum(s.pos)}, ${fmtPc(scattLimit)})`
      );
    }
    lines.push('closeShutter()');
    lines.push('');
  }

  return lines.join('\n');
}

export interface SampleScriptInput {
  ipts: number | string;
  /** Base configuration names, already resolved. */
  configs: string[];
  samples: SampleSpec[];
  /** Configurations whose empty beam was measured earlier in the experiment. */
  configsWithoutEmptyBeam?: string[];
  transLimit?: number;
  scattLimit?: number;
}

export function buildSampleScript({
  ipts,
  configs,
  samples,
  configsWithoutEmptyBeam = [],
  transLimit = DEFAULT_TRANS_LIMIT,
  scattLimit = DEFAULT_SCATT_LIMIT,
}: SampleScriptInput): string {
  const skip = new Set(configsWithoutEmptyBeam);
  const withEb = withEmptyBeam(samples);

  const parts = [STANDARD_HEADER, '', `setipts(${fmtNum(ipts)})`, ''];
  for (const base of configs) {
    // Built per configuration rather than from one shared sample list, so a
    // configuration already calibrated earlier does not get a second empty beam
    // while a genuinely new one still does.
    const use = skip.has(base) ? samples : withEb;
    const block = measurementBlock(base, use, { transLimit, scattLimit });
    if (block.trim()) parts.push(block);
  }
  return parts.join('\n').replace(/\s+$/, '') + '\n';
}

export type TemperatureControl = 'peltier1' | 'peltier2' | 'polysci';

export interface TemperatureScriptInput {
  ipts?: number | string | null;
  configs: string[];
  samples: SampleSpec[];
  temps: number[];
  controls?: TemperatureControl[];
  equilDelay?: number;
  /** Temperatures at which transmission is measured too. Default: none. */
  transTemps?: number[];
  transLimit?: number;
  scattLimit?: number;
}

export function buildTemperatureScript({
  ipts,
  configs,
  samples,
  temps,
  controls = ['peltier1', 'peltier2'],
  equilDelay = 600,
  transTemps = [],
  transLimit = DEFAULT_TRANS_LIMIT,
  scattLimit = DEFAULT_SCATT_LIMIT,
}: TemperatureScriptInput): string {
  const num = (v: number) => (Number.isInteger(v) ? Math.trunc(v) : v);
  const labels = configs.map(configLabel).join(', ');

  const parts = [STANDARD_HEADER, ''];
  if (ipts) {
    parts.push(`setipts(${fmtNum(ipts)})`);
    parts.push('');
  }
  parts.push(`# Temperature series (${labels}), control: ${controls.join(', ')}`);
  parts.push(`temp_list = [${temps.map(num).join(', ')}]`);
  parts.push(`trans_temps = [${transTemps.map(num).join(', ')}]`);
  parts.push('');
  parts.push('for T in temp_list:');

  const body: string[] = [];
  const usePeltier = controls.includes('peltier1') || controls.includes('peltier2');
  if (usePeltier && !controls.includes('polysci')) {
    // Module 5's guard. Emitted whenever a peltier is driven without polysci
    // already under explicit control, because the script may reach 80 C on a
    // temperature the author did not think about.
    body.push(`if T >= ${POLYSCI_GUARD_TEMP}:`);
    body.push('    set_polysci_temp(60)');
  }
  if (controls.includes('peltier1')) body.push('setpeltier1temp(T)');
  if (controls.includes('peltier2')) body.push('setpeltier2temp(T)');
  if (controls.includes('polysci')) body.push('set_polysci_temp(T)');
  body.push(`delay(${fmtNum(equilDelay)})`);
  body.push('');

  for (const base of configs) {
    const label = configLabel(base);
    body.push(`# ${label}`);
    body.push('if T in trans_temps:');
    body.push(`    loadconf('${base}_trans')`);
    body.push('    openShutter()');
    for (const s of samples) {
      body.push(
        `    runsampleid(f'T-${s.name} ${label} {T}C', ${fmtNum(s.items)}, ` +
          `'${s.rack}', 'pc', ${fmtNum(s.pos)}, ${fmtPc(transLimit)})`
      );
    }
    body.push('    closeShutter()');
    body.push(`loadconf('${base}_scatt')`);
    body.push('openShutter()');
    for (const s of samples) {
      body.push(
        `runsampleid(f'S-${s.name} ${label} {T}C', ${fmtNum(s.items)}, ` +
          `'${s.rack}', 'pc', ${fmtNum(s.pos)}, ${fmtPc(scattLimit)})`
      );
    }
    body.push('closeShutter()');
    body.push('');
  }

  parts.push(...body.map((line) => (line ? '    ' + line : '')));
  return parts.join('\n').replace(/\s+$/, '') + '\n';
}
