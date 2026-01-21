#!/usr/bin/env bash
# Download + transcribe + process + ingest for a single YouTube source.
#
# Usage:
#   ./scripts/run_source.sh "ChannelName" "https://www.youtube.com/@Channel/videos"
#   ./scripts/run_source.sh "PlaylistName" "https://www.youtube.com/playlist?list=PLxxx"
#   ./scripts/run_source.sh "VideoName" "https://www.youtube.com/watch?v=xxx"
#
# Flags:
#   --skip-download   Skip download step (process what's already on disk)
#   --ingest-only     Skip processing (just ingest existing transcripts)

set -euo pipefail

CHANNEL_NAME=""
YOUTUBE_URL=""
SKIP_DOWNLOAD=false
INGEST_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      echo "Usage: $0 [--skip-download] [--ingest-only] <channel_name> <youtube_url>"
      exit 0
      ;;
    --skip-download) SKIP_DOWNLOAD=true; shift ;;
    --ingest-only) INGEST_ONLY=true; shift ;;
    -*)
      echo "Unknown flag: $1" >&2
      exit 2
      ;;
    *)
      if [[ -z "$CHANNEL_NAME" ]]; then
        CHANNEL_NAME="$1"
      elif [[ -z "$YOUTUBE_URL" ]]; then
        YOUTUBE_URL="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 2
      fi
      shift
      ;;
  esac
done

if [[ -z "$CHANNEL_NAME" ]]; then
  echo "Usage: $0 [--skip-download] [--ingest-only] <channel_name> <youtube_url>" >&2
  echo "Run with --help for examples." >&2
  exit 1
fi

if [[ "$SKIP_DOWNLOAD" == "false" && -z "$YOUTUBE_URL" ]]; then
  echo "Missing youtube_url (required unless --skip-download is set)" >&2
  echo "Usage: $0 [--skip-download] [--ingest-only] <channel_name> <youtube_url>" >&2
  exit 1
fi

if [[ "$SKIP_DOWNLOAD" == "false" ]]; then
  ./scripts/download_channel.sh "$CHANNEL_NAME" "$YOUTUBE_URL"
fi

if [[ "$INGEST_ONLY" == "true" ]]; then
  ./scripts/full_pipeline.sh --ingest-only
else
  ./scripts/full_pipeline.sh "$CHANNEL_NAME"
fi
