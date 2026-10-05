#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${SMOKE_BASE_URL:-}}"
if [[ -z "$base_url" ]]; then
  echo "SMOKE_BASE_URL or a base URL argument is required" >&2
  exit 2
fi
base_url="${base_url%/}"

paths=("/" "/login")
for path in "${paths[@]}"; do
  status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --max-time 20 "$base_url$path")"
  printf 'smoke path=%s status=%s\n' "$path" "$status"
  if [[ "$status" != 2* && "$status" != 3* ]]; then
    echo "Production smoke check failed for $path" >&2
    exit 1
  fi
done

printf 'Production public smoke check passed for %s\n' "$base_url"

# Authenticated and authorization scenarios must run in the staging/E2E suite;
# this check intentionally never accepts credentials or logs sensitive responses.
if [[ "${REQUIRE_PUBLIC_MARKET_SMOKE:-false}" == "true" ]]; then
  status="$(curl --silent --show-error --location --output /dev/null --write-out '%{http_code}' --max-time 20 "$base_url/market")"
  printf 'smoke path=/market status=%s\n' "$status"
  [[ "$status" == 2* || "$status" == 3* ]]
fi
