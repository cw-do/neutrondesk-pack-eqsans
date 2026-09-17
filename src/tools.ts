/**
 * EQ-SANS tools: Q-range arithmetic, the scan-function reference, and the
 * deterministic script builders.
 *
 * These are what makes the assistant more than a reader of documents — and all
 * three are specific to this beamline, which is why they live in the EQSANS
 * pack rather than in the app. A Q-range formula from here applied at another
 * instrument would be confidently wrong.
 *
 * Every tool reads. Where a wrong answer would cost beam time, the model
 * supplies arguments and code produces the artefact: the script builders
 * render the text, so a forgotten empty beam is impossible rather than unlikely.
 */

import type { PackApi, ToolDef } from 'neutrondesk-pack-api';

import { calculateQRange, createQRange } from './qrange';
import { parseSavConfigs } from './savConfigs';
import { createScanFunctionIndex } from './scanFunctions';
import {
  RACK_TYPES,
  buildSampleScript,
  buildTemperatureScript,
  configBase,
  resolveConfigRef,
  type SampleSpec,
  type TemperatureControl,
} from './scriptgen';

const SAMPLE_ITEM_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: "Sample name/label, e.g. 'sampleA'." },
    items: { type: 'number', description: 'Sample ITEM number (0 if none assigned).' },
    pos: {
      type: 'number',
      description: 'Position/slot in the rack. -1 for a non-standard environment.',
    },
    rack: {
      type: 'string',
      enum: [...RACK_TYPES],
      description: 'Sample-environment rack type.',
    },
    trans: {
      type: 'boolean',
      description:
        'Measure transmission. Defaults to true; only set false for a deliberate scattering-only repeat.',
    },
    scatt: { type: 'boolean', description: 'Measure scattering. Defaults to true.' },
  },
  required: ['name', 'items', 'pos', 'rack'],
} as const;

function parseSamples(args: Record<string, unknown>): SampleSpec[] {
  const raw = args.samples;
  if (!Array.isArray(raw)) return [];
  const out: SampleSpec[] = [];
  for (const s of raw) {
    if (typeof s !== 'object' || s === null) continue;
    const o = s as Record<string, unknown>;
    const name = (typeof o.name === 'string' ? o.name : String(o.name ?? '')).trim();
    if (!name) continue;
    out.push({
      name,
      items: Number(o.items ?? 0) || 0,
      pos: Number(o.pos ?? 0) || 0,
      rack: typeof o.rack === 'string' ? o.rack : 'peltier',
      // Absent means yes. Transmission-and-scattering is the documented
      // default, so only an explicit false turns one off.
      trans: o.trans !== false,
      scatt: o.scatt !== false,
    });
  }
  return out;
}

/** The six EQ-SANS tools, built over this pack's data. */
export function buildTools(api: PackApi): ToolDef[] {
  const { ok, fail, str, strArray, numArray } = api.tools;
  const qr = createQRange(parseSavConfigs(api.knowledge.data));
  const sf = createScanFunctionIndex(api.knowledge.scanFunctions);

  /** Base configuration names present in the bundle, for label resolution. */
  function knownBases(): string[] {
    const seen: string[] = [];
    for (const name of qr.listConfigs()) {
      const base = configBase(name);
      if (!seen.includes(base)) seen.push(base);
    }
    return seen;
  }

  const qrangeLookup: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'qrange_lookup',
        description:
          'Compute the Q-range (QMin/QMax), wavelength range, TOF range and beam diameter for a ' +
          'named EQ-SANS configuration. Use list_qrange_configs first if unsure of the exact name. ' +
          'QMin is idealised from the beamstop size alone; QMinPractical is the more realistic ' +
          'estimate — prefer it when asked what Q is actually achievable, and say it is an estimate.',
        parameters: {
          type: 'object',
          properties: {
            config_name: {
              type: 'string',
              description:
                "Configuration name, e.g. 'conf_4000mm_2p5A_60Hz'. A label like '4m 2.5a' also works.",
            },
          },
          required: ['config_name'],
        },
      },
    },
    activity: (a) => `Working out the Q-range for ${str(a, 'config_name') || 'that configuration'}`,
    run: (args) => {
      const requested = str(args, 'config_name');
      // The model is told labels are fine, so accept one here rather than make it
      // guess the conf_... form.
      const asBase = resolveConfigRef(requested, knownBases());
      const resolved = qr.resolveConfig(requested) ?? qr.resolveConfig(asBase);
      if (!resolved) {
        return fail(
          `No configuration named "${requested}". ` +
            `Call list_qrange_configs to see the ${knownBases().length} available names.`
        );
      }
      const r = calculateQRange(resolved.config.params);
      const lines = [`Configuration: ${resolved.name}`];
      for (const [key, value] of Object.entries(r)) {
        if (value === undefined) continue;
        lines.push(`${key}: ${typeof value === 'number' ? value.toFixed(4) : String(value)}`);
      }
      return ok(lines.join('\n'));
    },
  };

  const listQRangeConfigs: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'list_qrange_configs',
        description:
          'List every EQ-SANS configuration name available to qrange_lookup and to the ' +
          "script builders' `configs` argument.",
        parameters: { type: 'object', properties: {} },
      },
    },
    activity: () => 'Listing the instrument configurations',
    run: () => ok(knownBases().join('\n')),
  };

  // ---------------------------------------------------------------------------
  // Scan functions
  // ---------------------------------------------------------------------------

  const listScanFunctions: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'list_scan_functions',
        description:
          'List the names of every EQ-SANS scan function. Use before lookup_scan_function when ' +
          'you need to see what exists.',
        parameters: { type: 'object', properties: {} },
      },
    },
    activity: () => 'Listing the scan functions',
    run: () => ok(sf.listFunctionNames().join('\n')),
  };

  const lookupScanFunction: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'lookup_scan_function',
        description:
          'Get the exact source — signature, parameters, comments, the real EPICS/PV calls — of ' +
          'EQ-SANS scan functions, by name or by topic keyword. Use this for ANY question about ' +
          'what a function does, its parameters, or how to control something. Never guess a ' +
          'function name or signature.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description:
                "A function name ('setpeltier1temp') or a topic keyword ('peltier', 'transmission').",
            },
          },
          required: ['query'],
        },
      },
    },
    activity: (a) => `Looking up ${str(a, 'query') || 'the scan function'}`,
    run: (args) => {
      const query = str(args, 'query');
      const exact = sf.getFunction(query);
      if (exact) return ok(exact.body);
      const matches = sf.searchFunctions(query);
      if (matches.length === 0) {
        return fail(
          `No scan function matches "${query}". Call list_scan_functions to see all ` +
            `${sf.listFunctionNames().length} names.`
        );
      }
      return ok(matches.map((m) => `# ${m.name}\n${m.body}`).join('\n\n'));
    },
  };

  // ---------------------------------------------------------------------------
  // Script generation
  // ---------------------------------------------------------------------------

  const buildSampleScriptTool: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'build_sample_script',
        description:
          'Generate a complete EQ-SANS scan script for a set of samples across one or more ' +
          'configurations: imports, setipts, then a transmission block and a scattering block per ' +
          'configuration. The empty-beam transmission run is added automatically. Deterministic — ' +
          'always use this instead of writing the script by hand.',
        parameters: {
          type: 'object',
          properties: {
            ipts: { type: 'number', description: "IPTS number. Use 99999 if the user hasn't given one." },
            configs: {
              type: 'array',
              items: { type: 'string' },
              description:
                "Configurations to measure — an exact name ('conf_4000mm_2p5A_60Hz') or a plain " +
                "label ('4m 2.5a', '9m 15a 30hz'). Pass through what the user said.",
            },
            samples: {
              type: 'array',
              items: SAMPLE_ITEM_SCHEMA,
              description: 'Samples to measure at each configuration.',
            },
            configs_without_empty_beam: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Subset of `configs` whose empty beam was ALREADY measured earlier in this ' +
                'experiment. Leave empty for a first script — every configuration needs its own.',
            },
            trans_limit: { type: 'number', description: 'Proton charge for transmission runs. Default 0.15.' },
            scatt_limit: { type: 'number', description: 'Proton charge for scattering runs. Default 1.0.' },
          },
          required: ['ipts', 'configs', 'samples'],
        },
      },
    },
    activity: () => 'Building the scan script',
    run: (args) => {
      const samples = parseSamples(args);
      if (samples.length === 0) return fail('build_sample_script needs at least one sample.');
      const bases = knownBases();
      const configs = strArray(args, 'configs').map((c) => resolveConfigRef(c, bases));
      if (configs.length === 0) return fail('build_sample_script needs at least one configuration.');

      const script = buildSampleScript({
        ipts: Number(args.ipts ?? 99999) || 99999,
        configs,
        samples,
        configsWithoutEmptyBeam: strArray(args, 'configs_without_empty_beam').map((c) =>
          resolveConfigRef(c, bases)
        ),
        transLimit: Number.isFinite(Number(args.trans_limit)) ? Number(args.trans_limit) : undefined,
        scattLimit: Number.isFinite(Number(args.scatt_limit)) ? Number(args.scatt_limit) : undefined,
      });
      return ok(script);
    },
  };

  const buildTemperatureScriptTool: ToolDef = {
    schema: {
      type: 'function',
      function: {
        name: 'build_temperature_script',
        description:
          'Generate an EQ-SANS temperature-series script: a loop over temperatures that sets the ' +
          'controllers, waits for equilibration, then measures. Includes the >=80C polysci chiller ' +
          'guard. Deterministic — always use this instead of writing the script by hand.',
        parameters: {
          type: 'object',
          properties: {
            ipts: { type: 'number', description: 'IPTS number; omit if already set.' },
            configs: { type: 'array', items: { type: 'string' }, description: 'Configurations measured at each temperature.' },
            samples: { type: 'array', items: SAMPLE_ITEM_SCHEMA, description: 'Samples measured at each temperature.' },
            temps: { type: 'array', items: { type: 'number' }, description: 'Temperature series, degrees C.' },
            controls: {
              type: 'array',
              items: { type: 'string', enum: ['peltier1', 'peltier2', 'polysci'] },
              description: 'Controllers to set. Default: both peltier blocks.',
            },
            equil_delay: { type: 'number', description: 'Equilibration delay in seconds. Default 600.' },
            trans_temps: {
              type: 'array',
              items: { type: 'number' },
              description:
                'Temperatures at which to also measure transmission. Default none — transmission ' +
                'is normally measured once, at the initial temperature.',
            },
            trans_limit: { type: 'number' },
            scatt_limit: { type: 'number' },
          },
          required: ['configs', 'samples', 'temps'],
        },
      },
    },
    activity: () => 'Building the temperature-series script',
    run: (args) => {
      const samples = parseSamples(args);
      if (samples.length === 0) return fail('build_temperature_script needs at least one sample.');
      const temps = numArray(args, 'temps');
      if (temps.length === 0) return fail('build_temperature_script needs at least one temperature.');
      const bases = knownBases();
      const configs = strArray(args, 'configs').map((c) => resolveConfigRef(c, bases));
      if (configs.length === 0) return fail('build_temperature_script needs at least one configuration.');

      const controls = strArray(args, 'controls').filter(
        (c): c is TemperatureControl => c === 'peltier1' || c === 'peltier2' || c === 'polysci'
      );

      const script = buildTemperatureScript({
        ipts: Number.isFinite(Number(args.ipts)) ? Number(args.ipts) : null,
        configs,
        samples,
        temps,
        controls: controls.length > 0 ? controls : undefined,
        equilDelay: Number.isFinite(Number(args.equil_delay)) ? Number(args.equil_delay) : undefined,
        transTemps: numArray(args, 'trans_temps'),
        transLimit: Number.isFinite(Number(args.trans_limit)) ? Number(args.trans_limit) : undefined,
        scattLimit: Number.isFinite(Number(args.scatt_limit)) ? Number(args.scatt_limit) : undefined,
      });
      return ok(script);
    },
  };

  return [
    qrangeLookup,
    listQRangeConfigs,
    listScanFunctions,
    lookupScanFunction,
    buildSampleScriptTool,
    buildTemperatureScriptTool,
  ];
}
