#!/usr/bin/env bash
# T-1013: Bundle Local Server USB package for Offline B
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${ROOT}/deployment/usb-bundle/PQQ-Offline-B"
STAMP="$(date +%Y%m%d)"

echo "==> Building USB bundle at ${OUT}"

rm -rf "${OUT}"
mkdir -p "${OUT}"

# Core runtime
cp -R "${ROOT}/local-server" "${OUT}/local-server"
rm -rf "${OUT}/local-server/node_modules" \
       "${OUT}/local-server/db/pqq.sqlite" \
       "${OUT}/local-server/config.json" \
       "${OUT}/local-server/service-account.json" 2>/dev/null || true

# PWA static (same build as GH Pages)
for item in index.html dashboard.html scoreboard.html admin.html approve.html \
  judge-theory.html judge-practice.html judge-full.html styles.css config.json; do
  cp "${ROOT}/${item}" "${OUT}/${item}"
done
cp -R "${ROOT}/js" "${OUT}/js"
cp -R "${ROOT}/pwa" "${OUT}/pwa"
cp -R "${ROOT}/assets" "${OUT}/assets"

# Config templates
cp "${ROOT}/local-server/config.example.json" "${OUT}/local-server/config.example.json"
cp "${ROOT}/local-server/service-account.example.json" "${OUT}/local-server/service-account.example.json"
cp "${ROOT}/deployment/usb-bundle/SNAPSHOT_SAMPLE.json" "${OUT}/SNAPSHOT_SAMPLE.json"
cp "${ROOT}/deployment/usb-bundle/README.md" "${OUT}/README.md"

# Install production deps only
echo "==> npm install (production)"
(cd "${OUT}/local-server" && npm install --omit=dev)

ARCHIVE="${ROOT}/deployment/usb-bundle/PQQ-Offline-B-${STAMP}.tar.gz"
tar -czf "${ARCHIVE}" -C "${ROOT}/deployment/usb-bundle" "PQQ-Offline-B"

echo "✅ USB bundle ready:"
echo "   Folder: ${OUT}"
echo "   Archive: ${ARCHIVE}"
echo ""
echo "Next steps:"
echo "  1. Copy to USB / laptop Thư ký"
echo "  2. cp local-server/config.example.json local-server/config.json"
echo "  3. Add service-account.json (not included)"
echo "  4. npm start in local-server/"
