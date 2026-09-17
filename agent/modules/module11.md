Module 11 — Instrument Specifications and Design
===================================================

Curated from the EQ-SANS instrument design paper: Zhao, J. K., Gao, C. Y. & Liu, D. (2010),
"The extended Q-range small-angle neutron scattering diffractometer at the SNS," *J. Appl.
Cryst.* 43, 1068–1077, doi:10.1107/S002188981002217X. For anything not captured here (full
derivations, figures, references), see the source PDF.

---

1. Overview
------------

EQ-SANS (also written as **EQSANS**, no hyphen, in configuration names, scripts, and file paths
— see module1 Sec.2.2) is designed to study non-crystalline, nano-sized materials in solid,
liquid, or gas form: polymers, micelles, proteins, and other large biological molecular
complexes in solution, along with colloids, nanoparticles, and porous media (module1 Sec.1.1).
It offers high neutron flux, a broad dynamic Q-range, and wide overall Q-coverage.

EQ-SANS is on Beamline 6 at the Spallation Neutron Source (SNS), Oak Ridge — a pulsed
spallation source, 1.4 MW design power, 60 Hz repetition rate. EQ-SANS uses pinhole geometry
and views the SNS's top-downstream, **coupled supercritical hydrogen (cold) moderator**, through
a curved multichannel **beam bender** (Sec.2) that keeps the instrument out of the moderator's
direct line of sight. Fixed primary flight path: 14 m (moderator to sample). Variable secondary
flight path (sample to detector, SDD): 1–10 m per the original design paper; the low-angle
detector travels along the beam inside the scattering tank, and current operation spans
**1.3–9 m**, matching the real instrument configurations in module1 Sec.2.2
(`conf_1300mm_...` through `conf_9000mm_...`). Total instrument length: 15–24 m.

2. Neutron optics: the beam bender
-------------------------------------

The defining optical component is a **curved multichannel beam bender** (not a straight guide):
bending radius 95 m, total length 3.3 m, deflects the beam by 2°. Five curved glass inserts
divide the 40×40mm beam into six channels. Made of non-borated float glass with a supermirror
multilayer coating — 3.5θc critical angle on the main (concave) sides, 2θc on the convex sides
(θc = natural-nickel critical angle, 0.1°/Å). Manufactured by SwissNeutronics. Straight guides
follow the bender. Using a bent (rather than straight) optic avoids needing a T0 chopper to
block fast/prompt neutrons from the target, since the curve itself removes direct line-of-sight
to the moderator. Initial collimator: 270mm steel piece, 40×40mm beam opening.

3. Chopper system
--------------------

Three bandwidth-limiting choppers, T1/T2/T3, at 5.7 m / 7.8 m / 9.5 m from the moderator. Disc
diameter 637mm, boron-coated, supplied by SKF and Mirrotron. T3 is a double-disc chopper
(variable opening via relative phase between its two discs); T1 and T2 are single-disc. Cut-out
opening angles: 129.6° (T1), 180° (T2), 230° (each T3 disc).

Three operating modes:
- **60 Hz (standard)**: a clean wavelength band **3–4.3 Å wide** (exact width depends on the
  detector distance in use) — narrow, but simple and always available.
- **Pulse rejection (30 Hz)**: doubles the bandwidth by rejecting every other source pulse, but
  suffers from wavelength-leakage contamination from the rejected pulses — not generally used.
- **Frame skipping (30 Hz)**: EQ-SANS's signature mode. Two non-adjacent frames (e.g. frame 1
  and frame 3) are allowed through simultaneously and arrive at the detector at different
  times-of-flight, producing **two neutron wavelength bands** at once — giving 3× the bandwidth
  of 60 Hz operation and a wider dynamic Q-range at a single detector-distance setting,
  equivalent to a 20 Hz source, with no pulse rejected. Only usable when the detector is no more
  than twice the last chopper's distance from the moderator, i.e. **SDD ≤ 5 m** (detector ≤ 19 m
  from moderator) — beyond that, the skipped frames start to cross-talk. This is the mode behind
  the `_30Hz` / `fs` ("frame-skipping") suffix seen in some configuration/sample names (module1
  Sec.2.2, module9).

4. Collimation
----------------

Three slit wheels (S1, S2, S3), each with 8 stepper-motor-driven positions: three circular
(⌀10, 15, 20 mm), three square (10×10, 15×15, 20×20 mm), one fully open (40×40mm), one fully
closed. Sample slit is manually changeable. Six guard slits sit between S3 and the sample to
remove stray/scattered neutrons. An optional W-shaped sapphire frame-overlap mirror (between S2
and S3) reflects λ > 33 Å out of the beam with no effect below 20 Å, for higher-frame leakage
suppression when needed.

5. Detector
-------------

Low-angle detector: ³He tubes (GE), active length 1041mm, diameter 8mm, ~256 pixels/tube
(~4.3mm/pixel), operated at 1625 V (7mm FWHM spatial resolution). Gas pressure 22.1 bar (20 bar
³He). Tubes arranged in two planes (11mm tube spacing within a plane, 8.2mm between planes,
5.5mm lateral offset) on a 5 m-radius arc centered on the sample. Total active area 1×1.4 m
(1×1 m installed as of the paper). The scattering tank moves on rails ±2 m along the beamline
(for large sample-environment equipment like magnets); double-wall construction with 200mm
light concrete + 5mm sintered boron carbide lining for background shielding. Detector background
with SNS off: ~1–2 counts/s; at 650 kW source power: ~8–9 counts/s.

6. Sample environment
------------------------

### 6.1 Standard automated sample changer
The **standard** sample environment is an automated sample changer for liquid samples in
rectangular or banjo-type optical cells, 1–5mm thick, up to 20×20mm cross-section (larger
samples need a customized holder), controllable between **5°C and 60°C**. It accommodates **15
banjo cells or 10 demountable titanium cells** — the `banjo`/`ti` racks of module1 Sec.6.1. The
sample sits in a sample-environment tank (radiation shield + humidity control). No significant
magnetic material within 2 m of the sample, to keep the location compatible with magnet sample
environments.

Note: the original 2010 design paper documents a wider **253–353 K (-20°C to 80°C)** range for
this sample-changer environment as a whole; 5–60°C is the currently advertised operating spec.
Treat 5–60°C as current and -20/80°C as the original design envelope if the distinction matters
— ask if it's unclear which one a question needs.

### 6.2 Peltier blocks (extended temperature range)
An extended range of **5°C to 130°C**, with improved precision and ramp rates versus the
standard changer, is available via Peltier units accommodating **12 banjo cells** — the
`peltier` rack of module1 Sec.6.1/9.1 (12 positions across two 6-position blocks, controlled via
`setpeltier1temp`/`setpeltier2temp`). Module1 documents the Peltier's own operating range as
-10°C to 125°C; the two figures describe the same hardware at slightly different
precision/rounding, not two different environments.

### 6.3 Furnace
A furnace is available for temperatures up to **330°C** — well above the Peltier's ceiling, for
samples that need higher-temperature measurement than Peltier/polysci-chiller staging (module1
Sec.9.2) can reach. Non-standard environment: sample position = -1 (module1 Sec.6.2).

### 6.4 Sample tumbler
A sample tumbler is available for studying colloids that would otherwise settle out of solution
during a measurement — the `tumbler` rack of module1 Sec.6.1 (rotation only, ambient
temperature).

### 6.5 Relative humidity generator / GI-SANS
A relative humidity generator can interface with a goniometer to perform grazing-incidence SANS
(**GI-SANS**) measurements — this is the `gis`/`gis2` naming seen in some instrument
configurations (e.g. `conf_2500mm_2p5A_60Hz_gis_scatt`, `conf_4000mm_8p5A_60Hz_gis2_scatt` in
`corpus/eqsans_qconfig/`). Non-standard environment: sample position = -1 (module1 Sec.6.2).

7. Resolution
---------------

FWHM wavelength resolution Δλ/λ ≈ 0.33–0.53% (one order of magnitude better than a reactor
velocity selector's typical 5–30%) — set primarily by the moderator's pulse width (~20 µs FWHM
at 1 Å, scaling roughly linearly with wavelength up to ~15 Å) rather than by the neutron-
transport optics or detector timing. Q resolution combines this wavelength spread with the
angular uncertainty from the finite sizes of the source slit, sample, and detector pixels
(see the paper for the full (ΔQ/Q)² formula).

8. Data handling notes
-------------------------

Data are saved as neutron events (detector x/y, time-of-flight, source-pulse reference) — not
pre-histogrammed — so an experiment's data can be time-sliced *after* the fact using the event
timestamps, useful for time-dependent phenomena. Corrections applied before analysis: dark
current (beam-shutter-closed measurement, subtracted), empty-beam subtraction (corrects for
direct-beam scatter off the beamstop), detector efficiency and source-spectrum normalization
(multiplicative). Sample transmission is measured through a small pinhole (0.1–0.3mm) in the
beamstop center. For a sample-in-buffer/cell system, the sample-only scattering is obtained via
`I_s/T_s = I_(s+b)/T_(s+b) − I_b/T_b` (subscripts: s = sample, b = buffer/cell).

End of Module 11
