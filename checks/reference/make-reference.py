#!/usr/bin/env python3
"""Produce checks/reference/selfcheck.json from the ORIGINAL Python.

    python checks/reference/make-reference.py <path to eqsans-agent-for-ndesk> [output.json]

Imports the source's pure qrange module (standard library only) straight from
its src/ tree, points it at its corpus, and runs the same enumeration
src/index.ts selfCheck() runs, writing JSON with sorted keys.

The reference covers `configs` and `qrange`. It leaves out `labels`: label
resolution (`4m 2.5a` -> `conf_4000mm_2p5A_60Hz`) is an addition the pack made
for its system prompt and the Python never had. The scan-function lookup is no
longer this pack's code (the app builds it over agent/scan-functions.txt), so
it is not part of selfCheck either. pack-check compares key by key and reports
the uncovered key.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: make-reference.py <source repo> [output.json]")
    source = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).with_name("selfcheck.json")

    os.environ["EQSANS_QRANGE_CONFIG_DIR"] = str(source / "corpus" / "eqsans_qconfig")
    sys.path.insert(0, str(source / "src"))

    from eqsans_agent import qrange  # noqa: E402

    configs = qrange.list_configs()
    q = {}
    for name in configs:
        params = qrange.load_config_data(name)
        q[name] = None if params is None else qrange.calculate_q_range(params)

    reference = {"configs": configs, "qrange": q}
    out.write_text(json.dumps(reference, sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    print(f"wrote {out} ({out.stat().st_size} bytes) from {source}")


if __name__ == "__main__":
    main()
