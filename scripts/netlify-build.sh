#!/usr/bin/env bash
set -euo pipefail

# Netlify's standard build image does not include Flutter. Keep the SDK in the
# build cache so that only the first deploy downloads it.
FLUTTER_VERSION="${FLUTTER_VERSION:-3.44.1}"
CACHE_ROOT="${NETLIFY_CACHE_DIR:-$HOME/.cache}"
FLUTTER_DIR="$CACHE_ROOT/flutter-$FLUTTER_VERSION"

if [ ! -x "$FLUTTER_DIR/bin/flutter" ]; then
  mkdir -p "$CACHE_ROOT"
  archive="$CACHE_ROOT/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"
  curl --fail --location --retry 3 \
    "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" \
    --output "$archive"
  rm -rf "$CACHE_ROOT/flutter"
  tar -xf "$archive" -C "$CACHE_ROOT"
  mv "$CACHE_ROOT/flutter" "$FLUTTER_DIR"
fi

export PATH="$FLUTTER_DIR/bin:$PATH"
flutter --disable-analytics

(cd backend_api && npm ci)
(cd flutter_app && flutter pub get && flutter build web --release \
  --dart-define=API_BASE_URL=/api \
  --dart-define=SUPPORT_WHATSAPP="${SUPPORT_WHATSAPP:-5514996559580}")
