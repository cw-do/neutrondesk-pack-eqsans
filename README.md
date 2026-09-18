# EQSANS pack for NeutronDesk

The EQ-SANS (BL-6, SNS) instrument pack, and the worked example of what a
NeutronDesk instrument pack is. This README explains the pack from the top
down: the layout every pack shares, the minimum a pack must contain, and then
each folder of this pack, what is in it and why.

A pack is one git repository holding everything one instrument brings to the
[NeutronDesk](https://github.com/cw-do/neutrondesk) app: the assistant's rules
and reference knowledge, the guide library, the friendly names for its process
variables, links, and optionally code for calculations the assistant should do
deterministically. The instrument team owns it. The app vendors it at build
time (`npm run packs:pull`), pinned to a commit, and never fetches it while
running.

The formal specification is [FORMAT.md](https://github.com/cw-do/neutrondesk-pack-check/blob/main/FORMAT.md),
published with the check tool. A new pack starts from
[neutrondesk-pack-template](https://github.com/cw-do/neutrondesk-pack-template).
`npm test` here runs that check tool on this pack.

## 1. The layout every pack shares

```
<pack root>/
  pack.json                 REQUIRED   who this instrument is and what the app should offer for it
  README.md                 recommended
  LICENSE                   recommended
  .gitattributes            recommended   * text=auto eol=lf
  package.json              recommended   npm test -> neutrondesk-pack-check
  agent/
    system-prompt.md        REQUIRED if capabilities includes "agent"   the instrument's own rules
    modules/*.md            optional   reference knowledge, retrieved per question; one topic per file
    scan-functions.txt      optional   the instrument's scan-function source, split at each `def`
  guides/*.md               optional   documents on the Guides screen, also retrieved by the assistant
  pv/
    catalogue.json          optional   friendly names for the process variables people search for
  data/**                   optional   text files handed verbatim to the pack's code
  src/                      optional   TypeScript; index.ts default-exports a factory that builds tools
  checks/
    cases.json              optional   questions and tool calls with what they must produce
    golden/*.json           optional   recorded outputs the check compares against
```

Where each part reaches the app:

| Part | Reaches the user as |
|---|---|
| `pack.json` | The instrument picker ("Full support", the blurb), the header, which screens exist, the Guides order, the links, the Ask openers |
| `agent/system-prompt.md` | Spliced into the app's shared prompt template as this instrument's rules |
| `agent/modules/*.md` | Scored against each question; the best few go into the model's context |
| `agent/scan-functions.txt` | Looked up by name or keyword through a tool, never retrieved wholesale |
| `guides/*.md` | The Guides screen, and retrieved alongside the modules |
| `pv/catalogue.json` | Friendly names and explanations over a run's DAS logs (Run → Metadata) |
| `data/**` | Given to `src/` as strings; the app does not read them |
| `src/` | Tools the assistant can call for this instrument |
| `checks/` | Nothing in the app; `npm test` and the app's own check read them |

## 2. The minimum a pack needs

To pass `npm test` and be vendored, a pack needs:

1. **`pack.json`** with `schemaVersion: 1`, an `id` that is the instrument's
   ONCat id exactly as the app's instrument picker shows it (`EQSANS`, `CG2`,
   `PG3`, upper case), `facility` (`SNS` or `HFIR`), `name`, `shortName`,
   `fullName`, `beamline`, `blurb`, `capabilities`, `usesSansTitleConvention`,
   `guides.order`, `guides.categories`, `links`, `agent.suggestions`. The id is
   the only thing that links the pack to an instrument.
2. **`agent/system-prompt.md`** of at least 200 characters if `capabilities`
   includes `agent`. Only your beamline's rules; the app supplies the shared
   ones (phone answering, no execution, the RSS refusal, catalogue use).
3. **Every guide in `guides/` listed in `guides.order`**, each with complete
   front matter and a `category` from `guides.categories`.
4. **UTF-8, LF, text only**, 2 MB total, 256 KB per file, no `dependencies` in
   `package.json`.

Everything else is optional. A pack with only 1 and 2 already gives the
instrument a tuned assistant and a "Full support" badge. Modules make the
assistant knowledgeable, guides give users something to read, the PV catalogue
makes Metadata searchable by concept, and `src/` adds exact calculations.

## 3. This pack, folder by folder

### `pack.json`

```jsonc
{
  "schemaVersion": 1,
  "id": "EQSANS",                       // ONCat id; the folder in the app becomes packs/eqsans/
  "facility": "SNS",
  "name": "EQSANS", "shortName": "EQ-SANS", "beamline": "BL-6",
  "fullName": "Extended Q-Range Small-Angle Neutron Scattering Diffractometer",
  "blurb": "Small-angle scattering, time-of-flight. Full NeutronDesk support.",
  "capabilities": ["runs", "monitor", "detector", "pv", "guides", "agent", "reduction"],
  "usesSansTitleConvention": true,      // run titles follow S-/T- naming, so the app classifies them
  "guides": { "order": [ /* 13 ids, screen order */ ], "categories": [ /* 6 */ ] },
  "links": [ /* the EQ-SANS user guide and instrument page */ ],
  "agent": { "suggestions": [ /* 5 openers on the Ask screen */ ] },
  "maintainers": [ /* who to ask */ ]
}
```

Points worth copying:

- `capabilities` lists what this instrument really has. `detector` and
  `reduction` open the Detector tab and the reduction-readiness card; an
  instrument without those should not claim them, because the screens would
  open on nothing.
- `guides.order` is the order the Guides screen shows, and it deliberately
  puts the instrument team's reduction route (`reduction-routes`,
  `script-reduction`) before the personal tools (`eqsanscli-commands`,
  `sansdir`). It includes one guide the app ships for every instrument
  (`oncat-access`); a pack may place shared guides in its order.
- `agent.suggestions` are chosen to show what this assistant can do that the
  rest of the app cannot: compute a Q-range, produce a script, explain a rule.

### `agent/system-prompt.md`

The rules of EQ-SANS, in six sections. Use it as the shape for another
instrument:

| Section | What it does |
|---|---|
| Two task domains | Separates measurement planning from data reduction, and says which tools and modules belong to each, so planning defaults never leak into reduction answers |
| Core rules | The real command set, the fixed measurement sequence, the "every sample gets transmission and scattering" default, what to assume when details are missing |
| Use tools, don't hand-write | Which questions must go through a tool (`qrange_lookup`, the script builders, `lookup_scan_function`) rather than memory, and why |
| Temperature series | The equilibration delay, the chiller guard, when transmission is repeated |
| Hardware and design questions | Where those answers are (module 11) and an instruction to read every retrieved excerpt |
| Scan functions | Any question about a function goes through the lookup; quote the source, never invent a signature |

`{{INSTRUMENT_NAME}}` may be used and is substituted by the app. Nothing here
repeats the shared template; if a rule is true at every beamline it belongs in
the app, not here.

### `agent/modules/`

Reference knowledge, one topic per file. Whole files are scored against each
question by the words they share with it, which is why one topic per file
matters: a module that grows into two topics dilutes its own score and should
be split. The first line underlined with `===` is the title; files sort by the
first number in their name.

| File | Topic |
|---|---|
| `module1.md` | Core concepts for EQ-SANS experiments |
| `module2.md` | Command reference |
| `module3.md` | Standard script templates |
| `module4.md` | Multi-configuration and advanced templates |
| `module5.md` | Temperature control and high-temperature procedure |
| `module7.md` | Safety, contacts, operating guidance |
| `module9.md` | Tensile stage (psylo) experiments |
| `module10.md` | RheoSANS (shear cell) experiments |
| `module11.md` | Instrument specifications and design |
| `module12.md` | Data reduction and data viewing tools |

The two knowledge paths are complementary and not interchangeable: the
scan-function reference below is reached only by the `lookup_scan_function`
tool, never by retrieval. The sample-changer robot appears in no module at all,
and a question about it is answerable only through the lookup.

### `agent/scan-functions.txt`

A copy of the instrument's live scan-function source, 107 functions. The app
splits it at every top-level `def name(` so a question about one function
returns that function's real signature, comments and the EPICS calls it makes.
Kept as `.txt` so nothing tries to run or lint it. Refresh it by copying the
file in again.

### `guides/`

Twelve documents users read on the Guides screen; the assistant retrieves them
too, so writing one does both. Each has front matter (`id`, `title`,
`category`, `summary`, `updated`, `source`) and `id` equals the file name.

Categories, in screen order: `experiment`, `reduction`, `data-access`,
`eqsanscli`, `sansdir`, `troubleshooting`. The split matters: `drtsans` on the
analysis cluster is how the instrument team says to reduce EQ-SANS data, and
the `reduction` guides are about that and the principles. `eqsanscli` and
`sansdir` are personal tools with their own sections, so the library does not
teach a convenience as though it were the method. The reduction guides follow
the team's own documentation at sites.google.com/view/eqsans, which is also the
first link in `pack.json`, because a page the beamline maintains is worth more
than a copy frozen into an app.

### `pv/catalogue.json`

Ten entries. This is not the list of process variables; the app already shows
every DAS log ONCat recorded for a run, around 470 on EQ-SANS, under its real
name. This file is an overlay for the handful people search for by concept:
detector distance, wavelength, chopper frequency, proton charge, sample
temperature, the two apertures, the beamstop, total counts, duration. Each gets
a friendly name, a description that says why it matters, search aliases, and
where needed a unit conversion (`detectorz` is logged in mm, shown in m).

`sampletemp` has an empty `units` on purpose: the unit depends on the sample
environment and is not in the log, and a wrong unit on a temperature is worse
than none.

### `data/qrange-configs/`

The real `.sav` files from the EQ-SANS OPI computer, 106 of them: the full set
of the instrument's configuration selections, not synthetic data. Each is a
`BL6:CS:QPlan:<key> <value>` autosave dump. The app bundles them verbatim and
hands them to `src/` as strings; `src/savConfigs.ts` parses them, keeping only
`SampleDetDistance`, `WLMin`, `Freq`, `BSforQ`, `S1s`, `S2s`, `S3s`, `S4`.

Transmission (`_trans`) files carry `S1t`/`S2t`/`S3t` rather than
`S1s`/`S2s`/`S3s`, so a Q-range computed from one has a beam diameter of 0;
Q-range is always read off the `_scatt` member of a pair. To refresh, copy the
`.sav` files in and let the app pull the pack again.

`data/` is the place for anything of this kind: tables, configuration dumps,
calibration constants. The app never interprets them, so their format is the
pack's business.

### `src/`

The code pack part. `src/index.ts` default-exports a factory; the app calls it
once, handing over the pack's own knowledge (`api.knowledge.modules`,
`.scanFunctions`, `.data`) and the tool-result helpers, and gets back the six
tools:

| Tool | What it does |
|---|---|
| `qrange_lookup` | Q-range, wavelength range, TOF range and beam diameter for a configuration, by exact name or a label like `4m 2.5a` |
| `list_qrange_configs` | Every configuration name the bundle has |
| `list_scan_functions` | Every scan-function name |
| `lookup_scan_function` | A function's real source, by name or keyword |
| `build_sample_script` | A complete measurement script for samples across configurations; adds the empty-beam run itself |
| `build_temperature_script` | A temperature-series script with the chiller guard and equilibration delays |

Files:

- `index.ts` — the factory, named exports for checks, and `selfCheck()`.
- `tools.ts` — the six tool definitions: JSON Schema, the activity line shown
  while a tool runs, and `run()`.
- `qrange.ts` — the Q-range arithmetic. A port of `cw-do/eqsans-agent-for-ndesk`
  `qrange.py`, itself from ESAC v2, matching the instrument's own Q-Range
  Planner including the beam-diameter quirk noted in the source. Verified
  across all 106 configurations to floating-point rounding.
- `scriptgen.ts` — the script renderer. A port of `scriptgen.py`, character
  for character, which is why an integral proton charge is written `1.0`.
- `scanFunctions.ts` — the name and keyword index over the scan functions.
- `savConfigs.ts` — the `.sav` parser.

Two rules this code follows, and any pack code should:

- **Where a wrong answer costs beam time, the model supplies arguments and
  code produces the artefact.** The model never writes a script; it extracts
  samples and configurations and calls `build_sample_script`, and the empty
  beam cannot be forgotten because the renderer adds it.
- **The ports must stay identical to their originals.** If you change
  `qrange.ts` or `scriptgen.ts`, re-run the comparison against the Python
  rather than trusting that it still matches. The goldens under `checks/`
  will show what moved.

Constraints the check enforces on any `src/`: imports are relative paths
inside `src/` or `import type` from `neutrondesk-pack-api`; no network,
dynamic loading or timers; compiles under strict TypeScript without the DOM
library (so no `fetch` and no `console`); tool names are `snake_case`, unique,
and not one of the app's shared tools.

### `checks/`

What `npm test` uses to check this pack against itself.

- `cases.json` — nine retrieval cases (a question and the module or guide it
  must reach, or a word the retrieved text must contain) and eighteen tool
  runs (a tool, its arguments, and strings the result must and must not
  contain: the empty-beam run is present, the scattering block comes after
  transmission, the chiller guard appears for a peltier series, a nonsense
  configuration is refused).
- `golden/tools.json`, `golden/toolruns.json`, `golden/selfcheck.json` —
  recorded outputs. `selfcheck.json` holds every configuration's Q-range and
  the scan-function index, so a change to a constant shows up as a numeric
  diff rather than a vaguely different answer. `npm run golden` rewrites them;
  a person reads the diff and commits it. Never regenerate goldens in CI.

### `package.json`, `.gitattributes`, `LICENSE`

`package.json` wires `npm test` and `npm run golden` to
`neutrondesk-pack-check`, installed from GitHub as a dev dependency;
`dependencies` stays empty because pack code runs inside the app and brings
nothing of its own. `.gitattributes` keeps every file LF, which the app's
content hash assumes. The licence is the pack's own choice; this one keeps
all rights reserved, and the template is MIT so it can be copied freely.

## 4. Working on this pack

```bash
npm install
npm test                 # the same checks the app runs before vendoring
npm run golden           # after an intended change to tool output; review the diff, then commit
```

Then push. On the app side, `npm run packs:pull -- eqsans` fetches the new
commit, runs the check again, vendors the pack, and records the commit in
`packs.lock`; the pack ships in the next app build. Nothing under the app's
`packs/eqsans/` is edited by hand.

## 5. Where this pack deviates from the conversion guide

This pack was converted from `eqsans-agent-for-ndesk` before the template's
`AGENTS.md` existed, and a dry run of that guide against the same source found
these differences. The guide is the rule; this pack is the older practice.

- **The system prompt is paraphrased and rewrapped**, not moved sentence by
  sentence. Same six sections, same removals, different wording.
- **`qrange_lookup` accepts labels** (`4m 2.5a`), which the Python's
  `_resolve_qrange_config` does not. Deliberate: the system prompt tells the
  model labels are fine.
- **`list_scan_functions` returns 107 names, the Python 105.** The source
  file defines `setnano1` and `setnano2` twice; the Python's dict keeps one
  of each, the TypeScript list keeps both. Lookup by name behaves the same
  (last definition wins in both). Open question whether the list should dedupe.
- **No `checks/reference/` yet.** The Python comparison that verified the
  Q-range port across all 106 configurations was run outside this repository;
  a dry run with a fresh `make-reference.py` reproduced it (worst difference
  1.1e-16) but its output is not committed here. Adding the reference is the
  next change to this pack.
- The file names `scanFunctions.ts` and `savConfigs.ts` do not mirror the
  Python module names; the guide now says names are free.

## 6. Where this came from


Ported from `cw-do/eqsans-agent-for-ndesk`, whose corpus in turn came from
ESAC v2. The guides come from `cw-do/eqsanscli`'s `knowledge/*.md`. Before this
pack existed the same files lived in the NeutronDesk repository under
`knowledge/instruments/eqsans/` and `knowledge/guides/`; that history is there.
