#!/bin/bash
# Run `next build` with a ceiling on how much memory it may take.
#
# Why this exists: on 2026-09-18 a single `next build` reached 23 GB, then
# 31 GB, then 29 GB, three times in one day. This machine's Linux side only
# has 31 GB, so the build consumed the whole thing — swap included — and
# every other process froze waiting for memory that was never coming.
# VS Code's connection to Linux died each time (WebSocket 1006), which looks
# from the outside like "VS Code shut down on its own".
#
# The kernel does eventually kill the build, but far too late to help: on the
# 16:50 occurrence VS Code had already been starved for 79 seconds before the
# kernel acted. By then the editor was gone.
#
# So the build gets its own ceiling. If it goes over, only the build dies,
# and it dies with an explanation. The machine, and the editor, stay up.
#
# Note the ceiling is NOT a Node.js heap setting. Node's own heap limit here
# is ~4 GB, so the 29 GB was native memory allocated by Turbopack's Rust core,
# which `--max-old-space-size` does not govern at all.

set -euo pipefail

CAP="${BUILD_MEMORY_CAP:-12G}"

# Vercel and CI build on their own bounded machines and have no systemd user
# session to put a cgroup on. Nothing to protect there, so run straight.
if [ -n "${CI:-}" ] || [ -n "${VERCEL:-}" ]; then
  exec npx next build "$@"
fi

# Applying the ceiling needs systemd-run plus a delegated memory controller.
# If either is missing we do NOT quietly build uncapped — that is exactly the
# configuration that took the machine down three times. Say so and stop.
cap_available() {
  command -v systemd-run >/dev/null 2>&1 &&
    systemd-run --user --scope -q -p MemoryMax=64M -- true >/dev/null 2>&1
}

if ! cap_available; then
  if [ "${BUILD_ALLOW_UNCAPPED:-}" = "1" ]; then
    echo "WARNING: building with no memory ceiling because BUILD_ALLOW_UNCAPPED=1." >&2
    echo "         If the machine freezes and VS Code drops, this is why." >&2
    exec npx next build "$@"
  fi
  cat >&2 <<'MSG'
ERROR: cannot put a memory ceiling on this build, so it is not being started.

An uncapped build on this machine has frozen the whole Linux side three times
and taken VS Code's connection down with it, so refusing is deliberate.

This needs systemd-run and a delegated memory controller. To check:
  systemd-run --user --scope -p MemoryMax=64M -- true

To build anyway, knowing it may freeze the machine:
  BUILD_ALLOW_UNCAPPED=1 npm run build
MSG
  exit 1
fi

echo "Building with a ${CAP} memory ceiling (override with BUILD_MEMORY_CAP)."

unit="next-build-$$"
status=0
systemd-run --user --scope -q \
  --unit="$unit" \
  -p MemoryMax="$CAP" \
  -p MemorySwapMax=0 \
  -- npx next build "$@" || status=$?

# Whether hitting the ceiling surfaces as 137 (SIGKILL) or 143 (SIGTERM) varies
# — measured here it is 143 — so the exit code alone cannot be trusted to mean
# "ran out of memory". systemd records the real reason against the unit, so ask
# it rather than guess, and only claim the ceiling when it says so.
# systemd writes that record a fraction of a second after systemd-run returns,
# so a single immediate check misses it and the build looks like it failed for
# no stated reason. Give it a few tries before concluding it was something else.
stopped_by_ceiling=no
if [ "$status" -eq 137 ] || [ "$status" -eq 143 ]; then
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if journalctl --user -n 200 --no-pager 2>/dev/null |
         grep -q "${unit}.scope: Failed with result 'oom-kill'"; then
      stopped_by_ceiling=yes
      break
    fi
    sleep 0.3
  done
fi

if [ "$stopped_by_ceiling" = "no" ] && [ "$status" -ne 0 ]; then
  # A build that died on a signal we cannot attribute is worth naming, because
  # silently reporting it as an ordinary failure sends you hunting for a code
  # error that is not there.
  if [ "$status" -eq 137 ] || [ "$status" -eq 143 ]; then
    echo "" >&2
    echo "NOTE: the build was terminated by a signal (exit ${status}), but systemd does" >&2
    echo "      not record it hitting the ${CAP} ceiling. Something else stopped it —" >&2
    echo "      a timeout wrapper or a Ctrl-C are the usual causes." >&2
  fi
  exit "$status"
fi

if [ "$stopped_by_ceiling" = "yes" ]; then
  cat >&2 <<MSG

ERROR: the build asked for more than ${CAP} and was stopped.

It was stopped on purpose. Without the ceiling it would have taken the
machine's memory down to nothing and frozen VS Code along with it.

Turbopack is what runs away here. Measured on 2026-09-18 with Next 16.3.5:
uncapped it reached 23-31 GB and froze the machine; under a 12 GB ceiling it
got there in about 40 seconds and was stopped. A webpack build of the same
tree finished normally inside that same 12 GB.

So:
  1. Build with webpack, which is known to work here:
       npm run build -- --webpack
  2. Raising the ceiling is unlikely to help — uncapped Turbopack took every
     byte the machine had (29-31 GB) rather than settling at some figure.
     Only worth trying if you can spare it:
       BUILD_MEMORY_CAP=20G npm run build
MSG
  exit 137
fi

exit "$status"
