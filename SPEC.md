# SNOOP v1 Specification

SNOOP sniffs a codebase for things that should never ship. It has two parts:

- **`snoop` CLI**: scans files with three rules and prints findings as text or stable JSON.
- **Snoop web app**: the pixel-art dog that runs while a scan is in progress and sits when idle (`index.html`, `sprite.js`, `main.js`).

This document defines v1 completely and sketches v2 and v3.

---

## 1. Goals and non-goals

**v1 goals**

- Three deterministic, line-based rules with a documented contract.
- A checked-in test corpus that defines correct behavior for each rule.
- JSON output that is byte-identical for identical input and safe to diff.
- Automated tests for rules, sprite, and CLI, all in CI.
- No build step. Plain JavaScript (ES modules for the CLI, classic scripts for the web app). Zero runtime dependencies. Node 20 or later.

**v1 non-goals**

- Auto-fixing findings.
- Scanning git history (only the working tree is scanned).
- Network access or telemetry of any kind.
- Connecting the web app to real scans (it keeps the placeholder `scan()`; see v2).

---

## 2. Rules

Every rule runs per line, per file. Lines are split on `\n`, and a trailing `\r` is stripped before matching. Lines and columns are 1-based. Columns count UTF-16 code units, matching JavaScript strings and most editors.

| ID | Name | Severity | Detects |
|---|---|---|---|
| `SNOOP001` | `hardcoded-secret` | `error` | Credentials committed in source |
| `SNOOP002` | `merge-conflict-marker` | `error` | Unresolved git conflict markers |
| `SNOOP003` | `debug-statement` | `warning` | Debugger breakpoints left in code |

### SNOOP001 `hardcoded-secret`

Reports a finding when a line matches any of these:

1. **AWS access key ID**: `\b(AKIA|ASIA)[0-9A-Z]{16}\b`
2. **Private key header**: `-----BEGIN [A-Z ]*PRIVATE KEY-----`
3. **Secret-named assignment**: a key-like identifier containing `api_key`, `apikey`, `api-key`, `secret`, `token`, `password` or `passwd` (case-insensitive), followed by `=` or `:`, followed by a single- or double-quoted literal. The literal must be at least 12 characters with no whitespace.

Pattern 3 skips placeholder values. A literal is a placeholder when its whole value matches, case-insensitive:
`x+`, `\*+`, `changeme`, `example`, `placeholder`, `dummy`, `test`, `<...>`, `${...}`, or `your[-_].*`.

**Redaction.** The real secret must never appear in any output. In `snippet`, the matched secret value keeps its first 4 characters and the rest is replaced with exactly 8 `*`, whatever the original length (for example `AKIA********`). The fingerprint is computed from the redacted snippet.

### SNOOP002 `merge-conflict-marker`

- Reports any line that starts at column 1 with `<<<<<<<` or `>>>>>>>`, followed by a space or end of line.
- Reports a line that is exactly `=======` only if it lies between a reported `<<<<<<<` line and the next `>>>>>>>` line in the same file. A bare `=======`, such as a Markdown setext heading underline, is never reported on its own.
- Also reports `|||||||` (diff3 style) under the same rule as `=======`.

### SNOOP003 `debug-statement`

Applies by file extension:

| Extensions | Reported |
|---|---|
| `.js .mjs .cjs .jsx .ts .tsx` | the `debugger` keyword used as a statement |
| `.py` | `breakpoint()` and `pdb.set_trace()` / `ipdb.set_trace()` |

A match is ignored when it sits inside a line comment (`//` for JS/TS, `#` for Python) or inside a single-line string literal. v1 tracks quote state per line only. Multi-line strings and block comments are a known limitation (see v2).

`console.log` is intentionally **not** reported in v1, because it is legitimate in CLIs and scripts.

---

## 3. Scan behavior

- **Input**: one path, either a file or a directory (default `.`).
- **Directory walk**: recursive, in sorted order. The walk skips `.git/` and `node_modules/`, and does not follow symlinks.
- **Skipped files**: binary files (a NUL byte in the first 8 KB) and files larger than 1 MB. Skipped files are counted in `summary.filesSkipped`, not reported as findings.
- **Encoding**: files are read as UTF-8. Invalid sequences are replaced, never fatal.
- **Performance target**: 10,000 files / 50 MB in under 5 s on a current laptop. This is a target, not a CI gate.

---

## 4. CLI

```
snoop scan [path] [--json] [--rules SNOOP001,SNOOP003]
snoop --version
snoop --help
```

- Default output is human-readable: one line per finding, `path:line:column  severity  ruleId  message`.
- `--json` prints the JSON document (section 5) to stdout and nothing else.
- `--rules` limits the scan to the listed rule IDs. An unknown ID is a usage error.
- Diagnostics and errors always go to stderr, never stdout.

**Exit codes**

| Code | Meaning |
|---|---|
| `0` | Scan completed, no findings |
| `1` | Scan completed, one or more findings (any severity) |
| `2` | Usage error, unreadable path, or internal error |

---

## 5. JSON output (`snoop/v1`)

### Shape

```json
{
  "schema": "snoop/v1",
  "tool": { "name": "snoop", "version": "1.0.0" },
  "root": "corpus/bad",
  "summary": {
    "filesScanned": 9,
    "filesSkipped": 0,
    "findings": 3,
    "byRule": { "SNOOP001": 1, "SNOOP002": 1, "SNOOP003": 1 }
  },
  "findings": [
    {
      "ruleId": "SNOOP001",
      "ruleName": "hardcoded-secret",
      "severity": "error",
      "path": "SNOOP001/aws-key.js",
      "line": 3,
      "column": 19,
      "endColumn": 39,
      "message": "Possible AWS access key ID committed in source.",
      "snippet": "const accessKey = \"AKIA********\";",
      "fingerprint": "9f2c41d07a6be3e1"
    }
  ]
}
```

### Stability guarantees

Running `snoop scan <path> --json` twice on identical input produces byte-identical output, on any OS and from any working directory.

1. **Key order** is exactly as shown above, at every level.
2. **Formatting**: 2-space indent, `\n` line endings, one trailing newline.
3. **Finding order**: sorted by `path`, then `line`, then `column`, then `ruleId`, using code-unit comparison (not locale).
4. **Paths** are relative to `root`, use `/` on every OS, and never start with `./`.
5. **`root`** is the path argument as given, normalized to `/` separators with any trailing slash removed.
6. **`byRule`** always lists every rule that ran, including those with `0` findings, in rule ID order.
7. **No volatile fields**: no timestamps, durations, absolute paths, hostnames or PIDs.
8. **`fingerprint`**: the first 16 hex characters of `sha256(ruleId + "\0" + path + "\0" + snippet.trim())`. It does not include the line number, so it survives code moving up or down.
9. **`snippet`**: the full source line with secrets redacted (SNOOP001), truncated to 200 code units with a trailing `…` if longer.

### Versioning rules

- Within `snoop/v1`, fields are never removed, renamed, retyped, or reordered.
- New fields may be added only as optional fields at the end of an object. Consumers must ignore unknown fields.
- Any breaking change bumps the schema to `snoop/v2`.
- The golden file `corpus/expected/bad.json` enforces all of this in CI (see 7.3).

---

## 6. Test corpus

```
corpus/
  bad/
    SNOOP001/   files that must trigger SNOOP001 (and nothing unexpected)
    SNOOP002/
    SNOOP003/
  clean/        near-misses that must produce zero findings for every rule
  expected/
    bad.json    golden `snoop scan corpus/bad --json` output; the single source of truth
```

**Rules for the corpus**

- `corpus/expected/bad.json` lists every expected finding across all of `corpus/bad/`. If a file isn't listed, it must produce no findings.
- Every secret must be fake. For AWS keys, use AWS's documented example `AKIAIOSFODNN7EXAMPLE`. Private keys use a truncated, invalid body. This keeps GitHub push protection quiet and leaks nothing.
- Each rule has at least 3 bad cases and at least 3 clean near-misses.
- Changing `bad.json` is a deliberate act, reviewed like code.

**Minimum cases**

| Rule | `corpus/bad` | `corpus/clean` near-misses |
|---|---|---|
| SNOOP001 | AWS key in a JS string; `-----BEGIN RSA PRIVATE KEY-----` in a `.pem`; `apiKey: "sk_live_a1b2c3d4e5f6g7"` in JSON; two secrets on one line (two findings, different columns) | `apiKey = process.env.API_KEY`; `password: ""`; `token = "<your-token>"`; `secret = "${SECRET}"`; `api_key = "changeme"` |
| SNOOP002 | a full `<<<<<<<` / `=======` / `>>>>>>>` block (3 findings); a diff3 block with `\|\|\|\|\|\|\|`; a CRLF file with markers | Markdown file with a `=======` setext heading; `<<<<<<` (6 chars); `x <<<<<<< y` (not at column 1) |
| SNOOP003 | `debugger;` in `.js`; `debugger` without a semicolon in `.ts`; `breakpoint()` and `pdb.set_trace()` in `.py` | `// debugger;` comment; `"debugger"` inside a string; `const debuggerEnabled = true`; `debugger` in a `.md` file; `# breakpoint()` in Python |

---

## 7. Testing

All suites run locally with one command each and run in CI on every push and pull request. A PR cannot merge unless all of them pass.

| Suite | Tool | Command |
|---|---|---|
| Rule unit tests | Vitest | `npm run test:unit` |
| Sprite E2E + canvas snapshots | Playwright (`sprite` project, Chromium) | `npm run test:e2e -- --project=sprite` |
| CLI JSON E2E | Playwright (`cli` project, no browser) | `npm run test:e2e -- --project=cli` |

### 7.1 Vitest: unit tests for each rule

File: `tests/unit/rules.test.js` (one `describe` per rule).

For each rule `R`:

1. **Bad corpus**: run `R` alone over every file in `corpus/bad/`. Its findings must equal the entries for `R` in `corpus/expected/bad.json`, comparing `path`, `line`, `column`, `endColumn` and `snippet`. Running over all of `corpus/bad/`, not just `corpus/bad/R/`, catches cross-rule false positives.
2. **Clean corpus**: run `R` over every file in `corpus/clean/`. It must return zero findings. Each clean file is its own test case (`it.each`), so a failure names the file.
3. **Rule-specific cases** as inline tests:
   - SNOOP001: redaction never leaks more than the first 4 characters; the placeholder list is honored; two secrets on one line give two findings.
   - SNOOP002: `=======` outside a conflict block is not reported; CRLF lines match.
   - SNOOP003: comment and string skipping; the extension gating is correct.

Shared helpers also get unit tests: path normalization, sorting, fingerprinting, and the binary and size skips.

### 7.2 Playwright: sprite states and canvas snapshots

File: `tests/e2e/sprite.spec.js`. The web app is served by Playwright's `webServer` (`python3 -m http.server 4173`). The viewport is fixed at 960×540 with `deviceScaleFactor: 1`.

**Test hook (required v1 change to `main.js`).** When the page is loaded with `?test`, the `requestAnimationFrame` loop does not start. The page instead exposes:

```js
window.__snoop = {
  state(),            // { mode: 'idle' | 'running', x, dir, frame, tick }
  step(n = 1),        // advance n simulation ticks, then render once
  place(x, dir),      // set position and direction
};
```

The fake `scan()` timer is driven with Playwright's `page.clock` so progress is deterministic.

**State tests**

- On load: mode is `idle` and the button reads "Start Scan". `step(20)` switches between idle frames 0 and 1 (tail wag).
- Click Start Scan: the button reads "Stop Scan", mode is `running`, and each `step()` moves `x` by exactly 2 px.
- Run frames advance every 6 ticks and loop 0 → 3.
- Placed near the right edge and stepped: Snoop clamps to the edge, `dir` becomes -1, and the sprite renders mirrored.
- Click Stop Scan: mode is `idle`, the status reads "Scan stopped…", and `x` stops changing.
- Run the clock until the fake scan reaches 100%: mode returns to `idle` and the status reads "Scan complete…".

**Canvas snapshots**

- One `toHaveScreenshot()` per sprite frame: `run-0` to `run-3`, `idle-0`, `idle-1`, plus `run-0-flipped`. Each is taken at a fixed `place()` position, clipped to the sprite bounds, with `maxDiffPixels: 0`. Fills land on integer coordinates, so there is no anti-aliasing to tolerate.
- **Pixel-truth check** (independent of baselines): read the canvas with `getImageData` and assert that the center pixel of every sprite cell equals `SNOOP_PALETTE[key]` from `sprite.js`, or transparent for `.`. This catches palette or grid drift even if someone regenerates the baselines.
- Baseline images are created and checked only inside the pinned Playwright Docker image, so CI and local runs match. They are updated only with `--update-snapshots` in a PR that explains why.

### 7.3 Playwright: CLI JSON output

File: `tests/e2e/cli.spec.js`. This uses Playwright Test as the runner with no browser. Each test spawns `node bin/snoop.js` as a real process and asserts on its exit code, stdout and stderr.

- `scan corpus/bad --json`: exit code `1`, stderr empty, stdout **byte-equal** to `corpus/expected/bad.json`.
- `scan corpus/clean --json`: exit code `0`, `findings` is `[]`, and `byRule` has all three rules at `0`.
- **Determinism**: two consecutive runs give identical bytes.
- **Location independence**: running from another working directory with an absolute path gives identical `findings` and `summary`, with only `root` allowed to differ.
- **No leaks**: no raw fake secret from `corpus/bad/SNOOP001/` appears anywhere in stdout or stderr.
- **Schema**: stdout validates against `schema/snoop-v1.schema.json` (key order is checked separately by the byte-equality test).
- `--rules SNOOP002` only reports SNOOP002, and `byRule` contains only that rule.
- **Errors**: a nonexistent path or unknown rule ID gives exit code `2`, empty stdout, and a message on stderr.

### 7.4 CI

File: `.github/workflows/ci.yml`. It triggers on `push` and `pull_request`.

| Job | Runs on | Steps |
|---|---|---|
| `unit` | `ubuntu-latest`, Node 20 and 22 | `npm ci`, `npm run test:unit` |
| `e2e` | container `mcr.microsoft.com/playwright:v<pinned>-jammy` | `npm ci`, `npm run test:e2e` (both projects) |

- The Playwright image tag is pinned to the exact `@playwright/test` version in `package.json`. Both are bumped together.
- On failure, the Playwright HTML report and the snapshot diffs are uploaded as workflow artifacts.
- `unit` and `e2e` are required status checks on `main`.

---

## 8. Repository layout (v1)

```
index.html  style.css  sprite.js  main.js     web app (classic scripts, opens from file://)
bin/snoop.js                                  CLI entry
src/scan.js  src/output.js  src/walk.js
src/rules/secret.js  src/rules/conflict.js  src/rules/debug.js
schema/snoop-v1.schema.json
corpus/{bad,clean,expected}/
tests/unit/  tests/e2e/
vitest.config.js  playwright.config.js  package.json
.github/workflows/ci.yml
```

`package.json` holds dev dependencies only (`vitest`, `@playwright/test`, a JSON-schema validator). Nothing is installed at runtime.

---

## 9. Required changes to the existing web app

1. **Fixed timestep.** The simulation advances at exactly 60 ticks per second whatever the display refresh rate, using an accumulator over `requestAnimationFrame` timestamps. This fixes Snoop running about twice as fast on 120 Hz displays, and it is what lets `step()` be deterministic.
2. **The `?test` hook** described in 7.2.
3. **`?demo` mode** (already implemented): Snoop runs a fake scan, sits and wags for 2 s, then starts again, forever. It exists for manual viewing only, and E2E tests never load it.
4. The behavior is otherwise unchanged: 2 px per tick, run frames every 6 ticks, wag every 20 ticks.

---

## 10. Roadmap

### v1 (this document)

- The three rules, the CLI, `snoop/v1` JSON, and the corpus.
- The sprite web app with the placeholder `scan()`, a fixed timestep, and the test hook.
- Vitest, both Playwright suites, and CI.

**Done when**: every test in section 7 passes in CI, `corpus/expected/bad.json` is committed, and `snoop scan . --json` on the SNOOP repo itself exits `0`.

### v2: Snoop scans for real

- `snoop serve` runs a local server, and the web app drives a real scan and streams progress over Server-Sent Events. This replaces the placeholder `scan()`.
- A new sprite state, **found**: Snoop stops and points when a finding arrives. The web app gains a findings list.
- `.gitignore` support and a `snoop.config.json` for include/exclude paths and per-rule severity.
- Inline suppression: `snoop-ignore SNOOP003` on the same or the previous line.
- SARIF output (`--format sarif`) alongside JSON, for GitHub code scanning.
- SNOOP001: an entropy check for unnamed high-entropy strings.
- SNOOP003: block comments and multi-line strings.

### v3: Snoop on patrol

- A custom rule API: users add rules as modules, each with its own corpus folder and an auto-generated unit test.
- A baseline file built from fingerprints, so only new findings fail CI.
- A packaged pre-commit hook and a GitHub Action.
- Incremental scanning with a content-hash cache.
- More languages for SNOOP003 (Ruby `binding.pry`, PHP `var_dump`/`dd`, Go `runtime.Breakpoint`).
- `snoop/v2` JSON only if a breaking change is unavoidable, with a migration note and a deprecation window for v1.
