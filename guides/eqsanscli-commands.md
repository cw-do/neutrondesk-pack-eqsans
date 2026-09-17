---
id: eqsanscli-commands
title: eqsanscli — catalogue, matching and reduction
category: eqsanscli
summary: The assisted workflow for the bookkeeping before a reduction, and the commands it accepts.
updated: 2026-09-16
source: cw-do/eqsanscli
---
# eqsanscli

A helper for the part of reduction that is bookkeeping: pulling the catalogue,
working out which transmission belongs to which sample, and checking that every
scattering run has what it needs before anything is reduced.

## Where it sits

Reduction at EQ-SANS is `drtsans` on the analysis cluster — see **Script
reduction, step by step**. `eqsanscli` sits in front of that and builds the
table; the reduction underneath is still drtsans, and the protocol rules it
checks are the same rules in **Reduction protocol rules**, which apply however
you reduce.

Worth it when the matching bookkeeping is what costs you time. With three
samples the template script is less trouble.

> Not facility software. A personal tool by the same author as NeutronDesk.

## The routine path

**Load the catalogue.** Pulls every run for the experiment from ONCat with its
title, distance, wavelength, frequency, duration and counts, and classifies each
one from its title.

    /show <IPTS>

**Check the classes before matching anything.** A mislabelled run here becomes a
wrong assignment everywhere downstream, and the reduced output does not show it.

    /show catalog
    /reclass <run> <class>

Classes are `scatt`, `trans`, `bkg`, `bkgtrans`, `empty`, `emptyscatt` and
`ignore`. `/reclass --sample <name> sample` restores a whole sample that was
mis-keyworded — it respects the `S-`/`T-` prefix, so the scattering and
transmission runs land in the right classes together rather than one at a time.

**Match.** Groups runs by configuration and gives each scattering run its
transmission by sample name, and its background and empty beam by configuration.

    /matchruns

Read the warnings it prints. More than one empty beam or background in a
configuration means a choice was made for you — the first one was used, which is
a decision nobody made on purpose.

**Review, then reduce.** Every row should have a transmission and an empty beam.

    /show table
    /reduce

NeutronDesk shows that same table on its Reduction screen with the validation
already applied, which is the part worth doing on a phone.

## Command reference

### Catalogue

    /show 36571
    /show catalog
    /reclass 177128 empty
    /refresh catalog

### Matching

    /matchruns
    /matchruns --update
    /set 3 trans 177130
    /set --config 4m2.5a emp 177128
    /assign bkg porsil

`/matchruns --update` adds only new scattering runs to an existing table and
keeps rows that already reduced, which is what you want after `/refresh`.

Prefer `/assign bkg <sample>` over setting rows one at a time: it finds that
sample's `S-` and `T-` runs per configuration and sets `bkg` and `bkgtrans`
together, so it cannot pair a row with a background from another configuration.
A per-row `/set` can (protocol BKG-01).

### Configuration

    /config show 4m2.5a
    /set config 4m2.5a numqbins 50
    /set config all wavelengthstep 0.1
    /preset list

### Reduction

    /reduce
    /reduce 1-4
    /reduce --sample porsil
    /status
    /export script

### Calibration files

    /instrument show
    /instrument check
    /instrument apply
    /instrument apply --force
    /instrument list
    /instrument pin <cycle>

## How calibration resolution behaves

The six cycle-owned parameters — mask, sensitivity, dark, beam flux, detector
offset and detector scale — are resolved from the run number. **Instrument
calibration files** explains why they belong to the cycle; this is what this
tool does about it.

Resolution runs automatically at `/matchruns`, after presets are applied so the
machine-physics files win over any preset values, and on demand at
`/instrument apply`. `/instrument off` disables it; `/instrument pin <cycle>`
locks it to one cycle.

It does **not** run at `/export script`. That command emits whatever is already
in each configuration, so if the cycle's calibration has changed since, run
`/matchruns` or `/instrument apply` *before* exporting — otherwise the script
carries the old files and nothing says so.

**Your edits survive.** A repeat `/matchruns`, or `/instrument apply` without
`--force`, updates resolver-owned values to the newest files but preserves an
explicit `/set config` edit: the resolver treats a value it did not write as a
manual override. Only `/instrument apply --force` overrides one. That is what
you want the day you need a specific flood, and also why a path set during one
experiment is still there three cycles later — if calibration looks stale,
suspect an override before suspecting the resolver.

**Presets.** `/apply preset <name|file.json>` without `--force` never overwrites
a value the configuration already has, so after `/matchruns` it leaves the
resolved calibration intact and fills gaps only. `/apply preset --force`
overwrites everything the preset carries and does not re-resolve afterwards;
recover with `/instrument apply --force`. Presets should not carry the six
cycle parameters at all — a preset that does spreads one experiment's stale
cycle to every experiment that copies it.

## Fixing what troubleshooting finds

**Troubleshooting** describes the symptoms and what they mean. The fixes here:

| Symptom | Fix |
|---|---|
| No empty beam for these rows | `/reclass <run> empty` then `/matchruns`; or `/set --config <id> emp <run>` to avoid a rebuild |
| Nothing in the working table | `/matchruns` has not run; `/table list` shows whether the rows are in another table |
| Permission error on a mask or calibration file | `/instrument apply` to re-resolve, `/instrument check` to list every unreadable file |
| Flood, dark or flux not found | `/instrument show` reports what resolved and from which cycle |
| Intensity off by a constant factor | `/show config <id>` shows `standardabsolutescale` and where it came from |
| Container scattering still present | `/show table` — a blank `Bkg` is expected only for the background sample itself and for empty-beam rows |
| A sample missing from the table | `/show catalog` shows the `Class` column; `/reclass --sample <name> sample` restores it |
| Still on last cycle's flood | `/instrument show` marks hand-set values "yours, kept"; `/instrument apply --force` overrides them |
| A new cycle not picked up | `/instrument list` shows every cycle with its anchor run — a cycle with no dark or flood has no anchor |

## Reading a config id

    4m10a       4.0 m, 10.0 A, 60 Hz
    4m2.5a      4.0 m, 2.5 A, 60 Hz
    2.5m2.5a    2.5 m, 2.5 A, 60 Hz
    8m12a30hz   8.0 m, 12.0 A, 30 Hz

60 Hz is the default and is omitted from the label.
