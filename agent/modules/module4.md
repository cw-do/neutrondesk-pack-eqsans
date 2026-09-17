
Module 4 — Multi-Configuration and Advanced Templates for EQ-SANS
=================================================================

This module contains templates for experiments involving multiple detector distances,
multiple wavelength bands, multiple temperatures, and multi-sample logic that spans
many configurations.

These templates follow strict EQ-SANS ordering rules:
1. For each configuration: transmission → scattering
2. Never return to a previous configuration
3. Empty beam usualy does not require scattering measurement
4. Use sample position = -1 for non-standard environments
5. If user request, use straight forward sequential coding instead of using for-loops.

All templates are written in clean markdown/text format for direct RAG ingestion.

---

1. Multi-Configuration (Two Configurations)
-------------------------------------------

This template measures transmission and scattering at two different configurations
(e.g., 4m 2.5A and 4m 10A).

```
from epics import caget
from scan import *
import os
import sys
sys.path.append('/home/controls/var/tmp/scripting/dev/')
from eqsans_scanfunctions_live import *

setipts(99999)

# --- First configuration: 4m 2.5A ---
loadconf('conf_4000mm_2p5A_60Hz_trans')
openShutter()
runsampleid('T-emptybeam 4m 2.5a', 0, 'peltier', 'pc', 1, 0.15)
runsampleid('T-A 4m 2.5a', 0, 'peltier', 'pc', 2, 0.15)
closeShutter()

loadconf('conf_4000mm_2p5A_60Hz_scatt')
openShutter()
runsampleid('S-A 4m 2.5a', 0, 'peltier', 'pc', 2, 1.0)
closeShutter()

# --- Second configuration: 4m 10A ---
loadconf('conf_4000mm_10p0A_60Hz_trans')
openShutter()
runsampleid('T-emptybeam 4m 10a', 0, 'peltier', 'pc', 1, 0.15)
runsampleid('T-A 4m 10a', 0, 'peltier', 'pc', 2, 0.15)
closeShutter()

loadconf('conf_4000mm_10p0A_60Hz_scatt')
openShutter()
runsampleid('S-A 4m 10a', 0, 'peltier', 'pc', 2, 3.0)
closeShutter()
```

---

2. Multi-Configuration (Three Configurations)
---------------------------------------------

```
from epics import caget
from scan import *
import os
import sys
sys.path.append('/home/controls/var/tmp/scripting/dev/')
from eqsans_scanfunctions_live import *

setipts(99999)

configs = [
    ('conf_4000mm_2p5A_60Hz', '4m 2.5a'),
    ('conf_4000mm_7p0A_60Hz', '4m 7A'),
    ('conf_9000mm_15p0A_60Hz', '9m 15A')
]

for conf, label in configs:

    # Transmission
    loadconf(conf + '_trans')
    openShutter()
    runsampleid(f'T-emptybeam {label}', 0, 'peltier', 'pc', 1, 0.15)
    runsampleid(f'T-sampleA {label}', 0, 'peltier', 'pc', 2, 0.15)
    closeShutter()

    # Scattering
    loadconf(conf + '_scatt')
    openShutter()
    runsampleid(f'S-sampleA {label}', 0, 'peltier', 'pc', 2, 1.0)
    closeShutter()
```

---

3. Multi-Sample and Multi-Configuration Template
------------------------------------------------

This template handles several samples measured across multiple configurations.

```
from epics import caget
from scan import *
import os
import sys
sys.path.append('/home/controls/var/tmp/scripting/dev/')
from eqsans_scanfunctions_live import *

setipts(99999)

samples = [
    (2, 'A'),
    (3, 'B'),
    (4, 'C')
]

configs = [
    ('conf_4000mm_2p5A_60Hz', '4m 2.5a'),
    ('conf_8000mm_8p0A_60Hz', '8m 8A')
]

for conf, label in configs:

    # Transmission
    loadconf(conf + '_trans')
    openShutter()
    runsampleid(f'T-emptybeam {label}', 0, 'peltier', 'pc', 1, 0.15)
    for pos, name in samples:
        runsampleid(f'T-{name} {label}', 0, 'peltier', 'pc', pos, 0.15)
    closeShutter()

    # Scattering
    loadconf(conf + '_scatt')
    openShutter()
    for pos, name in samples:
        runsampleid(f'S-{name} {label}', 0, 'peltier', 'pc', pos, 1.0)
    closeShutter()
```

---

4. Multi-Temperature + Multi-Configuration Template
---------------------------------------------------

```
from epics import caget
from scan import *
import os
import sys
sys.path.append('/home/controls/var/tmp/scripting/dev/')
from eqsans_scanfunctions_live import *

setipts(99999)

temps = [25, 40, 60]
samples = [(2, 'A')]

configs = [
    ('conf_4000mm_2p5A_60Hz', '4m 2.5a'),
    ('conf_4000mm_10p0A_60Hz', '4m 10a')
]

# Transmission is done only at initial temperature
setpeltier1temp(25)
setpeltier2temp(25)
# transmission for first config
loadconf('conf_4000mm_2p5A_60Hz_trans')
openShutter()
runsampleid('T-emptybeam 4m 2.5a', 0, 'peltier', 'pc', 1, 0.15)
runsampleid('T-A 4m 2.5a', 0, 'peltier', 'pc', 2, 0.15)
closeShutter()
# transmission for second config
loadconf('conf_4000mm_10p0A_60Hz_trans')
openShutter()
runsampleid('T-emptybeam 4m 10a', 0, 'peltier', 'pc', 1, 0.15)
runsampleid('T-A 4m 10a', 0, 'peltier', 'pc', 2, 0.15)
closeShutter()

# Scattering at each config and temperature
for conf, label in configs:
    loadconf(conf + '_scatt')
    for T in temps:
        setpeltier1temp(T)
        setpeltier2temp(T)
        delay(600)
        openShutter()
        runsampleid(f'S-A {T}C {label}', 0, 'peltier', 'pc', 2, 1.0)
        closeShutter()
```

---

5. Real-experiment example: helper functions instead of a for-loop over samples
---------------------------------------------------------------------------------

An alternative acceptable style to templates 1-4's inline `runsampleid` calls (relevant when a
user asks for straightforward/sequential code per this module's Rule 5): define one local
function per measurement type, taking just the varying proton-charge value, and reuse a
module-level `conf_str` variable for the label portion of each title. Adapted from a real
9-sample, 2-configuration, 2-temperature experiment:

```
def runsamples_trans(pc):
    runsampleid('T-empty ' + conf_str, 0, 'peltier', 'pc', 1, pc)
    runsampleid('T-banjo ' + conf_str, 0, 'peltier', 'pc', 2, pc)
    runsampleid('T-porsil ' + conf_str, 0, 'peltier', 'pc', 3, pc)
    # ... one line per sample ...

def runsamples_scatt(pc):
    runsampleid('S-banjo ' + conf_str, 0, 'peltier', 'pc', 2, pc)
    # ... one line per sample ...

def runtemp_scatt(pc):
    # Only the temperature-dependent samples — 'empty'/'banjo'/'porsil' controls are typically
    # NOT re-measured at every temperature (see module5 Sec.5).
    runsampleid('S-sds-nacl-1 ' + conf_str, 117670, 'peltier', 'pc', 4, pc)
    # ...

setipts(38603)

loadconf('conf_4000mm_10p0A_60Hz_trans')
openShutter()
conf_str = '4m 10A'
runsamples_trans(0.06)
closeShutter()

loadconf('conf_4000mm_10p0A_60Hz_scatt')
openShutter()
conf_str = '4m 10A'
runsamples_scatt(1.0)
closeShutter()

# ... repeat trans+scatt for the second configuration ...

# Temperature series: transmission is NOT repeated (module5 Sec.5.1) — only scattering, per
# temperature, using runtemp_scatt. Note the set-delay-set-delay(600) pattern below: setting the
# controller once, a short delay, then setting it again before the real equilibration wait, is a
# commonly seen robustness idiom (guards against the first set not registering) — not a strict
# requirement, but a reasonable pattern to follow.
for temp in [30, 40]:
    set_polysci_temp(30)
    setpeltier1temp(temp)
    setpeltier2temp(temp)
    delay(2)
    setpeltier1temp(temp)
    setpeltier2temp(temp)
    delay(600)

    loadconf('conf_4000mm_10p0A_60Hz_scatt')
    openShutter()
    conf_str = str(temp) + 'C 4m 10A'
    runtemp_scatt(0.8)
    closeShutter()

    # ... repeat for the second configuration ...

# Cool-down: this real example set Polysci to 25C (not 20C) while Peltier went to 20C — the
# general rule (module5 Sec.4.2, always return to 20C) is the safe default; small variations in
# the exact cool-down temperature do occur in practice.
set_polysci_temp(25)
setpeltier1temp(20)
setpeltier2temp(20)
estimatetime(power=1.85)
```

End of Module 4
