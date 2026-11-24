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

# Chromium's libraries: the host trial's working list (research R1).
dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango cairo alsa-lib

# The headless shell, the binary a headless launch uses.
npx playwright install --only-shell chromium

npm run build
