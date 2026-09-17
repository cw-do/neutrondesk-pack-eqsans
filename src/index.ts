/**
 * The EQSANS pack's code: what the app calls to get this instrument's tools.
 *
 * The app hands over the pack's own knowledge and the tool-result helpers; the
 * factory builds the six tools over them. Nothing here imports anything outside
 * this folder except types from `neutrondesk-pack-api`, and nothing here can
 * reach a network or the instrument.
 */

import type { PackFactory } from 'neutrondesk-pack-api';

import { buildTools } from './tools';

const pack: PackFactory = (api) => ({ tools: buildTools(api) });
export default pack;

// Named exports are for checks and comparison scripts, not for the app, which
// uses only the default export.
export { calculateQRange, createQRange } from './qrange';
export type { QRange, QRangeResult } from './qrange';
export { parseSavConfigs } from './savConfigs';
export type { QRangeConfig } from './savConfigs';
export { createScanFunctionIndex } from './scanFunctions';
export * from './scriptgen';
