---
id: troubleshooting
title: Troubleshooting
category: troubleshooting
summary: What to check when a reduction fails or the result looks wrong, and what the symptom usually means.
updated: 2026-09-16
source: cw-do/eqsanscli knowledge/troubleshooting.md
---
# Troubleshooting

Failure modes seen in real sessions, and what each one usually means. The
diagnosis is the same whichever route you reduce by; where a specific tool has a
specific command for the fix, that lives in that tool's own guide.

## The reduction refuses to start

**No empty beam for these rows**
The rows have no empty-beam run, which is what supplies the beam centre — so
there is nothing to reduce against (protocol EMP-01). Almost always the run was
measured but is filed as something else: an empty beam whose title reads like a
transmission gets classified as one. Check what class it was given before
assuming it is missing.

**Nothing in the working table**
Runs were catalogued but never matched into rows. If you expected rows and see
none, check whether they went into a different table.

## A row fails part-way through

**Permission error on a mask or calibration file**
The path points into another IPTS's shared folder, which your account cannot
read (protocol CAL-04). This is the usual legacy of a preset copied between
experiments. Re-resolve the calibration for the current cycle rather than
editing the path by hand.

**Flood, dark or flux file not found**
The cycle folder changed, or the configuration still carries a path from an
earlier cycle. Confirm which cycle the configuration resolved to before looking
for the file.

**A drtsans error with no obvious cause**
Each row writes `.out` and `.err` next to its reduction JSON in the output
directory, and the JSON records exactly what was passed. Read the JSON first: a
wrong path, or a null where a value is required, is visible there and usually
explains the traceback.

## The output looks wrong

**Intensity off by a constant factor**
Absolute scale. Either no standard was measured, so the output is relative and
correctly so (protocol SCL-01), or the scale factor came from a different
configuration (SCL-02). Check which configuration the factor was measured in.

**A step or kink at a stitch overlap**
One configuration's background or transmission is off, or the overlap window
sits where one of the profiles is already unreliable. Always look at the
per-configuration profiles before the merged one — the merge hides which side
is wrong. See **Stitching configurations**.

**Container scattering still in the result**
No background was subtracted, or the background came from a different
configuration (protocol BKG-01). A blank background is expected only for the
background sample itself and for empty-beam rows (EMP-03); anywhere else it is
a gap.

**Noise spread across every profile**
A background with poor counting statistics propagates into everything subtracted
from it. Check the background run's duration — a background measured too briefly
costs you every sample that uses it.

## The table looks wrong

**A sample is missing entirely**
Its runs were classified `ignore`, or its title matched a background or
empty-beam keyword and it was grouped as one. Run classification reads the
title, so a sample called something like `emptycell-A` will be filed as a
background. Check the class column before concluding the data is absent.

**Rows at a configuration that should not exist**
Configuration ids come from the ONCat metadata — `detector_distance` and
`wavelength` — not from the run title. A run whose title disagrees with its
metadata lands where the metadata says (protocol CAT-06). Trust the metadata;
the title is someone's note.

**Runs spanning a cycle boundary**
A configuration whose runs straddle two calibration cycles will use the earlier
cycle for all of them (protocol TBL-07). If the later runs need the newer
calibration, they belong in their own table.

## Calibration files not updating

**Still using the previous cycle's flood after a new one is published**
A value set by hand is never overwritten automatically (protocol CFG-03), which
is deliberate — an override you made on purpose should survive. The cost is that
a hand-set path sticks after it stops being right. Re-resolving with an explicit
force is what clears it.

**A new cycle's files are not picked up at all**
A cycle folder needs at least one dark or flood run before it has an anchor run,
and without an anchor there is nothing to resolve against. A cycle published but
not yet measured looks exactly like a cycle that does not exist.
