Module 12 — Data Reduction and Data Viewing Tools
===================================================

An EQ-SANS experiment has two distinct stages, and this agent's knowledge base is split along
that line:

- **Data collection / measurement / experiment** (modules 1–11) — planning and scripting the
  actual beamtime measurement: configurations, proton charge, sample environments, scan
  functions. This is what the rest of this knowledge base and this agent's tools
  (`build_sample_script`, `build_temperature_script`, `qrange_lookup`, `lookup_scan_function`)
  are for.
- **Data reduction / analysis / plotting / viewing** (this module) — everything that happens
  *after* measurement, once raw NeXus files already exist: reducing them into I(Q) (or
  I(Qx,Qy)), stitching configurations together, browsing/plotting/inspecting files. This is a
  separate stage with separate tools — none of it runs through `build_sample_script` /
  `build_temperature_script`, and none of the measurement-planning rules (proton charge,
  temperature sequencing, transmission-before-scattering, empty-beam requirements, etc.) apply
  here.

Point users here when they ask "how do I reduce my data," "how do I look at/plot my data," or
similar analysis-stage questions — not when they're asking about measuring/collecting data,
which belongs in modules 1–11.

1. eqsanscli — interactive data reduction
------------------------------------------

### 1.1 What it is
`eqsanscli` (https://github.com/cw-do/eqsanscli) is an interactive terminal application for
reducing EQ-SANS SANS data: catalog, match, reduce, stitch, and plot. It wraps `drtsans`
(the Mantid-based EQ-SANS reduction package) behind a guided, textual TUI (and a headless
JSON-over-stdin mode for scripted/agent use), so a user does not need to hand-author a drtsans
reduction script to get from raw NeXus files to a finished I(Q).

### 1.2 Where it runs
Available on the `analysis.sns.gov` analysis cluster at
`/gpfs/neutronsfs/instruments/EQSANS/shared/script/eqsanstools-cli`. Requires Python 3.10+, the
`drtsans` CLI, and access to the SNS filesystem and the ONCat network (for catalog loading).

### 1.3 Core workflow
Typical session: load an experiment by IPTS number, review/correct the automatic run
classification (sample / transmission / background / empty beam), let the tool auto-match
transmission and background runs to each sample, apply a reduction preset, run the reduction,
then stitch results together across detector distances/configurations for a combined I(Q).

Key commands: `/load ipts`, `/matchruns`, `/apply preset`, `/reduce`, `/stitch`, `/calibrate`,
`/mask create`, `/share`, `/autopilot` (runs the full catalog → match → reduce → stitch → plot
sequence automatically). Also supports absolute-scale calibration against reference standards,
preset comparison, and 24-hour anonymous file-sharing links for sending results to collaborators.

### 1.4 Tutorial and documentation
Full documentation, a step-by-step guide, 12 video screencasts, a complete command reference
(52 commands), parameter documentation, and validation-rule reference live at
https://cw-do.github.io/eqsanscli/. The "shortest possible reduction" quick-start there shows
the minimal 6-command path from load to plot — a good first pointer for a user asking how to
get started with reduction.

### 1.5 When to suggest it
For "how do I reduce my EQ-SANS data" type questions, `eqsanscli` is a strong first suggestion:
it's interactive, guided, and built specifically for EQ-SANS (not a general Mantid/drtsans
script the user has to adapt themselves).

2. sansdir — browsing and viewing data
----------------------------------------

### 2.1 What it is
`sansdir` (https://github.com/cw-do/sansdir) is a fast, keyboard-driven dual-pane terminal file
manager for SANS data on the analysis cluster, in the style of DOS-era Norton Commander /
MDIR. It is a *viewing/browsing* tool, distinct from `eqsanscli`'s reduction workflow — use it
when the question is about looking at, plotting, or organizing data files rather than reducing
them, though the two are complementary (e.g. browse and plot reduced `*Iq.dat` output from an
`eqsanscli` reduction in `sansdir`).

### 2.2 Where it runs
No install needed on the analysis cluster — run directly from
`/SNS/EQSANS/shared/script/sansdir/bin/sansdir`, or symlink it onto your `PATH`. No X11 display
server required (true terminal app); renders matplotlib plots in their own windows when a
display *is* available, falling back to PNGs under `~/.cache/sansdir/plots/` otherwise.

### 2.3 Key capabilities
- Fast navigation of `/SNS/EQSANS/IPTS-*` directories, dual-pane, full MDIR/Norton-style file
  ops (copy, move, rename, delete, mkdir, zip, email).
- Smart-plot (`p`): routes by file kind — `*Iq*.dat` (1D log-log overlay), `*Iqxqy*.dat` (2D
  heatmap), `*trans*.txt` (linear transmission vs wavelength), raw or Mantid-processed
  `*.nxs(.h5)` (detector heatmap, pure numpy, no Mantid dependency needed).
  `l` gives a generic linear-linear plot of any tabular CSV/TSV.
- NeXus/metadata browsing (`m`): lazy-expanding HDF5 tree browser with keyword search over
  DASlogs and other keys; `M` batch-extracts chosen keys across many files to CSV (per-file or
  summarized).
- Detector mask creation (`K`): interactive matplotlib mask editor (rectangles/ellipses,
  bank/tube spec shorthand like `b3`, `t50`) producing a drtsans-compatible `MaskWorkspace`
  `.nxs`/`.xml` — usable directly in a drtsans/eqsanscli reduction.
- OnCat integration (`i`): search/browse by IPTS or keyword, loads the run catalog in the
  right pane for tagging, plotting, or batch metadata extraction across a whole experiment.

Note: this agent has its own direct ONCAT catalog tools (`list_ipts_catalog`,
`search_ipts_by_member`, `get_latest_run` — see the system prompt's "Catalog questions" section
and `src/eqsans_agent/oncat.py`) for exactly the OnCat-integration use case above — a "show me the
catalog of IPTS-N" or "what's the latest run" question should be answered directly with those,
not by pointing the user to `sansdir`'s interactive browser.

### 2.4 When to suggest it
For "how do I see/look at/browse my data," "how do I quickly plot a run," or "how do I make a
detector mask" type questions, `sansdir` is the natural suggestion — it is purpose-built for
exactly this on the analysis cluster and needs no setup.

3. General data reduction background and tutorials
-----------------------------------------------------

### 3.1 Site
https://sites.google.com/view/eqsans is a more general reference for EQ-SANS data reduction,
oriented around the underlying scripting/Mantid approaches rather than a specific interactive
tool. Useful when a user wants to understand or author their *own* reduction script/notebook
rather than use a guided tool, or wants background on the reduction methods themselves.
Sections 4–9 below are digested from this site's four sub-pages (Script Reduction, Table
Reduction, Reduction in Mantid, Reduction in Web UI).

### 3.2 Approaches described
The site documents four ways to reduce EQ-SANS data, all using the same underlying `drtsans`
reduction engine and the same reduction parameters (section 5), just different front ends:
1. **Python script-based reduction** — drtsans Python scripts run on the analysis cluster
   (section 4). Most flexible; what the auto-generated script from `eqsans_guesslist.py` uses.
2. **Excel table-based reduction** — spreadsheet-driven reduction on the analysis cluster
   (section 7). Good for batch-reducing many samples without editing Python.
3. **Reduction in Mantid** — script or table reduction run inside MantidWorkbench instead of
   the terminal (section 8); same underlying algorithms, GUI-driven.
4. **Reduction via Web UI** — a browser-based front end over the same catalog/match/reduce/
   stitch workflow (section 9), similar in spirit to `eqsanscli` but browser-based instead of a
   terminal TUI.

### 3.3 Related resources linked from the site
- `analysis.sns.gov` — the primary Linux environment for reduction, plotting, and analysis
  (same cluster `eqsanscli` and `sansdir` run on; login with xcams/ucams credentials).
- `jupyter.sns.gov` — Jupyter notebook server for notebook-based reduction.
- `oncat.ornl.gov` / `ipts.ornl.gov` — data catalog and proposal management; used to look up run
  numbers for `_samscatt`, `_samtrans`, `_bkgscatt`, `_bkgtrans`, `_empty`, etc.
- SASView — Windows/Mac desktop application for further visualization and model fitting of
  reduced I(Q) data.
- Video tutorials on the ORNL neutron scattering YouTube channel.

4. Script-based reduction workflow (analysis cluster)
-----------------------------------------------------

### 4.1 Setup and running a script
On `analysis.sns.gov`, in a terminal:
```
cd /SNS/EQSANS/IPTS-****/shared/
. /SNS/EQSANS/shared/usertools/eqsans_setup.sh
```
(note the leading `.` and the space after it — this sources the setup script into the current
shell, it does not execute it as a subprocess). This drops a `reduce_template.py` starting
point into the working directory and puts the `drtsans` command on `PATH`.

Edit the template with a text editor (`gedit reduce_template.py &` or `pluma reduce_template.py &`
so it doesn't block the terminal), fill in the parameters described in section 5, then run it:
```
drtsans reduce_template.py
```
QA/development builds of the reduction package can be selected explicitly:
```
drtsans --qa  reduce_template.py
drtsans --dev reduce_template.py
```

### 4.2 Output files
A successful reduction run produces, per sample/configuration:
- `*_Iq.dat` — 1D reduced intensity I(Q).
- `*_Iqxqy.dat` — 2D intensity I(qx, qy).
- `*.png` — quick-look 1D and 2D plots.
- `*.json` — the reduction parameters actually used (a record of the run, reusable as a starting
  config for a similar reduction).
- `*.out` — log file.
- `*_trans.txt` — fitted transmission.
- `*_raw_trans.txt` — raw (unfitted) transmission data.

`sansdir` (section 2) is a natural next step for browsing/plotting these outputs.

### 4.3 A minimal EQVar reduction script
Reduction scripts configure an `EQVar` object (one instance per sample/configuration) and call
`reduceNow`:
```python
eq = EQVar('./4m.json')                  # start from a saved/template config
eq._outputdir = '/SNS/EQSANS/IPTS-12345/shared/output/'
eq._ipts = 12345
eq._standardabsolutescale = 1
eq._sampleaperturesize = 10
eq._maskfilename = '/SNS/EQSANS/IPTS-12345/shared/useThisMask.nxs'
eq._numqbins = 80
eq._empty = 10000
eq._thickness = 0.1
eq._bkgscatt = '10001'
eq._bkgtrans = '10002'
eq._samscatt = '10003'
eq._samtrans = '20003'
eq._filename = 'sample1'
reduceNow(eq)
```
For multiple samples, repeat the `EQVar(...)` / set-attributes / `reduceNow(eq)` block per
sample within the same script (or per configuration, for a multi-configuration experiment —
see section 6 for stitching the results together afterward).

### 4.4 Auto-generating a starting script (2025+)
After sourcing `eqsans_setup.sh`, an auto-list generator can build a first-draft catalog and
reduction script directly from the run catalog for a given experiment:
```
drtsans eqsans_guesslist.py [IPTS_number]
```
This produces:
- `catalog_[IPTS].csv` — the run catalog.
- `runlist_[IPTS].dat` — run numbers with automatically matched transmissions and sample names.
- `reduce[IPTS]_generated.py` — an auto-generated reduction script.

**Always review the generated script before running it** — the tool states this explicitly; the
automatic run-matching is a starting point, not guaranteed correct for every experiment. Once
reviewed, run it the same way as any other reduction script:
```
drtsans reduce[IPTS]_generated.py
```
This is conceptually the same auto-match step `eqsanscli`'s `/matchruns` performs, just as a
plain script instead of an interactive TUI.

5. Reduction parameters reference
----------------------------------

These are `EQVar` attributes (script reduction) — the same names appear as 'v' (variable) rows
in table reduction (section 7) and as fields in the Mantid `EQSANSScriptDRT`/`EQSANSTableDRT`
algorithms (section 8) and the Web UI's "Reduction Configs" tab (section 9), since all four
front ends drive the same underlying `drtsans` parameters.

### 5.1 Run identification (required for every reduction)
- `_instrumentname` — instrument, set to `EQSANS`.
- `_ipts` — IPTS number.
- `_filename` — output filename stem for this sample/configuration.
- `_thickness` — sample thickness, in cm.
- `_samscatt` / `_samtrans` — sample scattering / transmission run number.
- `_bkgscatt` / `_bkgtrans` — background (e.g. solvent/buffer) scattering / transmission run
  number.
- `_beamcenter` — beam-center run number.
- `_empty` — empty-beam run number (for transmission normalization).
- `_filterbytimestart` / `_filterbytimestop` — optional start/stop time to restrict which
  portion of a run is reduced (e.g. for time-resolved or kinetics data).

### 5.2 Output, directories, and instrument config
- `_outputdir` — output folder path.
- `_instrumentconfigurationdir` — default `/SNS/EQSANS/shared/instrument_configuration`.

### 5.3 Masking and dark current
- `_maskfilename` — full path to a mask file (e.g. one built with `sansdir`'s mask editor,
  section 2.3, or `sansdir mask` from the CLI).
- `_usedefaultmask` — use the standard instrument-configuration mask instead of/alongside a
  custom one.
- `_usemaskbacktubes` — mask the detector's back tube layers (default False).
- `_darkfilename` — dark-current file.

### 5.4 Normalization and flux
- `_normalization` — normalization method, default `"Total charge"`.
- `_fluxmonitorratiofile` — flux ratio file.
- `_beamfluxfilename` — wavelength-dependent flux file.
- `_sensitivityfilename` — detector sensitivity file.
- `_usesolidanglecorrection` — enable solid-angle correction (default True).
- `_usethetadeptranscorrection` — enable theta-dependent transmission correction (default True).
- `_mmradiusfortransmission` — radius used for the transmission measurement, default 25 mm.

### 5.5 Absolute scaling
- `_absolutescalemethod` — use `"standard"` method (porous silica calibration).
- `_standardabsolutescale` — the scale value itself; requires a porous-silica (or equivalent)
  calibration measurement to determine.

### 5.6 Geometry and apertures
- `_sampleoffset` — sample position offset, default 314.5.
- `_usedetectoroffset` — enable detector offset from moderator (default True).
- `_detectoroffset` — detector offset from moderator, default 80 mm.
- `_sampleaperturesize` — sample aperture, in mm.
- `_sourceaperturediameter` — source aperture, in mm.

### 5.7 Time-of-flight and wavelength
- `_cuttofmin` / `_cuttofmax` — low/high TOF cutoff, default 500 µs / 2000 µs.
- `_wavelengthstep` — wavelength bin width, default 0.1 Å.
- `_wavelengthsteptype` — binning method: `"constant Delta lambda"` (default) or
  `"constant Delta lambda/lambda"`.

### 5.8 Time/log slicing (kinetics, time-resolved data)
- `_usetimeslice` — enable time-slicing (default False).
- `_timesliceinterval` / `_timesliceoffset` / `_timesliceperiod` — slice interval, starting
  offset, and period definition, in seconds.
- `_uselogslice` — slice by a DASlog value instead of wall-clock time.
- `_logslicename` — which DASlog to slice on.
- `_logsliceinterval` — log-slice interval.

### 5.9 Q-binning and Q-range
- `_numqxqybins` — number of 2D output bins, default 80.
- `_1dqbintype` — 1D output method, default `"scalar"`.
- `_qbintype` — `"linear"` or `"log"` binning.
- `_numqbins` — number of Q values, default 120.
- `_logqbinsperdecade` — bins per decade, for log binning.
- `_uselogqbinsdecadecenter` / `_uselogqbinsevendecade` — alternate log-binning conventions
  (both default False).
- `_wedgeminangles` / `_wedgemaxangles` — wedge angle range, for anisotropic/wedge-averaged
  reduction.
- `_annularanglebin` — annular bin angle, default 5°.
- `_qmin` / `_qmax` — output Q-range limits.
- `_useerrorweighting` — error-weighted binning (True/False).

### 5.10 Resolution / smearing
- `_smearingpixelsizex` / `_smearingpixelsizey` — pixel size used for Q-resolution smearing.
- `_usesubpixels` — enable subpixel mode (default False).
- `_subpixelsx` / `_subpixelsy` — subpixel counts in x/y when subpixel mode is enabled.

### 5.11 Pixel calibration
- `_usepixelcalibration` — not used for EQ-SANS (present for cross-instrument compatibility).
- `_scalecomponents` — pixel position scaling, default `[1, 1, 1]`.

### 5.12 Incoherent/inelastic correction and elastic reference
Used for samples with significant inelastic/incoherent scattering where a simple background
subtraction is insufficient:
- `_fitinelasticincoh` — enable the incoherent correction (default False).
- `_selectminincoh` — use the minimum-incoherent algorithm (default True).
- `_incohfit_qmin` / `_incohfit_qmax` — force the Q-range used for the incoherent fit.
- `_incohfit_factor` — use an intensity-factor criterion for the fit Q-range instead.
- `_incohfit_intensityweighted` — enable intensity weighting in the fit (default False).
- `_elasticref` / `_elasticreftrans` — elastic reference scattering / transmission run.
- `_elasticbkg` / `_elasticbkgtrans` — elastic reference's own background scattering /
  transmission run.
- `_elasticrefthickness` — elastic reference sample thickness.

6. Data stitching across configurations
------------------------------------------
When an experiment measures a sample at multiple detector distances/configurations (e.g. 1.3m,
4m, 9m — see module1 §2.2 for configuration naming), each configuration's `*_Iq.dat` covers a
different Q-range; stitching merges them into one combined I(Q) curve:
- List stitching ranges in order of increasing Q (low-Q configuration first).
- The `overlap` array gives the overlap region between each adjacent pair, in the form
  `[MergeAB_min, MergeAB_max, MergeBC_min, MergeBC_max, ...]` for three or more curves.
- `target_profile_index` selects which curve's absolute scale the others are scaled to match
  (the first curve is index 0).
- Resulting scale factors are printed to the terminal for each merged curve — check these are
  close to 1 as a sanity check that the configurations agree in their overlap region.
- Default merged output filename is `_merged_[samplename]_Iq.txt` unless a `merged_fn` argument
  is given explicitly.

`eqsanscli`'s `/stitch` command (section 1.3) performs this same operation interactively, with
quality-of-stitch analysis, instead of setting these parameters by hand.

7. Table-based reduction (Excel/gnumeric)
--------------------------------------------
An alternative to writing an `EQVar` script directly: fill in a spreadsheet instead.

### 7.1 Workflow
```
cd /SNS/EQSANS/IPTS-****/shared/
. /SNS/EQSANS/shared/usertools/eqsans_setup.sh
drtsans eqsans_createcatalog.py [IPTS_number]
gnumeric [catalog_filename]
```
Edit the spreadsheet (see 7.2), save, then run:
```
drtsans eqsans_tablereduction.py [catalog_filename]
```

### 7.2 Row types
The first column of each row identifies its type; rows execute in ascending order:
- **`v` rows (variables)** — set a reduction parameter (section 5's names) for the reductions
  that follow; column 2 is the parameter name, column 3 the value.
- **`y` rows (reduce)** — run a reduction using the run numbers/settings on that row.
- **`s` rows (stitch)** — combine multiple already-reduced datasets (section 6); the columns
  needed for stitching are labeled in the header row.

Practical notes: change a row's leading letter (e.g. `y` → `c`, for "comment out") to skip it
without deleting it; duplicate a row to run the same reduction again with different parameters;
stitching chains beyond three configurations by feeding an already-stitched output file back in
as an input to another `s` row.

8. Reduction in MantidWorkbench
-----------------------------------
The same script- and table-based reductions can be driven from inside MantidWorkbench's GUI
instead of the terminal, if that's a more familiar environment.

### 8.1 Launching
Command line: `mantidworkbench --env=sans-qa` or `mantidworkbench --env=sans-dev`. Or from the
analysis-cluster desktop: top menu → **Analysis** → **Mantid Workbench**.

### 8.2 One-time setup
File → **Manage User Directories** → add `/SNS/EQSANS/shared/script/MantidAlgorithms` to the
Python Script Directories list → close and restart MantidWorkbench. EQ-SANS-specific
algorithms then appear under the **EQSANS** category in the algorithm search.
Optional: also add `/SNS/EQSANS/shared/script/eqsanstools` (via "Add Directory") to use the
IPython window with the eqsans Python packages loaded, and restart again.

### 8.3 Algorithms
- **EQSANSScriptDRT** — run a script-based reduction (section 4/5) from within Mantid.
- **EQSANSCreateCatalog** — build a run catalog (equivalent of `eqsans_createcatalog.py`).
- **EQSANSTableDRT** — run a table-based reduction (section 7) against an Excel file.
- **EQSANSUpdateCatalog** — refresh a catalog mid-experiment as new runs come in.
- **EQSANSOpenTable** — opens a reduction table via gnumeric from within Mantid.
- **GuinierFit** — Guinier analysis on reduced I(Q) data.
- **PlotSANS2D** / **PlotSANS2DScatter** — 2D visualization.
- **ScaleFactor_DBFit** — Debye-Bueche fitting for absolute-scale determination.
- **ScaleSubtract** — intensity scaling/subtraction between datasets.

9. Reduction via Web UI
---------------------------
A browser-based front end over the same catalog → match → reduce → stitch workflow, similar in
spirit to `eqsanscli` (section 1) but run through a browser instead of a terminal TUI.

### 9.1 Launching
```
cd /SNS/EQSANS/IPTS-****/shared/
. /SNS/EQSANS/shared/usertools/eqsans_setup.sh
./run_webui.sh
```
This opens a browser window automatically.

### 9.2 Workflow
1. Enter the IPTS number and generate the catalog.
2. Review/correct the pre-filled background scattering, transmission, and empty-beam
   assignments; match transmission run numbers to scattering runs.
3. Mark rows to be reduced with `r` in the first column, then save.
4. Open the **Reduction Configs** tab; verify shared settings (output directory, IPTS number),
   and review individual configurations via the dropdown menu (same parameters as section 5).
5. Assign an output filename and generate the Python reduction script; run it either via
   `drtsans` in the terminal or the web UI's own run button.
6. For stitching: specify the folder and file-name pattern, refresh the file list, assign files
   to configuration slots, check Q-range overlaps, then stitch (section 6).

10. Guidance: which option to point a user to
------------------------------------------------

- "How do I reduce my data?" → lead with `eqsanscli` (section 1) for a guided, interactive,
  EQ-SANS-specific experience. If the user wants to author or understand their own reduction
  script instead, walk them through section 4 (script-based reduction) using the parameter
  reference in section 5; mention table reduction (section 7), Mantid (section 8), or the web
  UI (section 9) as equivalent alternative front ends if they prefer a spreadsheet or GUI over a
  Python script.
- "What does parameter X do / how do I set X?" → answer directly from section 5 (organized by
  category: run identification, masking, normalization, absolute scale, Q-binning, resolution,
  incoherent/elastic correction, etc.) rather than guessing — these are real `EQVar`/`drtsans`
  parameter names, not something to invent.
- "How do I combine my 4m and 9m data?" / "how do I stitch configurations?" → section 6
  (stitching), or `eqsanscli`'s `/stitch` command for the interactive equivalent.
- "How do I see/browse/plot my data?" → `sansdir` (section 2).
- "How do I make a detector mask?" → `sansdir`'s interactive mask editor (`K`), which is
  drtsans-compatible and can feed directly into `_maskfilename` (section 5.3) for any of the
  reduction front ends above.
- These are all analysis-cluster tools, separate from this agent's own scripting tools
  (`build_sample_script`/`build_temperature_script`, which generate *measurement* scripts, not
  reduction scripts) — do not confuse the two when answering.

End of Module 12
