#!/usr/bin/env bash
# Builds a signed, installable APK at build/soulsmind.apk without Gradle.
# With an Android SDK (ANDROID_HOME, as on GitHub's runners) it uses the SDK's build-tools: aapt, d8, zipalign,
# apksigner. Without one it uses the packaged tools from Ubuntu's repositories:
#   sudo apt-get install -y aapt apksigner zipalign dalvik-exchange android-sdk-platform-23
# Also needs Node.js 18+ and a JDK (8 or newer).
# Optional: VERSION_CODE / VERSION_NAME override the manifest; KEYSTORE / KS_PASS / KS_ALIAS choose the signing key.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AND="$ROOT/android"
OUT="$ROOT/build"
WORK="$OUT/apk-work"
SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
BT=""
if [ -n "$SDK" ] && [ -d "$SDK/build-tools" ]; then
  BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | grep -E '/[0-9]+\.[0-9]+\.[0-9]+/$' | sort -V | tail -1)"
fi
if [ -n "$BT" ]; then
  PLAT="$(ls -d "$SDK"/platforms/android-*/ 2>/dev/null | grep -E '/android-[0-9]+/$' | sort -V | tail -1)"
  ANDROID_JAR="${ANDROID_JAR:-${PLAT}android.jar}"
  AAPT="${BT}aapt"; ZIPALIGN="${BT}zipalign"; APKSIGNER="${BT}apksigner"; D8="${BT}d8"
  echo "Using the Android SDK: $(basename "$BT") build-tools, $(basename "$PLAT")"
else
  ANDROID_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
  AAPT=aapt; ZIPALIGN=zipalign; APKSIGNER=apksigner; D8=""
  echo "Using Ubuntu's packaged Android tools"
fi
VERSION_CODE="${VERSION_CODE:-2}"
VERSION_NAME="${VERSION_NAME:-0.3.0}"
KEYSTORE="${KEYSTORE:-$AND/rimebell-debug.keystore}"
KS_PASS="${KS_PASS:-android}"
KS_ALIAS="${KS_ALIAS:-rimebell}"

for tool in node javac keytool "$AAPT" "$ZIPALIGN" "$APKSIGNER" ${D8:-dalvik-exchange}; do
  command -v "$tool" >/dev/null || { echo "Missing $tool. See the top of android/build.sh." >&2; exit 1; }
done
[ -f "$ANDROID_JAR" ] || { echo "Missing $ANDROID_JAR." >&2; exit 1; }

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
if [ -n "$D8" ]; then
  find "$WORK/classes" -name '*.class' > "$WORK/classes.txt"
  "$D8" --min-api 24 --lib "$ANDROID_JAR" --output "$WORK/dex" $(cat "$WORK/classes.txt")
else
  dalvik-exchange --dex --min-sdk-version=24 --output="$WORK/dex/classes.dex" "$WORK/classes"
fi

echo "== package"
"$AAPT" package -f -0 arsc \
  -M "$AND/AndroidManifest.xml" -S "$AND/res" -A "$WORK/assets" -I "$ANDROID_JAR" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -F "$WORK/unsigned.apk"
(cd "$WORK/dex" && "$AAPT" add "$WORK/unsigned.apk" classes.dex >/dev/null)
"$ZIPALIGN" -f -p 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "== sign"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KS_PASS" -keypass "$KS_PASS" -alias "$KS_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Rimebell Debug, O=moblized" >/dev/null 2>&1
fi
"$APKSIGNER" sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" --ks-key-alias "$KS_ALIAS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$OUT/soulsmind.apk" "$WORK/aligned.apk"
"$APKSIGNER" verify "$OUT/soulsmind.apk"
rm -f "$OUT/soulsmind.apk.idsig"
echo "Built $OUT/soulsmind.apk ($(du -h "$OUT/soulsmind.apk" | cut -f1), version $VERSION_NAME / $VERSION_CODE)"
