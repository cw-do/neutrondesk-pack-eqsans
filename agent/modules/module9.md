Module 9 — Tensile Stage (psylo) Experiments
=============================================

This module covers SANS measurement of a sample under controlled mechanical stretching on the
"psylo" tensile stage — a different physical setup from the standard peltier/banjo/ti/tumbler
racks in module1. Ported from a real experiment script (`tensile1.py`).

---

1. What's different from a standard sample script
---------------------------------------------------

- The sample is positioned by moving a **translation stage** (`movetransx`, and `movetransz` for
  height), not by choosing a rack slot number. `runsampleid`'s position argument is `-1`
  (non-standard environment — see module1 Sec.6.2/12) for every measurement in a tensile
  experiment, even though the `sample_env` string passed is still `'peltier'` by convention.
- The sample is stretched incrementally with `psylo_tension_step(speed, dist, selector='both')`
  between scattering measurements — the same physical sample is re-measured at each new
  displacement, not a series of different samples.
- `psylo_stop()` halts stage motion; rarely needed (a normal script lets each step finish).
  `psylo_compression_step`, `psylo_rotccw`, and `psylo_rotcw` also exist for compression and
  rotation stages — same idea, different motion; look them up with `lookup_scan_function` before
  using them, since usage patterns for those aren't captured here yet.
- `beamslit4(size_mm)` sets the beam-defining slit aperture — smaller for a small/narrow sample
  (e.g. `beamslit4(3)` for a 3mm-wide tensile bar) than for a standard cell (module1 default is
  effectively larger; rheoSANS in module10 uses 8mm).

2. Sequence
-----------

1. `loadconf` the transmission configuration, `movetransx` to the calibrated sample position,
   `openShutter`, ONE `runsampleid` transmission run for the sample (no separate empty-beam
   T-run in this example — the tensile stage's empty-beam calibration is evidently handled
   outside this script; don't assume that's always true, ask if unsure), `closeShutter`.
2. `loadconf` the scattering configuration, set `beamslit4`, `movetransx` back to the sample
   position, `openShutter`.
3. Run the FIRST scattering measurement at zero displacement (`_d0` suffix).
4. Repeat: `psylo_tension_step(...)` (stretch by `dist` on `selector='both'` sides, so the total
   displacement increases by `2 * dist` each step) → `runsampleid` scattering run, named with the
   cumulative displacement in mm (`_d2`, `_d4`, `_d6`, ... — e.g. two steps of `dist=1.0` on both
   sides = 4mm cumulative, named `_d4`).
5. `closeShutter` after the last step; `movetransx` back to a resting position;
   `estimatetime(power)` to estimate total run time.

3. Naming convention
---------------------

`T-<sample> <config label><fs?><slit annotation>` for transmission,
`S-<sample>_d<cumulative_mm> <config label><fs?><slit annotation>` for each scattering step.
Example: `S-70.30PBD_0.05phr_d4 4m 2.5Afs 3mmsa` — sample "70.30PBD_0.05phr" at 4mm cumulative
displacement, 4m/2.5Å config, "fs" (frame-skipping — see module1 Sec.2.2's 30Hz note), 3mm slit
aperture. This is a looser, more descriptive naming style than module1 Sec.7's `<dist>m
<wavelength>A` — the slit/mode annotations are appended free-form, not a fixed grammar.

4. Example (adapted from a real experiment)
---------------------------------------------

```
setipts(37828)

loadconf('conf_4000mm_2p5A_30Hz_trans')
movetransx(389.5)  # calibrated sample position
openShutter()
runsampleid('T-sampleA 4m 2.5Afs 3mmsa', 0, 'peltier', 'pc', -1, 0.5)
closeShutter()

loadconf('conf_4000mm_2p5A_30Hz_scatt')
beamslit4(3)
movetransx(389.5)
openShutter()
runsampleid('S-sampleA_d0 4m 2.5Afs 3mmsa', 0, 'peltier', 'pc', -1, 1.1)

psylo_tension_step(speed=0.5, dist=1.0, selector='both')
runsampleid('S-sampleA_d2 4m 2.5Afs 3mmsa', 0, 'peltier', 'pc', -1, 1.1)

psylo_tension_step(speed=0.5, dist=1.0, selector='both')
runsampleid('S-sampleA_d4 4m 2.5Afs 3mmsa', 0, 'peltier', 'pc', -1, 1.1)

closeShutter()
movetransx(120)  # rest position
estimatetime(1.6)
```

Note: `build_sample_script`/`build_temperature_script` do NOT generate tensile-stage scripts —
their sample-list-by-configuration model doesn't fit an incremental, state-dependent displacement
series. For a tensile experiment, compose the script directly using this module and
`lookup_scan_function` for exact signatures, rather than the build tools.

End of Module 9
