#!/usr/bin/env bash
# Builds a signed, installable APK at build/rimebell.apk without Gradle, using the Android packaging tools
# from Ubuntu's repositories:
#   sudo apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# Also needs Node.js 18+ and a JDK (8 or newer).
# Optional: VERSION_CODE / VERSION_NAME override the manifest; KEYSTORE / KS_PASS / KS_ALIAS choose the signing key.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AND="$ROOT/android"
OUT="$ROOT/build"
WORK="$OUT/apk-work"
ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-0.2.0}"
KEYSTORE="${KEYSTORE:-$AND/rimebell-debug.keystore}"
KS_PASS="${KS_PASS:-android}"
KS_ALIAS="${KS_ALIAS:-rimebell}"

for tool in node javac aapt dalvik-exchange zipalign apksigner keytool; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. See the top of android/build.sh." >&2; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "Missing $ANDROID_JAR (apt package android-sdk-platform-23)." >&2; exit 1; }

echo "== game page"
cd "$ROOT/game"
[ -d node_modules/@fontsource ] || npm ci --omit=dev --no-audit --no-fund
node build.js

echo "== layout"
rm -rf "$WORK" && mkdir -p "$WORK/classes" "$WORK/dex" "$WORK/assets/www"
cp "$ROOT/game/dist/app/index.html" "$WORK/assets/www/index.html"

echo "== compile"
find "$AND/java" -name '*.java' > "$WORK/sources.txt"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" -d "$WORK/classes" @"$WORK/sources.txt"
dalvik-exchange --dex --min-sdk-version=24 --output="$WORK/dex/classes.dex" "$WORK/classes"

echo "== package"
aapt package -f -0 arsc \
  -M "$AND/AndroidManifest.xml" -S "$AND/res" -A "$WORK/assets" -I "$ANDROID_JAR" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -F "$WORK/unsigned.apk"
(cd "$WORK/dex" && aapt add "$WORK/unsigned.apk" classes.dex >/dev/null)
zipalign -f -p 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "== sign"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias "$KS_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Rimebell Debug, O=moblized" >/dev/null 2>&1
fi
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" --ks-key-alias "$KS_ALIAS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT/rimebell.apk" "$WORK/aligned.apk"
apksigner verify "$OUT/rimebell.apk"
rm -f "$OUT/rimebell.apk.idsig"
echo "Built $OUT/rimebell.apk ($(du -h "$OUT/rimebell.apk" | cut -f1), version $VERSION_NAME / $VERSION_CODE)"
