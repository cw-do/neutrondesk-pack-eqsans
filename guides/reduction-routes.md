---
id: reduction-routes
title: How EQSANS data gets reduced
category: reduction
summary: The four routes to I(Q), what they share, and which one to start with.
updated: 2026-09-16
source: sites.google.com/view/eqsans
---
# How EQSANS data gets reduced

Reduction turns raw detector events into **I(Q)** — scattered intensity against
momentum transfer. There are four routes. They produce the same thing; the
choice is about how you prefer to work.

| Route | Where | Suits |
|---|---|---|
| **Script** | analysis.sns.gov, terminal | The default. Repeatable, and easy to hand to someone else. |
| **Table** | analysis.sns.gov, spreadsheet | Many samples differing by a few columns. Little used now. |
| **Mantid** | MantidWorkbench | Interactive work, and anything that wants a GUI. |
| **Notebook** | jupyter.sns.gov | Reducing and plotting together, in a browser. |

The instrument team documents all four at **sites.google.com/view/eqsans**,
linked at the top of the Guides screen. That page is maintained by the people
who run the beamline, so where it disagrees with anything here, it wins.

## All of them start the same way

Sign in to the analysis cluster with your XCAMS or UCAMS account, move to your
experiment's shared folder, and source the setup script:

    cd /SNS/EQSANS/IPTS-<number>/shared/
    . /SNS/EQSANS/shared/usertools/eqsans_setup.sh

That puts `drtsans` on your path — the data reduction toolkit that does the
actual work in every one of the four routes.

## Which to start with

**Script reduction.** It is what the rest of these guides follow, and a script
you can re-run is worth more at three in the morning than a GUI session you
cannot reconstruct.

Table reduction still exists — `drtsans eqsans_createcatalog.py <IPTS>` writes
the spreadsheet and `drtsans eqsans_tablereduction.py` runs it — but it has
fallen out of use, and a script you can re-read is easier to hand to someone
else than a spreadsheet whose first column is an instruction.

## What NeutronDesk does here

Nothing. It has no compute and never writes to the instrument or the cluster.

What it is for is the check beforehand: whether runs are classified correctly,
whether they group into the configurations you expect, and whether each
scattering run actually has the transmission, background and empty beam it
needs — so you find a mis-set reduction on a phone rather than in an output
directory an hour later.
