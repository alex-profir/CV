#!/usr/bin/env bash
# Vercel's build (011 research R9, contracts/pdf.md Host build). The build
# image (Amazon Linux 2023) lacks Chromium's system libraries and the
# browser, which the build's PDF step needs. Only the host runs this:
# locally and in CI the browser is already installed, and `npm run build`
# is the whole build.
set -euo pipefail

# vercel.json is the host's config, not a served file: keep it out of the
# deploy's dirty check, as before.
git update-index --assume-unchanged vercel.json

# Chromium's libraries: the only two the build image lacks (research R1,
# R9: the trial's dnf run installed nothing else from its longer list).
dnf install -y -q nss nspr

# The headless shell, the binary a headless launch uses.
npx playwright install --only-shell chromium

npm run build
