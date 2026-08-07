#!/usr/bin/env bash
# Back-compat shim: QT8 is just one batch of the generic guard.
exec "$(dirname "$0")/batch-guard.sh" QT8
