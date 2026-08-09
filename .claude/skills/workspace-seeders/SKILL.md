---
name: workspace-seeders
description: Use when authoring, running, or reviewing a Klippel workspace seeder — `webapp/scripts/seed/*.seed.ts`, the demo/benchmark workspaces they build, their `helpers/puppeteer/generate*.ts` generators and `expected*` oracles, or the paired `integrity` test that asserts the sample's arithmetic. Triggers include "seed a demo workspace", "build the cost sample", "npm run seed:cost-sample", "why did my seeder run during test:e2e", "add an expected* oracle", "assert the sample's numbers", "add a new sample".
---

# Klippel workspace seeders

A **seeder** builds a realistic demo or benchmark workspace by driving the
running app. It is not a test and must never be collected as one. The normative
rules are [webapp/src/docs/quality/e2e-tests.md §13](../../webapp/src/docs/quality/e2e-tests.md);
this skill is the how-to.

Reference implementation: `webapp/scripts/seed/costSample.seed.ts` +
`helpers/puppeteer/generateCostSample.ts` + `helpers/puppeteer/seedCostSample.ts`
+ `Composer/tests/standalone/integrity/costSampleAudits.e2e.test.ts`.

## The three-part shape

1. **`helpers/puppeteer/generate<Sample>.ts` — pure.** Declares the sample's
   inputs (materials, processes, logos, electives, size curve) as data, and
   exports `expected*` functions that compute the answers **from those inputs**.
   No `page` dependency, seeded PRNG if randomised, index-derived ids.
2. **`helpers/puppeteer/seed<Sample>.ts` — drives the app.** Turns the declared
   inputs into MCP-tool calls against the running renderer. Shared verbatim by
   the seeder and the integrity test, so the two build the *same* sample.
3. **`scripts/seed/<sample>.seed.ts` — the entry point.** Connects over CDP,
   calls the seeder helper, logs what it built, keeps a smoke `expect` or two.

## Hard rules

- **Name it `*.seed.ts`, never `*.test.ts`.** The suite's default `testMatch`
  collects anything matching `*.test.ts` regardless of where it sits.
- **It lives in `webapp/scripts/seed/`**, which `jest.config.ts` excludes via
  `testPathIgnorePatterns: ['/node_modules/', '<rootDir>/scripts/']`. Never under
  a module's `tests/` tree — that tree is categorized by failure mode, and a
  seeder guards against none.
- **Add the npm script in the same change**, or the seeder is unreachable. It
  must override *both* `testMatch` and `testPathIgnorePatterns` on the command
  line to punch back through the config exclusion:

  ```
  "seed:cost-sample": "unset ELECTRON_RUN_AS_NODE; ENV_NAME=\"${ENV_NAME:-benchmark}\" KLIPPEL_E2E_SKIP_GLOBAL_SETUP=1 jest --testPathIgnorePatterns /node_modules/ --testMatch '<rootDir>/scripts/seed/<sample>.seed.ts'"
  ```

  Note `unset ELECTRON_RUN_AS_NODE` (VS Code leaks it and Electron then boots as
  plain Node, surfacing as an unrelated-looking CDP timeout) and
  `KLIPPEL_E2E_SKIP_GLOBAL_SETUP=1` (the app is already running).
- **Guard nothing beyond a smoke check.** Enough `expect` that a broken seed
  fails loudly instead of leaving a plausible-looking workspace behind. Real
  assertions go in the integrity test.
- **It resets a workspace.** That is why it must never run alongside the suite,
  and why `ENV_NAME` matters — point it at `benchmark`, never at the personal
  env.

## Why it runs under jest at all

It drives puppeteer through the same MCP tools and drivers the tests use, which
means serializing functions into the page. `tsx`/esbuild's `__name` injection
breaks those serialized functions — the same breakage istanbul's `cov_*` causes
in MCP tool files (§6). Jest's swc transform does not, and that stack is already
proven. Do not "simplify" a seeder into a plain `tsx` script.

## The paired integrity test

Every seeder gets one, under `<module>/tests/standalone/integrity/`. It builds
the same sample from the same helpers and asserts every figure the app derives
against the generator's oracle.

- **`integrity`, not `functionality`.** No single feature is under test. What is
  pinned is that the numbers stay consistent *with each other* and with the
  inputs, wherever you read them — per-row values, subtotals, the total, the
  audits, the time accordion. Each is a separate reading of one arithmetic and
  they must agree.
- **The oracle must be genuine.** It computes from the declared inputs directly.
  If it re-implements the app's aggregation, the two agree by construction and
  the test proves nothing. The test-side check that "subtotals sum to the total"
  catches a fourth contribution appearing even if the oracle were updated to
  match it — keep that kind of internal-consistency assertion.
- **Seed the sharp case deliberately.** In the cost sample it is an elective that
  is **off**, gating both a process and a logo: a regression that silently
  includes them still produces plausible-looking numbers. Assert both that the
  suppressed rows are still *listed* (`data-cost-disabled="true"`) and that they
  carry no value (`data-cost-money=""`).
- **Compare quantities with `toBeCloseTo`, not formatted strings.** The app and
  the oracle sum the same terms in a different order, so the last bit of a float
  can round the other way at 2 dp. Reserve exact-string assertions for the one
  figure the seeder has long proven agrees to the cent (the grand total).
- **Setup is expensive** — build the sample once in `beforeAll`, one facet per
  `it`. Give `beforeAll` a generous timeout; it is still the only timeout you set
  (§3, §8).
- Everything else in the e2e rules applies: no fixed timeouts, `data-*` mirrors
  instead of parsing captions, `resetWorkspace` / `resetUIState` isolation,
  `closeOpenOverlays` in a `finally` so a failed assertion never hands the next
  `it` an open Modal.

## When adding a new sample

Check whether the surface it will assert has the mirrors it needs. If a figure
is only available as rendered text, **add the mirror to the component** (§2)
rather than regexing the caption — that is what `data-time-minutes-per-unit`,
`data-time-garments` and `data-process-minutes` on `ProcessTimeAccordion` came
from. Known gap: the material audit panel still has none, so
`costSampleAudits.e2e.test.ts` parses its text.

## Related

- [e2e-test-rules](../e2e-test-rules/SKILL.md) — §13 lives there and is normative.
- [performance-tests](../performance-tests/SKILL.md) — the *other* consumer of
  pure `generate*` helpers; §11.5 lists the shared primitives.
