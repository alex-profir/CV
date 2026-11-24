#!/usr/bin/env bash
set -euxo pipefail
npm run build
dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango cairo alsa-lib
npx playwright install chromium
node spike-pdf.mjs
