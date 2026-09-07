#!/bin/bash
# Run every Swift module's tests. This is the gate on Kai.
#
# WHY A WRAPPER AND NOT PLAIN `swift test`
# Command Line Tools installs swift-testing at
#   /Library/Developer/CommandLineTools/Library/Developer/Frameworks/Testing.framework
# which is on no default search path. Without it SwiftPM still BUILDS the suites, but
# the runner it generates is guarded by `#if canImport(Testing)`, so it compiles to a
# no-op: `swift test` prints "Build complete" and exits 0 having run ZERO tests. That is
# a green light with nothing behind it, which is worse than a failure. kai-toolset.json
# supplies the search path and the two rpaths the test bundle needs at dlopen time.
#
# On a box WITH Xcode (Supreme) the toolset is not applied and plain `swift test`
# behaves identically - this script just works there too.
#
# Usage:  ./test.command                    every suite
#         ./test.command --filter Figure    one suite
#         MQ_DRAWS=20 ./test.command        fast loop (the gate value is 200)
set -euo pipefail

cd "$(dirname "$0")"

ARGS=()
if [ -d "/Applications/Xcode.app/Contents/Developer/Library/Frameworks/Testing.framework" ]; then
  echo "toolchain: Xcode present, using the default toolset"
else
  echo "toolchain: Command Line Tools, applying kai-toolset.json"
  ARGS+=(--toolset kai-toolset.json)
fi

# The engine bundle is a committed package resource, but if the repo has a fresher one
# in dist/ (someone just edited js/ and rebuilt) say so rather than testing a stale copy.
if [ -f ../dist/engine.bundle.js ] && command -v node >/dev/null 2>&1; then
  node ../tools/build-engine.mjs --check >/dev/null 2>&1 || {
    echo "WARNING: the committed engine bundle is stale. Run: npm run build:engine" >&2
  }
fi

exec swift test "${ARGS[@]}" "$@"
