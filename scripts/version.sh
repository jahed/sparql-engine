#!/usr/bin/env bash
set -euo pipefail

echo "$(git shortlog -s -n | cut -f2 | grep -v dependabot | cat - AUTHORS | awk '!seen[$0]++')" > AUTHORS
git add AUTHORS

license_line='// SPDX-License-Identifier: MIT'
for file in $(grep -rL "${license_line}" src/); do
  echo "${file}"
  echo "$(echo "${license_line}" | cat - "${file}")" > "${file}"
  git add "${file}"
done
