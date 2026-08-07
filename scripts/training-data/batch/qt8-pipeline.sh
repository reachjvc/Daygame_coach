#!/usr/bin/env bash
# Back-compat shim: QT8 is just one batch of the generic driver.
exec "$(dirname "$0")/batch-pipeline.sh" QT8 "$@"
