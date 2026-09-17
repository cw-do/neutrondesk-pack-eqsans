Module 10 — RheoSANS (Shear Cell) Experiments
===============================================

This module covers SANS measurement of a sample under controlled shear in a rheometer cell,
synchronized with external rheometer control software via `rheotrigger`. Ported from a real
experiment script (`rheorun1.py`).

---

1. Two blanks, not one
------------------------

A standard script needs one empty-beam run per configuration (module1 Sec.3.1). A rheoSANS cell
needs **two** separate background measurements, because the cell itself (not just the beam path)
scatters/attenuates:

- **`emptybeam`** — no cell in the beam at all, measured at a calibrated "empty" translation
  position (e.g. `emptyX`).
- **`emptycell`** — the empty rheometer cell/cup (no sample loaded yet) in the beam, measured at
  the calibrated "sample" translation position (e.g. `sampleX`). This is transmission-only in the
  worked example (no separate `emptycell` scattering run) — only the loaded sample gets a
  scattering measurement, since only one sample is loaded into the cell at a time.

2. Positioning: movetransx, not rack slot
--------------------------------------------

Like tensile-stage experiments (module9), physical position is set by `movetransx(value)`
between calibrated X positions (`emptyX`, `sampleX` — these must be calibrated per experiment,
they are not fixed constants), not by `runsampleid`'s position argument, which is simply `0`
throughout. `beamslit4(8)` (8mm) is typical for a rheoSANS cell — larger than the tensile stage's
3mm example in module9, since the cell aperture itself is larger.

3. Shear-rate series and rheotrigger
---------------------------------------

Once the real sample is loaded (commented out in the reference script until the operator has
physically loaded it — "we only load 1 sample at a time"), scattering is measured across a list
of shear rates, synchronized with the rheometer via `rheotrigger(value)`:

```
shear_rate = [0, 0.1, 100, 1, 10, 30, 0]
trigger    = [1, 0,   1,   0, 1,  0,  1]
# trigger=1 (+5V) starts a transition; the rheometer software then signals back on a
# low-voltage line when it's ready to move to the next rate — hence the alternating 1/0/1/0.
```

For each shear rate: `loadconf` the scattering config, `beamslit4`, `openShutter`,
`runsampleid` (title includes `SR-<rate>`), `closeShutter`, `delay(2)`, `rheotrigger(trigger[i])`,
`delay(2)` before moving to the next rate.

4. Naming convention
-----------------------

`T-<blank> <config> sa<slit>mm` for the two blanks, `S-<sample> SR-<rate> <config> sa<slit>mm`
per shear rate. Example: `S-3a-20be-40si SR-10 4m10a sa8mm` — sample "3a-20be-40si" at shear rate
10, 4m/10Å config, 8mm slit aperture. Like module9, this is a looser free-form annotation style,
not module1 Sec.7's fixed grammar.

5. Example (adapted from a real experiment, blanks only — sample loading is a manual step)
----------------------------------------------------------------------------------------------

```
setipts(35781)
sampleX = 545  # calibrated per experiment
emptyX = 640   # calibrated per experiment

loadconf('conf_4000mm_10p0A_60Hz_trans')
beamslit4(8)
movetransx(emptyX)
openShutter()
runsampleid('T-emptybeam 4m10a sa8mm', 0, 'banjo', 'pc', 0, 0.05)

movetransx(sampleX)
runsampleid('T-emptycell 4m10a sa8mm', 0, 'banjo', 'pc', 0, 0.05)
closeShutter()

loadconf('conf_4000mm_10p0A_60Hz_scatt')
beamslit4(8)
openShutter()
runsampleid('S-emptycell SR-0 4m10a sa8mm', 0, 'banjo', 'pc', 0, 3.5)
closeShutter()

# Repeat the transmission+scattering blank pair for each additional configuration (e.g. 4m 2.5a)
# before the real sample is loaded into the cell.
```

Note: `build_sample_script`/`build_temperature_script` do NOT generate rheoSANS scripts — the
shear-rate loop with rheometer trigger synchronization doesn't fit the sample-list-by-
configuration model. Compose these scripts directly using this module and `lookup_scan_function`.

End of Module 10
