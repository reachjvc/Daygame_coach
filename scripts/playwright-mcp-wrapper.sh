#!/bin/bash
export PLAYWRIGHT_BROWSERS_PATH="/home/jonaswsl/.cache/ms-playwright"
exec npx @playwright/mcp@latest --browser chromium "$@"
