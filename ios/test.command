#!/bin/bash
# Run every Swift module's tests. This is the gate on Kai.
#
# THE GATE'S ONE JOB: never report success unless tests actually EXECUTED.
#
# It was killed for exactly that. `swift test --filter <anything that does not match>`
# prints "Test run with 0 tests in 0 suites passed" and exits 0 - and --filter is a
# documented usage of this very script. A renamed suite, a typo, or a filter copied
# from another lane, and the light was green with nothing behind it. So this wrapper now
# PARSES the runner's output, requires a non-zero executed-test count, and requires an
# unfiltered run to clear the floor recorded in ios/gate-floor.txt.
#
# WHY A WRAPPER AND NOT PLAIN `swift test`
# Command Line Tools installs swift-testing at
#   /Library/Developer/CommandLineTools/Library/Developer/Frameworks/Testing.framework
# which is on no default search path, and CLT ships no XCTest at all. Without that
# search path a bare `swift test` on this box FAILS TO BUILD: the suites
# `import Testing` unconditionally, so you get `error: no such module 'Testing'` and
# exit 1.
#
# (An earlier version of this header said a bare `swift test` printed "Build complete",
# exited 0 and ran zero tests. Measured on Kai at d060bb3, that is not what happens -
# it fails loudly. The correction matters: a red gate that a note predicts will be
# silent gets waved through as "a Kai/Supreme difference".)
#
# The toolchain branch keys off the ACTIVE TOOLCHAIN (`xcrun --find xctest`, with
# `xcode-select -p` reported for the log), not off an app existing at a hardcoded
# /Applications/Xcode.app path. A box with Xcode installed at a versioned path
# (Xcode-16.4.app), or with Xcode installed but xcode-select pointing at Command Line
# Tools - the state this box is in - took the wrong branch under the old test.
#
# Usage:  ./test.command                    every suite; must clear the floor
#         ./test.command --filter Figure    one suite; must still run > 0 tests
#         MQ_DRAWS=20 ./test.command --filter Bridge
#                                           fast loop. The knob is REFUSED on an unfiltered
#                                           run (see MQ_GATE below); the gate value is 200.
set -euo pipefail

cd "$(dirname "$0")"

FLOOR_FILE="gate-floor.txt"

# ---------------------------------------------------------------- toolchain
DEVDIR="$(xcode-select -p 2>/dev/null || true)"
ARGS=()
if xcrun --find xctest >/dev/null 2>&1; then
  echo "toolchain: Xcode toolchain active at ${DEVDIR:-unknown}, using the default toolset"
else
  CLT_FRAMEWORKS="/Library/Developer/CommandLineTools/Library/Developer/Frameworks"
  if [ ! -d "$CLT_FRAMEWORKS/Testing.framework" ]; then
    echo "GATE FAILED: the active toolchain (${DEVDIR:-unknown}) has no XCTest, and" >&2
    echo "  $CLT_FRAMEWORKS/Testing.framework does not exist either." >&2
    echo "  Nothing on this box can run the suites. Install Command Line Tools, or point" >&2
    echo "  xcode-select at an Xcode that has them." >&2
    exit 1
  fi
  echo "toolchain: Command Line Tools at ${DEVDIR:-unknown}, applying kai-toolset.json"
  ARGS+=(--toolset kai-toolset.json)
fi

# ---------------------------------------------------------------- bundle integrity
# UNCONDITIONAL and FATAL. It used to run only when dist/ existed - and dist/ is
# gitignored, so on every fresh clone (Supreme included) the staleness check never ran
# at all - and a failure was a WARNING on stderr that still exited 0. The committed
# bundle is the interpreted code that ships inside the App Store binary; a gate that
# shrugs at it is not attesting to anything.
if command -v node >/dev/null 2>&1; then
  echo "bundle:    checking the committed engine bundle's own bytes against a fresh build of js/"
  if ! node ../tools/build-engine.mjs --check; then
    echo "GATE FAILED: the committed engine bundle is not a build of the current sources." >&2
    echo "  Run: npm run build:engine   (and commit the result)" >&2
    exit 1
  fi
  # The CUBE bundle gets the same treatment, and it is the same argument one layer along:
  # the refutation of the cube split found that the deploy verification and the ?v= link
  # covered 10.5% of the shipped bytes. On iOS there is no CDN and no cache to defeat -
  # the shipped file is a committed package resource - so THIS byte-hash IS the coverage.
  # A cube bundle that is not an extraction of the current cube/index.html never reaches
  # the simulator, let alone the iPad.
  echo "bundle:    checking the committed cube engine bundle's own bytes against a fresh extraction of cube/index.html"
  if ! node ../tools/build-cube-engine.mjs --check; then
    echo "GATE FAILED: the committed cube engine bundle is not an extraction of cube/index.html." >&2
    echo "  Run: npm run build:cube-engine   (and commit the result)" >&2
    exit 1
  fi
else
  echo "GATE FAILED: node is not on PATH, so the committed bundles cannot be verified" >&2
  echo "  against their sources. The Swift suite would be testing unattested blobs." >&2
  echo "  Install node, or run the gate on a box that has it." >&2
  exit 1
fi

# ---------------------------------------------------------------- run
# --filter and --skip are NOT the same thing for the floor, and treating them as one was
# refutation wound 3: `./test.command --skip Cube` executed 42 tests and printed
# GATE PASSED. A CI line carrying a --skip for one flaky suite silently dropped the floor
# for all of them.
#
#   --filter  narrows to a named subset. The run does not claim to be the gate, so the
#             floor is not applied (the > 0 check still is).
#   --skip    removes tests from a run that is otherwise the whole suite. It NEVER lifts
#             the floor - which means a --skip that actually removes anything fails, and
#             says why. That is the point: the floor is what "the whole suite ran" means.
FILTERED=0
SKIPPED=0
for arg in "$@"; do
  case "$arg" in
    --filter|--filter=*) FILTERED=1 ;;
    --skip|--skip=*)     SKIPPED=1 ;;
  esac
done
# A --skip anywhere keeps the floor armed, even alongside a --filter.
APPLY_FLOOR=1
if [ "$FILTERED" -eq 1 ] && [ "$SKIPPED" -eq 0 ]; then APPLY_FLOOR=0; fi

# THE GATE FLAG (refutation wound 2). On a run that claims to be the gate, the suites
# refuse the sample-size knobs - MQ_CUBE_PARITY_ROWS, MQ_CUBE_SOLVES, MQ_DRAWS - instead of
# quietly honouring them. `MQ_CUBE_PARITY_ROWS=1 MQ_CUBE_SOLVES=1 MQ_DRAWS=1 ./test.command`
# used to print "80 tests, floor cleared, GATE PASSED" in 1.3 s over two rows. A filtered
# run is a developer's edit loop and is left alone; it never claimed the floor either.
if [ "$APPLY_FLOOR" -eq 1 ]; then
  export MQ_GATE=1
  echo "gate:      MQ_GATE=1 - sample-size overrides are refused on this run"
else
  unset MQ_GATE || true
  echo "gate:      filtered run - MQ_GATE is not set, sample-size overrides are honoured"
fi

LOG="$(mktemp -t mqi-swift-gate)"
trap 'rm -f "$LOG"' EXIT

set +e
swift test "${ARGS[@]}" "$@" 2>&1 | tee "$LOG"
SWIFT_STATUS=${PIPESTATUS[0]}
set -e

# ---------------------------------------------------------------- count what RAN
# swift-testing's summary line: "Test run with 32 tests in 3 suites passed after ...".
# Absent entirely when the build failed - which is also zero tests executed.
SUMMARY="$(grep -oE 'Test run with [0-9]+ test' "$LOG" | tail -1 || true)"
if [ -n "$SUMMARY" ]; then
  EXECUTED="$(printf '%s' "$SUMMARY" | grep -oE '[0-9]+')"
else
  EXECUTED=0
fi
# Cross-check against the per-test result lines, so a summary line that lies (or a
# future format change that stops printing one) cannot be the only witness.
PER_TEST="$(grep -cE 'Test "[^"]+" (passed|failed|skipped)' "$LOG" || true)"
PER_TEST="${PER_TEST:-0}"

echo ""
echo "gate:      executed ${EXECUTED} test(s)  (per-test result lines seen: ${PER_TEST})"

if [ "$SWIFT_STATUS" -ne 0 ]; then
  echo "GATE FAILED: swift test exited ${SWIFT_STATUS}." >&2
  exit "$SWIFT_STATUS"
fi

if [ "$EXECUTED" -eq 0 ]; then
  echo "GATE FAILED: ZERO tests executed. A run that executes nothing is not a pass." >&2
  if [ "$FILTERED" -eq 1 ] || [ "$SKIPPED" -eq 1 ]; then
    echo "  A --filter/--skip matched no test. Check the name against:" >&2
    echo "    swift test ${ARGS[*]} --list-tests" >&2
  else
    echo "  No filter was given, so this is a build or discovery failure - see the log above." >&2
  fi
  exit 1
fi

# The two witnesses need not match exactly - a parameterised @Test counts once per case
# in the summary but prints one line per FUNCTION - so the cross-check is only that the
# summary is not the sole witness. A summary claiming tests ran with no per-test line
# behind it is a lying summary, and that is the thing being guarded against.
if [ "$PER_TEST" -eq 0 ]; then
  echo "GATE FAILED: the summary claims ${EXECUTED} test(s) ran but not one per-test" >&2
  echo "  result line was printed. The summary is the only witness; do not trust it." >&2
  exit 1
fi

# ---------------------------------------------------------------- the floor
# An unfiltered run must execute AT LEAST the number of tests this repo says it has.
# That is the other half of the false green: a suite that silently stops being
# discovered (a renamed file, a target dropped from Package.swift, a @Suite that no
# longer compiles in) shrinks the count without failing anything.
if [ "$APPLY_FLOOR" -eq 0 ]; then
  echo "gate:      filtered run - the floor is not applied (${EXECUTED} test(s) ran, which is > 0)"
elif [ -f "$FLOOR_FILE" ]; then
  FLOOR="$(grep -oE '^[0-9]+' "$FLOOR_FILE" | head -1 || true)"
  FLOOR="${FLOOR:-0}"
  if [ "$FLOOR" -le 0 ]; then
    echo "GATE FAILED: ios/${FLOOR_FILE} carries no positive floor." >&2
    exit 1
  fi
  if [ "$EXECUTED" -lt "$FLOOR" ]; then
    echo "GATE FAILED: only ${EXECUTED} test(s) executed, below the floor of ${FLOOR}" >&2
    echo "  recorded in ios/${FLOOR_FILE}. Tests have gone MISSING - a suite is no longer" >&2
    echo "  being discovered. If the drop is deliberate, lower the floor in the same" >&2
    echo "  commit that removes the tests, so it appears in the diff." >&2
    if [ "$SKIPPED" -eq 1 ]; then
      echo "" >&2
      echo "  A --skip was given. --skip does NOT lift the floor: a run with tests removed" >&2
      echo "  from it is not the gate, whatever it is called. Use --filter for an edit loop," >&2
      echo "  or run the whole suite." >&2
    fi
    exit 1
  fi
  echo "gate:      ${EXECUTED} test(s) executed, floor ${FLOOR} cleared"
  if [ "$EXECUTED" -gt "$FLOOR" ]; then
    echo "gate:      note - the suite has grown past the floor; raise ios/${FLOOR_FILE} to ${EXECUTED}"
  fi
else
  echo "GATE FAILED: ios/${FLOOR_FILE} is missing. The executed-test floor is part of the" >&2
  echo "  gate, not an optional extra." >&2
  exit 1
fi

echo "GATE PASSED"
