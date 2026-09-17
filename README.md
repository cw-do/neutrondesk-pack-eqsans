# EQSANS pack for NeutronDesk

The EQ-SANS (BL-6, SNS) instrument pack: the assistant's rules and reference
modules, the guide library, the curated process variables, the instrument's real
scan-function source and Q-range planner configurations, and (once the pack has
`src/`) the deterministic Q-range and script tools.

The format is `docs/packs/format.md` in the NeutronDesk repository. This README
covers only what is specific to EQ-SANS.

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
