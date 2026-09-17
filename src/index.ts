/**
 * The EQSANS pack's code: what the app calls to get this instrument's tools.
 *
 * The app hands over the pack's own knowledge and the tool-result helpers; the
 * factory builds the six tools over them. Nothing here imports anything outside
 * this folder except types from `neutrondesk-pack-api`, and nothing here can
 * reach a network or the instrument.
 */

import type { PackApi, PackFactory } from 'neutrondesk-pack-api';

import { createQRange } from './qrange';
import { parseSavConfigs } from './savConfigs';
import { createScanFunctionIndex } from './scanFunctions';
import { configBase, resolveConfigRef } from './scriptgen';
import { buildTools } from './tools';

const pack: PackFactory = (api) => ({ tools: buildTools(api) });
export default pack;

/**
 * What pack-check records as this pack's golden output (`checks/golden/selfcheck.json`).
 *
 * The raw numbers the tools round for display: every configuration's Q-range,
 * the scan-function names, a few keyword searches, and two label resolutions.
 * If any of these change, someone changed a port that has to match its Python
 * original, and the golden diff is the alarm.
 */
export function selfCheck(api: PackApi) {
  const qr = createQRange(parseSavConfigs(api.knowledge.data));
  const sf = createScanFunctionIndex(api.knowledge.scanFunctions);
  const bases = [...new Set(qr.listConfigs().map(configBase))];
  return {
    configs: qr.listConfigs(),
    qrange: Object.fromEntries(qr.listConfigs().map((n) => [n, qr.getQRange(n)])),
    functionNames: sf.listFunctionNames(),
    search: Object.fromEntries(
      ['peltier', 'transmission', 'robot', 'shutter', 'temperature', 'zzzqqq'].map((k) => [
        k,
        sf.searchFunctions(k).map((f) => f.name),
      ])
    ),
    labels: {
      '4m 2.5a': resolveConfigRef('4m 2.5a', bases),
      '8m 12a 30hz': resolveConfigRef('8m 12a 30hz', bases),
      '1.3m 0.5a': resolveConfigRef('1.3m 0.5a', bases),
    },
  };
}

// Named exports are for checks and comparison scripts, not for the app, which
// uses only the default export.
export { calculateQRange, createQRange } from './qrange';
export type { QRange, QRangeResult } from './qrange';
export { parseSavConfigs } from './savConfigs';
export type { QRangeConfig } from './savConfigs';
export { createScanFunctionIndex } from './scanFunctions';
export * from './scriptgen';
