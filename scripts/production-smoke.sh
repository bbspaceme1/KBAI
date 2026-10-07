#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${SMOKE_BASE_URL:-}}"
if [[ -z "$base_url" ]]; then
  echo "SMOKE_BASE_URL or a base URL argument is required" >&2
  exit 2
fi
base_url="${base_url%/}"

paths=("/" "/login" "/market")
for path in "${paths[@]}"; do
  body_file="$(mktemp)"
  trap 'rm -f "$body_file"' EXIT
  status="$(curl --silent --show-error --location --output "$body_file" --write-out '%{http_code}' --max-time 20 "$base_url$path")"
  printf 'smoke path=%s status=%s\n' "$path" "$status"
  if [[ "$status" != 2* && "$status" != 3* ]]; then
    echo "Production smoke check failed for $path" >&2
    exit 1
  fi
  case "$path" in
    /) grep -Eqi 'KBAI|K B A I' "$body_file" || { echo "Missing KBAI marker" >&2; exit 1; } ;;
    /login) grep -Eqi 'login|masuk|sign in' "$body_file" || { echo "Missing login marker" >&2; exit 1; } ;;
    /market) grep -Eqi 'market|pasar|IDX' "$body_file" || { echo "Missing market marker" >&2; exit 1; } ;;
  esac
done

printf 'Production public smoke check passed for %s\n' "$base_url"

# Authenticated and authorization scenarios must run in the staging/E2E suite;
# this check intentionally never accepts credentials or logs sensitive responses.
