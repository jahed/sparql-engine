#!/usr/bin/env bash
set -euo pipefail

license_line='// SPDX-License-Identifier: MIT'

for file in $(grep -rL "${license_line}" src/); do
  echo "${file}"
  echo "$(echo "${license_line}" | cat - "${file}")" > "${file}"
done
