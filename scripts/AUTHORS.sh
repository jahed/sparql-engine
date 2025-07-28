#!/usr/bin/env bash
set -euo pipefail

echo "$(git shortlog -s -n | cut -f2 | grep -v dependabot | cat - AUTHORS | awk '!seen[$0]++')" > AUTHORS
