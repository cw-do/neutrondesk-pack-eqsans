---
id: sansdir
title: sansdir — browsing and plotting data
category: sansdir
summary: A keyboard-driven terminal file manager for SANS data, with the keys worth memorising.
updated: 2026-09-16
source: cw-do/sansdir
---
# sansdir

A dual-pane terminal file manager for SANS data on the analysis cluster —
MDIR and Norton Commander, for NeXus files. It exists because the alternative,
forwarding a GUI over SSH to look at one file, is slow enough that people stop
looking, and stopping looking is how a bad run survives to the end of a beam
cycle.

It plots in real matplotlib windows when a display is available, and falls back
to PNGs under `~/.cache/sansdir/plots/` when there is none — so it works over a
plain SSH session.

> Not facility software. A personal tool by the same author as NeutronDesk, so
> if it is not on your path, that is why.

## Starting it

    /SNS/EQSANS/shared/script/sansdir-stable/bin/sansdir

    sansdir                                  # here
    sansdir /SNS/EQSANS/IPTS-12345/shared    # somewhere specific

Press `?` inside for the live keymap — it is generated from the command
registry, so it is never out of date with the build you are running.

## Moving around

| Key | Does |
|---|---|
| `Tab` | Switch active pane |
| `↑` `↓` `j` `k` | Move the cursor |
| `Enter` | Smart open — folder, image, text preview, or plot a catalogue run |
| `Backspace` | Up one directory |
| `/` | Filter the pane by substring; `Esc` clears |
| `g` / `G` | Jump to a path / fullscreen folder-tree picker |
| `=` | Point the other pane at this one's directory |
| `Ctrl+U` | Swap the two panes' directories |
| `Ctrl+O` | Maximise the active pane |
| `:` | Command line — every action has a `:command` too |
| `q` | Quit |

## Selecting files

| Key | Does |
|---|---|
| `Space` | Tag or untag the row under the cursor |
| `+` / `*` / `-` | Tag · tag by glob · untag by glob |
| `u` | Untag everything |

Tagging is what most operations act on: copy, move, delete, zip and batch
extract all work on the tagged set, not on the cursor.

## File operations

Function keys follow the Norton convention, so they are where your hands expect.

| Key | Does |
|---|---|
| `F2` | Rename the file under the cursor |
| `F3` | View it in the other pane |
| `F4` | Edit in `$EDITOR` |
| `F5` | Refresh both panes |
| `F6` | Copy tagged files to the other pane |
| `F7` | Move tagged files to the other pane |
| `F8` / `Del` | Delete tagged files |
| `F9` | Make a directory |
| `z` | Zip the tagged files |
| `e` | Email the tagged files |

`F5` also repairs a pane whose directory was deleted out from under it — from
the other pane, from another shell, or by someone else on a shared filesystem.
It re-anchors to the nearest surviving ancestor and says so, rather than showing
zero rows at a dead path, which looks exactly like an empty directory.

## Plotting

| Key | Plots |
|---|---|
| `p` | Smart-plot the selection, routed by file kind |
| `l` | Linear-linear plot of any tabular CSV or TSV, labelled from its header row |

`p` reads the kind from the name and the contents:

| File | Plot |
|---|---|
| `*Iq*.dat` | log-log overlay — several at once compare directly |
| `*trans*.txt` | linear T(λ) |
| `*Iqxqy*.dat` | 2D heatmap, or a tile when several are tagged |
| `*.nxs.h5` raw events | 256×192 detector heatmap |
| `*.nxs` Mantid-processed | the same heatmap, computed in pure numpy |

The processed-file path needs no Mantid installed, which is what makes it usable
from a terminal that has nothing else set up.

## Metadata

| Key | Does |
|---|---|
| `m` | Browse the cursor file's NeXus tree, expanded lazily |
| `M` | Batch extract metadata from the tagged files |
| `K` | Build a detector mask from the cursor's NeXus file |

Inside the `m` tree, `/` switches to keyword search — type a fragment and scan
hits with `↑`/`↓` without leaving the search box, instead of expanding your way
down to `/entry/DASlogs/…`. The detail pane shows dtype, shape, units and a
value preview.

Batch extract has two modes, and the difference matters:

- **Per-file** keeps the full DASlogs arrays, one CSV per input. The output
  template uses `<filename>` as the placeholder.
- **Summary** reduces each time series to its mean, one row per file — the right
  mode for "how long was each of these" or "what temperature did each sit at".
  `Ctrl+T` adds standard deviation and count columns.

## Without the TUI

The same extraction runs as a plain command, which is what you want in a script:

    sansdir extract -k /entry/duration *.nxs.h5

    # one row per file, time series reduced to means
    sansdir extract \
      -k /entry/DASlogs/temperature/value \
      -k /entry/duration \
      --out summary.tsv \
      /SNS/EQSANS/IPTS-12345/nexus/EQSANS_*.nxs.h5

    # one CSV per file, full arrays kept
    sansdir extract \
      -k /entry/DASlogs/temperature/time \
      -k /entry/DASlogs/temperature/value \
      --out '<filename>_temp.csv' \
      EQSANS_172749.nxs.h5 EQSANS_172750.nxs.h5

`--with-stats` adds stdev and n columns in summary mode.

## The catalogue

| Key | Does |
|---|---|
| `i` | Search ONCat by IPTS or keyword; picking one moves to `<IPTS>/shared/` and loads its runs |
| `c` | Show or hide the catalogue pane |

The catalogue always opens on the right pane wherever you pressed `i`, so the
layout stays predictable, and `Ctrl+U` swaps the file panes without moving it.
Inside the catalogue, `Space` tags a run, `p` or `Enter` plots its raw NeXus,
`m` opens its HDF5 tree, and `M` batch-extracts from the tagged runs.

This is the same catalogue NeutronDesk shows on its Runs screen, read from the
same ONCat service — one from a terminal on the cluster, one from a phone.
