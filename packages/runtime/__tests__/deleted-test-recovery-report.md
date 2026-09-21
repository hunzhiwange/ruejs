# Deleted test recovery report

Generated from `deleted-test-recovery.manifest.json` after the 2026-09-20 full regression run. The manifest is the machine-readable source of truth for all 199 deleted paths.

## Verification

- Executable expected failures: none. `rg -n 'it\\.fails\\(' packages/runtime/__tests__ --glob '*.{ts,tsx}'` only matches the manifest gate's scanner implementation.
- Deletion-set gate: `pnpm exec vitest run --project unit-jsdom packages/runtime/__tests__/deleted-test-recovery.manifest.spec.ts` — exit 0, 1 file and 5 tests passed.
- Full unit suite: `pnpm run test-unit` — exit 0, 395 files and 2124 tests passed; 0 expected failures.
- TypeScript check: `pnpm run check` — exit 0; TypeScript and the compiler/runtime boundary check passed.
- Silent-skip review: no newly introduced `skip` or `todo`; recovered tests use ordinary passing assertions.

## Classification summary

| Classification   | Deleted paths | Meaning                                                                        |
| ---------------- | ------------: | ------------------------------------------------------------------------------ |
| Migrated passing |           150 | Restored at the original test path and currently passes.                       |
| Migrated failing |             0 | No restored path retains an executable expected failure.                       |
| Covered          |            42 | Observable behavior is exercised by the manifest's current test evidence.      |
| Obsolete         |             7 | Removed implementation/helper; rationale is retained by the manifest evidence. |
| **Total**        |       **199** | Every deleted path occurs exactly once.                                        |

## Expected failure queue

Empty. All 44 registered expected failures were converted to ordinary passing tests, their per-entry `failingTests` arrays were cleared, and `expectedFailures` is `[]`.
