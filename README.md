# EQSANS pack for NeutronDesk

The EQ-SANS (BL-6, SNS) instrument pack: the assistant's rules and reference
modules, the guide library, the curated process variables, the instrument's real
scan-function source and Q-range planner configurations, and the deterministic
Q-range and script tools in `src/`.

This repository is vendored into the NeutronDesk app by `npm run packs:pull`. The
pack format is [docs/packs/format.md](https://github.com/cw-do/neutrondesk/blob/main/docs/packs/format.md)
in the app repository, and the checks a pack must pass are run by its
`tools/pack-check`. This README covers only what is specific to EQ-SANS.

## Modules

| File | Topic |
|---|---|
| `agent/modules/module1.md` | Core concepts for EQ-SANS experiments |
| `module2.md` | Command reference |
| `module3.md` | Standard script templates |
| `module4.md` | Multi-configuration and advanced templates |
| `module5.md` | Temperature control and high-temperature procedure |
| `module7.md` | Safety, contacts, operating guidance |
| `module9.md` | Tensile stage (psylo) experiments |
| `module10.md` | RheoSANS (shear cell) experiments |
| `module11.md` | Instrument specifications and design |
| `module12.md` | Data reduction and data viewing tools |

Note the two knowledge paths are complementary and not interchangeable: the
scan-function reference (`agent/scan-functions.txt`) is reached only by the
`lookup_scan_function` tool, never by retrieval. The sample-changer robot appears
in no module at all.

## Q-range configurations

`data/qrange-configs/` holds the real `.sav` files from the EQ-SANS OPI computer:
the full set of the instrument's configuration selections, not synthetic data.
Each is a `BL6:CS:QPlan:<key> <value>` autosave dump. The Q-range arithmetic reads
`SampleDetDistance`, `WLMin`, `Freq`, `BSforQ`, `S1s`, `S2s`, `S3s`, `S4`; the
rest is ignored. To refresh, copy the `.sav` files in and re-run the app's
`npm run packs:gen`.

Transmission (`_trans`) files carry `S1t`/`S2t`/`S3t` rather than `S1s`/`S2s`/`S3s`,
so a Q-range computed from one has a beam diameter of 0. Q-range is always read
off the `_scatt` member of a pair.

## Code (`src/`)

`src/index.ts` builds the six assistant tools over the pack's own data:
`qrange_lookup`, `list_qrange_configs`, `list_scan_functions`,
`lookup_scan_function`, `build_sample_script`, `build_temperature_script`.

Two files are ports that must stay numerically and textually identical to their
Python originals in `cw-do/eqsans-agent-for-ndesk`:

- `qrange.ts` (`qrange.py`, itself from ESAC v2's `qrange_calculator.py`) matches
  the instrument's own Q-Range Planner, including the beam-diameter quirk noted
  in the source. Verified across all 106 configurations to floating-point
  rounding.
- `scriptgen.ts` (`scriptgen.py`, from ESAC v2's `script_builder.py`) renders
  scripts character for character as the Python does, which is why it formats an
  integral proton charge as `1.0`.

Both feed real beam-time decisions. If you change either, re-run the comparison
against the Python rather than trusting that it still matches. The model never
writes a script; it supplies arguments and `scriptgen.ts` renders the text, so
the empty-beam transmission run cannot be forgotten.

`savConfigs.ts` parses the `.sav` files, `scanFunctions.ts` indexes the
scan-function source by name and keyword, and `tools.ts` wires them into tool
definitions.

## Guides

The reduction guides follow the instrument team's own documentation at
sites.google.com/view/eqsans. `drtsans` on the analysis cluster is how the team
says to reduce EQ-SANS data; `eqsanscli` and `sansdir` are personal tools and
have their own guide categories so the general guides stay about the method.

## Where this came from

Ported from `cw-do/eqsans-agent-for-ndesk`, whose corpus in turn came from
ESAC v2. The guides come from `cw-do/eqsanscli`'s `knowledge/*.md`. Before this
pack existed the same files lived in the NeutronDesk repository under
`knowledge/instruments/eqsans/` and `knowledge/guides/`; that history is there.
