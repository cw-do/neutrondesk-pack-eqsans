---
id: eqsans-overview
title: EQSANS at a glance
category: experiment
summary: What the instrument measures, and the vocabulary the rest of these guides assume.
updated: 2026-09-14
source: NeutronDesk
---
# EQSANS at a glance

EQSANS is the Extended Q-Range Small-Angle Neutron Scattering diffractometer on
**BL-6** at the Spallation Neutron Source. It measures how a sample scatters
neutrons through small angles, which is what reveals structure on length scales
from roughly a nanometre to a few hundred nanometres.

## Configuration

Almost everything in EQSANS reduction is organised by **configuration**, which
is the triple:

    (detector distance, wavelength, chopper frequency)

written compactly as `4m2.5a`, `8m12a`, or `8m12a30hz`. 60 Hz is the default
and is left off the label.

Configuration matters because a measurement is only comparable to another
measurement in the same configuration. An empty-beam run taken at 4 m tells you
nothing about the beam centre at 8 m.

## Run types

A run title is the instrument's own note about what was measured. The
convention EQSANS uses:

| Prefix or keyword | Means |
|---|---|
| `S-` | Scattering from the sample |
| `T-` | Transmission measurement |
| `banjo`, `bkg`, `emptycell`, `ticell` | Background: the container without the sample |
| `empty`, `emp`, `* beam` | Empty beam: the direct beam with nothing in it |

NeutronDesk classifies runs with exactly these rules, so the type badge you see
in the Runs list is the type the reduction tooling will use. It is still a
reading of the title, not ground truth: check it when something looks odd.

## What a reduction needs

For one sample measurement to reduce, you need, all in the same configuration:

- the **sample scattering** run
- its **transmission** run
- an **empty beam** run, which supplies both the beam centre and the empty
  transmission
- usually a **background** run and its own transmission

Missing the empty beam is blocking, not a warning: without it there is no beam
centre and no fallback. See the protocol guide, rule EMP-01.
