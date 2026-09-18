/**
 * The EQSANS pack's code: what the app calls to get this instrument's tools.
 *
 * The app hands over the pack's own knowledge and the tool-result helpers; the
 * factory builds the four EQ-SANS tools over them (Q-range and the script
 * builders). The two scan-function lookup tools are the app's own, built over
 * this pack's `agent/scan-functions.txt`; nothing here needs to provide them.
 * Nothing here imports anything outside this folder except types from
 * `neutrondesk-pack-api`, and nothing here can reach a network or the
 * instrument.
 */

import type { PackApi, PackFactory } from 'neutrondesk-pack-api';

import { createQRange } from './qrange';
import { parseSavConfigs } from './savConfigs';
import { configBase, resolveConfigRef } from './scriptgen';
import { buildTools } from './tools';

const pack: PackFactory = (api) => ({ tools: buildTools(api) });
export default pack;

/**
 * What pack-check records as this pack's golden output (`checks/golden/selfcheck.json`)
 * and compares with `checks/reference/selfcheck.json`, produced by the Python
 * original.
 *
 * The raw numbers the tools round for display: every configuration's Q-range,
 * and a few label resolutions. If any of these change, someone changed a port
 * that has to match its Python original, and the golden diff is the alarm.
 */
export function selfCheck(api: PackApi) {
  const qr = createQRange(parseSavConfigs(api.knowledge.data));
  const bases = [...new Set(qr.listConfigs().map(configBase))];
  return {
    configs: qr.listConfigs(),
    qrange: Object.fromEntries(qr.listConfigs().map((n) => [n, qr.getQRange(n)])),
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
export * from './scriptgen';
