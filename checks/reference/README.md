# Reference from the Python original

`selfcheck.json` here was produced by `make-reference.py` running the original
Python of `cw-do/eqsans-agent-for-ndesk` (commit `1c5a201`) over the same
inputs `src/index.ts` `selfCheck()` enumerates. `npm test` (check H28) fails
unless the pack's TypeScript agrees with it to 1e-12, key by key.

It covers every configuration's Q-range (`configs`, `qrange`). It does not
cover `labels`, because resolving a label like `4m 2.5a` is an addition this
pack made for its system prompt; the Python had no such thing. The
scan-function lookup used to be compared here too; it is now the app's own
code, built over `agent/scan-functions.txt`, and the app checks it.

Regenerate only when the Python original changes:

```bash
python checks/reference/make-reference.py <path to eqsans-agent-for-ndesk>
```

and record the new source commit above.
