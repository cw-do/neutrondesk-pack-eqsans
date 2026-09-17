---
id: script-reduction
title: Script reduction, step by step
category: reduction
summary: Editing and running the drtsans template on analysis.sns.gov, and reading what comes out.
updated: 2026-09-16
source: sites.google.com/view/eqsans
---
# Script reduction, step by step

The default route: edit a Python template, run it, get I(Q) plus plots and a
record of exactly what was done.

## 1. Get on the cluster

Sign in to **analysis.sns.gov** with your XCAMS or UCAMS account, then in a
terminal:

    cd /SNS/EQSANS/IPTS-<number>/shared/
    . /SNS/EQSANS/shared/usertools/eqsans_setup.sh

Work in `shared/`, not `nexus/`. Raw data is read-only, and everyone on the
proposal can see what you leave in `shared/`.

## 2. Open the template

    gedit reduce_template.py

`pluma` works as well. The template is Python 3 and is meant to be edited: the
parameters at the top are the whole interface.

## 3. Fill in the runs

| Parameter | What it is |
|---|---|
| `_ipts` | Your IPTS number |
| `_filename` | Stem for the output names |
| `_thickness` | Sample thickness, cm |
| `_samscatt` | Sample scattering run |
| `_samtrans` | Its transmission run |
| `_bkgscatt` | Background run |
| `_bkgtrans` | Background transmission run |
| `_numqbins` | Number of Q bins in the output |

A configuration can be loaded from JSON instead of typed out:

    eq = EQVar('./4m.json')
    eq._outputdir = '/SNS/EQSANS/IPTS-12345/shared/output/'

Further parameters cover inelastic correction and the elastic reference; leave
them alone until you have a reason.

## 4. Run it

    drtsans reduce_template.py

`--qa` and `--dev` run against the QA or development build instead of
production. Use production unless you know why you are not.

## 5. Read the output

| File | Contents |
|---|---|
| `*_Iq.dat` | The reduced 1D profile — the result |
| `*_Iqxqy.dat` | The 2D reduced pattern |
| `*.png` | Plots, for a look without loading anything |
| `*.json` | Every parameter used, so it can be reproduced |
| `*.log` | What happened, warnings included |

Read the log even when it worked. A reduction that finishes while warning about
a missing transmission is not one to publish.

## Stitching configurations

A sample measured at more than one detector distance gives one profile per
configuration, which then have to be joined. The template's stitching section
takes the overlap ranges in ascending Q:

    overlap = [MergeAB_min, MergeAB_max, MergeBC_min, MergeBC_max]

`target_profile_index` picks which profile the others are scaled onto, counting
from zero. Choose the configuration you trust most on absolute scale — usually
the one with the best statistics across the overlap.

The **Stitching configurations** guide covers why; this is the how.

## Letting it guess the run list

Since 2025 a helper reads the catalogue and proposes the whole set:

    drtsans eqsans_guesslist.py <IPTS>

which writes:

    catalog_12345.csv           every run, with metadata
    runlist_12345.dat           runs grouped into a proposed list
    reduce12345_generated.py    a reduction script built from that list

Treat the generated script as a **draft**. It infers assignments from run
titles — the same evidence NeutronDesk classifies from, and wrong in the same
places. Check the pairings before running it.
