#!/usr/bin/env bash
# Remove stale non-source artifacts older than 7 days.
# Safe paths only — never touches src/, .git/, .auth/, node_modules/.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DAYS="${CLEAN_STALE_DAYS:-7}"
removed=0

delete_if_stale() {
  local path="$1"
  if [[ -e "$path" ]]; then
    # -mtime +N: last modified more than N*24 hours ago
    local found
    found="$(find "$path" -maxdepth 0 -mtime "+${DAYS}" 2>/dev/null || true)"
    if [[ -n "$found" ]]; then
      rm -rf "$path"
      echo "clean-stale-artifacts: removed $path (older than ${DAYS}d)"
      removed=$((removed + 1))
    fi
  fi
}

# Known artifact files / dirs at repo root
delete_if_stale "debug-screenshot.png"
delete_if_stale "dist"
delete_if_stale ".dist"

# downloads/ contents older than DAYS (keep empty folder)
if [[ -d downloads ]]; then
  while IFS= read -r -d '' f; do
    rm -rf "$f"
    echo "clean-stale-artifacts: removed $f (older than ${DAYS}d)"
    removed=$((removed + 1))
  done < <(find downloads -mindepth 1 -mtime "+${DAYS}" -print0 2>/dev/null || true)
fi

# Root-level junk
while IFS= read -r -d '' f; do
  rm -f "$f"
  echo "clean-stale-artifacts: removed $f (older than ${DAYS}d)"
  removed=$((removed + 1))
done < <(find . -maxdepth 1 \( -name '.DS_Store' -o -name '*.log' \) -type f -mtime "+${DAYS}" -print0 2>/dev/null || true)

if [[ "$removed" -eq 0 ]]; then
  echo "clean-stale-artifacts: nothing to remove (threshold ${DAYS}d)"
fi
