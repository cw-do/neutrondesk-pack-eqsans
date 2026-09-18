#!/usr/bin/env python3
"""Produce checks/reference/selfcheck.json from the ORIGINAL Python.

    python checks/reference/make-reference.py <path to eqsans-agent-for-ndesk> [output.json]

Imports the source's pure modules (qrange, scanfunctions: standard library
only) straight from its src/ tree, points them at its corpus, and runs the
same enumeration src/index.ts selfCheck() runs, writing JSON with sorted keys.

The reference covers `configs`, `qrange`, `functionNames` and `search`. It
leaves out `labels`: label resolution (`4m 2.5a` -> `conf_4000mm_2p5A_60Hz`)
is an addition the pack made for its system prompt and the Python never had.
pack-check compares key by key and reports the uncovered key.

The fixed inputs below (the search keywords) are duplicated in src/index.ts.
Change both.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

SEARCHES = ["peltier", "transmission", "robot", "shutter", "temperature", "zzzqqq"]


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: make-reference.py <source repo> [output.json]")
    source = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).with_name("selfcheck.json")

    os.environ["EQSANS_QRANGE_CONFIG_DIR"] = str(source / "corpus" / "eqsans_qconfig")
    os.environ["EQSANS_SCAN_FUNCTIONS_FILE"] = str(source / "corpus" / "eqsans" / "eqsans_scanfunctions_live.txt")
    sys.path.insert(0, str(source / "src"))

    from eqsans_agent import qrange, scanfunctions  # noqa: E402

    configs = qrange.list_configs()
    q = {}
    for name in configs:
        params = qrange.load_config_data(name)
        q[name] = None if params is None else qrange.calculate_q_range(params)

    reference = {
        "configs": configs,
        "qrange": q,
        "functionNames": scanfunctions.list_functions(),
        "search": {k: [name for name, _body in scanfunctions.search_functions(k)] for k in SEARCHES},
    }
    out.write_text(json.dumps(reference, sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes) from {source}")


if __name__ == "__main__":
    main()
