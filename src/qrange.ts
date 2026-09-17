/**
 * EQ-SANS Q-range arithmetic.
 *
 * A port of `cw-do/eqsans-agent-for-ndesk` `qrange.py`, which is itself a port
 * of ESAC v2's `services/qrange_calculator.py` and matches the real Q-Range
 * Planner IOC formulas. It must keep producing the same numbers: a scientist
 * planning beam time from this app and one planning from the instrument's own
 * planner have to agree, and a Q-range that is quietly 10% off is worse than no
 * Q-range at all.
 *
 * Kept numerically identical to the original, including the beam-diameter quirk
 * noted below. Fidelity beats tidiness here.
 */

import type { QRangeConfig } from './savConfigs';

/** Moderator-to-sample distance, metres. */
const L1 = 14.122;
const DETECTOR_SIZE = 1056.0; // mm
const SLIT1_DISTANCE = 10080.0; // mm
const SLIT2_DISTANCE = 11156.0; // mm
const SLIT3_DISTANCE = 12150.0; // mm
const SLIT4_DISTANCE = 14122.0; // mm
const BEAMSTOP_SIZES = [30.0, 60.0, 90.0]; // mm
const SLIT1_DIAMETERS = [NaN, 5.0, 10.0, 15.0, 20.0, 25.0, 10.0, 25.0, 26.0]; // mm
const SLIT23_DIAMETERS = [NaN, 0.0, 5.0, 10.0, 15.0, 20.0, 25.0, 20.0, 25.0]; // mm
const FREQ_OPTIONS = [30.0, 60.0]; // Hz
const TOF_CONST = 0.0039560346;

/**
 * Empirical correction for QMinPractical.
 *
 * QMin is an idealised value from the beamstop's physical size alone. Achieved
 * QMin in reduced data runs measurably higher, from two effects the idealised
 * calculation does not model: some detector-pixel clearance is masked beyond the
 * beamstop disk itself, and the last stretch of TOF at the long-wavelength frame
 * edge is discarded. Fitted against a couple of observed reduced-data QMin
 * values; not first-principles, and because those configs share an SDD and
 * beamstop a single pair of constants cannot reconcile both at once. Treat
 * QMinPractical as an estimate, not an authority — and say so when reporting it.
 */
const PRACTICAL_BEAMSTOP_PADDING_MM = 10.0;
const PRACTICAL_TOF_TRIM_US = 2000.0;

export interface QRangeResult {
  WLMin: number;
  WLMax: number;
  QMin: number;
  QMaxEdge: number;
  QMaxCorner: number;
  TOFMin: number;
  TOFMax: number;
  QMinPractical: number;
  BeamDia: number;
  /** Present only for 30 Hz configurations, which see a second frame. */
  WL2Min?: number;
  WL2Max?: number;
  QMin2?: number;
  QMax2Edge?: number;
  QMax2Corner?: number;
}

function practicalQMin(beamstopMm: number, sddMm: number, sddM: number, tofMaxUs: number): number {
  const radiusMm = beamstopMm / 2.0 + PRACTICAL_BEAMSTOP_PADDING_MM;
  const tofMaxPractical = tofMaxUs - PRACTICAL_TOF_TRIM_US;
  const wlMaxPractical = (tofMaxPractical * TOF_CONST) / (L1 + sddM);
  return (4.0 * Math.PI * Math.sin(Math.atan2(radiusMm, sddMm) / 2.0)) / wlMaxPractical;
}

export function calculateQRange(params: Record<string, number>): QRangeResult {
  const get = (k: string) => params[k] ?? 0;

  const beamstop = BEAMSTOP_SIZES[Math.trunc(get('BSforQ'))] ?? BEAMSTOP_SIZES[0];
  const s1sDia = SLIT1_DIAMETERS[Math.trunc(get('S1s'))] ?? NaN;
  const s2sDia = SLIT23_DIAMETERS[Math.trunc(get('S2s'))] ?? NaN;
  const s3sDia = SLIT23_DIAMETERS[Math.trunc(get('S3s'))] ?? NaN;
  const s4Dia = get('S4');
  const sddMm = get('SampleDetDistance');
  const sddM = sddMm / 1000.0;
  const wlMin = get('WLMin');
  const freq = FREQ_OPTIONS[Math.trunc(get('Freq'))] ?? FREQ_OPTIONS[0];
  const cornerR = Math.sqrt(2.0 * (DETECTOR_SIZE / 2.0) ** 2);

  const results = {} as QRangeResult;

  if (freq === 60) {
    // One frame.
    const tofMin = (wlMin * (L1 + sddM)) / TOF_CONST;
    const frame = (1.0 / freq) * 1_000_000.0;
    const tofMax = tofMin + frame;
    const wlMax = (tofMax * TOF_CONST) / (L1 + sddM);

    results.WLMin = wlMin;
    results.WLMax = wlMax;
    results.QMin = (4.0 * Math.PI * Math.sin(Math.atan2(beamstop / 2.0, sddMm) / 2.0)) / wlMax;
    results.QMaxEdge =
      (4.0 * Math.PI * Math.sin(Math.atan2(DETECTOR_SIZE / 2.0, sddMm) / 2.0)) / wlMin;
    results.QMaxCorner = (4.0 * Math.PI * Math.sin(Math.atan2(cornerR, sddMm) / 2.0)) / wlMin;
    results.TOFMin = tofMin;
    results.TOFMax = tofMax;
    results.QMinPractical = practicalQMin(beamstop, sddMm, sddM, tofMax);
  } else {
    // 30 Hz: two frames reach the detector.
    const frame60 = (1.0 / 60) * 1_000_000.0;

    const tofMinF1 = (wlMin * (L1 + sddM)) / TOF_CONST;
    const tofMaxF1 = tofMinF1 + frame60;
    const wlMaxF1 = (tofMaxF1 * TOF_CONST) / (L1 + sddM);

    const tofMinF2 = tofMaxF1 + frame60;
    const wlMinF2 = (tofMinF2 * TOF_CONST) / (L1 + sddM);
    const tofMaxF2 = tofMinF2 + frame60;
    const wlMaxF2 = (tofMaxF2 * TOF_CONST) / (L1 + sddM);

    results.WLMin = wlMin;
    results.WLMax = wlMaxF1;
    results.QMin = (4.0 * Math.PI * Math.sin(Math.atan2(beamstop / 2.0, sddMm) / 2.0)) / wlMaxF1;
    results.QMaxEdge =
      (4.0 * Math.PI * Math.sin(Math.atan2(DETECTOR_SIZE / 2.0, sddMm) / 2.0)) / wlMin;
    results.QMaxCorner = (4.0 * Math.PI * Math.sin(Math.atan2(cornerR, sddMm) / 2.0)) / wlMin;
    results.WL2Min = wlMinF2;
    results.WL2Max = wlMaxF2;
    results.QMin2 = (4.0 * Math.PI * Math.sin(Math.atan2(beamstop / 2.0, sddMm) / 2.0)) / wlMaxF2;
    results.QMax2Edge =
      (4.0 * Math.PI * Math.sin(Math.atan2(DETECTOR_SIZE / 2.0, sddMm) / 2.0)) / wlMinF2;
    results.QMax2Corner = (4.0 * Math.PI * Math.sin(Math.atan2(cornerR, sddMm) / 2.0)) / wlMinF2;
    results.TOFMin = tofMinF1;
    results.TOFMax = tofMinF2;
    // Frame 2 reaches the longer wavelength, so its edge is the true floor.
    results.QMinPractical = practicalQMin(beamstop, sddMm, sddM, tofMaxF2);
  }

  // Beam diameter, matching the original exactly — including the quirk that
  // S2s/S3s can only ever *shrink* the value below what S1s set. If S1s did not
  // set it, beam_dia stays 0 and the `>` guards never fire, so S2s/S3s alone
  // never set it at all. Reproduced rather than fixed: the instrument's own
  // planner behaves this way, and diverging would be the real bug.
  let beamDia = 0.0;
  if (!Number.isNaN(s1sDia) && s1sDia > 0) {
    beamDia = ((s1sDia + s4Dia) / (SLIT4_DISTANCE - SLIT1_DISTANCE)) * sddMm + s4Dia;
  }
  if (!Number.isNaN(s2sDia) && s2sDia > 0) {
    const d2 = ((s2sDia + s4Dia) / (SLIT4_DISTANCE - SLIT2_DISTANCE)) * sddMm + s4Dia;
    if (beamDia > d2) beamDia = d2;
  }
  if (!Number.isNaN(s3sDia) && s3sDia > 0) {
    const d3 = ((s3sDia + s4Dia) / (SLIT4_DISTANCE - SLIT3_DISTANCE)) * sddMm + s4Dia;
    if (beamDia > d3) beamDia = d3;
  }
  results.BeamDia = beamDia;

  return results;
}

/**
 * Name lookup over one set of configurations.
 *
 * Built once per pack from the parsed `.sav` files. Q-range is always read off
 * the scattering member of a pair — the transmission `.sav` files carry no
 * slit settings at all — so `resolveConfig` tries the exact name first and
 * then `<name>_scatt`.
 */
export function createQRange(configs: readonly QRangeConfig[]) {
  const index = new Map(configs.map((c) => [c.name, c]));

  /** Every configuration name, `.sav` stripped, in bundle order. */
  const listConfigs = (): string[] => configs.map((c) => c.name);

  const loadConfig = (name: string): QRangeConfig | null => index.get(name) ?? null;

  const resolveConfig = (name: string): { name: string; config: QRangeConfig } | null => {
    const exact = loadConfig(name);
    if (exact) return { name, config: exact };
    if (!name.endsWith('_scatt') && !name.endsWith('_trans')) {
      const scatt = loadConfig(`${name}_scatt`);
      if (scatt) return { name: `${name}_scatt`, config: scatt };
    }
    return null;
  };

  const getQRange = (name: string): QRangeResult | null => {
    const resolved = resolveConfig(name);
    return resolved ? calculateQRange(resolved.config.params) : null;
  };

  return { listConfigs, loadConfig, resolveConfig, getQRange };
}

export type QRange = ReturnType<typeof createQRange>;
